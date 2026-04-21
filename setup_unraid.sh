#!/bin/bash

# Insitu-Photos Unraid Setup Script

# 1. Load configuration from .env if it exists
if [ -f ".env" ]; then
    echo "Using settings from existing .env file..."
    export $(grep -v '^'#' .env | xargs)
else
    echo "Creating .env from example..."
    cp .env.example .env
    export $(grep -v '^'#' .env | xargs)
fi

# 2. Use Host Paths from .env
APP_DATA="${HOST_APPDATA_PATH:-/mnt/user/appdata/insitu-photos}"
PROJECT_DIR="$(pwd)"

echo "Starting setup for Insitu-Photos in $APP_DATA..."

# 3. Create Persistent Directories
mkdir -p "/db"
mkdir -p "/cache"
mkdir -p "/postgres-init"
chmod -R 777 "/cache"

# 4. Copy Initialization Scripts
if [ -d "/postgres-init" ]; then
    echo "Copying postgres-init scripts to $APP_DATA/postgres-init..."
    cp -r "/postgres-init/." "/postgres-init/"
fi

# 5. Pull Latest Images
echo "Pulling latest images from GHCR..."
docker-compose -f docker-compose.unraid.yml pull

# 6. Success Message
echo ""
echo "Setup complete!"
echo "Start the application with: docker-compose -f docker-compose.unraid.yml up -d"
