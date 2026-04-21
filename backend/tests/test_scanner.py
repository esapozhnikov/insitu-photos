import os
from app.utils.scanner import scan_directory

def test_scan_directory(tmp_path):
    d = tmp_path / "photos"
    d.mkdir()
    (d / "photo1.jpg").write_text("dummy content")
    (d / "photo2.png").write_text("dummy content")
    (d / "notes.txt").write_text("not a photo")
    
    # Subdirectory
    sub = d / "vacation"
    sub.mkdir()
    (sub / "photo3.jpeg").write_text("dummy content")
    
    results = scan_directory(str(d))
    # Filter to only check for our dummy files by name
    filenames = [os.path.basename(r) for r in results]
    assert "photo1.jpg" in filenames
    assert "photo2.png" in filenames
    assert "photo3.jpeg" in filenames
    assert "notes.txt" not in filenames
    assert len(results) == 3
