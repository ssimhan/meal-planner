'use client';

import { useState, useEffect, useRef } from 'react';

interface MealCorrectionInputProps {
  recipes: { id: string; name: string }[];
  onSave: (mealName: string, requestRecipe: boolean) => void;
  onCancel: () => void;
  placeholder?: string;
  existingValue?: string;
}

export default function MealCorrectionInput({
  recipes,
  onSave,
  onCancel,
  placeholder = 'Type to search recipes or enter custom meal...',
  existingValue = ''
}: MealCorrectionInputProps) {
  const [inputValue, setInputValue] = useState(existingValue);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredRecipes, setFilteredRecipes] = useState<{ id: string; name: string }[]>([]);
  const [isExistingRecipe, setIsExistingRecipe] = useState(false);
  const [requestRecipe, setRequestRecipe] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sort recipes alphabetically
  const sortedRecipes = [...recipes].sort((a, b) => a.name.localeCompare(b.name));

  // Filter recipes based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = sortedRecipes.filter(recipe =>
        recipe.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredRecipes(filtered);

      // Check if exact match exists
      const exactMatch = sortedRecipes.find(
        recipe => recipe.name.toLowerCase() === inputValue.toLowerCase()
      );
      setIsExistingRecipe(!!exactMatch);
    } else {
      setFilteredRecipes([]);
      setIsExistingRecipe(false);
    }
  }, [inputValue, sortedRecipes]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  };

  const handleSelectRecipe = (recipeName: string) => {
    setInputValue(recipeName);
    setIsExistingRecipe(true);
    setShowDropdown(false);
    setRequestRecipe(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredRecipes.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredRecipes.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredRecipes.length) {
          handleSelectRecipe(filteredRecipes[highlightedIndex].name);
        } else {
          handleSave();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  };

  const handleSave = () => {
    if (!inputValue.trim()) return;
    onSave(inputValue.trim(), requestRecipe);
  };

  return (
    <div className="mt-2 space-y-1.5">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-sage focus:border-transparent"
          autoFocus
        />

        {/* Dropdown */}
        {showDropdown && filteredRecipes.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredRecipes.map((recipe, index) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => handleSelectRecipe(recipe.name)}
                className={`w-full text-left px-3 py-2 hover:bg-sage/10 ${
                  index === highlightedIndex ? 'bg-sage/20' : ''
                }`}
              >
                {recipe.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inline checkbox for new recipes */}
      {inputValue.trim() && !isExistingRecipe && (
        <label className="flex items-center gap-1.5 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={requestRecipe}
            onChange={(e) => setRequestRecipe(e.target.checked)}
            className="rounded border-gray-300 text-sage focus:ring-sage h-3.5 w-3.5"
          />
          <span>Add this as a new recipe to the index</span>
        </label>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!inputValue.trim()}
          className="flex-1 px-3 py-1.5 text-sm bg-sage text-white rounded-md hover:bg-sage/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
