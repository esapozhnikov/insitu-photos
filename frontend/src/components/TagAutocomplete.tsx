import React, { useState, useEffect } from 'react';
import { Tag as TagIcon, X } from 'lucide-react';
import { api } from '../api/client';

interface TagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

export const TagAutocomplete: React.FC<TagAutocompleteProps> = ({ value, onChange }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Fetch all tags once
    api.getStats().then(stats => {
      // In a real app we'd have a specific GET /tags endpoint
      // For now let's just use empty if stats doesn't provide them
      // Or we can fetch suggestions from search API
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Get the current word being typed (after the last comma)
    const parts = newValue.split(',');
    const currentWord = parts[parts.length - 1].trim();

    if (currentWord.length >= 1) {
      api.getSearchSuggestions(currentWord).then(res => {
        setSuggestions(res.tags.map((t: any) => t.name));
        setShowSuggestions(true);
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (tag: string) => {
    const parts = value.split(',');
    parts[parts.length - 1] = ` ${tag}`;
    onChange(parts.join(',').trim());
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <input 
        type="text"
        value={value}
        onChange={handleInputChange}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="vacation, beach, 2024..."
        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-blue-500 transition-colors"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
          {suggestions.map(tag => (
            <button
              key={tag}
              onClick={() => handleSelectSuggestion(tag)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <TagIcon size={14} className="text-orange-400" /> {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
