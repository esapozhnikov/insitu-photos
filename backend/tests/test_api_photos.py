from fastapi.testclient import TestClient
from app.main import app
import pytest
from app.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

@pytest.fixture
def db_session():
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_get_photos_empty():
    response = client.get("/api/photos/")
    assert response.status_code == 200
    assert response.json() == []

def test_search_photos_by_path(db_session):
    # Setup: Create a photo with a specific path
    from app import models
    from datetime import datetime
    from app.database import SessionLocal
    db = SessionLocal()
    p1 = models.Photo(physical_path="/data/photos/2024/summer/img1.jpg", timestamp=datetime.now(), checksum="abc1")
    p2 = models.Photo(physical_path="/data/photos/2023/winter/img2.jpg", timestamp=datetime.now(), checksum="abc2")
    db.add(p1)
    db.add(p2)
    db.commit()

    # Test filtering
    response = client.post("/api/photos/search", json={"folder_path": "/data/photos/2024"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["physical_path"] == "/data/photos/2024/summer/img1.jpg"
    db.close()
