import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Tag as TagIcon, Info, Save, ChevronLeft, ChevronRight, Camera as CameraIcon, Download, HardDrive, Edit } from 'lucide-react';
import { Photo } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LocationPickerModal } from './LocationPickerModal';
import { TagAutocomplete } from './TagAutocomplete';
import { FaceTaggingSection } from './FaceTaggingSection';
import { AlbumMembershipSection } from './AlbumMembershipSection';

interface PhotoModalProps {
  photo: Photo;
  onClose: () => void;
  onUpdate: (updatedPhoto: Photo) => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({ photo, onClose, onUpdate, onNext, onPrev }) => {
  const { isUser, token } = useAuth();
  const [description, setDescription] = useState(photo.description || '');
  const [tags, setTags] = useState((photo.tags || []).map(t => t.name).join(', '));
  const [isSaving, setIsSaving] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    setDescription(photo.description || '');
    setTags((photo.tags || []).map(t => t.name).join(', '));
  }, [photo]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const updated = await api.updatePhoto(photo.id, {
        description,
        tags: tagList
      });
      onUpdate(updated);
    } catch (err) {
      alert('Failed to save metadata');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    setIsSaving(true);
    try {
      const updated = await api.updatePhoto(photo.id, {
        manual_lat_override: lat,
        manual_long_override: lng
      });
      onUpdate(updated);
      setIsLocationModalOpen(false);
    } catch (err) {
      alert('Failed to update location');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    window.open(`/api/photos/${photo.id}/download?token=${token}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
      <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-900/50 rounded-full hover:bg-slate-800 text-white/70 transition-colors z-10">
        <X size={24} />
      </button>

      {onPrev && (
        <button onClick={onPrev} className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-slate-900/50 rounded-full hover:bg-slate-800 text-white/70 transition-colors z-10">
          <ChevronLeft size={32} />
        </button>
      )}
      {onNext && (
        <button onClick={onNext} className="absolute right-[420px] top-1/2 -translate-y-1/2 p-4 bg-slate-900/50 rounded-full hover:bg-slate-800 text-white/70 transition-colors z-10">
          <ChevronRight size={32} />
        </button>
      )}

      <div className="flex w-full h-full p-4 gap-4 overflow-hidden">
        {/* Large Photo Display */}
        <div className="flex-1 flex items-center justify-center relative">
          <img 
            src={`/cache/${photo.thumbnail_large}`} 
            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
            alt=""
          />
        </div>

        {/* Metadata Sidebar */}
        <div className="w-96 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={20} className="text-blue-500" />
              <h3 className="text-xl font-bold">Metadata</h3>
            </div>
            <button 
              onClick={handleDownload}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Download Original"
            >
              <Download size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Storage Details */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <HardDrive size={14} /> File Path
              </label>
              <div className="text-[10px] font-mono text-slate-400 break-all bg-slate-950 p-2 rounded-lg border border-slate-800">
                {photo.physical_path}
              </div>
            </div>

            {/* Timestamp */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> Captured
              </label>
              <div className="text-lg font-medium text-slate-200">
                {photo.timestamp ? new Date(photo.timestamp).toLocaleString() : 'Unknown'}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={14} /> Location
                </label>
                {isUser && (
                  <button 
                    onClick={() => setIsLocationModalOpen(true)}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 uppercase tracking-tighter transition-colors"
                  >
                    <Edit size={10} /> Edit
                  </button>
                )}
              </div>
              <div className="text-slate-300 flex flex-col gap-1">
                {(photo.manual_lat_override !== null || photo.gps_lat !== null) ? (
                  <>
                    <div className="text-sm font-medium">
                      {(photo.manual_lat_override !== null ? photo.manual_lat_override : photo.gps_lat!).toFixed(6)}, {(photo.manual_long_override !== null ? photo.manual_long_override : photo.gps_long!).toFixed(6)}
                    </div>
                    {photo.manual_lat_override !== null && <div className="text-[10px] text-orange-500 font-bold uppercase tracking-tight">Manual Override</div>}
                  </>
                ) : (
                  <span className="text-slate-500 italic text-sm">No GPS data</span>
                )}
              </div>
            </div>

            {/* People Section */}
            <div className="pt-4 border-t border-slate-800/50">
              <FaceTaggingSection photo={photo} onUpdate={onUpdate} />
            </div>

            {/* Albums Section */}
            <div className="pt-4 border-t border-slate-800/50">
              <AlbumMembershipSection photo={photo} onUpdate={onUpdate} />
            </div>

            {/* Camera / Lens Details */}
            {(photo.camera_make || photo.camera_model || photo.lens) && (
              <div className="space-y-4 pt-4 border-t border-slate-800/50">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <CameraIcon size={14} /> Camera
                </label>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-200">{photo.camera_make} {photo.camera_model}</div>
                  <div className="text-sm text-slate-400 leading-tight">{photo.lens}</div>
                </div>
                
                {(photo.shutter_speed || photo.aperture || photo.iso) && (
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/50 rounded-xl p-3 border border-slate-800 text-center">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Shutter</div>
                      <div className="font-mono text-sm">{photo.shutter_speed || '-'}</div>
                    </div>
                    <div className="border-x border-slate-800">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Aperture</div>
                      <div className="font-mono text-sm">{photo.aperture ? `f/${photo.aperture}` : '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">ISO</div>
                      <div className="font-mono text-sm">{photo.iso || '-'}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2 pt-4 border-t border-slate-800/50">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</label>
              <textarea 
                value={description}
                readOnly={!isUser}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isUser ? "Add a description..." : "No description"}
                className={`w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-blue-500 min-h-[100px] transition-colors resize-none ${!isUser ? 'cursor-default' : ''}`}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2 pt-4 border-t border-slate-800/50">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <TagIcon size={14} /> Tags
              </label>
              {isUser ? (
                <>
                  <TagAutocomplete 
                    value={tags}
                    onChange={setTags}
                  />
                  <p className="text-[10px] text-slate-600 italic">Separate with commas</p>
                </>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {photo.tags?.length ? photo.tags.map(t => (
                    <span key={t.id} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">{t.name}</span>
                  )) : <span className="text-slate-600 italic text-xs">No tags</span>}
                </div>
              )}
            </div>
          </div>

          {isUser && (
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-blue-900/20"
              >
                {isSaving ? <span className="animate-spin text-xl">◌</span> : <Save size={20} />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isLocationModalOpen && (
        <LocationPickerModal
          initialLat={photo.manual_lat_override !== null ? photo.manual_lat_override : photo.gps_lat}
          initialLong={photo.manual_long_override !== null ? photo.manual_long_override : photo.gps_long}
          onSelect={handleLocationSelect}
          onClose={() => setIsLocationModalOpen(false)}
        />
      )}
    </div>
  );
};
