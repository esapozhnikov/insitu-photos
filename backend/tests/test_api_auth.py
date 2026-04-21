import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app import models, crud, schemas

# Setup in-memory sqlite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_api.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Create test user
        user_in = schemas.UserCreate(username="testuser", password="testpassword", role=models.UserRole.USER)
        crud.create_user(db, user_in)
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

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

def test_login_success(client):
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "testpassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "refresh_token" in response.cookies

def test_login_failure(client):
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_refresh_token(client):
    # First login to get a cookie
    login_response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "testpassword"}
    )
    assert login_response.status_code == 200
    
    # Now refresh
    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 200
    data = refresh_response.json()
    assert "access_token" in data
    
def test_logout(client):
    # First login
    client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "testpassword"}
    )
    
    # Logout
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert "refresh_token" not in response.cookies or response.cookies.get("refresh_token") == ""
