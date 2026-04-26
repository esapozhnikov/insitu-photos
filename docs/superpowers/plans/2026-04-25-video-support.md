# Video Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable support for `.mp4` and `.mov` files, including thumbnail generation via `ffmpeg` and video playback in the UI.

**Architecture:** Add a `media_type` column to the database. Update the scanner and metadata extractor to identify videos. Use `ffmpeg` to extract a frame for thumbnails. Update the frontend to show a play icon overlay and use a `<video>` tag for playback.

**Tech Stack:** Python (FastAPI, SQLAlchemy, ExifTool, ffmpeg), TypeScript (React, Tailwind CSS).

---

### Task 1: Environment & Schema Updates

**Files:**
- Modify: `backend/Dockerfile`
- Modify: `backend/app/models.py`
- Modify: `backend/app/schemas.py`
- Create: `backend/alembic/versions/xxxx_add_media_type.py` (via command)

- [ ] **Step 1: Add ffmpeg to Dockerfile**
Modify `backend/Dockerfile` to include `ffmpeg` in the runtime stage.
```dockerfile
# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libpq-dev exiftool ffmpeg && rm -rf /var/lib/apt/lists/*
...
```

- [ ] **Step 2: Update Photo Model**
Add `MediaType` enum and `media_type` column to `backend/app/models.py`.
```python
class MediaType(str, enum.Enum):
    PHOTO = "photo"
    VIDEO = "video"

class Photo(Base):
    ...
    media_type = Column(Enum(MediaType), default=MediaType.PHOTO, index=True)
```

- [ ] **Step 3: Update Schemas**
Update `PhotoResponse` and `PhotoSearch` in `backend/app/schemas.py`.
```python
class PhotoResponse(BaseModel):
    ...
    media_type: str = "photo"

class PhotoSearch(BaseModel):
    ...
    media_type: Optional[str] = None
```

- [ ] **Step 4: Create and Run Migration**
Run `docker-compose exec backend alembic revision --autogenerate -m "add media_type to photos"` (or local equivalent).

- [ ] **Step 5: Commit**
```bash
git add backend/Dockerfile backend/app/models.py backend/app/schemas.py
git commit -m "feat: add media_type to database and environment"
```

### Task 2: Backend Scanner & Metadata

**Files:**
- Modify: `backend/app/utils/scanner.py`
- Modify: `backend/app/utils/metadata.py`
- Modify: `backend/app/crud.py`

- [ ] **Step 1: Update Scanner Extensions**
Update `SUPPORTED_EXTENSIONS` in `backend/app/utils/scanner.py`.
```python
SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.mp4', '.mov'}
```

- [ ] **Step 2: Update Metadata Extraction**
Update `extract_metadata` in `backend/app/utils/metadata.py` to handle videos and detect `media_type`.
```python
def extract_metadata(file_path: str):
    ...
    is_video = os.path.splitext(file_path)[1].lower() in {'.mp4', '.mov'}
    media_type = "video" if is_video else "photo"
    
    # For videos, Pillow can't get size, use ExifTool
    width = metadata.get('File:ImageWidth') or metadata.get('QuickTime:ImageWidth')
    height = metadata.get('File:ImageHeight') or metadata.get('QuickTime:ImageHeight')
    ...
    return {
        "media_type": media_type,
        "width": width,
        "height": height,
        ...
    }
```

- [ ] **Step 3: Update CRUD for media_type**
Ensure `crud.create_photo` (or wherever it's saved) uses the `media_type` from metadata.

- [ ] **Step 4: Commit**
```bash
git add backend/app/utils/scanner.py backend/app/utils/metadata.py
git commit -m "feat: update scanner and metadata for videos"
```

### Task 3: Video Thumbnail Generation

**Files:**
- Modify: `backend/app/utils/thumbnails.py`

- [ ] **Step 1: Implement Video Frame Extraction**
Add a helper to extract a frame from video using `ffmpeg`.
```python
import subprocess

def extract_video_frame(video_path: str, output_path: str):
    cmd = [
        'ffmpeg', '-i', video_path,
        '-ss', '00:00:01.000',
        '-vframes', '1',
        output_path, '-y'
    ]
    subprocess.run(cmd, check=True, capture_output=True)
```

- [ ] **Step 2: Update generate_thumbnails**
Modify `generate_thumbnails` to use `extract_video_frame` if the file is a video.
```python
def generate_thumbnails(photo_path: str, checksum: str, is_video: bool = False):
    source_path = photo_path
    temp_frame = None
    
    if is_video:
        temp_frame = os.path.join(settings.cache_root, f"temp_{checksum}.jpg")
        extract_video_frame(photo_path, temp_frame)
        source_path = temp_frame
        
    # ... existing Pillow logic using source_path ...
    
    if temp_frame and os.path.exists(temp_frame):
        os.remove(temp_frame)
```

- [ ] **Step 3: Commit**
```bash
git add backend/app/utils/thumbnails.py
git commit -m "feat: generate thumbnails for video files using ffmpeg"
```

### Task 4: UI Support for Videos

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/components/PhotoGrid.tsx`
- Modify: `frontend/src/components/PhotoModal.tsx`

- [ ] **Step 1: Update Frontend Types**
Update `Photo` type to include `media_type`.

- [ ] **Step 2: Add Play Icon Overlay**
Update `PhotoGrid.tsx` to show a play icon for videos.
```tsx
{photo.media_type === 'video' && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80">
        <PlayIcon className="w-6 h-6 text-black fill-current" />
    </div>
  </div>
)}
```

- [ ] **Step 3: Update Modal to Play Video**
Update `PhotoModal.tsx` to render `<video>` when `media_type === 'video'`.
```tsx
{photo.media_type === 'video' ? (
  <video 
    src={`/api/photos/${photo.id}/download`} 
    controls 
    autoPlay 
    className="max-h-full max-w-full"
  />
) : (
  <img src={...} />
)}
```

- [ ] **Step 4: Commit**
```bash
git add frontend/src/types/index.ts frontend/src/components/PhotoGrid.tsx frontend/src/components/PhotoModal.tsx
git commit -m "feat: add video playback and play icon to UI"
```

### Task 5: Sidebar and Video View

**Files:**
- Create: `frontend/src/components/VideosView.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create VideosView**
Create a view that fetches only videos.
```tsx
const VideosView = () => {
    return <PhotoGrid initialFilters={{ media_type: 'video' }} />
}
```

- [ ] **Step 2: Add Sidebar Link**
Add "Videos" link to the sidebar in `App.tsx`.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/VideosView.tsx frontend/src/App.tsx
git commit -m "feat: add Videos view and sidebar link"
```
