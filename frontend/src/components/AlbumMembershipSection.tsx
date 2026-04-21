import React, { useState } from 'react';
import { LayoutGrid, Plus, X } from 'lucide-react';
import { Photo, Album } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AlbumSelectorModal } from './AlbumSelectorModal';

interface AlbumMembershipSectionProps {
  photo: Photo;
  onUpdate: (updatedPhoto: Photo) => void;
}

export const AlbumMembershipSection: React.FC<AlbumMembershipSectionProps> = ({ photo, onUpdate }) => {
  const { isUser } = useAuth();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);

  const handleOpenSelector = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAlbums();
      setAlbums(data);
      setIsSelectorOpen(true);
    } catch (err) {
      alert('Failed to load albums');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToAlbum = async (albumId: number) => {
    setIsLoading(true);
    try {
      await api.bulkAddPhotosToAlbum(albumId, [photo.id]);
      // Refresh photo data
      const updated = await api.getPhoto(photo.id);
      if (updated) onUpdate(updated);
      setIsSelectorOpen(false);
    } catch (err) {
      alert('Failed to add to album');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAlbum = async (name: string) => {
    setIsLoading(true);
    try {
      const newAlbum = await api.createAlbum({ name });
      await api.bulkAddPhotosToAlbum(newAlbum.id, [photo.id]);
      const updated = await api.getPhoto(photo.id);
      if (updated) onUpdate(updated);
      setIsSelectorOpen(false);
    } catch (err) {
      alert('Failed to create album');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromAlbum = async (albumId: number) => {
    if (!confirm('Remove from this album?')) return;
    setIsLoading(true);
    try {
      await api.removePhotoFromAlbum(albumId, photo.id);
      const updated = await api.getPhoto(photo.id);
      if (updated) onUpdate(updated);
    } catch (err) {
      alert('Failed to remove from album');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetAsCover = async (albumId: number) => {
    try {
      await api.setAlbumCover(albumId, photo.id);
      alert('Set as album cover');
    } catch (err) {
      alert('Failed to set as cover');
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <LayoutGrid size={14} /> Albums
      </label>
      <div className="flex flex-wrap gap-2">
        {photo.albums && photo.albums.length > 0 ? (
          photo.albums.map(album => (
            <div key={album.id} className="group bg-purple-600/20 text-purple-400 border border-purple-500/30 pl-3 pr-1 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
              <span>{album.name}</span>
              {isUser && (
                <>
                  <button 
                    onClick={() => handleSetAsCover(album.id)}
                    className="hidden group-hover:block text-[10px] bg-purple-600 text-white px-1.5 rounded-full hover:bg-purple-500"
                    title="Set as Cover"
                  >
                    Cover
                  </button>
                  <button 
                    onClick={() => handleRemoveFromAlbum(album.id)}
                    className="hover:bg-red-500 hover:text-white rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </>
              )}
            </div>
          ))
        ) : (
          <span className="text-slate-600 italic text-sm">Not in any albums</span>
        )}
        {isUser && (
          <button 
            onClick={handleOpenSelector}
            disabled={isLoading}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 p-1 rounded-full transition-colors"
            title="Add to Album"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {isSelectorOpen && (
        <AlbumSelectorModal 
          albums={albums}
          onSelect={handleAddToAlbum}
          onCreate={handleCreateAlbum}
          onClose={() => setIsSelectorOpen(false)}
        />
      )}
    </div>
  );
};
