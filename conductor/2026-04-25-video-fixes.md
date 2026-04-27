# Video Support Bug Fixes Plan

## Goal
Fix bugs identified after adding video support:
1. Ensure the "Videos" sidebar link actually filters to show only videos.
2. Separate video counts from photo counts on the Stats page.
3. Exclude "Live Photo" video snippets (short `.mov` files).
4. Update UI messaging to say "media files" instead of "photos" where appropriate.

## Architecture & Implementation Steps

### Task 1: Fix Videos Sidebar Filter
- **File:** `backend/app/crud.py`
- **Action:** Update the `search_photos` function to properly apply the `filters.media_type` filter to the SQLAlchemy query. Currently, the API receives the filter but ignores it when building the query.

### Task 2: Separate Stats Counts
- **File:** `backend/app/schemas.py`
  - Add `total_videos: int` to the `LibraryStats` Pydantic model.
- **File:** `backend/app/api/endpoints/stats.py`
  - Update `get_stats` to count `models.MediaType.photo` for `total_photos` and `models.MediaType.video` for `total_videos`.
- **File:** `frontend/src/types/index.ts`
  - Add `total_videos: number` to the `LibraryStats` interface.
- **File:** `frontend/src/components/StatsView.tsx`
  - Add a new stats card for "Total Videos" using the `Film` icon to display the new stat.

### Task 3: Exclude Live Photo Previews
- **File:** `backend/app/utils/metadata.py`
  - Update `extract_metadata` to parse `QuickTime:Duration` or `File:Duration` for video files. If the duration is less than 3.5 seconds, return a flag `{"is_live_photo_video": True}`.
- **File:** `backend/app/tasks.py`
  - Update `index_folder_task`. Check if `metadata.get("is_live_photo_video")` is true. If so, skip adding the file to the database to prevent short Live Photo snippets from cluttering the gallery.

### Task 4: Update UI Messaging
- **File:** `backend/app/tasks.py`
  - Update the progress text in `index_folder_task` from "Processed X/Y photos..." to "Processed X/Y media files...".
  - Update the completion messages similarly to reflect that both photos and videos are being processed.
