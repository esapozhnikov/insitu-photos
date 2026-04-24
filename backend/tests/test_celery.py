from app.tasks_test import add
from app.worker import reset_stuck_states
from app.database import SessionLocal
from app import models, crud

def test_celery_task_delay():
    # Note: This tests the task function directly
    result = add(4, 4)
    assert result == 8

def test_auto_reset_on_worker_startup():
    db = SessionLocal()
    # Ensure test folder exists or create it
    folder = db.query(models.Folder).filter(models.Folder.path == "/test/stuck").first()
    if not folder:
        folder = models.Folder(path="/test/stuck", status="scanning", is_monitored=True)
        db.add(folder)
    else:
        folder.status = "scanning"
    db.commit()
    db.refresh(folder)

    # Create stuck ML settings
    crud.update_setting(db, "ml_re_recognition_running", "true")
    crud.update_setting(db, "ml_full_rescan_running", "true")

    # Trigger reset
    reset_stuck_states(None)

    # Verify changes
    updated_folder = db.query(models.Folder).filter(models.Folder.id == folder.id).first()
    assert updated_folder.status == "idle"

    assert crud.get_setting(db, "ml_re_recognition_running").value == "false"
    assert crud.get_setting(db, "ml_full_rescan_running").value == "false"

    # Cleanup
    db.delete(updated_folder)
    db.commit()
    db.close()

def test_celery_task_timeouts_configured():
    from app.worker import celery_app
    # Global defaults from worker.py
    assert celery_app.conf.task_soft_time_limit == 3600
    assert celery_app.conf.task_time_limit == 3900

def test_scan_missing_faces_task_exists():
    from app.tasks import scan_missing_faces_task
    assert scan_missing_faces_task is not None
    assert hasattr(scan_missing_faces_task, 'delay')
