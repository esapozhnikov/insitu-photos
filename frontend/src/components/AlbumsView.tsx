import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Album, Photo, Folder } from '../types';
import { LayoutGrid, Plus, ChevronLeft, Play, Settings, RefreshCw, X, Check, Info } from 'lucide-react';
import { PhotoGrid } from './PhotoGrid';
import { useAuth } from '../context/AuthContext';

interface AlbumsViewProps {
  onPhotoClick: (photo: Photo, index: number, allPhotos: Photo[]) => void;
  onPlaySlideshow: (photos: Photo[]) => void;
}

export const AlbumsView: React.FC<AlbumsViewProps> = ({ onPhotoClick, onPlaySlideshow }) => {
  const { isUser } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const CHUNK_SIZE = 500;

  // Creation/Edition state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSmartSync, setIsSmartSync] = useState(false);
  const [linkedFolderId, setLinkedFolderId] = useState<number | null>(null);

  const loadData = () => {
    api.getAlbums().then(setAlbums);
    if (isUser) {
      api.getFolders().then(setFolders);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadAlbumPhotos = async (albumId: number, reset = true) => {
    if (isLoadingMore) return;
    if (reset) {
      setHasMore(true);
    }

    setIsLoadingMore(true);
    const skip = reset ? 0 : albumPhotos.length;

    try {
      const results = await api.searchPhotos({ album_id: albumId }, skip, CHUNK_SIZE);
      if (reset) {
        setAlbumPhotos(results);
      } else {
        setAlbumPhotos(prev => [...prev, ...results]);
      }
      setHasMore(results.length === CHUNK_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSelectAlbum = async (album: Album) => {
    setSelectedAlbum(album);
    loadAlbumPhotos(album.id, true);
  };

  const handleLoadMore = () => {
    if (selectedAlbum && hasMore && !isLoadingMore) {
      loadAlbumPhotos(selectedAlbum.id, false);
    }
  };

  const handleStartCreate = () => {
    setName('');
    setDescription('');
    setIsSmartSync(false);
    setLinkedFolderId(null);
    setIsCreating(true);
  };

  const handleStartEdit = () => {
    if (!selectedAlbum) return;
    setName(selectedAlbum.name);
    setDescription(selectedAlbum.description || '');
    setIsSmartSync(selectedAlbum.is_smart_sync);
    setLinkedFolderId(selectedAlbum.linked_folder_id);
    setIsEditing(true);
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    await api.createAlbum({ 
      name: name.trim(),
      description: description.trim() || null,
      is_smart_sync: isSmartSync,
      linked_folder_id: isSmartSync ? linkedFolderId : null
    });
    setIsCreating(false);
    loadData();
  };

  const handleUpdateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlbum || !name.trim()) return;
    
    await api.updateAlbum(selectedAlbum.id, {
      name: name.trim(),
      description: description.trim() || null,
      is_smart_sync: isSmartSync,
      linked_folder_id: isSmartSync ? linkedFolderId : null
    });
    
    // Refresh selected album and list
    const updated = await api.getAlbum(selectedAlbum.id);
    setSelectedAlbum(updated);
    setIsEditing(false);
    loadData();
  };

  if (selectedAlbum) {
    return (
      <div className="p-6 h-full flex flex-col">
        <header className="mb-8 flex items-center gap-4">
          <button 
            onClick={() => setSelectedAlbum(null)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">{selectedAlbum.name}</h2>
              {selectedAlbum.is_smart_sync && (
                <span className="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1">
                  <RefreshCw size={10} /> SMART SYNC
                </span>
              )}
            </div>
            <p className="text-slate-400">{albumPhotos.length} photos</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleStartEdit}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all"
              title="Album Settings"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => onPlaySlideshow(albumPhotos)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-purple-900/20 transform active:scale-95"
            >
              <Play size={20} fill="currentColor" /> Play Slideshow
            </button>
          </div>
        </header>

        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <form onSubmit={handleUpdateAlbum} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
              <header className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings size={24} className="text-blue-500" /> Album Settings
                </h2>
                <button type="button" onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </header>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Album Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold flex items-center gap-2">
                        <RefreshCw size={16} className="text-blue-500" /> Smart Folder Sync
                      </h3>
                      <p className="text-xs text-slate-500">Automatically add photos from a folder.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsSmartSync(!isSmartSync)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isSmartSync ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSmartSync ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  {isSmartSync && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Link to Folder</label>
                      <select 
                        value={linkedFolderId || ''}
                        onChange={(e) => setLinkedFolderId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 outline-none focus:border-blue-500 appearance-none"
                      >
                        <option value="">Select an indexed folder...</option>
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>{f.path}</option>
                        ))}
                      </select>
                      <div className="flex gap-2 text-[10px] text-slate-500 bg-slate-800/50 p-3 rounded-xl">
                        <Info size={14} className="flex-shrink-0" />
                        <p>Any photo found in this folder (or subfolders) will be automatically added to this album during scans.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <footer className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-3">
                <button 
                  type="submit" 
                  disabled={!name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Check size={20} /> Save Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </footer>
            </form>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <PhotoGrid 
            photos={albumPhotos} 
            onPhotoClick={(_, index) => onPhotoClick(_, index, albumPhotos)}
            selectedIds={new Set()}
            onToggleSelect={() => {}}
            onLoadMore={handleLoadMore}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <LayoutGrid size={32} className="text-purple-500" /> Albums
        </h2>
        {isUser && (
          <button 
            onClick={handleStartCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-colors shadow-lg shadow-blue-900/20"
          >
            <Plus size={20} /> Create Album
          </button>
        )}
      </header>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateAlbum} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <header className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus size={24} className="text-blue-500" /> Create New Album
              </h2>
              <button type="button" onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </header>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Album Name</label>
                <input 
                  type="text" 
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Vacation 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold flex items-center gap-2">
                      <RefreshCw size={16} className="text-blue-500" /> Smart Folder Sync
                    </h3>
                    <p className="text-xs text-slate-500">Automatically add photos from a folder.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsSmartSync(!isSmartSync)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isSmartSync ? 'bg-blue-600' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSmartSync ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                
                {isSmartSync && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Link to Folder</label>
                    <select 
                      value={linkedFolderId || ''}
                      onChange={(e) => setLinkedFolderId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 outline-none focus:border-blue-500 appearance-none"
                    >
                      <option value="">Select an indexed folder...</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.path}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <footer className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-3">
              <button 
                type="submit" 
                disabled={!name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-xl font-bold"
              >
                Create Album
              </button>
              <button 
                type="button" 
                onClick={() => setIsCreating(false)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold"
              >
                Cancel
              </button>
            </footer>
          </form>
        </div>
      )}

      {albums.length === 0 ? (
        <div className="bg-slate-900 p-12 rounded-2xl text-center border border-slate-800">
          <p className="text-slate-500 italic text-lg">No albums created yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {albums.map(album => (
            <div 
              key={album.id} 
              onClick={() => handleSelectAlbum(album)}
              className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 group cursor-pointer hover:border-purple-500 transition-colors relative"
            >
              <div className="aspect-square bg-slate-800 flex items-center justify-center relative overflow-hidden">
                {album.cover_photo_path ? (
                  <img src={`/cache/${album.cover_photo_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                ) : (
                  <LayoutGrid size={48} className="text-slate-700 group-hover:text-purple-500/50 transition-colors" />
                )}
                {album.is_smart_sync && (
                  <div className="absolute top-2 right-2 bg-blue-600/90 text-white p-1.5 rounded-lg shadow-lg backdrop-blur-sm" title="Smart Sync Enabled">
                    <RefreshCw size={14} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="font-semibold text-lg truncate">{album.name}</div>
                <div className="text-sm text-slate-500 flex items-center gap-1">
                  {album.is_smart_sync ? 'Smart Album' : 'Manual Album'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
