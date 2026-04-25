from .auth import get_password_hash
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from . import models, schemas

def get_photo_by_path(db: Session, path: str):
    return db.query(models.Photo).filter(models.Photo.physical_path == path).first()

def create_photo(db: Session, photo_data: dict):
    db_photo = models.Photo(**photo_data)
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    return db_photo

def get_folder_by_path(db: Session, path: str):
    return db.query(models.Folder).filter(models.Folder.path == path).first()

def create_folder(db: Session, path: str):
    db_folder = models.Folder(path=path, is_monitored=True)
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

def delete_folder(db: Session, folder_id: int):
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not folder:
        return False

    # Precise path matching: either the folder itself or a sub-path
    base_path = folder.path.rstrip('/')
    sub_path_pattern = base_path + '/%'
    
    photo_ids = [p.id for p in db.query(models.Photo).filter(
        or_(
            models.Photo.physical_path == base_path,
            models.Photo.physical_path.like(sub_path_pattern)
        )
    ).all()]

    if photo_ids:
        # Nullify references in related tables
        db.query(models.Album).filter(models.Album.cover_photo_id.in_(photo_ids)).update({models.Album.cover_photo_id: None}, synchronize_session=False)
        db.query(models.Person).filter(models.Person.thumbnail_photo_id.in_(photo_ids)).update({models.Person.thumbnail_photo_id: None}, synchronize_session=False)

        # Delete from many-to-many join tables
        db.execute(models.album_photos.delete().where(models.album_photos.c.photo_id.in_(photo_ids)))
        db.execute(models.photo_tags.delete().where(models.photo_tags.c.photo_id.in_(photo_ids)))

        # Delete dependent records
        db.query(models.Face).filter(models.Face.photo_id.in_(photo_ids)).delete(synchronize_session=False)

        # Finally delete the photos
        db.query(models.Photo).filter(models.Photo.id.in_(photo_ids)).delete(synchronize_session=False)

    # Nullify linked_folder_id in Albums
    db.query(models.Album).filter(models.Album.linked_folder_id == folder_id).update({models.Album.linked_folder_id: None}, synchronize_session=False)

    # Delete the folder record itself
    db.delete(folder)
    db.commit()
    return True

def update_folder_status(db: Session, folder_id: int, status: str):
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if folder:
        folder.status = status
        db.commit()
        db.refresh(folder)
    return folder

def update_photo_thumbnails(db: Session, photo_id: int, thumbnails: dict):
    db_photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if db_photo:
        db_photo.thumbnail_small = thumbnails.get("small")
        db_photo.thumbnail_large = thumbnails.get("large")
        db.commit()
        db.refresh(db_photo)
    return db_photo

def create_face(db: Session, face_data: dict):
    db_face = models.Face(**face_data)
    db.add(db_face)
    db.commit()
    db.refresh(db_face)
    return db_face

def update_face_thumbnail(db: Session, face_id: int, thumbnail_path: str):
    db_face = db.query(models.Face).filter(models.Face.id == face_id).first()
    if db_face:
        db_face.thumbnail_path = thumbnail_path
        db.commit()
        db.refresh(db_face)
    return db_face

def find_similar_person(db: Session, embedding: list, threshold: float = 0.15):
    """Finds a person with a similar face embedding using pgvector similarity search."""
    # Find the person with the closest face embedding
    # We use a single query to get both the person_id and the distance
    result = db.query(
        models.Face.person_id,
        models.Face.embedding.cosine_distance(embedding).label("distance")
    ).filter(
        models.Face.person_id != None, # noqa: E711
        models.Face.embedding != None # noqa: E711
    ).order_by("distance").first()

    if result and result.distance < threshold:
        return result.person_id

    return None

def get_unassigned_faces(db: Session):
    return db.query(models.Face).filter(models.Face.person_id is None).all()

def reset_faces(db: Session):
    # 1. Nullify person references in Face table
    db.query(models.Face).update({models.Face.person_id: None}, synchronize_session=False)
    # 2. Nullify thumbnail references in Person table
    db.query(models.Person).update({models.Person.thumbnail_photo_id: None}, synchronize_session=False)
    # 3. Delete all Faces and People
    db.query(models.Face).delete(synchronize_session=False)
    db.query(models.Person).delete(synchronize_session=False)
    db.commit()
