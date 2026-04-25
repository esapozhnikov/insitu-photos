import os

# Set environment variables for Pydantic Settings before importing app components
os.environ["TEST_MODE"] = "true"
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:///./test.db"
if not os.environ.get("REDIS_URL"):
    os.environ["REDIS_URL"] = "redis://localhost:6379"
if not os.environ.get("PHOTO_ROOT"):
    os.environ["PHOTO_ROOT"] = "./temp_photos"
if not os.environ.get("CACHE_ROOT"):
    os.environ["CACHE_ROOT"] = "./temp_cache"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app

# Use environment variable for test DB, fallback to SQLite for local safety
# Use connect_args={"check_same_thread": False} for sqlite
SQLALCHEMY_DATABASE_URL = os.environ["DATABASE_URL"]

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    from fastapi.testclient import TestClient
    yield TestClient(app)
    # Don't delete overrides here if you want it to persist for the test duration
    # But usually it's fine as the fixture is used by the test
    # Actually, deleting it here might be too early if the client is used across multiple requests in one test?
    # No, yield will return the client, and when the test is done, it will resume here.
    del app.dependency_overrides[get_db]
