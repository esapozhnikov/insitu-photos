import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Pause, ChevronLeft, ChevronRight, Maximize, Minimize, Settings2, Clock } from 'lucide-react';
import { Photo } from '../types';

interface SlideshowProps {
  photos: Photo[];
  startIndex?: number;
  onClose: () => void;
}

const SPEEDS = [
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
];

export const Slideshow: React.FC<SlideshowProps> = ({ photos, startIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(1); // Default 5s
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowSuggestions] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Preload next image
  useEffect(() => {
    const nextIndex = (currentIndex + 1) % photos.length;
    const img = new Image();
    img.src = `/cache/${photos[nextIndex].thumbnail_large}`;
  }, [currentIndex, photos]);

  // Slideshow Timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(next, SPEEDS[speedIndex].value);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, next, speedIndex]);

  // Autohide controls
  const handleMouseMove = () => {
    setShowSuggestions(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowSuggestions(false);
    }, 3000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === ' ') setIsPlaying(p => !p);
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev, onClose]);

  const currentPhoto = photos[currentIndex];

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-[2000] bg-black flex items-center justify-center overflow-hidden cursor-none"
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Background Blur Image (for aspect ratio filling) */}
      <div className="absolute inset-0 opacity-30 blur-3xl scale-110 pointer-events-none">
        <img 
          src={`/cache/${currentPhoto.thumbnail_large}`} 
          className="w-full h-full object-cover"
          alt=""
        />
      </div>

      {/* Main Image Container */}
      <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12">
        {/* Low-res placeholder (always rendered first) */}
        <img 
          src={`/cache/${currentPhoto.thumbnail_small}`} 
          className="absolute max-w-full max-h-full object-contain blur-sm z-0"
          style={{ width: 'auto', height: 'auto' }}
          alt=""
        />
        
        {/* High-res image */}
        <img 
          key={currentPhoto.id}
          src={`/cache/${currentPhoto.thumbnail_large}`} 
          className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] z-10 animate-in fade-in zoom-in-95 duration-700 ease-out"
          style={{ position: 'relative' }}
          alt=""
        />
      </div>

      {/* Info Overlay (Bottom Left) */}
      <div className={`absolute bottom-8 left-8 z-20 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-1">
            {currentPhoto.description || 'Untitled Photo'}
          </h3>
          <p className="text-white/60 text-sm flex items-center gap-2">
            <span className="font-medium">{currentIndex + 1} of {photos.length}</span>
            <span className="w-1 h-1 bg-white/20 rounded-full" />
            <span>{currentPhoto.timestamp ? new Date(currentPhoto.timestamp).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Unknown date'}</span>
          </p>
        </div>
      </div>

      {/* Controls (Top Right) */}
      <div className={`absolute top-8 right-8 z-20 flex items-center gap-3 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex items-center gap-1 shadow-2xl">
          {SPEEDS.map((s, idx) => (
            <button 
              key={s.label}
              onClick={() => setSpeedIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${speedIndex === idx ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              {s.label}
            </button>
          ))}
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button 
            onClick={toggleFullscreen}
            className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
        
        <button 
          onClick={onClose}
          className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-2xl shadow-2xl transition-all transform active:scale-95"
        >
          <X size={24} />
        </button>
      </div>

      {/* Player Controls (Bottom Center) */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-2 flex items-center gap-2 shadow-2xl">
          <button 
            onClick={prev}
            className="p-4 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
          >
            <ChevronLeft size={28} />
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center transition-all transform active:scale-95 shadow-xl shadow-blue-900/40"
          >
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} className="ml-1" fill="currentColor" />}
          </button>

          <button 
            onClick={next}
            className="p-4 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};