def search_photos(db: Session, filters: schemas.PhotoSearch, skip: int = 0, limit: int = 100, options: list = None):
    query = db.query(models.Photo)

    if options:
        query = query.options(*options)

    if filters.start_date:
        query = query.filter(models.Photo.timestamp >= filters.start_date)
    if filters.end_date:
        query = query.filter(models.Photo.timestamp <= filters.end_date)
    # Handle folder_id (existing)
    if filters.folder_id:
        folder = db.query(models.Folder).filter(models.Folder.id == filters.folder_id).first()
        if folder:
            query = query.filter(models.Photo.physical_path.like(f"{folder.path}%"))

    # Handle explicit folder_path (new)
    if filters.folder_path:
        # Normalize slashes and ensure trailing slash for prefix matching
        p = filters.folder_path.replace('\\', '/').rstrip('/')

        # Create versions with and without leading slash for robustness
        p_no_slash = p.lstrip('/')
        p_with_slash = '/' + p_no_slash

        if filters.recursive:
            # Match either version as prefix
            query = query.filter(or_(
                models.Photo.physical_path.ilike(f"{p_no_slash}/%"),
                models.Photo.physical_path.ilike(p_no_slash),
                models.Photo.physical_path.ilike(f"{p_with_slash}/%"),
                models.Photo.physical_path.ilike(p_with_slash)
            ))
        else:
            # Match only files directly in this folder
            query = query.filter(or_(
                models.Photo.physical_path.ilike(f"{p_no_slash}/%"),
                models.Photo.physical_path.ilike(f"{p_with_slash}/%")
            )).filter(or_(
                ~models.Photo.physical_path.ilike(f"{p_no_slash}/%/%"),
                ~models.Photo.physical_path.ilike(f"{p_with_slash}/%/%")
            ))

    # Prioritize person_id.
    if filters.person_id:
        query = query.join(models.Face).filter(models.Face.person_id == filters.person_id)

    if filters.face_ids:
        query = query.join(models.Face).filter(models.Face.id.in_(filters.face_ids))

    if filters.album_id:
        query = query.join(models.Photo.albums).filter(models.Album.id == filters.album_id)
    if filters.tag_name:
        query = query.join(models.Photo.tags).filter(models.Tag.name == filters.tag_name)

    if filters.query:
        # If person_id is set, we skip the text query to avoid the "0 photos" bug
        # where the person's name isn't in the metadata.
        if not filters.person_id:
            query = query.filter(or_(
                models.Photo.description.ilike(f"%{filters.query}%"),
                models.Photo.physical_path.ilike(f"%{filters.query}%")
            ))

    return query.distinct().order_by(models.Photo.timestamp.desc()).offset(skip).limit(limit).all()

def create_album(db: Session, album: schemas.AlbumCreate):
    db_album = models.Album(**album.dict())
    db.add(db_album)
    db.commit()
    db.refresh(db_album)
    return db_album

def add_photo_to_album(db: Session, album_id: int, photo_id: int):
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if album and photo:
        if photo not in album.photos:
            album.photos.append(photo)
            db.commit()
    return album

def add_photos_to_album(db: Session, album_id: int, photo_ids: List[int]):
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        return None

    photos = db.query(models.Photo).filter(models.Photo.id.in_(photo_ids)).all()
    for photo in photos:
        if photo not in album.photos:
            album.photos.append(photo)

    db.commit()
    db.refresh(album)
    return album

def update_photo_meta(db: Session, photo_id: int, updates: schemas.PhotoUpdate):
    db_photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not db_photo:
        return None

    if updates.description is not None:
        db_photo.description = updates.description
    if updates.manual_lat_override is not None:
        db_photo.manual_lat_override = updates.manual_lat_override
    if updates.manual_long_override is not None:
        db_photo.manual_long_override = updates.manual_long_override

    if updates.tags is not None:
        # Append new tags to existing ones (if not already present)
        current_tag_names = {t.name for t in db_photo.tags}
        for tag_name in updates.tags:
            if tag_name not in current_tag_names:
                tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
                if not tag:
                    tag = models.Tag(name=tag_name)
                    db.add(tag)
                db_photo.tags.append(tag)
                current_tag_names.add(tag_name)

    db.commit()
    db.refresh(db_photo)
    return db_photo

def update_person(db: Session, person_id: int, name: str):
    db_person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not db_person:
        return None
    db_person.name = name
    db.commit()
    db.refresh(db_person)
    return db_person

def delete_person(db: Session, person_id: int):
    # Unassign faces from the person
    db.query(models.Face).filter(models.Face.person_id == person_id).update({models.Face.person_id: None}, synchronize_session=False)
    # Delete the person record
    db.query(models.Person).filter(models.Person.id == person_id).delete()
    db.commit()

def create_person(db: Session, person: schemas.PersonCreate):
    db_person = models.Person(name=person.name)
    db.add(db_person)
    db.commit()
    db.refresh(db_person)
    return db_person

def assign_face_to_person(db: Session, face_id: int, person_id: int):
    db_face = db.query(models.Face).filter(models.Face.id == face_id).first()
    if db_face:
        db_face.person_id = person_id
        db.commit()
        db.refresh(db_face)
    return db_face

def merge_people(db: Session, source_id: int, target_id: int):
    source = db.query(models.Person).filter(models.Person.id == source_id).first()
    target = db.query(models.Person).filter(models.Person.id == target_id).first()

    if not source or not target:
        return None

    # Move all faces
    db.query(models.Face).filter(models.Face.person_id == source_id).update({models.Face.person_id: target_id})

    # Delete source person
    db.delete(source)
    db.commit()
    db.refresh(target)
    return target

def reset_library(db: Session):
    # Clear many-to-many relationships first
    db.execute(models.album_photos.delete())
    db.execute(models.photo_tags.delete())
    db.execute(models.album_tags.delete())

    # Clear main tables in correct order to respect foreign keys
    db.query(models.Face).delete(synchronize_session=False)
    db.query(models.Person).delete(synchronize_session=False)
    db.query(models.Album).delete(synchronize_session=False)
    db.query(models.Tag).delete(synchronize_session=False)
    db.query(models.Photo).delete(synchronize_session=False)
    # Note: folders are kept so we can re-scan them

    db.commit()

def get_settings(db: Session):
    return db.query(models.Setting).all()

def get_setting(db: Session, key: str):
    return db.query(models.Setting).filter(models.Setting.key == key).first()

def update_setting(db: Session, key: str, value: str):
    db_setting = db.query(models.Setting).filter(models.Setting.key == key).first()
    if not db_setting:
        db_setting = models.Setting(key=key, value=value)
        db.add(db_setting)
    else:
        db_setting.value = value
    db.commit()
    db.refresh(db_setting)
    return db_setting



def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()
