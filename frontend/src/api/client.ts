import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
});

// Store token in memory
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// Request interceptor to add the bearer token
client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor to handle token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh
        const { data } = await axios.post('/api/auth/refresh');
        accessToken = data.access_token;
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear token and let AuthContext handle redirect
        accessToken = null;
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: (credentials: any) => client.post('/auth/login', credentials).then(res => {
    setAccessToken(res.data.access_token);
    return res.data;
  }),
  logout: () => client.post('/auth/logout').then(res => {
    setAccessToken(null);
    return res.data;
  }),
  getMe: () => client.get('/auth/me').then(res => res.data),
  
  // Users (Admin Only)
  getUsers: () => client.get('/users/').then(res => res.data),
  createUser: (user: any) => client.post('/users/', user).then(res => res.data),
  updateUser: (id: number, updates: any) => client.patch(`/users/${id}`, updates).then(res => res.data),
  deleteUser: (id: number) => client.delete(`/users/${id}`).then(res => res.data),

  // Photos
  getPhotos: (skip = 0, limit = 500) => client.get('/photos/', { params: { skip, limit } }).then(res => res.data),
  getGeolocatedPhotos: () => client.get('/photos/geolocated').then(res => res.data),
  getPhoto: (id: number) => client.get(`/photos/${id}`).then(res => res.data),
  
  // Folders
  getFolders: () => client.get('/folders/').then(res => res.data),
  addFolder: (path: string) => client.post('/folders/', { path }).then(res => res.data),
  deleteFolder: (id: number) => client.delete(`/folders/${id}`).then(res => res.data),
  scanFolder: (id: number) => client.post(`/folders/${id}/scan`).then(res => res.data),
  getFolderTree: () => client.get('/folders/tree').then(res => res.data),

  // Admin / Settings
  reRunRecognition: () => client.post('/admin/re-run-recognition').then(res => res.data),
  fullFaceRescan: () => client.post('/admin/full-face-rescan').then(res => res.data),
  scanMissingFaces: () => client.post('/admin/scan-missing-faces').then(res => res.data),
  resetBackgroundTasks: () => client.post('/admin/reset-background-tasks').then(res => res.data),
  resetLibrary: () => client.post('/admin/reset').then(res => res.data),
  browseDirectory: (path?: string) => client.get('/admin/browse', { params: { path } }).then(res => res.data),
  getSettings: () => client.get('/settings/').then(res => res.data),
  updateSetting: (key: string, value: string) => client.put(`/settings/${key}`, { value }).then(res => res.data),

  // People
  getPeople: () => client.get('/people/').then(res => res.data),
  createPerson: (name: string) => client.post('/people/', { name }).then(res => res.data),
  getUnnamedClusters: () => client.get('/people/unnamed-clusters').then(res => res.data),
  getFaces: (faceIds: number[]) => client.post('/people/faces', faceIds).then(res => res.data),
  bulkAssignFaces: (faceIds: number[], personId?: number, name?: string) => client.post('/people/bulk-assign', { face_ids: faceIds, person_id: personId, name }).then(res => res.data),
  assignFaceToPerson: (faceId: number, personId: number) => client.patch(`/people/faces/${faceId}`, { person_id: personId }).then(res => res.data),
  getPersonFaces: (id: number) => client.get(`/people/${id}/faces`).then(res => res.data),
  updatePerson: (id: number, name: string) => client.patch(`/people/${id}`, { name }).then(res => res.data),
  deletePerson: (id: number) => client.delete(`/people/${id}`).then(res => res.data),
  mergePeople: (sourceId: number, targetId: number) => client.post('/people/merge', { source_person_id: sourceId, target_person_id: targetId }).then(res => res.data),

  // Search
  searchPhotos: (filters: any, skip = 0, limit = 500) => client.post('/photos/search', filters, { params: { skip, limit } }).then(res => res.data),
  getSearchSuggestions: (q: string) => client.get('/search/suggestions', { params: { q } }).then(res => res.data),

  // Albums
  createAlbum: (album: any) => client.post('/albums/', album).then(res => res.data),
  getAlbums: () => client.get('/albums/').then(res => res.data),
  getAlbum: (id: number) => client.get(`/albums/${id}`).then(res => res.data),
  updateAlbum: (id: number, updates: any) => client.patch(`/albums/${id}`, updates).then(res => res.data),
  bulkAddPhotosToAlbum: (albumId: number, photoIds: number[]) => client.post('/albums/bulk-add', { album_id: albumId, photo_ids: photoIds }).then(res => res.data),
  removePhotoFromAlbum: (albumId: number, photoId: number) => client.delete(`/albums/${albumId}/photos/${photoId}`).then(res => res.data),
  setAlbumCover: (albumId: number, photoId: number) => client.patch(`/albums/${albumId}`, { cover_photo_id: photoId }).then(res => res.data),

  // Stats
  getStats: () => client.get('/stats/').then(res => res.data),
  getSystemStatus: () => client.get('/stats/status').then(res => res.data),

  // Photo Update
  updatePhoto: (id: number, updates: any) => client.patch(`/photos/${id}`, updates).then(res => res.data),
  bulkUpdatePhotos: (updates: any) => client.post('/photos/bulk-update', updates).then(res => res.data),
  getPhotoFaces: (photoId: number) => client.get(`/photos/${photoId}/faces`).then(res => res.data),
  deletePhotoFace: (photoId: number, faceId: number) => client.delete(`/photos/${photoId}/faces/${faceId}`).then(res => res.data),
};
