import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Person, FaceCluster, Photo, Face } from '../types';
import { User, Users, UserPlus, Edit, Trash2, Check, X as CloseIcon, RefreshCw, Grid, CheckCircle2, Circle } from 'lucide-react';
import { PhotoGrid } from './PhotoGrid';
import { PhotoModal } from './PhotoModal';
import { PersonAutocomplete } from './PersonAutocomplete';

interface PeopleViewProps {
  onPersonClick?: (personId: number, personName: string) => void;
}

const FacePhotosModal: React.FC<{ 
  cluster: FaceCluster; 
  onClose: () => void;
  onNameCluster: (faceIds: number[], name: string) => Promise<void>;
}> = ({ cluster, onClose, onNameCluster }) => {
  const [faces, setFaces] = useState<Face[]>([]);
  const [selectedFaceIds, setSelectedFaceIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    // Fetch all faces in this cluster to get their specific thumbnails and photo IDs
    api.getFaces(cluster.face_ids).then(data => {
      setFaces(data);
      setSelectedFaceIds(new Set(cluster.face_ids));
      setIsLoading(false);
    });
  }, [cluster.face_ids]);

  const handleToggleSelect = (id: number) => {
    const newSelected = new Set(selectedFaceIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFaceIds(newSelected);
  };

  const handleNameSubmit = () => {
    const idsToName = Array.from(selectedFaceIds);
    if (newName.trim() && idsToName.length > 0) {
      onNameCluster(idsToName, newName);
      onClose();
    }
  };

  const handleViewPhoto = async (photoId: number) => {
    const photo = await api.getPhoto(photoId);
    setSelectedPhoto(photo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 md:p-8">
      <div className="bg-slate-900 w-full max-w-6xl h-full max-h-[90vh] rounded-3xl overflow-hidden border border-slate-800 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
              <img 
                src={`/cache/${cluster.representative_face.thumbnail_path}`} 
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Review Matches <span className="text-slate-500 text-sm font-normal">({selectedFaceIds.size} selected)</span>
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-slate-400 text-sm">Deselect any incorrect matches before saving</p>
                <div className="flex gap-2 ml-4">
                  <button 
                    onClick={() => setSelectedFaceIds(new Set(faces.map(f => f.id)))}
                    className="text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-slate-700 text-[10px]">|</span>
                  <button 
                    onClick={() => setSelectedFaceIds(new Set())}
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <CloseIcon size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/30">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {faces.map(face => {
                const isSelected = selectedFaceIds.has(face.id);
                return (
                  <div 
                    key={face.id}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all group cursor-pointer ${
                      isSelected ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-800 opacity-50 grayscale'
                    }`}
                    onClick={() => handleToggleSelect(face.id)}
                  >
                    <img 
                      src={`/cache/${face.thumbnail_path}`} 
                      className="w-full h-full object-cover"
                      alt=""
                    />
                    
                    {/* Selection Overlay */}
                    <div className="absolute top-2 left-2">
                      {isSelected ? (
                        <div className="bg-blue-500 text-white rounded-full p-0.5 shadow-lg">
                          <CheckCircle2 size={20} />
                        </div>
                      ) : (
                        <div className="bg-black/40 text-white/50 rounded-full p-0.5 backdrop-blur-sm">
                          <Circle size={20} />
                        </div>
                      )}
                    </div>

                    {/* View Photo Button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewPhoto(face.photo_id);
                      }}
                      className="absolute bottom-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                      title="View full photo"
                    >
                      <Grid size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full max-w-md">
            <div className="relative flex gap-2">
              <div className="flex-1">
                <PersonAutocomplete 
                  value={newName}
                  onChange={setNewName}
                  onSelect={(p) => {
                    setNewName(p.name || '');
                    // We don't auto-submit here so they can review selection
                  }}
                  onEnter={handleNameSubmit}
                />
              </div>
              <button 
                onClick={handleNameSubmit}
                disabled={!newName.trim() || selectedFaceIds.size === 0}
                className="px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-bold transition-all flex items-center gap-2 h-[38px] whitespace-nowrap"
              >
                <Check size={18} /> Save Identity
              </button>
            </div>
          </div>
          <p className="text-slate-500 text-xs italic">
            Naming will apply to {selectedFaceIds.size} selected faces. {faces.length - selectedFaceIds.size} faces will remain unnamed.
          </p>
        </div>
      </div>

      {selectedPhoto && (
        <PhotoModal 
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onUpdate={(updated) => {
            setSelectedPhoto(updated);
          }}
        />
      )}
    </div>
  );
};

export const PeopleView: React.FC<PeopleViewProps> = ({ onPersonClick }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [clusters, setClusters] = useState<FaceCluster[]>([]);
  const [namingClusterId, setNamingClusterId] = useState<number | null>(null);
  const [viewingClusterIdx, setViewingClusterIdx] = useState<number | null>(null);
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [peopleData, clusterData] = await Promise.all([
        api.getPeople(),
        api.getUnnamedClusters()
      ]);
      setPeople(peopleData);
      setClusters(clusterData);
    } catch (err) {
      console.error('Failed to load people data:', err);
      setError('Failed to load people data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNameFaces = async (faceIds: number[], name: string) => {
    if (!name.trim() || faceIds.length === 0) return;
    
    // Check if person exists
    let person = people.find(p => p.name?.toLowerCase() === name.toLowerCase());
    
    await api.bulkAssignFaces(faceIds, person?.id, name);
    setNewName('');
    setNamingClusterId(null);
    loadData();
  };

  const [mergingPersonId, setMergingPersonId] = useState<number | null>(null);
  const [mergeTargetName, setMergeTargetName] = useState('');
  const [selectedMergeTarget, setSelectedMergeTarget] = useState<Person | null>(null);

  const handleRenamePerson = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await api.updatePerson(id, editName);
      setEditingPersonId(null);
      loadData();
    } catch (err) {
      alert('Failed to rename person');
    }
  };

  const handleMergePeople = async (sourceId: number) => {
    if (!selectedMergeTarget || selectedMergeTarget.id === sourceId) {
      alert('Please select a different person to merge into.');
      return;
    }

    const sourcePerson = people.find(p => p.id === sourceId);
    if (!confirm(`Are you sure you want to merge "${sourcePerson?.name}" into "${selectedMergeTarget.name}"? This will move all tagged photos and cannot be undone.`)) {
      return;
    }

    try {
      await api.mergePeople(sourceId, selectedMergeTarget.id);
      setMergingPersonId(null);
      setMergeTargetName('');
      setSelectedMergeTarget(null);
      loadData();
    } catch (err) {
      alert('Failed to merge people');
    }
  };

  const handleDeletePerson = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? All associated faces will become unnamed.`)) return;
    try {
      await api.deletePerson(id);
      loadData();
    } catch (err) {
      alert('Failed to delete person');
    }
  };

  return (
    <div className="p-6 space-y-12">
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <RefreshCw className="animate-spin text-blue-500" size={48} />
          <p className="text-slate-400 font-medium italic">Grouping faces and loading people...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl flex items-center gap-4 text-red-200">
          <CloseIcon size={24} className="text-red-500" />
          <p>{error}</p>
          <button onClick={loadData} className="ml-auto bg-red-600 hover:bg-red-700 px-4 py-1 rounded-lg text-sm font-bold transition-colors">Retry</button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <section>
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 text-white">
              <Users size={32} className="text-blue-500" /> People
            </h2>
        {people.length === 0 ? (
          <div className="bg-slate-900 p-12 rounded-2xl text-center border border-slate-800 text-slate-500 italic">
            No people identified yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {people.map(person => {
              const isEditing = editingPersonId === person.id;
              const isMerging = mergingPersonId === person.id;

              return (
                <div 
                  key={person.id} 
                  className={`bg-slate-900 rounded-2xl overflow-hidden border transition-all relative shadow-lg ${
                    isMerging ? 'ring-2 ring-orange-500 border-orange-500/50' : 'border-slate-800 hover:border-slate-700 hover:shadow-blue-900/10'
                  } group`}
                >
                  <div 
                    onClick={() => onPersonClick?.(person.id, person.name || 'Unknown')}
                    className="aspect-square bg-slate-800 flex items-center justify-center text-4xl text-slate-600 font-bold uppercase relative overflow-hidden cursor-pointer"
                  >
                    {person.thumbnail_path ? (
                      <img 
                        src={`/cache/${person.thumbnail_path}`} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        alt={person.name || ''}
                      />
                    ) : (
                      person.name?.[0] || '?'
                    )}
                    {person.face_count && person.face_count > 0 && (
                      <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm" title={`${person.face_count} tagged photos`}>
                        {person.face_count}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenamePerson(person.id);
                            if (e.key === 'Escape') setEditingPersonId(null);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                        <button onClick={() => handleRenamePerson(person.id)} className="text-green-500 hover:text-green-400"><Check size={18} /></button>
                        <button onClick={() => setEditingPersonId(null)} className="text-red-500 hover:text-red-400"><CloseIcon size={18} /></button>
                      </div>
                    ) : isMerging ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-orange-500 uppercase">Merge into:</p>
                        <div className="flex gap-1">
                          <PersonAutocomplete 
                            value={mergeTargetName}
                            onChange={setMergeTargetName}
                            onSelect={(p) => {
                              setSelectedMergeTarget(p);
                              setMergeTargetName(p.name || '');
                            }}
                            onEnter={() => handleMergePeople(person.id)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleMergePeople(person.id)} 
                            disabled={!selectedMergeTarget}
                            className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white text-[10px] py-1.5 rounded font-bold transition-colors"
                          >
                            Merge
                          </button>
                          <button 
                            onClick={() => {
                              setMergingPersonId(null);
                              setMergeTargetName('');
                              setSelectedMergeTarget(null);
                            }} 
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] py-1.5 rounded font-bold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 relative">
                        <span 
                          onClick={() => onPersonClick?.(person.id, person.name || 'Unknown')}
                          className="font-semibold cursor-pointer text-slate-200 truncate"
                        >
                          {person.name || 'Unknown'}
                        </span>
                        
                        {/* Hover Actions */}
                        <div className="hidden group-hover:flex gap-1 absolute -top-12 right-0 bg-black/80 backdrop-blur-md rounded-xl p-1.5 border border-slate-700 shadow-xl z-20">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPersonId(person.id);
                              setEditName(person.name || '');
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="Rename"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setMergingPersonId(person.id);
                              setMergeTargetName('');
                              setSelectedMergeTarget(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-all"
                            title="Merge with another person"
                          >
                            <RefreshCw size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePerson(person.id, person.name || 'Unknown');
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 text-white">
          <UserPlus size={32} className="text-orange-500" /> Who is this?
        </h2>
        {clusters.length === 0 ? (
          <div className="bg-slate-900 p-12 rounded-2xl text-center border border-slate-800 text-slate-500 italic">
            All detected faces have been named.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {clusters.map((cluster, idx) => (
              <div key={idx} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 p-2 space-y-3 shadow-lg hover:border-slate-700 transition-all group">
                <div 
                  className="aspect-square bg-slate-800 rounded-xl overflow-hidden relative cursor-pointer"
                  onClick={() => setViewingClusterIdx(idx)}
                >
                   <div className="absolute inset-0 flex items-center justify-center">
                      {cluster.representative_face.thumbnail_path ? (
                        <img 
                          src={`/cache/${cluster.representative_face.thumbnail_path}`} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          alt="Detected face"
                        />
                      ) : (
                        <User size={48} className="text-slate-700" />
                      )}
                   </div>
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Grid className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                   </div>
                   {cluster.count > 1 && (
                     <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg z-10">
                       +{cluster.count - 1} more
                     </div>
                   )}
                </div>
                
                {namingClusterId === idx ? (
                  <div className="space-y-2">
                    <PersonAutocomplete 
                      value={newName}
                      onChange={setNewName}
                      onSelect={(p) => {
                        setNewName(p.name || '');
                        handleNameFaces(cluster.face_ids, p.name || '');
                      }}
                      onEnter={() => handleNameFaces(cluster.face_ids, newName)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleNameFaces(cluster.face_ids, newName)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-1.5 rounded font-bold transition-colors">Save</button>
                      <button onClick={() => setNamingClusterId(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] py-1.5 rounded font-bold transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setNamingClusterId(idx)}
                    className="w-full bg-slate-800 hover:bg-blue-600 py-2 rounded-lg text-sm font-semibold transition-colors text-slate-200"
                  >
                    Name this person
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {viewingClusterIdx !== null && (
        <FacePhotosModal 
          cluster={clusters[viewingClusterIdx]}
          onClose={() => setViewingClusterIdx(null)}
          onNameCluster={handleNameFaces}
        />
      )}
    </>
  )}
</div>
  );
};
