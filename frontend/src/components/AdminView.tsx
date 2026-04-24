import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Folder, Search, HardDrive, RefreshCw, AlertTriangle, CheckCircle2, Play, Trash2, Database, Shield, User as UserIcon, Users as UsersIcon } from 'lucide-react';
import { FileBrowserModal } from './FileBrowserModal';
import UserManagementTab from './UserManagementTab';

const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'folders' | 'ml' | 'maintenance' | 'users'>('folders');
  const [folders, setFolders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    try {
      const [foldersData, settingsData] = await Promise.all([
        api.getFolders(),
        api.getSettings()
      ]);
      setFolders(foldersData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddFolder = async (path: string) => {
    try {
      await api.addFolder(path);
      setIsBrowserOpen(false);
      fetchData();
      showStatus(`Added folder: ${path}`, 'success');
    } catch (error: any) {
      showStatus(error.response?.data?.detail || 'Failed to add folder', 'error');
    }
  };

  const showStatus = (text: string, type: 'info' | 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <header className="p-8 pb-4">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">System configuration and library management</p>
      </header>

      {/* Tabs */}
      <div className="px-8 border-b border-slate-800/50 flex gap-8">
        <button
          onClick={() => setActiveTab('folders')}
          className={`pb-4 text-sm font-semibold transition-all relative ${
            activeTab === 'folders' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Library Folders
          </div>
          {activeTab === 'folders' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-sm font-semibold transition-all relative ${
            activeTab === 'users' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            User Management
          </div>
          {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('ml')}
          className={`pb-4 text-sm font-semibold transition-all relative ${
            activeTab === 'ml' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Machine Learning
          </div>
          {activeTab === 'ml' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-4 text-sm font-semibold transition-all relative ${
            activeTab === 'maintenance' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Maintenance
          </div>
          {activeTab === 'maintenance' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
            statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            statusMessage.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
            'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
             statusMessage.type === 'error' ? <AlertTriangle className="w-5 h-5" /> :
             <RefreshCw className="w-5 h-5 animate-spin" />}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
        )}

        {activeTab === 'folders' && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-blue-500" />
                    Indexed Folders
                  </h3>
                  <p className="text-sm text-slate-400">Manage photo source directories</p>
                </div>
                <button
                  onClick={() => setIsBrowserOpen(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Add Folder
                </button>
              </div>

              <div className="space-y-3">
                {folders.map(folder => (
                  <div key={folder.id} className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm font-medium text-slate-200 truncate">{folder.path}</div>
                      <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                        Last scanned: {folder.last_scanned_at ? new Date(folder.last_scanned_at).toLocaleString() : 'Never'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={async () => {
                          try {
                            await api.scanFolder(folder.id);
                            showStatus('Scan started', 'info');
                          } catch (e) {
                            showStatus('Failed to start scan', 'error');
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-blue-400 transition-colors" title="Rescan">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (window.confirm('Remove this folder? Photos already indexed will remain but won\'t be updated.')) {
                            try {
                              await api.deleteFolder(folder.id);
                              fetchData();
                              showStatus('Folder removed', 'success');
                            } catch (e) {
                              showStatus('Failed to remove folder', 'error');
                            }
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors" title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {folders.length === 0 && (
                  <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No folders added yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && <UserManagementTab />}

        {activeTab === 'ml' && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-500" />
                Processing Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settings.filter(s => s.key.startsWith('ml_')).map(setting => (
                  <div key={setting.key} className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {setting.key.replace('ml_', '').replace(/_/g, ' ')}
                    </label>
                    {setting.key === 'ml_model_name' ? (
                      <select
                        value={setting.value}
                        onChange={async (e) => {
                          const newVal = e.target.value;
                          setSettings(prev => prev.map(s => s.key === setting.key ? { ...s, value: newVal } : s));
                          try {
                            await api.updateSetting(setting.key, newVal);
                            showStatus(`Updated ${setting.key}`, 'success');
                          } catch (e) {
                            showStatus('Failed to update setting', 'error');
                          }
                        }}
                        className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="buffalo_s">Buffalo S (Small, Fast)</option>
                        <option value="buffalo_m">Buffalo M (Medium)</option>
                        <option value="buffalo_l">Buffalo L (Large, Accurate)</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={setting.value}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setSettings(prev => prev.map(s => s.key === setting.key ? { ...s, value: newVal } : s));
                        }}
                        onBlur={async (e) => {
                          try {
                            await api.updateSetting(setting.key, e.target.value);
                            showStatus(`Updated ${setting.key}`, 'success');
                          } catch (e) {
                            showStatus('Failed to update setting', 'error');
                          }
                        }}
                        className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Batch Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={async () => {
                    try {
                      await api.reRunRecognition();
                      showStatus('Re-recognition task queued', 'info');
                    } catch (e) {
                      showStatus('Failed to queue task', 'error');
                    }
                  }}
                  className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all group"
                >
                  <div className="bg-purple-500/10 p-2 rounded-lg text-purple-400 group-hover:scale-110 transition-transform">
                    <UsersIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">Re-run Recognition</div>
                    <div className="text-[10px] text-slate-500">Re-cluster all faces and re-assign matches</div>
                  </div>
                </button>
                
                <button 
                  onClick={async () => {
                    if (window.confirm('This will re-analyze ALL photos for faces. This is very CPU intensive and will take a long time. Continue?')) {
                      try {
                        await api.fullFaceRescan();
                        showStatus('Full rescan task queued', 'info');
                      } catch (e) {
                        showStatus('Failed to queue task', 'error');
                      }
                    }
                  }}
                  className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all group"
                >
                  <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">Full Face Rescan</div>
                    <div className="text-[10px] text-slate-500">Scan all photos from scratch for faces</div>
                  </div>
                </button>

                <button 
                  onClick={async () => {
                    try {
                      await api.scanMissingFaces();
                      showStatus('Missing faces scan task queued', 'info');
                    } catch (e) {
                      showStatus('Failed to queue task', 'error');
                    }
                  }}
                  className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all group"
                >
                  <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">Scan Missing Faces</div>
                    <div className="text-[10px] text-slate-500">Only scan photos that were skipped or failed</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
             <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-red-500/10 p-3 rounded-xl text-red-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Danger Zone</h3>
                    <p className="text-sm text-slate-400">Irreversible maintenance operations. Use with caution.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <div>
                      <div className="text-sm font-semibold text-white">Reset Library</div>
                      <div className="text-[10px] text-slate-500">Clears all photos, albums, and thumbnails. Files on disk are safe.</div>
                    </div>
                    <button 
                      onClick={async () => {
                        if (window.confirm('DANGER: This will delete ALL database records and thumbnails. Files on disk will NOT be deleted. Are you sure?')) {
                           try {
                             await api.resetLibrary();
                             showStatus('Library reset successful', 'success');
                             fetchData();
                           } catch (error) {
                             showStatus('Failed to reset library', 'error');
                           }
                        }
                      }}
                      className="bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all border border-red-600/20"
                    >
                      Factory Reset
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <div>
                      <div className="text-sm font-semibold text-white">Clear Stuck Tasks</div>
                      <div className="text-[10px] text-slate-500">Reset flags if background tasks appear stuck after a crash.</div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await api.resetBackgroundTasks();
                          showStatus('Task flags cleared', 'success');
                        } catch (error) {
                          showStatus('Failed to clear flags', 'error');
                        }
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-slate-700"
                    >
                      Clear Flags
                    </button>
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {isBrowserOpen && (
        <FileBrowserModal
          onClose={() => setIsBrowserOpen(false)}
          onSelect={handleAddFolder}
        />
      )}
    </div>
  );
};

export default AdminView;