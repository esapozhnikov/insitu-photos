# README Update Design (2026-04-21)

## Goal
Improve the `README.md` to be more visually appealing, informative, and professional to attract users and developers, specifically highlighting the non-destructive nature of the app.

## Structure
1.  **Header:**
    -   `insitu-photos_logo.png` (centered if possible, or left-aligned).
    -   Project Title: **Insitu-Photos** (with emoji).
    -   **Tagline:** "Self-hosted, high-performance photo management optimized for Unraid. **Read-only indexing** that never touches, moves, or modifies your original files."
    -   Existing CI/Release badges.
2.  **Table of Contents:**
    -   Clickable links to all sections: Features, Showcase, Quick Start, Unraid Setup, Tech Stack, License.
3.  **📸 Feature Showcase (Interspersed with Screenshots):**
    -   **📍 In-Situ Indexing:** (Folders screenshot) - Preserve folder structure with zero modifications to source files.
    -   **⚡ High-Performance Timeline:** (Timeline screenshot) - Virtualized grid for 10,000+ photos.
    -   **🌍 Interactive Map:** (Map screenshot) - Cluster-based exploration.
    -   **🤖 AI Face Recognition:** (People screenshot) - Automatic grouping using InsightFace.
    -   **📊 Stats & Monitoring:** (Stats screenshot) - Built-in dashboard and OpenTelemetry support.
    -   **⚙️ Admin & Setup:** (Settings screenshot) - Easy configuration for ML thresholds and server paths.
4.  **🚀 Quick Start:**
    -   Preparation, Configuration, Launch steps (refined formatting).
5.  **🏔️ Unraid Setup:**
    -   Step-by-step instructions for Unraid users.
6.  **🛠️ Tech Stack:**
    -   Detailed list of technologies (FastAPI, React, PostgreSQL/pgvector, etc.).
7.  **⚖️ License:**
    -   MIT License.

## Visuals
- Screenshots captured using Chrome DevTools MCP are saved in `docs/screenshots/`.
- Images will be referenced in `README.md` using relative paths.

## Implementation Details
- Use GitHub Markdown for rendering.
- Ensure anchor links work correctly for navigation.
- Use emojis and bold text for better readability.
