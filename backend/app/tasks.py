import asyncio
import logging
import json
from datetime import datetime
from sqlalchemy.orm import Session
from .database import SessionLocal
from . import crud, models
from .worker import celery_app
from .utils.scanner import scan_directory
from .utils.thumbnails import generate_thumbnails, generate_face_thumbnail
from .utils.ml import detect_faces
from .telemetry import tracer, faces_detected_counter, photos_processed_counter, faces_processed_counter, faces_recognized_counter

logger = logging.getLogger(__name__)

@celery_app.task
def scan_folder_task(folder_id: int):
    with tracer.start_as_current_span("tasks.scan_folder") as span:
        db = SessionLocal()
        try:
            db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
            if not db_folder:
                return

            db_folder.status = "scanning"
            db_folder.scan_error = None
            db.commit()

            logger.info(f"Starting scan for folder: {db_folder.path}")
            
            # Scan filesystem
            photos_found = scan_directory(db_folder.path)
            span.set_attribute("photos.found_count", len(photos_found))
            
            for photo_path in photos_found:
                try:
                    # Basic photo record creation
                    photo_data = crud.process_photo_file(db, photo_path)
                    if photo_data:
                        # Trigger thumbnail and face detection for new photos
                        process_photo_assets_task.delay(photo_data.id)
                        photos_processed_counter.add(1)
                except Exception as e:
                    logger.error(f"Error processing photo {photo_path}: {e}")

            db_folder.last_scanned_at = datetime.now()
            db_folder.status = "idle"
            db.commit()
            logger.info(f"Finished scan for folder: {db_folder.path}")

        except Exception as e:
            logger.error(f"Error during scan task for folder {folder_id}: {e}")
            if db_folder:
                db_folder.status = "error"
                db_folder.scan_error = str(e)
                db.commit()
            span.record_exception(e)
        finally:
            db.close()

@celery_app.task
def process_photo_assets_task(photo_id: int):
    with tracer.start_as_current_span("tasks.process_photo_assets") as span:
        db = SessionLocal()
        try:
            db_photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
            if not db_photo:
                return

            # 1. Generate Thumbnails
            logger.info(f"Generating thumbnails for photo {photo_id}")
            thumbnails = generate_thumbnails(db_photo.physical_path, db_photo.checksum)
            db_photo.thumbnail_small = thumbnails.get("small")
            db_photo.thumbnail_large = thumbnails.get("large")
            db.commit()

            # 2. Face Detection
            logger.info(f"Detecting faces in photo {photo_id}")
            
            # Get ML settings
            model_name = crud.get_setting(db, "ml_model_name")
            min_score = crud.get_setting(db, "ml_min_score")
            threshold = crud.get_setting(db, "ml_recognition_threshold")
            
            model_name_val = model_name.value if model_name else "buffalo_l"
            min_score_val = float(min_score.value) if min_score else 0.7
            threshold_val = float(threshold.value) if threshold else 0.15

            span.set_attribute("ml.model", model_name_val)
            span.set_attribute("ml.min_score", min_score_val)

            # Run async detection in sync worker
            results = asyncio.run(detect_faces(
                db_photo.physical_path, 
                model_name=model_name_val, 
                min_score=min_score_val
            ))

            span.set_attribute("faces.detected_count", len(results))
            logger.info(f"Detected {len(results)} faces in photo {photo_id}")
            faces_detected_counter.add(len(results))

            for result in results:
                embedding = result.get("embedding")
                if isinstance(embedding, str):
                    try:
                        embedding = json.loads(embedding)
                    except Exception:
                        pass

                # Automated recognition: find similar existing person
                person_id = None
                if embedding is not None:
                    try:
                        person_id = crud.find_similar_person(db, embedding, threshold=threshold_val)
                        if person_id:
                            logger.info(f"Auto-assigned face in photo {photo_id} to person {person_id}")
                    except Exception as e:
                        logger.error(f"Error during automated recognition for photo {photo_id}: {e}")

                face_data = {
                    "photo_id": photo_id,
                    "person_id": person_id,
                    "bounding_box": result.get("boundingBox") or result.get("box"),
                    "embedding": embedding
                }
                db_face = crud.create_face(db, face_data)

                # Generate cropped thumbnail for this face
                try:
                    thumb_path = generate_face_thumbnail(
                        db_photo.physical_path,
                        db_face.id,
                        db_face.bounding_box
                    )
                    crud.update_face_thumbnail(db, db_face.id, thumb_path)
                except Exception as e:
                    logger.error(f"Error generating face thumbnail for face {db_face.id}: {e}")

            db.commit()

        except Exception as e:
            logger.error(f"Error processing assets for photo {photo_id}: {e}")
            span.record_exception(e)
        finally:
            db.close()

