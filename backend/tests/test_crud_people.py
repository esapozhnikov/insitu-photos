from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.database import SessionLocal, engine, Base
import pytest

@pytest.fixture
def db_session():
    # Setup: Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Teardown: Optional, but usually we clear data
        crud.reset_library(db)

def test_delete_person(db_session: Session):
    person = crud.create_person(db_session, schemas.PersonCreate(name="Test Person"))
    person_id = person.id
    
    # Verify created
    assert db_session.query(models.Person).filter_by(id=person_id).first() is not None
    
    # Delete
    crud.delete_person(db_session, person_id)
    
    # Verify deleted
    assert db_session.query(models.Person).filter_by(id=person_id).first() is None
