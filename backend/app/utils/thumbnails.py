import os
import subprocess
from PIL import Image
from ..config import settings

THUMBNAIL_SIZES = {
    "small": (300, 300),
    "large": (1200, 1200)
}

def extract_video_frame(video_path: str, output_path: str):
    """Extracts a frame from a video at 1s using ffmpeg."""
    cmd = [
        'ffmpeg', '-i', video_path,
        '-ss', '00:00:01.000',
        '-vframes', '1',
        output_path, '-y'
    ]
    # Use capture_output=True to keep logs clean, check=True to raise on error
    subprocess.run(cmd, check=True, capture_output=True)

def generate_thumbnails(photo_path: str, checksum: str, is_video: bool = False):
    """Generates thumbnails for a photo or video and returns their relative paths."""
    thumbnails = {}
    source_path = photo_path
    temp_frame = None
    
    if is_video:
        temp_frame = os.path.join(settings.cache_root, f"temp_{checksum}.jpg")
        try:
            extract_video_frame(photo_path, temp_frame)
            source_path = temp_frame
        except Exception as e:
            print(f"Failed to extract video frame for {photo_path}: {e}")
            return {}

    try:
        with Image.open(source_path) as img:
            # Handle orientation if EXIF present (only for photos usually)
            if not is_video:
                try:
                    from PIL import ImageOps
                    img = ImageOps.exif_transpose(img)
                except Exception:
                    pass

            for size_name, dimensions in THUMBNAIL_SIZES.items():
                thumb_img = img.copy()
                thumb_img.thumbnail(dimensions)
                
                # Ensure RGB for JPEG
                if thumb_img.mode in ("RGBA", "P"):
                    thumb_img = thumb_img.convert("RGB")
                
                # Storage path: /cache/thumbnails/<size>/<checksum>.jpg
                relative_dir = os.path.join("thumbnails", size_name)
                absolute_dir = os.path.join(settings.cache_root, relative_dir)
                os.makedirs(absolute_dir, exist_ok=True)
                
                filename = f"{checksum}.jpg"
                absolute_path = os.path.join(absolute_dir, filename)
                relative_path = os.path.join(relative_dir, filename)
                
                thumb_img.save(absolute_path, "JPEG", quality=85)
                thumbnails[size_name] = relative_path
    finally:
        # Cleanup temporary frame
        if temp_frame and os.path.exists(temp_frame):
            os.remove(temp_frame)
            
    return thumbnails

def generate_face_thumbnail(photo_path: str, face_id: int, bounding_box: dict):
    """Crops a face from an image and saves it as a thumbnail."""
    with Image.open(photo_path) as img:
        # Handle orientation
        try:
            from PIL import ImageOps
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass
            
        width, height = img.size
        # Bounding box is typically normalized [0, 1] or absolute pixels.
        # Immich ML v2 returns absolute pixels if not specified.
        # Let's assume absolute pixels based on previous logs: {'x1': 2576.0, 'y1': 1626.0, 'x2': 2684.0, 'y2': 1750.0}
        x1, y1 = bounding_box['x1'], bounding_box['y1']
        x2, y2 = bounding_box['x2'], bounding_box['y2']
        
        # Add 20% margin
        face_width = x2 - x1
        face_height = y2 - y1
        margin_x = face_width * 0.2
        margin_y = face_height * 0.2
        
        # Crop coordinates
        left = max(0, x1 - margin_x)
        top = max(0, y1 - margin_y)
        right = min(width, x2 + margin_x)
        bottom = min(height, y2 + margin_y)
        
        face_img = img.crop((left, top, right, bottom))
        face_img.thumbnail((300, 300))
        
        # Ensure RGB
        if face_img.mode in ("RGBA", "P"):
            face_img = face_img.convert("RGB")
            
        # Storage path: /cache/faces/<face_id>.jpg
        relative_dir = "faces"
        absolute_dir = os.path.join(settings.cache_root, relative_dir)
        os.makedirs(absolute_dir, exist_ok=True)
        
        filename = f"{face_id}.jpg"
        absolute_path = os.path.join(absolute_dir, filename)
        relative_path = os.path.join(relative_dir, filename)
        
        face_img.save(absolute_path, "JPEG", quality=90)
        return relative_path
