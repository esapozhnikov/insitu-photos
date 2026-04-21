import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_add_folder():
    response = client.post("/api/folders/", json={"path": "/photos/test"})
    assert response.status_code == 200
    assert response.json()["path"] == "/photos/test"

def test_add_duplicate_folder():
    client.post("/api/folders/", json={"path": "/photos/duplicate"})
    response = client.post("/api/folders/", json={"path": "/photos/duplicate"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Folder already indexed"

def test_get_folder_tree(db_session):
    from app import models
    from datetime import datetime
    from app.database import SessionLocal
    db = SessionLocal()
    p1 = models.Photo(physical_path="/photos/2024/trip1/a.jpg", timestamp=datetime.now(), checksum="c1")
    p2 = models.Photo(physical_path="/photos/2024/trip2/b.jpg", timestamp=datetime.now(), checksum="c2")
    db.add(p1)
    db.add(p2)
    db.commit()

    response = client.get("/api/folders/tree")
    assert response.status_code == 200
    tree = response.json()
    # Expect: [{name: 'photos', path: 'photos', children: [{name: '2024', path: 'photos/2024', children: [...]}]}]
    assert any(n["name"] == "photos" for n in tree)
    db.close()

def test_delete_folder(db_session):
    # Add a folder
    client.post("/api/folders/", json={"path": "/photos/to-delete"})
    folder = client.get("/api/folders/").json()[0]
    folder_id = folder["id"]
    
    # Delete it
    response = client.delete(f"/api/folders/{folder_id}")
    assert response.status_code == 200
    
    # Verify it's gone
    folders = client.get("/api/folders/").json()
    assert not any(f["id"] == folder_id for f in folders)
