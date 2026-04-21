from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database import get_db
from ... import models, auth

router = APIRouter(dependencies=[Depends(auth.requires_user)])

@router.get("/suggestions")
def get_suggestions(q: str, db: Session = Depends(get_db)):
    if not q or len(q) < 2:
        return {"people": [], "albums": [], "tags": [], "locations": []}
    
    # People
    people = db.query(models.Person).filter(models.Person.name.ilike(f"%{q}%")).limit(5).all()
    
    # Albums
    albums = db.query(models.Album).filter(models.Album.name.ilike(f"%{q}%")).limit(5).all()
    
    # Tags
    tags = db.query(models.Tag).filter(models.Tag.name.ilike(f"%{q}%")).limit(5).all()
    
    # Locations (Camera models/makes as a proxy for now, or just empty)
    # In a real app we might extract distinct city/country names if we had reverse geocoding
    
    return {
        "people": [{"id": p.id, "name": p.name} for p in people],
        "albums": [{"id": a.id, "name": a.name} for a in albums],
        "tags": [{"id": t.id, "name": t.name} for t in tags]
    }
