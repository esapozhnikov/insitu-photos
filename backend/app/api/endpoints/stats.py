from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
import sqlalchemy as sa
from ...database import get_db
from ... import models, schemas, auth
from ... import crud

router = APIRouter(dependencies=[Depends(auth.requires_user)])

@router.get("/", response_model=schemas.LibraryStats)
def get_stats(db: Session = Depends(get_db)):
    # Calculate photos by year
    year_results = db.query(
        extract('year', models.Photo.timestamp).label('year'),
        func.count(models.Photo.id)
    ).group_by('year').all()
    
    photos_by_year = {str(int(y)): count for y, count in year_results if y is not None}

    return {
        "total_photos": db.query(models.Photo).count(),
        "scanned_photos": db.query(models.Photo).filter(models.Photo.is_face_scanned == sa.true()).count(),
        "total_folders": db.query(models.Folder).count(),
        "total_albums": db.query(models.Album).count(),
        "total_faces": db.query(models.Face).count(),
        "total_people": db.query(models.Person).count(),
        "identified_faces": db.query(models.Face).filter(models.Face.person_id.isnot(None)).count(),
        "photos_by_year": photos_by_year,
        "folders": db.query(models.Folder).all()
    }

@router.get("/status", response_model=schemas.SystemStatus)
def get_system_status(db: Session = Depends(get_db)):
    scanning_folders = db.query(models.Folder).filter(models.Folder.status == "scanning").all()
    
    is_recognizing = crud.get_setting(db, "ml_re_recognition_running")
    is_rescanning = crud.get_setting(db, "ml_full_rescan_running")
    
    re_recognition_progress = crud.get_setting(db, "ml_re_recognition_progress")
    full_rescan_progress = crud.get_setting(db, "ml_full_rescan_progress")
    
    # Add detailed counts for better diagnostics
    db.query(models.Face).filter(
        models.Face.person_id.is_(None),
        models.Face.embedding.isnot(None)
    ).count()
    
    unassigned_without_embeddings = db.query(models.Face).filter(
        models.Face.person_id.is_(None),
        models.Face.embedding.is_(None)
    ).count()
    
    return {
        "is_scanning": len(scanning_folders) > 0,
        "is_processing_faces": is_rescanning.value == "true" if is_rescanning else False,
        "is_recognizing_faces": is_recognizing.value == "true" if is_recognizing else False,
        "queue_size": unassigned_without_embeddings, # Faces waiting for detection/embedding
        "scanning_folders": [f.path for f in scanning_folders],
        "re_recognition_progress": re_recognition_progress.value if re_recognition_progress else None,
        "full_rescan_progress": full_rescan_progress.value if full_rescan_progress else None
    }
