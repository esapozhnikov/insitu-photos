import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { X, MapPin, Check, MousePointer2, Search, Loader2 } from 'lucide-react';
import L from 'leaflet';

// Use standard DivIcon for simplicity and to avoid asset issues
const PickerMarkerIcon = L.divIcon({
  html: '<div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-xl animate-bounce"></div>',
  className: 'picker-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

interface LocationPickerModalProps {
  initialLat?: number | null;
  initialLong?: number | null;
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}

const MapController = ({ center }: { center: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
};

const LocationMarker = ({ position, setPosition }: { position: [number, number] | null, setPosition: (pos: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={PickerMarkerIcon} />
  );
};

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({ initialLat, initialLong, onSelect, onClose }) => {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLong ? [initialLat, initialLong] : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // 1. Try to parse as coordinates (e.g. "41.0125, -121.6510")
      const coordMatch = searchQuery.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setPosition([lat, lng]);
          setMapCenter([lat, lng]);
          setIsSearching(false);
          return;
        }
      }

      // 2. Geocode using Nominatim
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setPosition([lat, lon]);
        setMapCenter([lat, lon]);
      } else {
        alert('Location not found');
      }
    } catch (err) {
      alert('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    if (position) {
      onSelect(position[0], position[1]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <header className="p-6 border-b border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-slate-900">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MapPin size={24} className="text-red-500" /> Set Location
            </h2>
            <p className="text-xs text-slate-500 mt-1">Click on the map or search by address/coords</p>
          </div>
          
          <form onSubmit={handleSearch} className="flex-1 max-w-md w-full relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address or 'lat, lng'..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-4 pr-10 text-sm outline-none focus:border-blue-500 transition-colors"
            />
            <button 
              type="submit" 
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-blue-500 disabled:opacity-50 transition-colors"
            >
              {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </form>

          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors hidden md:block">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 relative bg-slate-950">
          <MapContainer 
            center={position || [20, 0]} 
            zoom={position ? 12 : 2} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <LocationMarker position={position} setPosition={setPosition} />
            <MapController center={mapCenter} />
          </MapContainer>
          
          {!position && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700 flex items-center gap-3 text-slate-200 font-medium shadow-2xl">
                <MousePointer2 size={20} className="text-blue-400" /> Click anywhere to set location
              </div>
            </div>
          )}
        </div>

        <footer className="p-6 border-t border-slate-800 bg-slate-900 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-4 items-center">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Latitude</label>
              <input 
                type="number" 
                value={position?.[0] || ''} 
                onChange={(e) => setPosition([parseFloat(e.target.value), position?.[1] || 0])}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm font-mono w-32"
                step="0.000001"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Longitude</label>
              <input 
                type="number" 
                value={position?.[1] || ''} 
                onChange={(e) => setPosition([position?.[0] || 0, parseFloat(e.target.value)])}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm font-mono w-32"
                step="0.000001"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!position}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 px-8 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
              <Check size={20} /> Confirm Location
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
