import asyncio
import json
import logging
import os
import shutil
from datetime import datetime
from opentelemetry import trace
from .worker import celery_app
from .database import SessionLocal
from .utils.scanner import scan_directory
from .utils.metadata import get_checksum, extract_metadata
from .utils.thumbnails import generate_thumbnails, generate_face_thumbnail
from .utils.ml import detect_faces
from .telemetry import tracer, meter
from . import crud, models, config

logger = logging.getLogger(__name__)

# ML Performance Counters
faces_detected_counter = meter.create_counter(
    "ml.faces_detected",
    unit="1",
    description="Number of faces detected in photos"
)
faces_recognized_counter = meter.create_counter(
    "ml.faces_recognized",
    unit="1",
    description="Number of faces assigned to a person"
)
faces_processed_counter = meter.create_counter(
    "ml.faces_processed",
    unit="1",
    description="Total number of faces processed during ML tasks"
)

@celery_app.task
def generate_thumbnails_task(photo_id: int):
    with tracer.start_as_current_span("tasks.generate_thumbnails") as span:
        span.set_attribute("photo.id", photo_id)
        db = SessionLocal()
        try:
            db_photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
            if db_photo:
                is_video = db_photo.media_type == models.MediaType.video
                thumbnails = generate_thumbnails(db_photo.physical_path, db_photo.checksum, is_video=is_video)
                crud.update_photo_thumbnails(db, photo_id, thumbnails)
        except Exception as e:
            logger.error(f"Error in generate_thumbnails_task for photo {photo_id}: {e}")
            span.record_exception(e)
        finally:
            db.close()

@celery_app.task
def process_faces_task(photo_id: int):
    with tracer.start_as_current_span("tasks.process_faces") as span:
        span.set_attribute("photo.id", photo_id)
        db = SessionLocal()
        try:
            db_photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
            if not db_photo:
                logger.warning(f"Photo {photo_id} not found for face processing")
                return

            if db_photo.media_type == models.MediaType.video:
                logger.info(f"Skipping face processing for video {photo_id}")
                db_photo.is_face_scanned = True
                db.commit()
                return

            # Fetch ML settings
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
                    logger.error(f"Error generating face thumbnail for {db_face.id}: {e}")
            
            # Mark photo as face scanned
            db_photo.is_face_scanned = True
            db.commit()
        except Exception as e:
            logger.error(f"Error in process_faces_task for photo {photo_id}: {e}")
            span.record_exception(e)
        finally:
            db.close()

@celery_app.task
def re_run_recognition_task():
    logger.info(f"DEBUG: Tracer provider: {trace.get_tracer_provider()}")
    with tracer.start_as_current_span("tasks.re_run_recognition") as span:
        db = SessionLocal()
        job = crud.create_background_job(db, "Re-run Recognition")
        try:
            # Mark as running
            crud.update_setting(db, "ml_re_recognition_running", "true")
            crud.update_setting(db, "ml_re_recognition_progress", "Starting...")
            
            # Fetch threshold from settings
            threshold = crud.get_setting(db, "ml_recognition_threshold")
            threshold_val = float(threshold.value) if threshold else 0.15
            span.set_attribute("ml.threshold", threshold_val)

            faces = db.query(models.Face).filter(
                
                models.Face.embedding != None # noqa: E711
            ).all()
            
            total = len(faces)
            span.set_attribute("faces.total_unassigned", total)
            logger.info(f"Starting background re-recognition for {total} faces...")
            
            count = 0
            for i, face in enumerate(faces):
                # Create a small sub-span for each face to track individual performance
                # and allow the span metrics to calculate "faces per second"
                with tracer.start_as_current_span("tasks.re_run_recognition.face"):
                    faces_processed_counter.add(1)
                    if face.embedding is not None:
                        person_id = crud.find_similar_person(db, face.embedding, threshold=threshold_val)
                        if person_id:
                            face.person_id = person_id
                            count += 1
                            faces_recognized_counter.add(1)

                if (i + 1) % 100 == 0 or (i + 1) == total:
                    progress_pct = int(((i + 1) / total) * 100) if total > 0 else 0
                    progress_text = f"Processed {i + 1}/{total} faces, {count} assigned so far..."
                    crud.update_setting(db, "ml_re_recognition_progress", progress_text)
                    crud.update_background_job(db, job.id, progress_percent=progress_pct, progress_text=progress_text)
                    logger.info(progress_text)
                    db.commit() # Commit periodically to show progress
            
            db.commit()
            span.set_attribute("faces.newly_assigned", count)
            final_text = f"Complete! Assigned {count} faces."
            crud.update_setting(db, "ml_re_recognition_progress", final_text)
            crud.update_background_job(db, job.id, status="completed", progress_percent=100, progress_text=final_text)
            logger.info(f"Re-recognition complete. Assigned {count} faces.")
        except Exception as e:
            logger.error(f"Error during re-recognition task: {e}")
            span.record_exception(e)
            crud.update_background_job(db, job.id, status="failed", error_message=str(e))
            db.rollback()
        finally:
            crud.update_setting(db, "ml_re_recognition_running", "false")
            db.close()

