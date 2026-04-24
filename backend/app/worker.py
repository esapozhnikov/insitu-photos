from celery import Celery
from celery.signals import worker_process_init, worker_ready
from opentelemetry.instrumentation.celery import CeleryInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from .config import settings
from .telemetry import setup_telemetry
from .database import engine, SessionLocal
from . import models, crud
import logging
import os

logger = logging.getLogger(__name__)

@worker_process_init.connect
def init_telemetry(**kwargs):
    setup_telemetry("insitu-photos-backend")
    CeleryInstrumentor().instrument()
    
    if os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") and os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT").lower() != "none":
        SQLAlchemyInstrumentor().instrument(engine=engine)
        HTTPXClientInstrumentor().instrument()

@worker_ready.connect
def reset_stuck_states(sender, **kwargs):
    logger.info("Worker ready. Resetting any stuck states in database.")
    with SessionLocal() as db:
        try:
            # Reset scanning folders
            db.query(models.Folder).filter(models.Folder.status == "scanning").update({"status": "idle"})
            
            # Reset ML flags
            crud.update_setting(db, "ml_re_recognition_running", "false")
            crud.update_setting(db, "ml_full_rescan_running", "false")
            db.commit()
            logger.info("Stuck states reset successfully.")
        except Exception as e:
            logger.error(f"Failed to reset stuck states: {e}")

celery_app = Celery(
    "worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks"] # Explicitly include tasks module
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_soft_time_limit=3600,  # 1 hour
    task_time_limit=3600 + 300, # 1 hour + 5 mins buffer
)
