from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database import get_db
from ... import crud, config, models, auth
from ...tasks import re_run_recognition_task, full_face_rescan_task
from ...telemetry import tracer
import os
import shutil
import logging

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(auth.requires_admin)])

@router.post("/reset")
def reset_library(db: Session = Depends(get_db)):
    with tracer.start_as_current_span("admin.reset_library"):
        # 1. Reset Database
        crud.reset_library(db)
        
        # 2. Clear Thumbnails
        cache_root = config.settings.cache_root
        small_dir = os.path.join(cache_root, "thumbnails", "small")
        large_dir = os.path.join(cache_root, "thumbnails", "large")
        faces_dir = os.path.join(cache_root, "faces")
        
        for directory in [small_dir, large_dir, faces_dir]:
            if os.path.exists(directory):
                for filename in os.listdir(directory):
                    file_path = os.path.join(directory, filename)
                    try:
                        if os.path.isfile(file_path) or os.path.islink(file_path):
                            os.unlink(file_path)
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path)
                    except Exception as e:
                        logger.error(f'Failed to delete {file_path}. Reason: {e}')
                        
        return {"message": "Library reset successful"}

@router.post("/reset-background-tasks")
def reset_background_tasks(db: Session = Depends(get_db)):
    with tracer.start_as_current_span("admin.reset_background_tasks"):
        crud.update_setting(db, "ml_re_recognition_running", "false")
        crud.update_setting(db, "ml_full_rescan_running", "false")
        crud.update_setting(db, "ml_re_recognition_progress", "Reset by user")
        crud.update_setting(db, "ml_full_rescan_progress", "Reset by user")
        
        # Also reset any folder scan statuses
        db.query(models.Folder).update({models.Folder.status: "idle"})
        db.commit()
        
        return {"message": "Background task statuses reset successfully"}

@router.post("/re-run-recognition")
def re_run_recognition(db: Session = Depends(get_db)):
    # Check if already running
    is_running = crud.get_setting(db, "ml_re_recognition_running")
    if is_running and is_running.value == "true":
        return {"message": "Re-recognition is already running in background."}
    
    # Mark as starting (task will set it to true again, but this helps immediate feedback)
    crud.update_setting(db, "ml_re_recognition_running", "true")
    crud.update_setting(db, "ml_re_recognition_progress", "Queuing task...")
    
    # Queue task
    re_run_recognition_task.delay()
    
    return {"message": "Re-recognition task started in background."}

@router.post("/full-face-rescan")
def full_face_rescan(db: Session = Depends(get_db)):
    # Check if already running
    is_running = crud.get_setting(db, "ml_full_rescan_running")
    if is_running and is_running.value == "true":
        return {"message": "Full rescan is already running in background."}
    
    # Mark as starting
    crud.update_setting(db, "ml_full_rescan_running", "true")
    crud.update_setting(db, "ml_full_rescan_progress", "Queuing rescan...")
    
    # Queue task
    full_face_rescan_task.delay()
            
    return {"message": "Full facial rescan started in background."}
@router.get("/browse")
def browse_directory(path: str = None):
    photo_root = os.path.normpath(config.settings.photo_root)
    
    if not path:
        target_path = photo_root
    else:
        # Normalize and ensure it's within photo_root
        target_path = os.path.normpath(path)
        if not target_path.startswith(photo_root):
            target_path = photo_root

    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Path not found")
        
    try:
        items = os.listdir(target_path)
        folders = []
        for item in items:
            full_path = os.path.join(target_path, item)
            if os.path.isdir(full_path) and not item.startswith('.'):
                folders.append(item)
        
        return {
            "current_path": target_path,
            "folders": sorted(folders),
            "parent_path": os.path.dirname(target_path) if target_path != photo_root else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
