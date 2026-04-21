import hashlib
import logging
import os
from datetime import datetime
from PIL import Image
from exiftool import ExifToolHelper

from ..telemetry import tracer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_checksum(file_path: str) -> str:
    hash_sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()

def extract_metadata(file_path: str):
    with tracer.start_as_current_span("extract_metadata") as span:
        span.set_attribute("file.path", file_path)
        logger.info(f"Extracting metadata for: {file_path}")
        
        # Skip macOS resource fork files which crash ExifTool
        if os.path.basename(file_path).startswith('._'):
            logger.warning(f"Skipping macOS metadata file: {file_path}")
            return {}

        try:
            with ExifToolHelper() as et:
                metadata_list = et.get_metadata(file_path)
                if not metadata_list:
                    return {}
                metadata = metadata_list[0]
            
            timestamp = None
            dt_str = metadata.get('EXIF:DateTimeOriginal') or metadata.get('File:FileModifyDate')
            if dt_str:
                try:
                    # Handle cases with or without timezone
                    timestamp = datetime.strptime(dt_str[:19], '%Y:%m:%d %H:%M:%S')
                except:
                    pass
                    
            with Image.open(file_path) as img:
                width, height = img.size
                
            # Parse GPS coordinates using Ref tags
            gps_lat = metadata.get('EXIF:GPSLatitude')
            gps_long = metadata.get('EXIF:GPSLongitude')
            lat_ref = metadata.get('EXIF:GPSLatitudeRef', 'N')
            long_ref = metadata.get('EXIF:GPSLongitudeRef', 'E')
            
            if gps_lat is not None:
                if lat_ref == 'S': gps_lat = -abs(gps_lat)
            if gps_long is not None:
                if long_ref == 'W': gps_long = -abs(gps_long)

            # Extract people from XMP Regions or Keywords
            people = []
            # Try XMP:RegionName (Lightroom/Picasa)
            region_names = metadata.get('XMP:RegionName')
            if region_names:
                if isinstance(region_names, list):
                    people.extend(region_names)
                else:
                    people.append(region_names)
            
            # Try IPTC:Keywords or XMP:Subject
            keywords = metadata.get('IPTC:Keywords') or metadata.get('XMP:Subject')
            if keywords:
                # This is more speculative as keywords can be anything, 
                # but many people put names in keywords.
                # We'll only use these if no explicit region names were found.
                if not people:
                    # Filter for things that look like names (e.g. capitalized)
                    if isinstance(keywords, list):
                        for k in keywords:
                            if k and k[0].isupper() and ' ' in k:
                                people.append(k)
                    elif isinstance(keywords, str):
                        if keywords and keywords[0].isupper() and ' ' in keywords:
                            people.append(keywords)

            return {
                "timestamp": timestamp,
                "width": width,
                "height": height,
                "gps_lat": gps_lat,
                "gps_long": gps_long,
                "camera_make": metadata.get('EXIF:Make'),
                "camera_model": metadata.get('EXIF:Model'),
                "lens": metadata.get('EXIF:LensModel') or metadata.get('Composite:LensID'),
                "shutter_speed": metadata.get('EXIF:ExposureTime'),
                "aperture": metadata.get('EXIF:FNumber'),
                "iso": metadata.get('EXIF:ISO'),
                "people": list(set(people)) # Deduplicate
            }
        except Exception as e:
            span.record_exception(e)
            logger.error(f"Failed to extract metadata for {file_path}: {e}")
            return {}
