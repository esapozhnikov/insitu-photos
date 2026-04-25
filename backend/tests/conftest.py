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
if not os.environ.get("SECRET_KEY"):
    os.environ["SECRET_KEY"] = "test_secret_key_for_ci"

import pytest
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app

# Use environment variable for test DB, fallback to SQLite for local safety
SQLALCHEMY_DATABASE_URL = os.environ["DATABASE_URL"]

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

@event.listens_for(Base.metadata, "before_create")
def create_vector_extension(target, connection, **kw):
    """Ensure vector extension is created on PostgreSQL, ignore on SQLite."""
    if connection.dialect.name == "postgresql":
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database_session():
    # Session-level setup
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
    Base.metadata.create_all(bind=engine)
    yield
    # Base.metadata.drop_all(bind=engine) # Optional: don't drop if you want to inspect

@pytest.fixture(autouse=True)
def auto_mock_auth(request):
    """Automatically mock auth for all tests except auth/rbac specific tests."""
    from app import auth, models
    
    # Check if we should skip mocking for this test module
    module_name = request.module.__name__
    if "test_rbac" in module_name or "test_api_auth" in module_name or "test_auth_query" in module_name:
        yield
        return

    mock_user = models.User(username="admin", role=models.UserRole.ADMIN, is_active=True)
    
    # Save original overrides if any
    original_overrides = app.dependency_overrides.copy()
    
    app.dependency_overrides[auth.requires_admin] = lambda: mock_user
    app.dependency_overrides[auth.requires_user] = lambda: mock_user
    app.dependency_overrides[auth.requires_viewer] = lambda: mock_user
    
    yield
    
    # Restore original overrides
    app.dependency_overrides = original_overrides

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
    
    # Save original get_db override
    original_get_db = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c
    
    # Restore original get_db override
    if original_get_db:
        app.dependency_overrides[get_db] = original_get_db
    else:
        app.dependency_overrides.pop(get_db, None)
