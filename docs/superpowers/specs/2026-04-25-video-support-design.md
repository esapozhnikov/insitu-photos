# Design: Video Support

Adding support for video files (.mp4, .mov) with thumbnail generation and specialized UI components.

## Architecture

### Database Changes
- **MediaType Enum**: `PHOTO`, `VIDEO`.
- **Photo Model**: Add `media_type` column (Enum) with index.
- **Migration**: Add column to `photos` table, default to `PHOTO`.

### Backend Implementation
- **Dockerfile**: Install `ffmpeg` in the runtime image.
- **Scanner**: Include `.mp4` and `.mov` in supported extensions.
- **Metadata**:
  - Update `extract_metadata` to handle video files using ExifTool.
  - Set `media_type` based on file extension or MIME type.
- **Thumbnails**:
  - Implement frame extraction for videos using `ffmpeg`.
  - Process extracted frame through existing thumbnail pipeline.
- **AI Processing**:
  - Update worker logic to skip facial recognition and AI tagging for `media_type == VIDEO`.

### Frontend Implementation
- **Components**:
  - `PhotoGrid`: Add play icon overlay for videos.
  - `PhotoModal`: Use `<video>` tag for video playback.
- **Navigation**:
  - Add "Videos" link to sidebar.
  - Create `VideosView` (or reuse `PhotoGrid` with filter).
- **API**:
  - Update `PhotoResponse` schema to include `media_type`.
  - Update `PhotoSearch` schema to allow filtering by `media_type`.

## Data Flow
1. Scanner finds `.mp4` file.
2. Metadata extractor identifies it as `VIDEO`.
3. Thumbnail generator runs `ffmpeg` to extract frame at 1s.
4. UI renders thumbnail with overlay.
5. Modal plays video using original file path.

## Success Criteria
- [ ] Users can see video files in the main grid.
- [ ] Videos have thumbnails with a play icon overlay.
- [ ] Clicking a video opens the modal and plays the video.
- [ ] Sidebar has a "Videos" section showing only videos.
- [ ] AI tasks are not triggered for video files.
