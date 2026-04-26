import os
from typing import List

SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.mp4', '.mov'}

def scan_directory(directory_path: str) -> List[str]:
    photo_paths = []
    for root, dirs, files in os.walk(directory_path):
        # Exclude cache, thumbnails and other non-photo directories
        dirs[:] = [d for d in dirs if d.lower() not in {'cache', 'thumbnails', 'thumbs', 'encoded-video'}]
        
        for file in files:
            # Ignore hidden/metadata files (common on macOS/network shares)
            if file.startswith('.'):
                continue
            if os.path.splitext(file)[1].lower() in SUPPORTED_EXTENSIONS:
                photo_paths.append(os.path.join(root, file))
    return photo_paths
