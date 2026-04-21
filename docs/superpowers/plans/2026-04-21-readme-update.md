# README Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the `README.md` to be more visually appealing with a new header, table of contents, and a feature showcase interspersed with screenshots.

**Architecture:** A single-file update to `README.md` using relative links to screenshots stored in `docs/screenshots/`.

**Tech Stack:** GitHub Flavored Markdown.

---

### Task 1: Update README Header and Table of Contents

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace existing header with new centered logo and tagline**

```markdown
<p align="center">
  <img src="insitu-photos_logo.png" width="200" alt="Insitu-Photos Logo">
</p>

# Insitu-Photos 📸

[![CI](https://github.com/esapozhnikov/insitu-photos/actions/workflows/ci.yml/badge.svg)](https://github.com/esapozhnikov/insitu-photos/actions/workflows/ci.yml)
[![Release](https://github.com/esapozhnikov/insitu-photos/actions/workflows/release.yml/badge.svg)](https://github.com/esapozhnikov/insitu-photos/actions/workflows/release.yml)

**Self-hosted, high-performance photo management optimized for Unraid.**
*Read-only indexing that never touches, moves, or modifies your original files.*
```

- [ ] **Step 2: Add Table of Contents**

```markdown
## 📖 Table of Contents
* [✨ Features](#-features)
* [📸 Showcase](#-showcase)
* [🚀 Quick Start](#-quick-start)
* [🏔️ Unraid Setup](#-unraid-setup)
* [🛠️ Tech Stack](#-tech-stack)
* [⚖️ License](#-license)
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update readme header and add table of contents"
```

---

### Task 2: Implement Feature Showcase with Screenshots

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace Features section with Showcase section including screenshots**

```markdown
## 📸 Showcase

### ⚡ High-Performance Timeline
Smoothly navigate libraries of 10,000+ photos with virtualized grids. Preserve your original memories exactly where they live.

![Timeline Screenshot](docs/screenshots/timeline.png)

### 🤖 AI Face Recognition
Automatically group faces using InsightFace (buffalo_l model) and manage people in your collection.

![People Screenshot](docs/screenshots/people.png)

### 🌍 Interactive Map
Discover your photos on a world map with intelligent clustering and metadata-based location tracking.

![Map Screenshot](docs/screenshots/map.png)

### 📍 In-Situ Indexing & Folders
Read-only access to your photo library. Your folder structure is preserved and untouched.

![Folders Screenshot](docs/screenshots/folders.png)

### 📊 Stats & Monitoring
Built-in dashboard for library statistics and OpenTelemetry support for system telemetry.

![Stats Screenshot](docs/screenshots/stats.png)

### ⚙️ Admin & Settings
Easy configuration for ML thresholds, server paths, and user management.

![Settings Screenshot](docs/screenshots/settings.png)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add feature showcase with screenshots to readme"
```

---

### Task 3: Refine Quick Start and Unraid Setup sections

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update Quick Start and Unraid Setup for better formatting**

Ensure sections use proper anchor tags (implicit in Markdown headers) and consistent emoji usage.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: refine quick start and unraid setup formatting"
```
