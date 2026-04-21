#!/bin/bash
set -e

# Wait for DB to be ready
echo "Waiting for database..."
until python -c "import socket; s = socket.socket(); s.connect(('db', 5432))" 2>/dev/null; do
  sleep 1
done

# We let the API container handle migrations to avoid race conditions

# Start the worker
echo "Starting Celery worker..."
exec celery -A app.worker.celery_app worker --loglevel=info