@celery_app.task(time_limit=3600*24, soft_time_limit=3600*23) # 24 hours
def full_face_rescan_task():
    with tracer.start_as_current_span("tasks.full_face_rescan") as span:
        db = SessionLocal()
        job = crud.create_background_job(db, "Full Facial Rescan")
        try:
            # Mark as running
            crud.update_setting(db, "ml_full_rescan_running", "true")
            crud.update_setting(db, "ml_full_rescan_progress", "Clearing database...")
            crud.update_background_job(db, job.id, progress_text="Clearing database and thumbnails...")

            # Reset scanning status for all photos
            db.query(models.Photo).update({models.Photo.is_face_scanned: False})
            db.commit()

            # 1. Clear database face/person data
            crud.reset_faces(db)
            logger.info("Cleared all face and person records for full rescan")
            
            # 2. Clear face thumbnails
            cache_root = config.settings.cache_root
            faces_dir = os.path.join(cache_root, "faces")
            if os.path.exists(faces_dir):
                for filename in os.listdir(faces_dir):
                    file_path = os.path.join(faces_dir, filename)
                    try:
                        if os.path.isfile(file_path) or os.path.islink(file_path):
                            os.unlink(file_path)
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path)
                    except Exception as e:
                        logger.error(f'Failed to delete {file_path}. Reason: {e}')

            # 3. Queue face processing for all items
            media_items = db.query(models.Photo).all()
            total = len(media_items)
            span.set_attribute("items.count", total)
            logger.info(f"Queuing face processing for {total} items...")
            
            for i, item in enumerate(media_items):
                process_faces_task.delay(item.id)
                if (i + 1) % 100 == 0 or (i + 1) == total:
                    progress_pct = int(((i + 1) / total) * 100) if total > 0 else 0
                    progress_text = f"Queuing: {i + 1}/{total} items..."
                    crud.update_setting(db, "ml_full_rescan_progress", progress_text)
                    crud.update_background_job(db, job.id, progress_percent=progress_pct, progress_text=progress_text)
                    db.commit()

            final_text = f"Processing {total} items in background..."
            crud.update_setting(db, "ml_full_rescan_progress", final_text)
            crud.update_background_job(db, job.id, status="completed", progress_percent=100, progress_text=final_text)
            logger.info(f"Full facial rescan queuing complete for {total} photos.")
        except Exception as e:
            logger.error(f"Error during full rescan task: {e}")
            span.record_exception(e)
            crud.update_background_job(db, job.id, status="failed", error_message=str(e))
        finally:
            # NOTE: We set this to false when queuing is done. 
            # The individual process_faces_tasks will continue.
            crud.update_setting(db, "ml_full_rescan_running", "false")
            db.close()

@celery_app.task
def scan_missing_faces_task():
    with tracer.start_as_current_span("tasks.scan_missing_faces") as span:
        db = SessionLocal()
        job = crud.create_background_job(db, "Scan Missing Faces")
        try:
            crud.update_setting(db, "ml_full_rescan_running", "true")
            crud.update_setting(db, "ml_full_rescan_progress", "Searching for missing scans...")
            crud.update_background_job(db, job.id, progress_text="Searching for missing scans...")

            photos = db.query(models.Photo).filter(models.Photo.is_face_scanned == False).all() # noqa: E712
            total = len(photos)
            span.set_attribute("photos.missing_count", total)
            logger.info(f"Queuing face processing for {total} unscanned photos...")
            
            if total == 0:
                 crud.update_background_job(db, job.id, status="completed", progress_percent=100, progress_text="No missing scans found.")
                 return

            for i, photo in enumerate(photos):
                process_faces_task.delay(photo.id)
                if (i + 1) % 100 == 0 or (i + 1) == total:
                    progress_pct = int(((i + 1) / total) * 100) if total > 0 else 0
                    progress_text = f"Queuing missing: {i + 1}/{total} photos..."
                    crud.update_setting(db, "ml_full_rescan_progress", progress_text)
                    crud.update_background_job(db, job.id, progress_percent=progress_pct, progress_text=progress_text)
                    db.commit()

            final_text = f"Processing {total} missing scans in background..."
            crud.update_setting(db, "ml_full_rescan_progress", final_text)
            crud.update_background_job(db, job.id, status="completed", progress_percent=100, progress_text=final_text)
            logger.info(f"Scan for missing faces queuing complete for {total} photos.")
        except Exception as e:
            logger.error(f"Error during scan_missing_faces task: {e}")
            span.record_exception(e)
            crud.update_background_job(db, job.id, status="failed", error_message=str(e))
        finally:
            crud.update_setting(db, "ml_full_rescan_running", "false")
            db.close()

