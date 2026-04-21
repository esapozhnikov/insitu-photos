export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  VIEWER = "viewer"
}

export interface User {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Photo {
  id: number;
  physical_path?: string;
  timestamp: string | null;
  thumbnail_small: string | null;
  thumbnail_large?: string | null;
  description?: string | null;
  camera_make?: string | null;
  camera_model?: string | null;
  lens?: string | null;
  shutter_speed?: string | null;
  aperture?: number | null;
  iso?: number | null;
  gps_lat: number | null;
  gps_long: number | null;
  manual_lat_override: number | null;
  manual_long_override: number | null;
  tags?: Tag[];
  people?: Person[];
  albums?: Album[];
}

export interface Folder {
  id: number;
  path: string;
  is_monitored: boolean;
  last_scanned_at: string | null;
  status: 'idle' | 'scanning';
  scan_error: string | null;
}

export interface Face {
  id: number;
  photo_id: number;
  bounding_box: any;
  thumbnail_path: string | null;
  person_id: number | null;
}

export interface FaceCluster {
  representative_face: Face;
  face_ids: number[];
  count: number;
}

export interface Person {
  id: number;
  name: string | null;
  thumbnail_photo_id: number | null;
  thumbnail_path: string | null;
  face_count?: number;
}

export interface Album {
  id: number;
  name: string;
  description: string | null;
  is_smart_sync: boolean;
  linked_folder_id: number | null;
  cover_photo_id?: number | null;
  cover_photo_path?: string | null;
}

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

export interface PhotoSearch {
  start_date?: string;
  end_date?: string;
  folder_id?: number;
  folder_path?: string;
  recursive?: boolean;
  person_id?: number;
  album_id?: number;
  tag_name?: string;
  query?: string;
}

export interface SystemStatus {
  is_scanning: boolean;
  is_processing_faces: boolean;
  is_recognizing_faces: boolean;
  queue_size: number;
  scanning_folders: string[];
  re_recognition_progress?: string;
  full_rescan_progress?: string;
}
