import React, { useState, useEffect } from 'react';
import { X, Folder, ChevronRight, ChevronLeft, Check, FolderOpen } from 'lucide-react';
import { api } from '../api/client';

interface FileBrowserModalProps {
  onSelect: (path: string) => void;
  onClose: () => void;
}

export const FileBrowserModal: React.FC<FileBrowserModalProps> = ({ onSelect, onClose }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [folders, setFolders] = useState<string[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPath = async (path?: string) => {
    setLoading(true);
    try {
      const data = await api.browseDirectory(path);
      setCurrentPath(data.current_path);
      setFolders(data.folders);
      setParentPath(data.parent_path);
    } catch (err) {
      alert('Error browsing directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPath();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-200">
              <FolderOpen size={24} className="text-blue-500" /> Browse Folders
            </h2>
            <p className="text-[10px] font-mono text-slate-500 mt-1 break-all">{currentPath || 'Loading...'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin text-blue-500 text-2xl">◌</div>
            </div>
          ) : (
            <div className="space-y-1">
              {parentPath && (
                <button 
                  onClick={() => loadPath(parentPath)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 group"
                >
                  <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="font-semibold">.. (Back)</span>
                </button>
              )}
              
              {folders.length === 0 ? (
                <div className="py-12 text-center text-slate-500 italic">
                  No subfolders found.
                </div>
              ) : (
                folders.map(folder => (
                  <button 
                    key={folder}
                    onClick={() => loadPath(`${currentPath}/${folder}`)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Folder size={20} className="text-blue-500 group-hover:fill-blue-500/20 transition-all" />
                      <span className="font-medium text-slate-200">{folder}</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <footer className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors text-slate-300"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSelect(currentPath)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-8 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            <Check size={20} /> Select This Folder
          </button>
        </footer>
      </div>
    </div>
  );
};
