import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app import models, crud, schemas

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_rbac.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Create one user of each role
        crud.create_user(db, schemas.UserCreate(username="admin", password="password", role=models.UserRole.ADMIN))
        crud.create_user(db, schemas.UserCreate(username="user", password="password", role=models.UserRole.USER))
        crud.create_user(db, schemas.UserCreate(username="viewer", password="password", role=models.UserRole.VIEWER))
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def get_token(client, username):
    response = client.post("/api/auth/login", json={"username": username, "password": "password"})
    return response.json()["access_token"]

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_viewer_access(client):
    token = get_token(client, "viewer")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Can view albums
    response = client.get("/api/albums/", headers=headers)
    assert response.status_code == 200
    
    # CANNOT view photos (Timeline)
    response = client.get("/api/photos/", headers=headers)
    assert response.status_code == 403
    
    # CANNOT view people
    response = client.get("/api/people/", headers=headers)
    assert response.status_code == 403
    
    # CANNOT create album
    response = client.post("/api/albums/", json={"name": "New Album"}, headers=headers)
    assert response.status_code == 403

def test_user_access(client):
    token = get_token(client, "user")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Can view photos
    response = client.get("/api/photos/", headers=headers)
    assert response.status_code == 200
    
    # Can create album
    response = client.post("/api/albums/", json={"name": "User Album"}, headers=headers)
    assert response.status_code == 200
    
    # CANNOT add folder
    response = client.post("/api/folders/", json={"path": "/some/path"}, headers=headers)
    assert response.status_code == 403
    
    # CANNOT access settings
    response = client.get("/api/settings/", headers=headers)
    assert response.status_code == 403

def test_admin_access(client):
    token = get_token(client, "admin")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Can add folder
    response = client.post("/api/folders/", json={"path": "/tmp/test_photos"}, headers=headers)
    assert response.status_code == 200
    
    # Can access settings
    response = client.get("/api/settings/", headers=headers)
    assert response.status_code == 200
    
    # Can manage users
    response = client.get("/api/users/", headers=headers)
    assert response.status_code == 200
