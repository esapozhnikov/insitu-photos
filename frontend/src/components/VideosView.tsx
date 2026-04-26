import React, { useEffect, useState } from 'react';
import { Film, Play } from 'lucide-react';
import { api } from '../api/client';
import { Photo, MediaType } from '../types';
import { PhotoGrid } from './PhotoGrid';

interface VideosViewProps {
  onPhotoClick: (photo: Photo, index: number, allPhotos: Photo[]) => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number, shiftKey: boolean, index: number) => void;
}

export const VideosView: React.FC<VideosViewProps> = ({ onPhotoClick, selectedIds, onToggleSelect }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const CHUNK_SIZE = 500;

  const loadVideos = async (reset = true) => {
    const skip = reset ? 0 : photos.length;
    try {
      const results = await api.searchPhotos({ media_type: MediaType.VIDEO }, skip, CHUNK_SIZE);
      if (reset) {
        setPhotos(results);
      } else {
        setPhotos(prev => [...prev, ...results]);
      }
      setHasMore(results.length === CHUNK_SIZE);
    } catch (err) {
      console.error("Error loading videos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  return (
    <div className="p-6 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Film className="text-blue-500" size={28} />
            <h2 className="text-3xl font-bold">Videos</h2>
          </div>
          <p className="text-slate-400 font-medium">{photos.length} videos found</p>
        </div>
        {photos.length > 0 && (
          <button
            onClick={() => {/* Slideshow for videos could be tricky, maybe just ignore for now */}}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 transform active:scale-95"
          >
            <Play size={20} fill="currentColor" /> Play All
          </button>
        )}
      </header>

      <div className="flex-1 overflow-hidden">
        {isLoading && photos.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : photos.length > 0 ? (
          <PhotoGrid
            photos={photos}
            onPhotoClick={(photo, index) => onPhotoClick(photo, index, photos)}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onLoadMore={() => loadVideos(false)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
            <Film size={64} className="opacity-20" />
            <p className="text-xl font-medium">No videos found</p>
            <p className="text-sm">Scan folders containing .mp4 or .mov files to see them here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
