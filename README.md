# Insitu-Photos 📸

[![CI](https://github.com/esapozhnikov/insitu-photos/actions/workflows/ci.yml/badge.svg)](https://github.com/esapozhnikov/insitu-photos/actions/workflows/ci.yml)
[![Release](https://github.com/esapozhnikov/insitu-photos/actions/workflows/release.yml/badge.svg)](https://github.com/esapozhnikov/insitu-photos/actions/workflows/release.yml)

A self-hosted, high-performance photo management application optimized for Unraid servers. **Insitu-Photos** indexes your memories exactly where they live, without ever moving, modifying, or messing with your original files.

## ✨ Features

*   **📍 In-Situ Indexing:** Read-only access to your photo library. Your folder structure is preserved and untouched.
*   **🤖 AI-Powered Facial Recognition:** Automatically group faces using NVIDIA GPU acceleration (InsightFace).
*   **🌍 Interactive Mapping:** Discover your photos on a world map with intelligent clustering.
*   **⚡ High Performance:** Smoothly navigate libraries of 10,000+ photos with virtualized grids.
*   **📺 TV-Friendly Slideshow:** Full-screen automated playback mode for any selection or album.
*   **🔍 Unified Search:** Filter by person, date, folder, tags, or metadata.
*   **📊 Stats & Telemetry:** Built-in dashboard and OpenTelemetry support for monitoring.

## Quick Start
1. Clone the repository.
2. Copy `.env.example` to `.env` and configure your settings.
3.  **Launch the stack:**
    ```bash
    docker-compose up -d
    ```

    *Note: By default, the ML service uses CPU. To enable NVIDIA GPU acceleration, update `docker-compose.yml` to use the `-cuda` image and ensure the `deploy` section is active.*

    **Example `ml-service` config:**
    ```yaml
    ml-service:
    # For CPU
     # image: ghcr.io/immich-app/immich-machine-learning:v2.7.5
    # For GPU
      image: ghcr.io/immich-app/immich-machine-learning:v2.7.5-cuda
    # For GPU (NVIDIA), uncomment below:
    # image: ghcr.io/immich-app/immich-machine-learning:v2.7.5-cuda
    # deploy:
     #  resources:
      #   reservations:
         # devices:
           # - driver: nvidia
             # count: 1
             # capabilities: [gpu]
      environment:
        - MACHINE_LEARNING_GPU_SAVED_MODEL_PATH=/cache/ml-models
      volumes:
        - ./cache/ml-models:/cache/ml-models
      deploy:
        resources:
          reservations:
            devices:
              - driver: nvidia
                count: 1
                capabilities: [gpu]
    ```
4. Access the UI at `http://localhost:3000`.

## Unraid Setup
Use the provided `docker-compose.unraid.yml` or the community template (coming soon).

## 🛠️ Tech Stack

*   **Frontend:** React (Vite), TypeScript, Tailwind CSS, Leaflet, React-Virtuoso.
*   **Backend:** FastAPI (Python), SQLAlchemy, Celery, Redis.
*   **AI:** Immich-ML (InsightFace) with NVIDIA GPU acceleration.
*   **Database:** PostgreSQL with `pgvector`.
*   **Monitoring:** OpenTelemetry, Grafana Cloud.

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

