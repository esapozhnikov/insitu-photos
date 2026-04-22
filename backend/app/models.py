from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Table, JSON, Enum
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from .database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"

# Many-to-Many join table for Album and Photos
album_photos = Table(
    "album_photos",
    Base.metadata,
    Column("album_id", Integer, ForeignKey("albums.id"), primary_key=True),
    Column("photo_id", Integer, ForeignKey("photos.id"), primary_key=True),
)

photo_tags = Table(
    "photo_tags",
    Base.metadata,
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
    Column("photo_id", Integer, ForeignKey("photos.id"), primary_key=True),
)

album_tags = Table(
    "album_tags",
    Base.metadata,
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
    Column("album_id", Integer, ForeignKey("albums.id"), primary_key=True),
)

class Photo(Base):
    __tablename__ = "photos"
    id = Column(Integer, primary_key=True, index=True)
    physical_path = Column(String, unique=True, index=True)
    checksum = Column(String, index=True)
    timestamp = Column(DateTime, index=True)
    width = Column(Integer)
    height = Column(Integer)
    gps_lat = Column(Float, nullable=True)
    gps_long = Column(Float, nullable=True)
    manual_lat_override = Column(Float, nullable=True)
    manual_long_override = Column(Float, nullable=True)
    description = Column(String, nullable=True)
    camera_make = Column(String, nullable=True)
    camera_model = Column(String, nullable=True)
    lens = Column(String, nullable=True)
    shutter_speed = Column(String, nullable=True)
    aperture = Column(Float, nullable=True)
    iso = Column(Integer, nullable=True)
    thumbnail_small = Column(String, nullable=True)
    thumbnail_large = Column(String, nullable=True)
    is_face_scanned = Column(Boolean, default=False, index=True)

    albums = relationship("Album", secondary=album_photos, back_populates="photos")    faces = relationship("Face", back_populates="photo")
    tags = relationship("Tag", secondary=photo_tags, back_populates="photos")

class Album(Base):
    __tablename__ = "albums"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    is_smart_sync = Column(Boolean, default=False)
    linked_folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    cover_photo_id = Column(Integer, ForeignKey("photos.id"), nullable=True)
    
    photos = relationship("Photo", secondary=album_photos, back_populates="albums")
    tags = relationship("Tag", secondary=album_tags, back_populates="albums")
    cover_photo = relationship("Photo", foreign_keys=[cover_photo_id])

class Folder(Base):
    __tablename__ = "folders"
    id = Column(Integer, primary_key=True, index=True)
    path = Column(String, unique=True, index=True)
    is_monitored = Column(Boolean, default=False)
    last_scanned_at = Column(DateTime, nullable=True)
    status = Column(String, default="idle")
    scan_error = Column(String, nullable=True)

class Person(Base):
    __tablename__ = "people"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True)
    thumbnail_photo_id = Column(Integer, ForeignKey("photos.id"), nullable=True)
    
    faces = relationship("Face", back_populates="person")

class Face(Base):
    __tablename__ = "faces"
    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, ForeignKey("photos.id"), index=True)
    person_id = Column(Integer, ForeignKey("people.id"), nullable=True, index=True)
    
    # Bounding box as JSON: {"x1": 10, "y1": 10, "x2": 100, "y2": 100}
    bounding_box = Column(JSON)
    
    # Path to the cropped face thumbnail
    thumbnail_path = Column(String, nullable=True)
    
    # Embedding vector (e.g., 512 dimensions for InsightFace)
    embedding = Column(Vector(512))
    
    photo = relationship("Photo", back_populates="faces")
    person = relationship("Person", back_populates="faces")

class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    photos = relationship("Photo", secondary=photo_tags, back_populates="tags")
    albums = relationship("Album", secondary=album_tags, back_populates="tags")

class Setting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(String)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True)
