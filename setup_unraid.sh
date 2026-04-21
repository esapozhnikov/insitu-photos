#!/bin/bash

# Unraid Local Build & Setup Script
# This script builds the Docker images locally on your Unraid server.

# 1. Configuration
PROJECT_DIR="$(pwd)"
APP_DATA="/mnt/user/appdata/unraid-photo-album"

echo "🚀 Starting local build for Insitu-Photos..."
echo "📍 Project Directory: $PROJECT_DIR"

# 2. Create Persistent Directories
echo "📂 Ensuring persistent directories exist in $APP_DATA..."
mkdir -p "$APP_DATA/db"
mkdir -p "$APP_DATA/cache"
chmod -R 777 "$APP_DATA/cache"

# 3. Build Docker Images
echo "🛠 Building Backend/Worker image (unraid_photo_be:1.0)..."
docker build -t unraid_photo_be:1.0 ./backend

echo "🛠 Building Frontend image (unraid_photo_fe:1.0)..."
docker build -t unraid_photo_fe:1.0 ./frontend

# 4. Success Message
echo ""
echo "✅ Build complete!"
echo "👉 You can now start the application with:"
echo "   docker-compose -f docker-compose.unraid.yml up -d"
echo ""
echo "🌐 UI will be available at: http://<unraid-ip>:3001"
echo "📡 API will be available at: http://<unraid-ip>:8001"
echo "🗄️  Postgres will be available at: http://<unraid-ip>:5433"
