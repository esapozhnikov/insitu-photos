#!/bin/bash
set -e

# Wait for DB to be ready
echo "Waiting for database..."
until python -c "import socket; s = socket.socket(); s.connect(('db', 5432))" 2>/dev/null; do
  sleep 1
done

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Start the application
echo "Starting application..."
# Remove --reload for production-style default in Docker
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

