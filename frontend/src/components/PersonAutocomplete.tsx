import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Person } from '../types';

interface PersonAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (person: Person) => void;
  onEnter: () => void;
}

export const PersonAutocomplete: React.FC<PersonAutocompleteProps> = ({ value, onChange, onSelect, onEnter }) => {
  const [suggestions, setSuggestions] = useState<Person[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length >= 1) {
      api.getPeople().then((people: Person[]) => {
        const filtered = people.filter((p: Person) => 
          p.name?.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 5);
        setSuggestions(filtered);
        setIsOpen(filtered.length > 0);
      });
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input 
        type="text" 
        id="person-name-autocomplete"
        name="person-name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.length >= 1 && suggestions.length > 0 && setIsOpen(true)}
        placeholder="Name..."
        autoFocus
        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 transition-colors"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onEnter();
            setIsOpen(false);
          }
        }}
      />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map(person => (
            <button
              key={person.id}
              onClick={() => {
                onSelect(person);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 flex items-center gap-2 transition-colors border-b border-slate-700/50 last:border-0"
            >
              {person.thumbnail_path && (
                <img src={`/cache/${person.thumbnail_path}`} className="w-6 h-6 rounded-full object-cover" alt="" />
              )}
              <span className="font-medium text-slate-200">{person.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