@celery_app.task
def re_run_recognition_task():
    logger.info(f"DEBUG: Tracer provider: {trace.get_tracer_provider()}")
    with tracer.start_as_current_span("tasks.re_run_recognition") as span:
        db = SessionLocal()
        try:
            # Mark as running
            crud.update_setting(db, "ml_re_recognition_running", "true")
            crud.update_setting(db, "ml_re_recognition_progress", "Starting...")
            
            # Fetch threshold from settings
            threshold = crud.get_setting(db, "ml_recognition_threshold")
            threshold_val = float(threshold.value) if threshold else 0.15
            span.set_attribute("ml.threshold", threshold_val)

            # Process ALL faces with embeddings to ensure thorough re-evaluation
            faces = db.query(models.Face).filter(
                models.Face.embedding != None # noqa: E711
            ).all()
            
            total = len(faces)
            span.set_attribute("faces.total_to_process", total)
            logger.info(f"Starting background re-recognition for {total} faces...")
            
            count = 0
            for i, face in enumerate(faces):
                with tracer.start_as_current_span("tasks.re_run_recognition.face"):
                    faces_processed_counter.add(1)
                    if face.embedding is not None:
                        # Attempt to find a match among ALREADY ASSIGNED faces
                        person_id = crud.find_similar_person(db, face.embedding, threshold=threshold_val)
                        
                        # Only update if we found a match and it is different or face was unassigned
                        if person_id and person_id != face.person_id:
                            face.person_id = person_id
                            count += 1
                            faces_recognized_counter.add(1)

                if (i + 1) % 100 == 0 or (i + 1) == total:
                    progress = f"Processed {i + 1}/{total} faces, {count} assignments updated..."
                    crud.update_setting(db, "ml_re_recognition_progress", progress)
                    logger.info(progress)
                    db.commit()
            
            db.commit()
            span.set_attribute("faces.updated_assignments", count)
            crud.update_setting(db, "ml_re_recognition_progress", f"Complete! Updated {count} assignments.")
            logger.info(f"Re-recognition complete. Updated {count} assignments.")
        except Exception as e:
            logger.error(f"Error during re-recognition task: {e}")
            span.record_exception(e)
            db.rollback()
        finally:
            crud.update_setting(db, "ml_re_recognition_running", "false")
            db.close()

@celery_app.task
def full_face_rescan_task():
    with tracer.start_as_current_span("tasks.full_face_rescan") as span:
        db = SessionLocal()
        try:
            crud.update_setting(db, "ml_full_rescan_running", "true")
            crud.update_setting(db, "ml_full_rescan_progress", "Clearing existing faces...")
            
            # 1. Clear all existing faces (Danger Zone!)
            db.query(models.Face).delete()
            db.commit()
            
            # 2. Get all photo IDs
            photo_ids = [p.id for p in db.query(models.Photo.id).all()]
            total = len(photo_ids)
            span.set_attribute("photos.total", total)
            
            for i, photo_id in enumerate(photo_ids):
                process_photo_assets_task(photo_id) # Run synchronously in this task
                
                if (i + 1) % 10 == 0 or (i + 1) == total:
                    progress = f"Rescanned {i + 1}/{total} photos..."
                    crud.update_setting(db, "ml_full_rescan_progress", progress)
                    db.commit()
            
            crud.update_setting(db, "ml_full_rescan_progress", "Complete!")
        except Exception as e:
            logger.error(f"Error during full face rescan: {e}")
            span.record_exception(e)
            db.rollback()
        finally:
            crud.update_setting(db, "ml_full_rescan_running", "false")
            db.close()

@celery_app.task
def smart_sync_folder_task(folder_id: int):
    """Automatically creates albums based on folder names and keeps them in sync."""
    with tracer.start_as_current_span("tasks.smart_sync_folder") as span:
        db = SessionLocal()
        try:
            folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
            if not folder:
                return

            # Find or create smart albums for this folder
            # For simplicity, we just ensure one album exists for the folder name
            folder_name = folder.path.split("/")[-1] or "Photos"
            
            # Look for albums linked to this folder
            smart_albums = db.query(models.Album).filter(
                models.Album.linked_folder_id == folder.id,
                models.Album.is_smart_sync == True # noqa: E712
            ).all()

            if not smart_albums:
                # Create default smart album
                album = models.Album(
                    name=folder_name,
                    description=f"Smart synced from {folder.path}",
                    is_smart_sync=True,
                    linked_folder_id=folder.id
                )
                db.add(album)
                db.commit()
                db.refresh(album)
                smart_albums = [album]

            # Sync photos (add all photos from this folder to its smart albums)
            photos = db.query(models.Photo).filter(models.Photo.physical_path.like(f"{folder.path}%")).all()
            for album in smart_albums:
                for photo in photos:
                    if photo not in album.photos:
                        album.photos.append(photo)
            
            db.commit()
        except Exception as e:
            logger.error(f"Error in smart sync for folder {folder_id}: {e}")
            span.record_exception(e)
        finally:
            db.close()
