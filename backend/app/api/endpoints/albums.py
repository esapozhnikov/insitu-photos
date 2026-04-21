from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from typing import List
from ...database import get_db
from ... import crud, schemas, models, auth

router = APIRouter(dependencies=[Depends(auth.requires_viewer)])

@router.post("/", response_model=schemas.AlbumResponse, dependencies=[Depends(auth.requires_user)])
def create_album(album: schemas.AlbumCreate, db: Session = Depends(get_db)):
    return crud.create_album(db, album)

@router.get("/", response_model=List[schemas.AlbumResponse])
def get_albums(db: Session = Depends(get_db)):
    albums = db.query(models.Album).options(
        selectinload(models.Album.photos),
        selectinload(models.Album.cover_photo),
        selectinload(models.Album.tags)
    ).all()
    
    for album in albums:
        if album.cover_photo:
            album.cover_photo_path = album.cover_photo.thumbnail_small
        elif album.photos:
            # Fallback to the first photo in the album
            album.cover_photo_path = album.photos[0].thumbnail_small
    return albums

@router.post("/{album_id}/photos/{photo_id}", dependencies=[Depends(auth.requires_user)])
def add_photo(album_id: int, photo_id: int, db: Session = Depends(get_db)):
    crud.add_photo_to_album(db, album_id, photo_id)
    return {"message": "Photo added to album"}

@router.delete("/{album_id}/photos/{photo_id}", dependencies=[Depends(auth.requires_user)])
def remove_photo(album_id: int, photo_id: int, db: Session = Depends(get_db)):
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if album and photo:
        if photo in album.photos:
            album.photos.remove(photo)
            db.commit()
    return {"message": "Photo removed from album"}

@router.patch("/{album_id}", dependencies=[Depends(auth.requires_user)])
def update_album(album_id: int, updates: dict, db: Session = Depends(get_db)):
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    if "name" in updates:
        album.name = updates["name"]
    if "description" in updates:
        album.description = updates["description"]
    if "is_smart_sync" in updates:
        album.is_smart_sync = updates["is_smart_sync"]
    if "linked_folder_id" in updates:
        # Convert null or non-existent folder to None
        folder_id = updates["linked_folder_id"]
        album.linked_folder_id = folder_id if folder_id != -1 else None
    if "cover_photo_id" in updates:
        album.cover_photo_id = updates["cover_photo_id"]
    
    db.commit()
    return {"message": "Album updated"}

@router.post("/bulk-add", dependencies=[Depends(auth.requires_user)])
def bulk_add_photos(params: schemas.BulkAlbumAdd, db: Session = Depends(get_db)):
    album = crud.add_photos_to_album(db, params.album_id, params.photo_ids)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return {"message": f"Added {len(params.photo_ids)} photos to album"}
