# Improved AI Stats & Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the AI processing status bar and add tracking for face detection vs identification.

**Architecture:** Add `is_face_scanned` to the Photo model, fix SQLAlchemy `is not None` bugs, and update the frontend to show two separate progress bars for "Detection" and "Identification".

**Tech Stack:** Python (FastAPI, SQLAlchemy, Alembic), React (TypeScript, Tailwind CSS).

---

### Task 1: Add `is_face_scanned` to Photo Model

**Files:**
- Modify: `backend/app/models.py`

- [ ] **Step 1: Add the column to the model**

```python
# backend/app/models.py around line 40
class Photo(Base):
    __tablename__ = "photos"
    # ... existing columns ...
    thumbnail_large = Column(String, nullable=True)
    is_face_scanned = Column(Boolean, default=False, index=True) # Add this line
```

- [ ] **Step 2: Verify model change with a simple script**

Run: `python -c "from backend.app.models import Photo; print(Photo.is_face_scanned)"`
Expected: `<sqlalchemy.sql.schema.Column object at ...>`

- [ ] **Step 3: Commit**

```bash
git add backend/app/models.py
git commit -m "feat: add is_face_scanned column to Photo model"
```

---

### Task 2: Database Migration & Backfill

**Files:**
- Create: `backend/alembic/versions/2026_04_21_add_is_face_scanned.py` (exact name will be generated)

- [ ] **Step 1: Generate the migration**

Run: `docker compose exec backend alembic revision --autogenerate -m "add is_face_scanned to photo"`
(Or run locally if env is set up)

- [ ] **Step 2: Add backfill logic to the migration**

Modify the generated file to include:
```python
def upgrade() -> None:
    # ... existing op.add_column ...
    op.add_column('photos', sa.Column('is_face_scanned', sa.Boolean(), nullable=True))
    op.create_index(op.f('ix_photos_is_face_scanned'), 'photos', ['is_face_scanned'], unique=False)
    
    # Backfill: Set is_face_scanned=True for photos that already have faces
    op.execute("""
        UPDATE photos 
        SET is_face_scanned = True 
        WHERE id IN (SELECT DISTINCT photo_id FROM faces)
    """)
    
    # Set default for the rest
    op.execute("UPDATE photos SET is_face_scanned = False WHERE is_face_scanned IS NULL")
    op.alter_column('photos', 'is_face_scanned', nullable=False, server_default=sa.text('false'))
```

- [ ] **Step 3: Apply the migration**

Run: `docker compose exec backend alembic upgrade head`

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/*.py
git commit -m "db: migration for is_face_scanned with backfill"
```

---

### Task 3: Update AI Tasks to Track Progress

**Files:**
- Modify: `backend/app/tasks.py`

- [ ] **Step 1: Update `process_faces_task`**

```python
# backend/app/tasks.py in process_faces_task
            # ... after the face detection loop ...
            for result in results:
                # ... existing face creation logic ...
            
            # Add this at the end of the try block:
            db_photo.is_face_scanned = True
            db.commit()
```

- [ ] **Step 2: Update `full_face_rescan_task`**

```python
# backend/app/tasks.py in full_face_rescan_task
        try:
            # Mark as running
            crud.update_setting(db, "ml_full_rescan_running", "true")
            crud.update_setting(db, "ml_full_rescan_progress", "Clearing database...")

            # Add this:
            db.query(models.Photo).update({models.Photo.is_face_scanned: False})
            db.commit()
            
            # 1. Clear database face/person data
            crud.reset_faces(db)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/tasks.py
git commit -m "feat: track face scanning progress in tasks"
```

---

### Task 4: Fix Stats API & Update Schema

**Files:**
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/api/endpoints/stats.py`

- [ ] **Step 1: Update `LibraryStats` schema**

```python
# backend/app/schemas.py
class LibraryStats(BaseModel):
    total_photos: int
    scanned_photos: int # Add this
    total_folders: int
    total_albums: int
    total_faces: int
    total_people: int
    identified_faces: int # Rename from processed_faces
    photos_by_year: dict[str, int]
```

- [ ] **Step 2: Fix bugs and update logic in `get_stats`**

```python
# backend/app/api/endpoints/stats.py
@router.get("/", response_model=schemas.LibraryStats)
def get_stats(db: Session = Depends(get_db)):
    # ... existing year logic ...

    return {
        "total_photos": db.query(models.Photo).count(),
        "scanned_photos": db.query(models.Photo).filter(models.Photo.is_face_scanned == True).count(),
        "total_folders": db.query(models.Folder).count(),
        "total_albums": db.query(models.Album).count(),
        "total_faces": db.query(models.Face).count(),
        "total_people": db.query(models.Person).count(),
        "identified_faces": db.query(models.Face).filter(models.Face.person_id != None).count(), # Fixed bug
        "photos_by_year": photos_by_year
    }
```

- [ ] **Step 3: Fix `get_system_status` bug**

```python
# backend/app/api/endpoints/stats.py in get_system_status
    # ...
    db.query(models.Face).filter(
        models.Face.person_id == None, # Changed from is None
        models.Face.embedding != None  # Changed from is not None
    ).count()

    unassigned_without_embeddings = db.query(models.Face).filter(
        models.Face.person_id == None, # Changed from is None
        models.Face.embedding == None  # Changed from is None
    ).count()
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas.py backend/app/api/endpoints/stats.py
git commit -m "fix: stats api bugs and update schema for dual progress bars"
```

---

### Task 5: Update Frontend Stats View

**Files:**
- Modify: `frontend/src/components/StatsView.tsx`

- [ ] **Step 1: Update the Progress Bars**

```tsx
// frontend/src/components/StatsView.tsx
      {/* AI Progress Section */}
      <div className="mt-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-8 space-y-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Library Scan Progress (Face Detection)</h3>
          <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-1000"
              style={{ width: `${stats.total_photos > 0 ? (stats.scanned_photos / stats.total_photos) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-slate-400 font-medium">
            <span>{stats.scanned_photos} photos scanned</span>
            <span>{stats.total_photos} total photos</span>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Identification Coverage</h3>
          <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-1000"
              style={{ width: `${stats.total_faces > 0 ? (stats.identified_faces / stats.total_faces) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-slate-400 font-medium">
            <span>{stats.identified_faces} faces identified</span>
            <span>{stats.total_faces} total faces detected</span>
          </div>
        </div>
      </div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/StatsView.tsx
git commit -m "feat: show dual progress bars for AI processing"
```
