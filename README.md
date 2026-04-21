# Insitu-Photos 📸

[![CI](https://github.com/esapozhnikov/insitu-photos/actions/workflows/ci.yml/badge.svg)](https://github.com/esapozhnikov/insitu-photos/actions/workflows/ci.yml)
[![Release](https://github.com/esapozhnikov/insitu-photos/actions/workflows/release.yml/badge.svg)](https://github.com/esapozhnikov/insitu-photos/actions/workflows/release.yml)

A self-hosted, high-performance photo management application optimized for Unraid servers. **Insitu-Photos** indexes your memories exactly where they live, without ever moving, modifying, or messing with your original files.

## ✨ Features

*   **📍 In-Situ Indexing:** Read-only access to your photo library. Your folder structure is preserved and untouched.
*   **🤖 AI-Powered Facial Recognition:** Automatically group faces using InsightFace.
*   **🌍 Interactive Mapping:** Discover your photos on a world map with intelligent clustering.
*   **⚡ High Performance:** Smoothly navigate libraries of 10,000+ photos with virtualized grids.
*   **📺 TV-Friendly Slideshow:** Full-screen automated playback mode for any selection or album.
*   **🔍 Unified Search:** Filter by person, date, folder, tags, or metadata.
*   **📊 Stats & Telemetry:** Built-in dashboard and OpenTelemetry support for monitoring.

## 🚀 Quick Start

### 1. Preparation
Clone the repository and prepare your environment:
```bash
cp .env.example .env
```

### 2. Configuration
Edit your `.env` file to match your server paths:
- `HOST_PHOTO_PATH`: The root directory of your photo collection (e.g., `/mnt/user/photos`).
- `HOST_APPDATA_PATH`: Where Insitu-Photos should store its database and cache (e.g., `/mnt/user/appdata/insitu-photos`).

### 3. Launch
```bash
docker-compose up -d
```
Access the UI at `http://localhost:3000`.

## 🏔️ Unraid Setup
For Unraid users, we provide a streamlined setup script:
1. Copy `setup_unraid.sh` and `docker-compose.unraid.yml` to your server.
2. Configure `.env` as described above.
3. Run `bash setup_unraid.sh`.
4. Run `docker-compose -f docker-compose.unraid.yml up -d`.

The UI will be available at `http://<unraid-ip>:3001`.

## 🛠️ Tech Stack
*   **Frontend:** React, TypeScript, Tailwind CSS, Leaflet.
*   **Backend:** FastAPI, SQLAlchemy, Celery, Redis.
*   **AI:** Immich-ML (InsightFace) with optional NVIDIA GPU acceleration.
*   **Database:** PostgreSQL with `pgvector`.

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.
