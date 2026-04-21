#!/bin/bash
set -e

# Run database migrations (optional but safe)
echo "Running database migrations..."
alembic upgrade head

# Start the worker
echo "Starting Celery worker..."
exec celery -A app.worker.celery_app worker --loglevel=info
