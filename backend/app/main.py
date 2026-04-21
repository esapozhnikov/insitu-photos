from .telemetry import setup_telemetry
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from .database import engine, Base, init_db, SessionLocal
from .api.endpoints import folders, photos, people, albums, stats, admin, search, settings as api_settings, auth, users
from .config import settings
from . import crud, models, schemas
import os
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Only run DB initialization if not in test mode or if explicitly requested
    if os.getenv("TEST_MODE") != "true":
        # Initialize pgvector extension first (migrations handle table creation)
        init_db()

        # Create tables (for development, migrations should handle production)
        Base.metadata.create_all(bind=engine)

        # Add default records and Admin bootstrap
        db = SessionLocal()
        try:
            # Default settings
            default_settings = {
                "smart_sync_enabled": "false",
                "ml_model_name": "buffalo_l",
                "ml_min_score": "0.7",
                "ml_recognition_threshold": "0.15",
                "ml_min_faces": "1"
            }
            for key, val in default_settings.items():
                if not crud.get_setting(db, key):
                    crud.update_setting(db, key, val)
                    
            # Admin bootstrap
            admin_user = crud.get_user_by_username(db, settings.admin_user)
            if not admin_user:
                crud.create_user(db, schemas.UserCreate(
                    username=settings.admin_user,
                    password=settings.admin_password,
                    role=models.UserRole.ADMIN
                ))
            else:
                # Update admin password from env if it changed
                from .auth import get_password_hash
                admin_user.hashed_password = get_password_hash(settings.admin_password)
                admin_user.role = models.UserRole.ADMIN
                db.commit()

        finally:
            db.close()
    yield


# Initialize Telemetry
setup_telemetry("insitu-photos-backend")

app = FastAPI(title="Insitu-Photos API", lifespan=lifespan)
FastAPIInstrumentor.instrument_app(app)

# Instrument external calls and database
if os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") and os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT").lower() != "none":
    SQLAlchemyInstrumentor().instrument(engine=engine)
    HTTPXClientInstrumentor().instrument()

# Ensure cache directory exists
os.makedirs(settings.cache_root, exist_ok=True)
app.mount("/cache", StaticFiles(directory=settings.cache_root), name="cache")
app.mount("/originals", StaticFiles(directory=settings.photo_root), name="originals")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(folders.router, prefix="/api/folders", tags=["folders"])
app.include_router(photos.router, prefix="/api/photos", tags=["photos"])
app.include_router(people.router, prefix="/api/people", tags=["people"])
app.include_router(albums.router, prefix="/api/albums", tags=["albums"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(api_settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Insitu-Photos API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
