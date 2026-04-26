import React, { useEffect, useState } from 'react';
import { Camera, Image as ImageIcon, Map as MapIcon, Users, Settings, Search, BarChart3, X, Tag as TagIcon, LayoutGrid, Trash2, Folder, MapPin, Play, LogOut } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from './api/client';
import { Photo, Album } from './types';
import { PhotoGrid } from './components/PhotoGrid';
import { VideosView } from './components/VideosView';
import AdminView from './components/AdminView';
import { MapView } from './components/MapView';
import { PeopleView } from './components/PeopleView';
import { StatsView } from './components/StatsView';
import { PhotoModal } from './components/PhotoModal';
import { AlbumsView } from './components/AlbumsView';
import { FoldersView } from './components/FoldersView';
import { AlbumSelectorModal } from './components/AlbumSelectorModal';
import { LocationPickerModal } from './components/LocationPickerModal';
import { BulkTagModal } from './components/BulkTagModal';
import { Slideshow } from './components/Slideshow';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginView from './components/LoginView';

const AppContent = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, isAdmin, isUser } = useAuth();

  const currentPath = location.pathname;
  const photoIdParam = searchParams.get('photo');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [suggestions, setSuggestions] = useState<{people: any[], albums: any[], tags: any[]}>({ people: [], albums: [], tags: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Modal State
  const [modalPhotos, setModalPhotos] = useState<Photo[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [activeCluster, setActiveCluster] = useState<Photo[] | null>(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [isBulkLocationModalOpen, setIsBulkLocationModalOpen] = useState(false);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);

  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [slideshowPhotos, setSlideshowPhotos] = useState<Photo[]>([]);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const CHUNK_SIZE = 500;

  const loadPhotos = async (query?: string, filters: any = {}, reset = true) => {
    if (isLoadingMore || !isUser) return;

    if (reset) {
      setHasMore(true);
    }

    setIsLoadingMore(true);
    const skip = reset ? 0 : photos.length;

    try {
      let results: Photo[];
      if (query || Object.keys(filters).length > 0) {
        results = await api.searchPhotos({ query, ...filters }, skip, CHUNK_SIZE);
      } else {
        results = await api.getPhotos(skip, CHUNK_SIZE);
      }

      if (reset) {
        setPhotos(results);
      } else {
        setPhotos(prev => [...prev, ...results]);
      }

      setHasMore(results.length === CHUNK_SIZE);
    } catch (err) {
      console.error("Error loading photos:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadMorePhotos = () => {
    if (!hasMore || isLoadingMore) return;
    loadPhotos(searchQuery, activeFilters, false);
  };

  useEffect(() => {
    if (isUser) {
      loadPhotos(searchQuery, activeFilters);
    }
  }, [isUser]);

  // Search Suggestions Effect
  useEffect(() => {
    if (searchQuery.length < 2 || !isUser) {
      setSuggestions({ people: [], albums: [], tags: [] });
      return;
    }

    const timer = setTimeout(() => {
      api.getSearchSuggestions(searchQuery).then(setSuggestions);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isUser]);

  const handleSuggestionClick = (type: string, item: any) => {
    const newFilters = { ...activeFilters };
    if (type === 'people') newFilters.person_id = item.id;
    if (type === 'albums') newFilters.album_id = item.id;
    if (type === 'tags') newFilters.tag_name = item.name;

    setActiveFilters(newFilters);
    setSearchQuery(item.name);
    setShowSuggestions(false);
    loadPhotos(item.name, newFilters);
  };

  const handlePersonClick = (personId: number, personName: string) => {
    const filters = { person_id: personId };
    setActiveFilters(filters);
    setSearchQuery(personName);
    navigate('/photos');
    loadPhotos('', filters);
  };

  const handlePhotoClick = (photo: Photo, index: number, allPhotos: Photo[]) => {
    setModalPhotos(allPhotos);
    setSelectedPhotoIndex(index);
    setSearchParams({ photo: photo.id.toString() });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPhotos(searchQuery);
  };

  const handleToggleSelect = (id: number, shiftKey: boolean, index: number) => {
    const newSelected = new Set(selectedIds);

    if (shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      for (let i = start; i <= end; i++) {
        newSelected.add(photos[i].id);
      }
    } else {
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    }

    setSelectedIds(newSelected);
    setLastSelectedIndex(index);
  };

  const handleSelectAll = (ids: number[]) => {
    const newSelected = new Set(selectedIds);
    ids.forEach(id => newSelected.add(id));
    setSelectedIds(newSelected);
  };

  const handleBulkTagsSave = async (tags: string[]) => {
    await api.bulkUpdatePhotos({
      photo_ids: Array.from(selectedIds),
      tags: tags
    });

    alert(`Updated ${selectedIds.size} photos`);
    setIsBulkTagModalOpen(false);
    setSelectedIds(new Set());
    loadPhotos(searchQuery);
  };

  const handleBulkLocationSelect = async (lat: number, lng: number) => {
    await api.bulkUpdatePhotos({
      photo_ids: Array.from(selectedIds),
      manual_lat_override: lat,
      manual_long_override: lng
    });

    alert(`Updated location for ${selectedIds.size} photos`);
    setIsBulkLocationModalOpen(false);
    setSelectedIds(new Set());
    loadPhotos(searchQuery);
  };

  const handleAddToAlbum = async () => {
    const albums = await api.getAlbums();
    setAllAlbums(albums);
    setIsAlbumModalOpen(true);
  };

  const handleSelectAlbum = async (albumId: number) => {
    await api.bulkAddPhotosToAlbum(albumId, Array.from(selectedIds));
    alert(`Added ${selectedIds.size} photos to album`);
    setSelectedIds(new Set());
    setIsAlbumModalOpen(false);
  };

  const handleCreateAlbum = async (name: string) => {
    const newAlbum = await api.createAlbum({ name });
    await api.bulkAddPhotosToAlbum(newAlbum.id, Array.from(selectedIds));
    alert(`Created album "${name}" and added ${selectedIds.size} photos`);
    setSelectedIds(new Set());
    setIsAlbumModalOpen(false);
  };

  const handlePhotoUpdate = (updatedPhoto: Photo) => {
    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
    setModalPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
  };

  useEffect(() => {
    if (photoIdParam && photos.length > 0) {
      const id = parseInt(photoIdParam);
      const index = photos.findIndex(p => p.id === id);
      if (index !== -1) {
        setModalPhotos(photos);
        setSelectedPhotoIndex(index);
      }
    }
  }, [photoIdParam, photos]);

  useEffect(() => {
    if (selectedPhotoIndex !== null && modalPhotos[selectedPhotoIndex]) {
      const currentPhotoId = modalPhotos[selectedPhotoIndex].id;
      if (photoIdParam !== currentPhotoId.toString()) {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('photo', currentPhotoId.toString());
        setSearchParams(newParams);
      }
    }
  }, [selectedPhotoIndex, modalPhotos, photoIdParam, searchParams, setSearchParams]);

  const handleCloseModal = () => {
    setSelectedPhotoIndex(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('photo');
    setSearchParams(newParams);
  };

  const selectedPhoto = selectedPhotoIndex !== null ? modalPhotos[selectedPhotoIndex] : null;

  const handleViewCluster = (clusterPhotos: Photo[]) => {
    setActiveCluster(null);
    setPhotos(clusterPhotos);
    navigate('/photos');
  };

  const NavLink = ({ to, icon: Icon, label, restricted = false, onClick }: any) => {
    if (restricted) return null;

    return (
      <Link
        to={to}
        onClick={onClick}
        className={`flex items-center gap-3 p-2 rounded-lg w-full text-left transition-colors ${isActive(to) ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}
      >
        <Icon size={20} className={isActive(to) ? 'text-white' : 'text-slate-500'} />
        <span className="font-medium text-sm">{label}</span>
      </Link>
    );
  };

  const isActive = (path: string) => {
    if (path === '/photos' && (location.pathname === '/photos' || location.pathname === '/')) return true;
    return location.pathname === path;
  };

  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginView />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white selection:bg-blue-500/30">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-800 p-4 flex flex-col gap-4 bg-slate-900/50 backdrop-blur-xl">
        <h1 className="text-xl font-bold flex items-center gap-3">
          <img src="/logo_ui.png" alt="Insitu-Photos" className="h-8 w-8 object-contain" /> Insitu-Photos
        </h1>

        {isUser && (
          <div className="relative mt-4">
            <form onSubmit={handleSearch}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search photos..."
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </form>

            {showSuggestions && (searchQuery.length >= 2) && (suggestions.people.length > 0 || suggestions.albums.length > 0 || suggestions.tags.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden py-2 animate-in fade-in zoom-in duration-200">
                {suggestions.people.length > 0 && (
                  <div>
                    <div className="px-4 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/50">People</div>
                    {suggestions.people.map(p => (
                      <button key={p.id} onClick={() => handleSuggestionClick('people', p)} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-600 transition-colors flex items-center gap-2">
                        <Users size={14} className="text-blue-400" /> {p.name}
                      </button>
                    ))}
                  </div>
                )}
                {suggestions.albums.length > 0 && (
                  <div className="mt-2">
                    <div className="px-4 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/50">Albums</div>
                    {suggestions.albums.map(a => (
                      <button key={a.id} onClick={() => handleSuggestionClick('albums', a)} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-600 transition-colors flex items-center gap-2">
                        <LayoutGrid size={14} className="text-purple-400" /> {a.name}
                      </button>
                    ))}
                  </div>
                )}
                {suggestions.tags.length > 0 && (
                  <div className="mt-2">
                    <div className="px-4 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/50">Tags</div>
                    {suggestions.tags.map(t => (
                      <button key={t.id} onClick={() => handleSuggestionClick('tags', t)} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-600 transition-colors flex items-center gap-2">
                        <TagIcon size={14} className="text-orange-400" /> {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <nav className="flex flex-col gap-2 mt-4 flex-1 overflow-y-auto custom-scrollbar">
          <NavLink to="/photos" icon={ImageIcon} label="Timeline" onClick={() => loadPhotos()} restricted={!isUser} />
          <NavLink to="/videos" icon={Play} label="Videos" restricted={!isUser} />
          <NavLink to="/people" icon={Users} label="People" restricted={!isUser} />
          <NavLink to="/albums" icon={LayoutGrid} label="Albums" />
          <NavLink to="/folders" icon={Folder} label="Folders" restricted={!isUser} />
          <NavLink to="/map" icon={MapIcon} label="Map" restricted={!isUser} />
          <NavLink to="/stats" icon={BarChart3} label="Stats" restricted={!isUser} />
          <div className="mt-4 pt-4 border-t border-slate-800">
            <NavLink to="/admin" icon={Settings} label="Settings" restricted={!isAdmin} />
          </div>
        </nav>

        {/* User Profile / Logout */}
        <div className="p-2 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-xs font-bold text-blue-400">
              {user?.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user?.username}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role}</div>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <Routes>
          <Route path="/photos" element={
            <ProtectedRoute allowedRoles={['admin', 'user']}>
              <div className="p-6 h-full flex flex-col">
                <header className="mb-8 flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-bold">Timeline</h2>
                    <p className="text-slate-400 font-medium">{photos.length} photos found</p>
                  </div>
                  <button
                    onClick={() => { setSlideshowPhotos(photos); setIsSlideshowOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 transform active:scale-95"
                  >
                    <Play size={20} fill="currentColor" /> Play Slideshow
                  </button>
                </header>
                <div className="flex-1 overflow-hidden">
                  <PhotoGrid
                    photos={photos}
                    onPhotoClick={(photo, index) => handlePhotoClick(photo, index, photos)}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onPlaySlideshow={() => { setSlideshowPhotos(photos); setIsSlideshowOpen(true); }}
                    onLoadMore={loadMorePhotos}
                  />
                </div>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/videos" element={
            <ProtectedRoute allowedRoles={['admin', 'user']}>
              <VideosView 
                onPhotoClick={handlePhotoClick} 
                selectedIds={selectedIds} 
                onToggleSelect={handleToggleSelect} 
              />
            </ProtectedRoute>
          } />
          <Route path="/map" element={
            <ProtectedRoute allowedRoles={['admin', 'user']}>
              <div className="p-6 h-full"><MapView onPhotoClick={handlePhotoClick} onClusterClick={setActiveCluster} /></div>
            </ProtectedRoute>
          } />
          <Route path="/people" element={
            <ProtectedRoute allowedRoles={['admin', 'user']}>
              <div className="h-full overflow-y-auto"><PeopleView onPersonClick={handlePersonClick} /></div>
            </ProtectedRoute>
          } />
          <Route path="/albums" element={
            <ProtectedRoute>
              <div className="h-full overflow-y-auto"><AlbumsView onPhotoClick={handlePhotoClick} onPlaySlideshow={(ps) => { setSlideshowPhotos(ps); setIsSlideshowOpen(true); }} /></div>
            </ProtectedRoute>
          } />
          <Route path="/folders" element={
            <ProtectedRoute allowedRoles={['admin', 'user']}>
              <div className="h-full overflow-hidden">
                <FoldersView
                  onPhotoClick={handlePhotoClick}
                  onPlaySlideshow={(ps) => { setSlideshowPhotos(ps); setIsSlideshowOpen(true); }}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onClearSelection={() => setSelectedIds(new Set())}
                />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/stats" element={
            <ProtectedRoute allowedRoles={['admin', 'user']}>
              <div className="h-full overflow-y-auto"><StatsView /></div>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <div className="h-full overflow-y-auto"><AdminView /></div>
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/photos" replace />} />
        </Routes>

        {/* Floating Selection Toolbar */}
        {selectedIds.size > 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-slate-900/90 backdrop-blur-md border border-blue-500/50 px-6 py-3 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col border-r border-slate-800 pr-6">
              <span className="text-blue-400 font-bold text-lg leading-tight">{selectedIds.size}</span>
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsBulkTagModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-blue-600/20 text-blue-100 transition-colors font-medium">
                <TagIcon size={18} /> Bulk Tag
              </button>
              <button onClick={() => setIsBulkLocationModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-blue-600/20 text-blue-100 transition-colors font-medium">
                <MapPin size={18} /> Bulk GPS
              </button>
              <button onClick={handleAddToAlbum} className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-blue-600/20 text-blue-100 transition-colors font-medium">
                <LayoutGrid size={18} /> Add to Album
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="ml-2 p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {selectedPhoto && (
          <PhotoModal
            photo={selectedPhoto}
            onClose={handleCloseModal}
            onUpdate={handlePhotoUpdate}
            onNext={selectedPhotoIndex! < modalPhotos.length - 1 ? () => setSelectedPhotoIndex(selectedPhotoIndex! + 1) : undefined}
            onPrev={selectedPhotoIndex! > 0 ? () => setSelectedPhotoIndex(selectedPhotoIndex! - 1) : undefined}
          />
        )}

        {isAlbumModalOpen && (
          <AlbumSelectorModal
            albums={allAlbums}
            onSelect={handleSelectAlbum}
            onCreate={handleCreateAlbum}
            onClose={() => setIsAlbumModalOpen(false)}
          />
        )}

        {isBulkTagModalOpen && (
          <BulkTagModal
            count={selectedIds.size}
            onSave={handleBulkTagsSave}
            onClose={() => setIsBulkTagModalOpen(false)}
          />
        )}

        {isBulkLocationModalOpen && (
          <LocationPickerModal
            onSelect={handleBulkLocationSelect}
            onClose={() => setIsBulkLocationModalOpen(false)}
          />
        )}

        {isSlideshowOpen && (
          <Slideshow
            photos={slideshowPhotos}
            onClose={() => setIsSlideshowOpen(false)}
          />
        )}
      </main>

      {/* Cluster Preview Overlay */}
      {activeCluster && (
        <div className="fixed top-10 right-10 z-[10000] w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden flex flex-col max-h-[80%]">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
            <div>
              <h3 className="font-bold text-sm text-white">Location Cluster</h3>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{activeCluster.length} Photos</p>
            </div>
            <button
              onClick={() => setActiveCluster(null)}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900">
            <div className="grid grid-cols-2 gap-3">
              {activeCluster.slice(0, 10).map((photo) => (
                <div
                  key={photo.id}
                  onClick={async () => {
                    setActiveCluster(null);
                    try {
                      const fullPhoto = await api.getPhoto(photo.id);
                      handlePhotoClick(fullPhoto, 0, [fullPhoto]);
                    } catch (err) {
                      console.error("Error fetching photo for modal:", err);
                      handlePhotoClick(photo, 0, [photo]);
                    }
                  }}
                  className="aspect-square bg-slate-800 rounded-xl overflow-hidden cursor-pointer group relative border border-slate-700 hover:border-blue-500 transition-all shadow-lg"
                >
                  {photo.thumbnail_small ? (
                    <img
                      src={`/cache/${photo.thumbnail_small}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600 italic">No Preview</div>
                  )}
                  <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
              {activeCluster.length > 10 && (
                <div
                  onClick={() => handleViewCluster(activeCluster)}
                  className="aspect-square bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-900 hover:border-slate-700 transition-all"
                >
                  <span className="text-xs font-bold">+{activeCluster.length - 10} more</span>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 bg-slate-900 border-t border-slate-800">
            <button
              onClick={() => handleViewCluster(activeCluster)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-xl transition-all shadow-lg shadow-blue-900/20"
            >
              View All in Timeline
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
