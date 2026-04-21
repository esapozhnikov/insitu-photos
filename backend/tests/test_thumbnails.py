import os
from PIL import Image
from app.utils.thumbnails import generate_thumbnails

def test_generate_thumbnails(tmp_path):
    # Mock settings.cache_root for this test
    from app.config import settings
    original_cache = settings.cache_root
    settings.cache_root = str(tmp_path / "cache")
    
    # Create a dummy image
    img_path = tmp_path / "test.jpg"
    img = Image.new('RGB', (1000, 1000), color='red')
    img.save(img_path)
    
    checksum = "dummy_checksum"
    results = generate_thumbnails(str(img_path), checksum)
    
    assert "small" in results
    assert "large" in results
    assert os.path.exists(os.path.join(settings.cache_root, results["small"]))
    assert os.path.exists(os.path.join(settings.cache_root, results["large"]))
    
    settings.cache_root = original_cache
