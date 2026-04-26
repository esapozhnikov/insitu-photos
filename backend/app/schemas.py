from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from .models import UserRole, MediaType

class FolderCreate(BaseModel):
    path: str

class FolderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    path: str
    is_monitored: bool
    last_scanned_at: Optional[datetime]
    status: str
    scan_error: Optional[str] = None
    total_files: int
    processed_files: int

class TagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
class AlbumResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str]
    is_smart_sync: bool
    linked_folder_id: Optional[int]
    cover_photo_id: Optional[int] = None
    cover_photo_path: Optional[str] = None

class PersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: Optional[str] = None
    thumbnail_photo_id: Optional[int] = None
    thumbnail_path: Optional[str] = None
    face_count: int = 0

class PhotoMapResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: Optional[datetime]
    thumbnail_small: Optional[str]
    gps_lat: Optional[float] = None
    gps_long: Optional[float] = None
    manual_lat_override: Optional[float] = None
    manual_long_override: Optional[float] = None

class PhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    physical_path: str
    timestamp: Optional[datetime]
    thumbnail_small: Optional[str]
    thumbnail_large: Optional[str]
    description: Optional[str] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    lens: Optional[str] = None
    shutter_speed: Optional[str] = None
    aperture: Optional[float] = None
    iso: Optional[int] = None
    gps_lat: Optional[float] = None
    gps_long: Optional[float] = None
    manual_lat_override: Optional[float] = None
    manual_long_override: Optional[float] = None
    media_type: MediaType = MediaType.PHOTO
    tags: List[TagResponse] = []
    people: List[PersonResponse] = []
    albums: List[AlbumResponse] = []


class PhotoUpdate(BaseModel):
    description: Optional[str] = None
    manual_lat_override: Optional[float] = None
    manual_long_override: Optional[float] = None
    tags: Optional[List[str]] = None

class BulkPhotoUpdate(PhotoUpdate):
    photo_ids: List[int]

class FaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    photo_id: int
    person_id: Optional[int] = None
    bounding_box: dict
    thumbnail_path: Optional[str] = None

class FaceClusterResponse(BaseModel):
    representative_face: FaceResponse
    face_ids: List[int]
    count: int

class PersonCreate(BaseModel):
    name: str

class PersonUpdate(BaseModel):
    name: str

class PersonMerge(BaseModel):
    source_person_id: int
    target_person_id: int

class FaceBulkAssign(BaseModel):
    face_ids: List[int]
    person_id: Optional[int] = None
    name: Optional[str] = None

class BackgroundJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    status: str
    progress_text: Optional[str] = None
    progress_percent: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

class LibraryStats(BaseModel):
    total_photos: int
    scanned_photos: int
    total_folders: int
    total_albums: int
    total_faces: int
    total_people: int
    identified_faces: int
    photos_by_year: dict[str, int]
    folders: List[FolderResponse] = []
    active_jobs: List[BackgroundJobResponse] = []

class SystemStatus(BaseModel):
    is_scanning: bool
    is_processing_faces: bool
    is_recognizing_faces: bool
    queue_size: int
    scanning_folders: List[str]
    re_recognition_progress: Optional[str] = None
    full_rescan_progress: Optional[str] = None

class AlbumCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_smart_sync: bool = False
    linked_folder_id: Optional[int] = None

class BulkAlbumAdd(BaseModel):
    album_id: int
    photo_ids: List[int]

class PhotoSearch(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    folder_id: Optional[int] = None
    folder_path: Optional[str] = None
    recursive: bool = True
    person_id: Optional[int] = None
    face_ids: Optional[List[int]] = None
    album_id: Optional[int] = None
    tag_name: Optional[str] = None
    query: Optional[str] = None
    media_type: Optional[MediaType] = None

class SettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    value: str

class SettingUpdate(BaseModel):
    value: str

# Auth & User Schemas
class UserBase(BaseModel):
    username: str
    role: UserRole = UserRole.VIEWER
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None

class Login(BaseModel):
    username: str
    password: str
