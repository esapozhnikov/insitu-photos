from app.database import Base, engine
from app.models import Photo

def test_create_tables():
    # This will create all tables in the database
    Base.metadata.create_all(bind=engine)
    # If no error, tables were created. We can also verify table names.
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    assert "photos" in tables
    assert "albums" in tables
    assert "folders" in tables
    assert "album_photos" in tables
