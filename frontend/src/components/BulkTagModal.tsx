import React, { useState } from 'react';
import { Tag as TagIcon, X, Save } from 'lucide-react';
import { TagAutocomplete } from './TagAutocomplete';

interface BulkTagModalProps {
  onSave: (tags: string[]) => void;
  onClose: () => void;
  count: number;
}

export const BulkTagModal: React.FC<BulkTagModalProps> = ({ onSave, onClose, count }) => {
  const [tags, setTags] = useState('');

  const handleSave = () => {
    const tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    onSave(tagList);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TagIcon size={24} className="text-orange-500" /> Bulk Tagging
            </h2>
            <p className="text-xs text-slate-500 mt-1">Applying tags to {count} photos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </header>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tags</label>
            <TagAutocomplete value={tags} onChange={setTags} />
            <p className="text-[10px] text-slate-600 italic">Existing tags will be kept, these will be added.</p>
          </div>
        </div>

        <footer className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            <Save size={20} /> Save to {count} Photos
          </button>
        </footer>
      </div>
    </div>
  );
};
