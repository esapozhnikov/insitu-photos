import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models, auth, crud, schemas
from app.database import Base

# Setup in-memory sqlite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_password_hashing():
    pwd = "secret_password"
    hashed = auth.get_password_hash(pwd)
    assert auth.verify_password(pwd, hashed) is True
    assert auth.verify_password("wrong", hashed) is False

def test_user_crud(db):
    user_in = schemas.UserCreate(username="testuser", password="testpassword", role=models.UserRole.USER)
    user = crud.create_user(db, user_in)
    assert user.username == "testuser"
    assert user.role == models.UserRole.USER
    assert auth.verify_password("testpassword", user.hashed_password)
    
    found_user = crud.get_user_by_username(db, "testuser")
    assert found_user.id == user.id
