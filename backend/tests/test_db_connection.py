from app.database import engine
from sqlalchemy import text

def test_connection():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        assert result.fetchone()[0] == 1
