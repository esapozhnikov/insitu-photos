from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        
        # Simple migration to add missing cover_photo_id to albums table
        try:
            conn.execute(text("ALTER TABLE albums ADD COLUMN IF NOT EXISTS cover_photo_id INTEGER REFERENCES photos(id)"))
            conn.execute(text("ALTER TABLE folders ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'idle'"))
            conn.execute(text("ALTER TABLE folders ADD COLUMN IF NOT EXISTS scan_error TEXT"))
        except Exception:
            # Table might not exist yet, which is fine, create_all will handle it
            pass
            
        # Reset any stuck scans on startup
        try:
            conn.execute(text("UPDATE folders SET status = 'idle' WHERE status = 'scanning'"))
            # Reset background task flags (update progress first while running is still 'true')
            conn.execute(text("UPDATE settings SET value = 'Task Interrupted or System Restarted' WHERE key = 'ml_re_recognition_progress' AND (SELECT value FROM settings WHERE key = 'ml_re_recognition_running') = 'true'"))
            conn.execute(text("UPDATE settings SET value = 'Task Interrupted or System Restarted' WHERE key = 'ml_full_rescan_progress' AND (SELECT value FROM settings WHERE key = 'ml_full_rescan_running') = 'true'"))
            conn.execute(text("UPDATE settings SET value = 'false' WHERE key = 'ml_re_recognition_running'"))
            conn.execute(text("UPDATE settings SET value = 'false' WHERE key = 'ml_full_rescan_running'"))
        except Exception:
            pass
            
        conn.commit()
