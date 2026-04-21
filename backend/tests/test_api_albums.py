import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app import models
from datetime import datetime

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_create_album():
    response = client.post("/api/albums/", json={"name": "Test Album", "description": "Test Desc"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Album"
    assert data["is_smart_sync"] is False

def test_update_album_smart_sync():
    # 1. Create album
    create_resp = client.post("/api/albums/", json={"name": "Smart Album"})
    album_id = create_resp.json()["id"]
    
    # 2. Create a folder to link to
    folder_resp = client.post("/api/folders/", json={"path": "/photos/vacation"})
    folder_id = folder_resp.json()["id"]
    
    # 3. Update album with smart sync settings
    update_resp = client.patch(f"/api/albums/{album_id}", json={
        "is_smart_sync": True,
        "linked_folder_id": folder_id
    })
    assert update_resp.status_code == 200
    
    # 4. Verify updates
    get_resp = client.get("/api/albums/")
    album = next(a for a in get_resp.json() if a["id"] == album_id)
    assert album["is_smart_sync"] is True
    assert album["linked_folder_id"] == folder_id

def test_smart_sync_logic():
    from app.tasks import index_folder_task
    from unittest.mock import patch
    
    db = SessionLocal()
    
    # 1. Setup: Folder, Smart Album, and Global Setting
    folder_path = "/photos/sync_test"
    db_folder = models.Folder(path=folder_path, is_monitored=True)
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    
    db_album = models.Album(name="Auto Album", is_smart_sync=True, linked_folder_id=db_folder.id)
    db.add(db_album)
    
    db_setting = models.Setting(key="smart_sync_enabled", value="true")
    db.add(db_setting)
    db.commit()
    
    # 2. Mock scanner to return a "new" photo in that folder
    photo_path = "/photos/sync_test/new_photo.jpg"
    
    with patch("app.tasks.scan_directory", return_value=[photo_path]), \
         patch("app.tasks.get_checksum", return_value="fake_checksum"), \
         patch("app.tasks.extract_metadata", return_value={"timestamp": datetime.now(), "camera_make": "Test"}), \
         patch("app.tasks.generate_thumbnails_task.delay"), \
         patch("app.tasks.process_faces_task.delay"):
        
        # 3. Run the indexing task
        index_folder_task(folder_path)
        
    # 4. Verify the photo was added to the album automatically
    db.expire_all()
    photo = db.query(models.Photo).filter(models.Photo.physical_path == photo_path).first()
    assert photo is not None
    
    album = db.query(models.Album).filter(models.Album.id == db_album.id).first()
    assert photo in album.photos
    
    db.close()