@celery_app.task(time_limit=3600*24, soft_time_limit=3600*23) # 24 hours
def index_folder_task(folder_path: str):
    with tracer.start_as_current_span("tasks.index_folder") as span:
        span.set_attribute("folder.path", folder_path)
        logger.info(f"Starting index_folder_task for {folder_path}")
        db = SessionLocal()
        folder_id = None
        job = crud.create_background_job(db, f"Index Folder: {os.path.basename(folder_path)}")
        try:
            # Check if this folder is linked to any Smart Sync albums
            folder = crud.get_folder_by_path(db, folder_path)
            if folder:
                folder_id = folder.id
                folder.status = "scanning"
                folder.scan_error = None # Clear previous error
                db.commit()

            smart_albums = []
            if folder:
                # Check if global smart sync is enabled
                is_enabled = crud.get_setting(db, "smart_sync_enabled")
                if is_enabled and is_enabled.value.lower() == "true":
                    smart_albums = db.query(models.Album).filter(
                        models.Album.linked_folder_id == folder.id,
                        models.Album.is_smart_sync
                    ).all()

            crud.update_background_job(db, job.id, progress_text="Scanning directory...")
            media_files = scan_directory(folder_path)
            span.set_attribute("media.count", len(media_files))
            logger.info(f"Found {len(media_files)} items in {folder_path}")

            if folder_id:
                try:
                    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
                    if folder:
                        folder.total_files = len(media_files)
                        folder.processed_files = 0
                        db.commit()
                except Exception as e:
                    logger.error(f"Error updating folder total_files: {e}")

            total = len(media_files)
            for i, path in enumerate(media_files):
                try:
                    db_photo = crud.get_photo_by_path(db, path)
                    if not db_photo:
                        with tracer.start_as_current_span("tasks.process_new_photo") as photo_span:
                            photo_span.set_attribute("file.path", path)
                            checksum = get_checksum(path)
                            metadata = extract_metadata(path)
                            
                            if metadata.get("is_live_photo_video"):
                                continue

                            # Remove 'people' as it's not a field in the Photo model
                            metadata.pop("people", None)
                            metadata.pop("is_live_photo_video", None)
                            
                            photo_data = {
                                "physical_path": path,
                                "checksum": checksum,
                                **metadata
                            }
                            db_photo = crud.create_photo(db, photo_data)
                            generate_thumbnails_task.delay(db_photo.id)
                            process_faces_task.delay(db_photo.id)

                    # Ensure photo is in smart albums
                    for album in smart_albums:
                        if db_photo not in album.photos:
                            album.photos.append(db_photo)

                    # Periodically commit to show progress and keep memory low
                    if (i + 1) % 100 == 0 or (i + 1) == total:
                        progress_pct = int(((i + 1) / total) * 100) if total > 0 else 0
                        progress_text = f"Processed {i + 1}/{total} media files..."
                        
                        if folder_id:
                            folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
                            if folder:
                                folder.processed_files = i + 1
                        
                        crud.update_background_job(db, job.id, progress_percent=progress_pct, progress_text=progress_text)
                        db.commit()
                        logger.info(progress_text)
                except Exception as e:
                    logger.error(f"Error processing photo {path}: {e}")
                    continue

            db.commit()
            crud.update_background_job(db, job.id, status="completed", progress_percent=100, progress_text=f"Finished processing {len(media_files)} media files.")
            logger.info(f"Finished processing all {len(media_files)} media files in {folder_path}")
        except Exception as e:
            error_msg = str(e)
            span.record_exception(e)
            logger.error(f"Critical error during index_folder_task for {folder_path}: {error_msg}")
            crud.update_background_job(db, job.id, status="failed", error_message=error_msg)
            if folder_id:
                try:
                    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
                    if folder:
                        folder.scan_error = error_msg
                        db.commit()
                except Exception:
                    pass
        finally:
            if folder_id:
                try:
                    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
                    if folder:
                        folder.status = "idle"
                        folder.last_scanned_at = datetime.utcnow()
                        db.commit()
                        logger.info(f"Folder {folder_id} status reset to idle")
                except Exception as e:
                    logger.error(f"Error resetting folder status: {e}")
            db.close()

