#!/bin/bash

# Insitu-Photos Unraid Setup Script

# 1. Configuration
PROJECT_DIR="C:\Users\Eugene\Documents\Projects\unraid_photo_album"
APP_DATA="/mnt/user/appdata/insitu-photos"

echo "Starting setup for Insitu-Photos..."

# 2. Create Persistent Directories
echo "Creating persistent directories in $APP_DATA..."
mkdir -p "/db"
mkdir -p "/cache"
mkdir -p "/postgres-init"
chmod -R 777 "/cache"

# 3. Copy Initialization Scripts
if [ -d "/postgres-init" ]; then
    echo "Copying postgres-init scripts to $APP_DATA/postgres-init..."
    cp -r "/postgres-init/." "/postgres-init/"
fi

# 4. Pull Latest Images
echo "Pulling latest images from GHCR..."
docker-compose -f docker-compose.unraid.yml pull

# 5. Success Message
echo ""
echo "Setup complete!"
echo "Start the application with: docker-compose -f docker-compose.unraid.yml up -d"
