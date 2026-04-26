import os
from app.utils.scanner import scan_directory

def test_scan_directory_with_videos(tmp_path):
    d = tmp_path / "media"
    d.mkdir()
    (d / "photo1.jpg").write_text("dummy content")
    (d / "video1.mp4").write_text("dummy content")
    (d / "video2.mov").write_text("dummy content")
    (d / "notes.txt").write_text("not a photo")
    
    results = scan_directory(str(d))
    filenames = [os.path.basename(r) for r in results]
    
    assert "photo1.jpg" in filenames
    assert "video1.mp4" in filenames
    assert "video2.mov" in filenames
    assert "notes.txt" not in filenames
    # Currently it should fail because .mp4 and .mov are not in SUPPORTED_EXTENSIONS
    assert len(results) == 3
