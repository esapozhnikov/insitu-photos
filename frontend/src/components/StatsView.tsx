import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { BarChart3, Image as ImageIcon, Folder, Users, UserCheck, LayoutGrid } from 'lucide-react';

export const StatsView = () => {
  const [stats, setStats] = useState<any>(null);

  const loadStats = () => {
    api.getStats().then(setStats).catch(err => console.error("Error fetching stats:", err));
  };

  useEffect(() => {
    loadStats();
    // Poll for updates every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return (
    <div className="p-8 text-slate-500 animate-pulse">Loading stats...</div>
  );

  const cards = [
    { label: 'Total Photos', value: stats.total_photos, icon: <ImageIcon className="text-blue-500" /> },
    { label: 'Folders', value: stats.total_folders, icon: <Folder className="text-amber-500" /> },
    { label: 'Albums', value: stats.total_albums, icon: <LayoutGrid className="text-purple-500" /> },
    { label: 'Faces Detected', value: stats.total_faces, icon: <Users className="text-emerald-500" /> },
    { label: 'Identified People', value: stats.total_people, icon: <UserCheck className="text-pink-500" /> },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto overflow-y-auto h-full">
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <BarChart3 size={32} /> Library Statistics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => (
          <div key={card.label} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-6 shadow-lg">
            <div className="p-4 bg-slate-800 rounded-xl">{card.icon}</div>
            <div>
              <div className="text-slate-400 text-sm font-medium uppercase tracking-wider">{card.label}</div>
              <div className="text-3xl font-bold mt-1">{card.value?.toLocaleString() || 0}</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* AI Progress Section */}
      <div className="mt-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-8 space-y-8">
        {stats.folders && stats.folders.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Folder size={20} className="text-amber-500" /> Folder Scan Progress
            </h3>
            <div className="space-y-6">
              {stats.folders.map((folder: any) => {
                const progress = folder.total_files > 0 
                  ? Math.min(100, Math.round((folder.processed_files / folder.total_files) * 100)) 
                  : (folder.status === 'idle' && folder.last_scanned_at ? 100 : 0);
                
                return (
                  <div key={folder.id} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300 font-medium truncate max-w-md">{folder.path}</span>
                      <span className="text-slate-400">
                        {folder.status === 'scanning' ? (
                          <span className="text-amber-500 animate-pulse flex items-center gap-2">
                            Scanning... {folder.processed_files} / {folder.total_files}
                          </span>
                        ) : (
                          <span>Completed</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${folder.status === 'scanning' ? 'bg-amber-500' : 'bg-slate-600'}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xl font-semibold mb-4">Library Scan Progress (Face Detection)</h3>
          <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-1000"
              style={{ width: `${stats.total_photos > 0 ? (stats.scanned_photos / stats.total_photos) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-slate-400 font-medium">
            <span>{stats.scanned_photos} photos scanned</span>
            <span>{stats.total_photos} total photos</span>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Identification Coverage</h3>
          <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-1000"
              style={{ width: `${stats.total_faces > 0 ? (stats.identified_faces / stats.total_faces) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-slate-400 font-medium">
            <span>{stats.identified_faces} faces identified</span>
            <span>{stats.total_faces} total faces detected</span>
          </div>
        </div>
      </div>

    </div>
  );
};
