import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import { Photo } from '../types';
import L from 'leaflet';
import { Maximize2, RefreshCw } from 'lucide-react';
import { api } from '../api/client';

// Custom DivIcon for clusters
const createClusterCustomIcon = (cluster: any) => {
  return L.divIcon({
    html: `<div class="bg-blue-600 text-white font-bold rounded-full w-10 h-10 flex items-center justify-center border-4 border-white/20 shadow-2xl transition-transform hover:scale-110">${cluster.getChildCount()}</div>`,
    className: 'custom-marker-cluster',
    iconSize: L.point(40, 40, true),
  });
};

const PhotoMarkerIcon = L.divIcon({
  html: '<div class="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-xl animate-pulse ring-4 ring-blue-500/20"></div>',
  className: 'photo-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

interface MapViewProps {
  onPhotoClick: (photo: Photo, index: number, allPhotos: Photo[]) => void;
  onClusterClick: (clusterPhotos: Photo[]) => void;
}

export const MapView: React.FC<MapViewProps> = ({ 
  onPhotoClick, onClusterClick
}) => {
  const [geolocatedPhotos, setGeolocatedPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      setIsLoading(true);
      try {
        const results = await api.getGeolocatedPhotos();
        setGeolocatedPhotos(results);
      } catch (err) {
        console.error("Error fetching geolocated photos:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  const handleClusterClick = (cluster: any, event: any) => {
    if (event && event.originalEvent) {
      L.DomEvent.stop(event.originalEvent);
    }
    
    const markers = cluster.getAllChildMarkers();
    // Retrieve photo data from marker options (attached via event handler or title lookup)
    const photosInCluster: Photo[] = markers
      .map((m: any) => {
        if (m.options.photo) return m.options.photo;
        const id = parseInt(m.options.title);
        return geolocatedPhotos.find(p => p.id === id);
      })
      .filter((p: any): p is Photo => p !== undefined);
    
    if (photosInCluster.length > 0) {
      onClusterClick(photosInCluster);
    }
  };

  const handleMarkerClick = async (photo: Photo) => {
    // We need the full photo object (with people/tags/etc) for the modal
    try {
      const fullPhoto = await api.getPhoto(photo.id);
      onPhotoClick(fullPhoto, 0, [fullPhoto]);
    } catch (err) {
      console.error("Error fetching full photo details:", err);
      // Fallback to what we have
      onPhotoClick(photo, 0, [photo]);
    }
  };

  return (
    <div className="h-full w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 relative">
      {isLoading && (
        <div className="absolute inset-0 z-[1001] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <RefreshCw className="text-blue-500 animate-spin" size={32} />
            <div className="text-slate-200 font-bold">Loading map markers...</div>
          </div>
        </div>
      )}

      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {!isLoading && (
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createClusterCustomIcon}
            maxClusterRadius={50}
            showCoverageOnHover={false}
            spiderfyOnMaxZoom={true}
            zoomToBoundsOnClick={false}
            eventHandlers={{
              clusterclick: (e: any) => {
                handleClusterClick(e.layer, e);
              }
            }}
          >
            {geolocatedPhotos.map(photo => {
              const lat = photo.manual_lat_override !== null ? photo.manual_lat_override : photo.gps_lat!;
              const lng = photo.manual_long_override !== null ? photo.manual_long_override : photo.gps_long!;
              
              return (
                <Marker 
                  key={photo.id} 
                  position={[lat, lng]} 
                  icon={PhotoMarkerIcon}
                  title={photo.id.toString()}
                  eventHandlers={{
                    add: (e) => {
                      // Robustly attach photo data to the Leaflet marker object
                      e.target.options.photo = photo;
                    }
                  }}
                >
                  <Popup className="custom-popup" minWidth={200}>
                    <div className="bg-slate-900 -m-1 overflow-hidden rounded-xl border border-slate-800 shadow-2xl group">
                      <div 
                        className="relative cursor-pointer overflow-hidden"
                        onClick={() => handleMarkerClick(photo)}
                      >
                        {photo.thumbnail_small ? (
                          <img 
                            src={`/cache/${photo.thumbnail_small}`} 
                            className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-110" 
                            alt="" 
                          />
                        ) : (
                          <div className="w-full h-40 bg-slate-800 flex items-center justify-center text-xs text-slate-500 italic">No Preview</div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="text-white" size={24} />
                        </div>
                      </div>
                      <div className="p-4 bg-slate-900">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Captured</div>
                        <div className="text-sm font-semibold text-slate-200">
                          {photo.timestamp ? new Date(photo.timestamp).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Unknown date'}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[9px] text-slate-600 font-mono tracking-tighter">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
                          <button 
                            onClick={() => handleMarkerClick(photo)}
                            className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wider transition-colors"
                          >
                            View Full
                          </button>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        )}
      </MapContainer>
    </div>
  );
};

