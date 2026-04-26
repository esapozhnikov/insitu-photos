import pytest
from unittest.mock import MagicMock, patch
from app.utils.metadata import extract_metadata
from app.models import MediaType

@pytest.fixture
def mock_exiftool():
    with patch('app.utils.metadata.ExifToolHelper') as mock:
        yield mock

@pytest.fixture
def mock_image_open():
    with patch('app.utils.metadata.Image.open') as mock:
        yield mock

def test_extract_metadata_photo(mock_exiftool, mock_image_open):
    # Setup mock ExifTool
    et_instance = mock_exiftool.return_value.__enter__.return_value
    et_instance.get_metadata.return_value = [{
        'EXIF:DateTimeOriginal': '2023:01:01 12:00:00',
        'EXIF:GPSLatitude': 45.0,
        'EXIF:GPSLatitudeRef': 'N',
        'EXIF:GPSLongitude': 90.0,
        'EXIF:GPSLongitudeRef': 'E',
        'EXIF:Make': 'Sony',
        'EXIF:Model': 'A7III'
    }]
    
    # Setup mock Pillow
    img_instance = mock_image_open.return_value.__enter__.return_value
    img_instance.size = (1920, 1080)
    
    result = extract_metadata("test.jpg")
    
    assert result["media_type"] == "photo"
    assert result["width"] == 1920
    assert result["height"] == 1080
    assert result["camera_make"] == "Sony"

def test_extract_metadata_video(mock_exiftool, mock_image_open):
    # Setup mock ExifTool
    et_instance = mock_exiftool.return_value.__enter__.return_value
    et_instance.get_metadata.return_value = [{
        'QuickTime:CreateDate': '2023:01:01 13:00:00',
        'QuickTime:ImageWidth': 3840,
        'QuickTime:ImageHeight': 2160,
        'EXIF:Make': 'Apple',
        'EXIF:Model': 'iPhone 13'
    }]
    
    # Pillow should NOT be called for videos in the new implementation, 
    # but currently it IS called and might fail or return wrong info if mocked.
    # In my test, I'll assume it might be called and we want to see it NOT crash.
    
    result = extract_metadata("test.mp4")
    
    assert result["media_type"] == "video"
    assert result["width"] == 3840
    assert result["height"] == 2160
    assert result["camera_make"] == "Apple"
