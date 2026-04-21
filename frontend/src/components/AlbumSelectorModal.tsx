import React, { useState } from 'react';
import { X, Plus, FolderPlus } from 'lucide-react';
import { Album } from '../types';

interface AlbumSelectorModalProps {
  albums: Album[];
  onSelect: (albumId: number) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}

export const AlbumSelectorModal: React.FC<AlbumSelectorModalProps> = ({ albums, onSelect, onCreate, onClose }) => {
  const [newAlbumName, setNewAlbumName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAlbumName.trim()) {
      onCreate(newAlbumName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <header className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderPlus size={24} className="text-blue-500" /> Add to Album
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </header>

        <div className="p-6 space-y-6">
          {!isCreating ? (
            <>
              {albums.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {albums.map(album => (
                    <button
                      key={album.id}
                      onClick={() => onSelect(album.id)}
                      className="w-full text-left p-4 rounded-2xl bg-slate-800/50 hover:bg-blue-600 transition-all font-semibold group flex justify-between items-center"
                    >
                      {album.name}
                      <Plus size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 italic">
                  No albums found.
                </div>
              )}
              
              <button 
                onClick={() => setIsCreating(true)}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-800 text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all font-bold flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Create New Album
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">New Album Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="e.g. Summer Vacation 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit"
                  disabled={!newAlbumName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 py-3 rounded-xl font-bold transition-colors"
                >
                  Create and Add
                </button>
                <button 
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
