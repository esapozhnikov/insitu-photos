# Design Spec: Improved AI Stats & Progress Tracking

**Date:** 2026-04-21  
**Status:** Approved  
**Topic:** Fixing AI processing stats and adding transparent coverage tracking.

## 1. Problem Statement
The current "AI Processing Status" loading bar in `StatsView` is inaccurate:
1. It often shows 100% full even when processing is incomplete due to a bug in the SQLAlchemy `is not None` filter.
2. It only tracks "Identified vs Total" faces, which doesn't accurately represent "overall coverage" (e.g., photos that haven't even been scanned for faces yet).
3. Photos with zero faces are indistinguishable from photos that haven't been scanned.

## 2. Proposed Changes

### 2.1 Database Schema (`backend/app/models.py`)
- Add a new column to the `Photo` model:
    - `is_face_scanned`: `Boolean`, default `False`.
    - Purpose: Tracks if a photo has completed the face detection phase (even if 0 faces were found).

### 2.2 Migration & Backfill (`backend/alembic/versions/`)
- Create a new migration to add `is_face_scanned`.
- **Backfill Strategy:** Update existing photos where `Photo.id` exists in the `faces` table, setting `is_face_scanned = True`. This ensures existing identified/detected faces contribute to the "Scanned" progress immediately.

### 2.3 Backend Logic (`backend/app/tasks.py`)
- **`process_faces_task`**: Ensure `photo.is_face_scanned = True` is set and committed at the end of the task, regardless of how many faces were found.
- **`full_face_rescan_task`**: Reset `is_face_scanned = False` for all photos before starting the rescan.

### 2.4 API & Bug Fixes (`backend/app/api/endpoints/stats.py`)
- **Fix `is not None` Bug:** Replace `column is not None` with `column != None` in all SQLAlchemy filters.
- **Update `LibraryStats` schema:**
    - `total_photos`: Total photos in library.
    - `scanned_photos`: Count of photos where `is_face_scanned` is `True`.
    - `total_faces`: Total faces detected in the library.
    - `identified_faces`: Count of faces where `person_id` is assigned.
    - `total_people`: Total unique people in the database.

### 2.5 Frontend UI (`frontend/src/components/StatsView.tsx`)
- **Dual Progress Bars:**
    1. **Face Detection Progress:** "Photos Scanned" / "Total Photos".
    2. **Face Identification Coverage:** "Identified Faces" / "Total Faces Detected".
- Update labels to be more descriptive (e.g., "Library Scan Progress" and "Identification Coverage").

## 3. Success Criteria
- The progress bar no longer defaults to 100% when faces are unassigned.
- Users can see exactly how many photos are left to be scanned by the AI.
- Users can see what percentage of their detected faces have been identified/named.

## 4. Verification Plan
- **Backend:** Unit test for `get_stats` to verify correct counts with `None` values.
- **Database:** Verify migration correctly backfills `is_face_scanned` for existing photos with faces.
- **Manual UI Check:** Verify both progress bars update in real-time (via the existing 5s polling).
