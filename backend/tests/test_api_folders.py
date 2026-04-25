import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine, get_db
from app import models, auth

client = TestClient(app)

# Override dependencies for all tests in this file
def get_db_override():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_dependencies():
    # Mock auth to allow all requests
    mock_user = models.User(username="admin", role=models.UserRole.ADMIN, is_active=True)
    app.dependency_overrides[auth.requires_admin] = lambda: mock_user
    app.dependency_overrides[auth.requires_user] = lambda: mock_user
    app.dependency_overrides[auth.requires_viewer] = lambda: mock_user
    app.dependency_overrides[get_db] = get_db_override
    
    # Initialize DB
    Base.metadata.create_all(bind=engine)
    
    yield
    
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)

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
    p1 = models.Photo(physical_path="/photos/2024/trip1/a.jpg", timestamp=datetime.now(), checksum="c1")
    p2 = models.Photo(physical_path="/photos/2024/trip2/b.jpg", timestamp=datetime.now(), checksum="c2")
    db_session.add(p1)
    db_session.add(p2)
    db_session.commit()

    response = client.get("/api/folders/tree")
    assert response.status_code == 200
    tree = response.json()
    assert any(n["name"] == "photos" for n in tree)

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

def test_delete_folder_precise_matching(db_session):
    from app import models
    from datetime import datetime
    
    # Create folder /a and /ab
    client.post("/api/folders/", json={"path": "/a"})
    client.post("/api/folders/", json={"path": "/ab"})
    
    # Add photo to /a and /ab
    p1 = models.Photo(physical_path="/a/1.jpg", timestamp=datetime.now(), checksum="c1")
    p2 = models.Photo(physical_path="/ab/2.jpg", timestamp=datetime.now(), checksum="c2")
    db_session.add_all([p1, p2])
    db_session.commit()
    
    folders = client.get("/api/folders/").json()
    id_a = next(f["id"] for f in folders if f["path"] == "/a")
    
    # Delete /a
    client.delete(f"/api/folders/{id_a}")
    
    # Verify photo in /a is gone, but /ab/2.jpg remains
    assert db_session.query(models.Photo).filter(models.Photo.physical_path == "/a/1.jpg").count() == 0
    assert db_session.query(models.Photo).filter(models.Photo.physical_path == "/ab/2.jpg").count() == 1
