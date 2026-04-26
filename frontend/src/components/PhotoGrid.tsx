import React, { useState } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Photo } from '../types';
import { CheckCircle2, Circle, Play } from 'lucide-react';

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number, shiftKey: boolean, index: number) => void;
  onPlaySlideshow?: () => void;
  onLoadMore?: () => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, onPhotoClick, selectedIds, onToggleSelect, onPlaySlideshow, onLoadMore }) => {
  return (
    <div className="relative h-full group/grid">
      {onPlaySlideshow && photos.length > 0 && (
        <button 
          onClick={(e) => { e.stopPropagation(); onPlaySlideshow(); }}
          className="absolute top-4 right-8 z-20 bg-blue-600/80 hover:bg-blue-600 backdrop-blur-md text-white px-4 py-2 rounded-xl font-bold transition-all shadow-2xl opacity-0 group-hover/grid:opacity-100 flex items-center gap-2 border border-white/20"
        >
          <Play size={16} fill="currentColor" /> Play Slideshow
        </button>
      )}
      <VirtuosoGrid
      style={{ height: '100%' }}
      totalCount={photos.length}
      endReached={onLoadMore}
      listClassName="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2"
      itemContent={(index) => {
        const photo = photos[index];
        const isSelected = selectedIds.has(photo.id);
        
        return (
          <div 
            key={photo.id} 
            className={`aspect-square bg-slate-900 rounded-sm overflow-hidden group relative cursor-pointer border-2 transition-all shadow-md ${
              isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800 hover:border-slate-600'
            }`}
          >
            {/* Selection Checkbox */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(photo.id, e.shiftKey, index);
              }}
              className={`absolute top-2 left-2 z-10 p-1 rounded-full transition-opacity duration-200 ${
                isSelected ? 'opacity-100 bg-blue-500 text-white' : 'opacity-0 group-hover:opacity-100 bg-black/40 text-white/70 hover:text-white'
              }`}
            >
              {isSelected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>

            <div onClick={() => onPhotoClick(photo, index)} className="w-full h-full relative">
              {photo.thumbnail_small ? (
                <img 
                  src={`/cache/${photo.thumbnail_small}`} 
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    isSelected ? 'scale-90 opacity-75' : 'group-hover:scale-110'
                  }`} 
                  alt=""
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs italic">Processing...</div>
              )}

              {/* Video Play Icon Overlay */}
              {photo.media_type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/30 backdrop-blur-sm p-3 rounded-full border border-white/20 group-hover:scale-110 transition-transform shadow-lg">
                    <Play className="text-white fill-white" size={24} />
                  </div>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
                 <span className="text-[10px] text-slate-200 font-medium truncate">
                   {photo.timestamp ? new Date(photo.timestamp).toLocaleDateString() : 'Unknown date'}
                 </span>
              </div>
            </div>
          </div>
        );
      }}
    />
    </div>
  );
};
