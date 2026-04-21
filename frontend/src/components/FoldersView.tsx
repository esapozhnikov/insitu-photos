import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Photo, FolderNode } from '../types';
import { Folder, FolderOpen, ChevronRight, ChevronDown, CheckSquare, ListTree, Play } from 'lucide-react';
import { PhotoGrid } from './PhotoGrid';

interface FoldersViewProps {
  onPhotoClick: (photo: Photo, index: number, allPhotos: Photo[]) => void;
  onPlaySlideshow: (photos: Photo[]) => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number, shiftKey: boolean, index: number) => void;
  onSelectAll: (ids: number[]) => void;
  onClearSelection: () => void;
}

const FolderTreeItem: React.FC<{
  node: FolderNode;
  level: number;
  onSelect: (path: string) => void;
  selectedPath: string | null;
}> = ({ node, level, onSelect, selectedPath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <div 
        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          onSelect(node.path);
          if (node.children.length > 0) setIsOpen(!isOpen);
        }}
      >
        {node.children.length > 0 ? (
          isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <div className="w-[14px]" />
        )}
        {isOpen ? <FolderOpen size={16} className={isSelected ? 'text-white' : 'text-blue-500'} /> : <Folder size={16} className={isSelected ? 'text-white' : 'text-slate-500'} />}
        <span className="text-sm font-medium truncate">{node.name}</span>
      </div>
      {isOpen && node.children.map(child => (
        <FolderTreeItem key={child.path} node={child} level={level + 1} onSelect={onSelect} selectedPath={selectedPath} />
      ))}
    </div>
  );
};

export const FoldersView: React.FC<FoldersViewProps> = ({ 
  onPhotoClick, onPlaySlideshow, selectedIds, onToggleSelect, onSelectAll, onClearSelection 
}) => {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isRecursive, setIsRecursive] = useState(true);

  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const CHUNK_SIZE = 500;

  useEffect(() => {
    api.getFolderTree().then(setTree);
  }, []);

  const loadFolderPhotos = async (path: string, recursive: boolean, reset = true) => {
    if (isLoadingMore) return;
    if (reset) {
      setHasMore(true);
    }

    setIsLoadingMore(true);
    const skip = reset ? 0 : photos.length;

    try {
      const results = await api.searchPhotos({ 
        folder_path: path,
        recursive: recursive 
      }, skip, CHUNK_SIZE);
      
      if (reset) {
        setPhotos(results);
      } else {
        setPhotos(prev => [...prev, ...results]);
      }
      setHasMore(results.length === CHUNK_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (selectedPath) {
      loadFolderPhotos(selectedPath, isRecursive, true);
    }
  }, [selectedPath, isRecursive]);

  const handleLoadMore = () => {
    if (selectedPath && hasMore && !isLoadingMore) {
      loadFolderPhotos(selectedPath, isRecursive, false);
    }
  };

  const allInFolderSelected = photos.length > 0 && photos.every(p => selectedIds.has(p.id));

  const handleSelectAll = () => {
    if (allInFolderSelected) {
      onClearSelection();
    } else {
      onSelectAll(photos.map(p => p.id));
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-950">
      {/* Sidebar Tree */}
      <div className="w-72 border-r border-slate-800 flex flex-col bg-slate-950">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <ListTree size={18} className="text-blue-500" />
          <h3 className="font-bold">Folder Structure</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {tree.length === 0 ? (
            <div className="p-4 text-slate-500 italic text-sm text-center">No indexed folders found.</div>
          ) : (
            tree.map(node => (
              <FolderTreeItem key={node.path} node={node} level={0} onSelect={setSelectedPath} selectedPath={selectedPath} />
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="text-2xl font-bold truncate max-w-md">
              {selectedPath ? selectedPath.split('/').pop() : 'Folders'}
            </h2>
            <p className="text-slate-500 text-sm font-mono truncate max-w-md">{selectedPath || 'Select a folder to view photos'}</p>
          </div>
          
          {selectedPath && (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onPlaySlideshow(photos)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 transform active:scale-95"
              >
                <Play size={18} fill="currentColor" /> Play
              </button>
              <div className="w-px h-8 bg-slate-800 mx-2" />
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={isRecursive} 
                  onChange={(e) => setIsRecursive(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 w-4 h-4"
                />
                Include subfolders
              </label>
              <button 
                onClick={handleSelectAll}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <CheckSquare size={16} /> {allInFolderSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-hidden p-6">
          {selectedPath ? (
            photos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                <p className="text-lg italic">No photos found in this folder.</p>
              </div>
            ) : (
              <PhotoGrid 
                photos={photos} 
                onPhotoClick={(p, i) => onPhotoClick(p, i, photos)}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                onPlaySlideshow={() => onPlaySlideshow(photos)}
                onLoadMore={handleLoadMore}
              />
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
              <Folder size={64} className="opacity-20" />
              <p className="text-xl font-medium">Choose a folder to view photos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
