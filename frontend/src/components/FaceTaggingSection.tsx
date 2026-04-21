import React, { useState, useEffect } from 'react';
import { Users, UserPlus, X, Check, Edit2, Trash2 } from 'lucide-react';
import { Photo, Face, Person } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PersonAutocomplete } from './PersonAutocomplete';

interface FaceTaggingSectionProps {
  photo: Photo;
  onUpdate: (updatedPhoto: Photo) => void;
}

export const FaceTaggingSection: React.FC<FaceTaggingSectionProps> = ({ photo, onUpdate }) => {
  const { isUser } = useAuth();
  const [faces, setFaces] = useState<Face[]>([]);
  const [namingFaceId, setNamingFaceId] = useState<number | null>(null);
  const [editingFaceId, setEditingFaceId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api.getPhotoFaces(photo.id).then(setFaces);
  }, [photo.id]);

  const handleNameFace = async (faceId: number, isEditing: boolean = false) => {
    const nameToUse = selectedPerson ? selectedPerson.name || '' : (isEditing ? editName : newName);
    const personId = selectedPerson ? selectedPerson.id : undefined;

    if (!nameToUse.trim() && !personId) return;
    setIsLoading(true);
    try {
      await api.bulkAssignFaces([faceId], personId, nameToUse);
      if (isEditing) {
        setEditName('');
        setEditingFaceId(null);
      } else {
        setNewName('');
        setNamingFaceId(null);
      }
      setSelectedPerson(null);
      
      // Refresh photo data to show new people using dedicated getPhoto endpoint
      const updated = await api.getPhoto(photo.id);
      onUpdate(updated);
      
      // Refresh faces list locally
      const updatedFaces = await api.getPhotoFaces(photo.id);
      setFaces(updatedFaces);
    } catch (err) {
      alert('Failed to assign name');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePerson = async (faceId: number) => {
    if (!confirm('Remove this person from the photo?')) return;
    setIsLoading(true);
    try {
      await api.deletePhotoFace(photo.id, faceId);
      
      const updated = await api.getPhoto(photo.id);
      onUpdate(updated);
      const updatedFaces = await api.getPhotoFaces(photo.id);
      setFaces(updatedFaces);
    } catch (err) {
      alert('Failed to remove person');
    } finally {
      setIsLoading(false);
    }
  };

  const unnamedFaces = faces.filter(f => !f.person_id);
  const namedFaces = faces.filter(f => f.person_id);

  return (
    <div className="space-y-4">
      {/* Named People */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Users size={14} /> People in Photo
        </label>
        <div className="flex flex-wrap gap-2">
          {namedFaces.length === 0 ? (
            <span className="text-slate-600 italic text-sm">No one tagged yet</span>
          ) : (
            namedFaces.map(face => {
              const personName = photo.people?.find(p => p.id === face.person_id)?.name || 'Unknown';
              return (
                <div key={face.id} className="group relative">
                  {editingFaceId === face.id ? (
                    <div className="flex items-center gap-2 bg-slate-900 border border-blue-500/50 rounded-full pl-1 pr-1 py-1 shadow-lg shadow-blue-900/20 z-10">
                      {face.thumbnail_path && (
                        <img src={`/cache/${face.thumbnail_path}`} className="w-6 h-6 rounded-full object-cover" alt="" />
                      )}
                      <div className="w-40">
                        <PersonAutocomplete 
                          value={editName}
                          onChange={setEditName}
                          onSelect={(p) => {
                            setSelectedPerson(p);
                            setEditName(p.name || '');
                            // We wait for Check button for final submit
                          }}
                          onEnter={() => handleNameFace(face.id, true)}
                        />
                      </div>
                      <button 
                        onClick={() => handleNameFace(face.id, true)}
                        className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingFaceId(null);
                          setEditName('');
                          setSelectedPerson(null);
                        }}
                        className="p-1 bg-slate-800 text-slate-400 rounded-full hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-blue-600/20 text-blue-400 border border-blue-500/30 pl-1 pr-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-blue-600/30 transition-colors">
                      {face.thumbnail_path && (
                        <img src={`/cache/${face.thumbnail_path}`} className="w-6 h-6 rounded-full object-cover" alt="" />
                      )}
                      <span>{personName}</span>
                      {isUser && (
                        <div className="hidden group-hover:flex items-center gap-1 ml-1 border-l border-blue-500/30 pl-1">
                          <button 
                            onClick={() => {
                              setEditingFaceId(face.id);
                              setEditName(personName);
                            }}
                            className="p-1 text-blue-400 hover:text-white rounded hover:bg-blue-500/20"
                            title="Rename/Reassign"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => handleRemovePerson(face.id)}
                            className="p-1 text-red-400 hover:text-white rounded hover:bg-red-500/20"
                            title="Remove Tag"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Unnamed Faces */}
      {isUser && unnamedFaces.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800/50">
          <label className="text-xs font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
            <UserPlus size={14} /> Suggested Faces
          </label>
          <div className="grid grid-cols-3 gap-2">
            {unnamedFaces.map(face => (
              <div key={face.id} className="bg-slate-950 border border-slate-800 rounded-lg p-1 space-y-1">
                <div className="aspect-square rounded-md overflow-hidden bg-slate-900">
                  <img src={`/cache/${face.thumbnail_path}`} className="w-full h-full object-cover" alt="Detected face" />
                </div>
                {namingFaceId === face.id ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <PersonAutocomplete 
                        value={newName}
                        onChange={setNewName}
                        onSelect={(p) => {
                          setSelectedPerson(p);
                          setNewName(p.name || '');
                        }}
                        onEnter={() => handleNameFace(face.id)}
                      />
                      <button 
                        onClick={() => handleNameFace(face.id)} 
                        disabled={isLoading}
                        className="text-blue-500 bg-slate-800 p-1 rounded hover:bg-slate-700 transition-colors"
                      >
                        {isLoading ? '...' : <Check size={14} />}
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setNamingFaceId(null);
                        setNewName('');
                        setSelectedPerson(null);
                      }}
                      className="text-[10px] text-slate-500 hover:text-red-400 uppercase font-bold text-left"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setNamingFaceId(face.id)}
                    className="w-full text-[10px] font-bold text-slate-400 hover:text-white py-1 transition-colors"
                  >
                    Name
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
