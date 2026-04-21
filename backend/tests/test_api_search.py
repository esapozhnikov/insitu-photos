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

def test_search_photos_empty():
    response = client.post("/api/photos/search", json={})
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_album():
    response = client.post("/api/albums/", json={"name": "Test Album", "description": "A test album"})
    assert response.status_code == 200
    assert response.json()["name"] == "Test Album"
