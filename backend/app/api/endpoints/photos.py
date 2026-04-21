from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_
from typing import List
from ...database import get_db
from ... import crud, schemas, models, auth
import os

router = APIRouter()

def _populate_people(photos):
    for photo in photos:
        people_map = {}
        for face in photo.faces:
            if face.person and face.person.id not in people_map:
                people_map[face.person.id] = face.person
        photo.people = list(people_map.values())
    return photos

@router.get("/", response_model=List[schemas.PhotoResponse])
def get_photos(skip: int = 0, limit: int = 500, db: Session = Depends(get_db), current_user: models.User = Depends(auth.requires_user)):
    photos = db.query(models.Photo).options(
        selectinload(models.Photo.tags),
        selectinload(models.Photo.albums),
        selectinload(models.Photo.faces).selectinload(models.Face.person)
    ).order_by(models.Photo.timestamp.desc()).offset(skip).limit(limit).all()
    
    return _populate_people(photos)

@router.get("/geolocated", response_model=List[schemas.PhotoMapResponse])
def get_geolocated_photos(db: Session = Depends(get_db), current_user: models.User = Depends(auth.requires_user)):
    """Fetch ALL photos that have either GPS data or manual location override."""
    return db.query(models.Photo).filter(
        or_(
            models.Photo.gps_lat != None, # noqa: E711
            models.Photo.gps_long != None, # noqa: E711
            models.Photo.manual_lat_override != None, # noqa: E711
            models.Photo.manual_long_override != None # noqa: E711
        )
    ).all()

@router.post("/search", response_model=List[schemas.PhotoResponse])
def search_photos(filters: schemas.PhotoSearch, skip: int = 0, limit: int = 500, db: Session = Depends(get_db), current_user: models.User = Depends(auth.requires_viewer)):
    # Viewers can only search if album_id is specified
    if current_user.role == models.UserRole.VIEWER and not filters.album_id:
         raise HTTPException(
                status_code=403,
                detail="Viewers can only access photos within an album",
            )

    options = [
        selectinload(models.Photo.tags),
        selectinload(models.Photo.albums),
        selectinload(models.Photo.faces).selectinload(models.Face.person)
    ]
    
    photos = crud.search_photos(db, filters, skip, limit, options=options)
    
    return _populate_people(photos)

@router.get("/{photo_id}", response_model=schemas.PhotoResponse)
def get_photo(photo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.requires_viewer)):
    photo = db.query(models.Photo).options(
        selectinload(models.Photo.tags),
        selectinload(models.Photo.albums),
        selectinload(models.Photo.faces).selectinload(models.Face.person)
    ).filter(models.Photo.id == photo_id).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    # If viewer, ensure photo belongs to at least one album
    if current_user.role == models.UserRole.VIEWER and not photo.albums:
         raise HTTPException(
                status_code=403,
                detail="Viewers can only access photos within an album",
            )

    return _populate_people([photo])[0]

@router.get("/{photo_id}/download")
def download_photo(photo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.requires_viewer)):
    db_photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not db_photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # If viewer, ensure photo belongs to at least one album
    if current_user.role == models.UserRole.VIEWER and not db_photo.albums:
         raise HTTPException(
                status_code=403,
                detail="Viewers can only access photos within an album",
            )

    if not os.path.exists(db_photo.physical_path):
        raise HTTPException(status_code=404, detail="Original file not found on disk")

    return FileResponse(
        path=db_photo.physical_path,
        filename=os.path.basename(db_photo.physical_path),
        media_type='application/octet-stream'
    )

@router.patch("/{photo_id}", response_model=schemas.PhotoResponse)
def update_photo(photo_id: int, updates: schemas.PhotoUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.requires_user)):
    photo = crud.update_photo_meta(db, photo_id, updates)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo

@router.get("/{photo_id}/faces", response_model=List[schemas.FaceResponse])
def get_photo_faces(photo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.requires_viewer)):
    return db.query(models.Face).filter(models.Face.photo_id == photo_id).all()

@router.delete("/{photo_id}/faces/{face_id}")
def delete_photo_face(photo_id: int, face_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.requires_user)):
    db.query(models.Face).filter(models.Face.id == face_id, models.Face.photo_id == photo_id).update({models.Face.person_id: None})
    db.commit()
    return {"message": "Person unassigned from face"}

@router.post("/bulk-update")
def bulk_update_photos(updates: schemas.BulkPhotoUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.requires_user)):
    for pid in updates.photo_ids:
        crud.update_photo_meta(db, pid, updates)
    return {"message": f"Updated {len(updates.photo_ids)} photos"}
