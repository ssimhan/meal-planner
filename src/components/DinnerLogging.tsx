'use client';

import React from 'react';
import MealCorrectionInput from './MealCorrectionInput';
import { WorkflowStatus } from '@/lib/api';

export interface DinnerLoggingProps {
  status: WorkflowStatus | null;
  logLoading: boolean;
  showAlternatives: boolean;
  setShowAlternatives: (show: boolean) => void;
  selectedAlternative: 'freezer' | 'outside' | 'other' | null;
  setSelectedAlternative: (alt: 'freezer' | 'outside' | 'other' | null) => void;
  otherMealText: string;
  setOtherMealText: (text: string) => void;
  selectedFreezerMeal: string;
  setSelectedFreezerMeal: (meal: string) => void;
  isDinnerEditing: boolean;
  setIsDinnerEditing: (editing: boolean) => void;
  dinnerEditInput: string;
  setDinnerEditInput: (input: string) => void;
  recipes: { id: string; name: string }[];
  onLogDay: (
    made: boolean | string,
    feedback?: string,
    freezerMeal?: string,
    actualMeal?: string,
    needsFix?: boolean,
    requestRecipe?: boolean
  ) => Promise<void>;
}

export default function DinnerLogging({
  status,
  logLoading,
  showAlternatives,
  setShowAlternatives,
  selectedAlternative,
  setSelectedAlternative,
  otherMealText,
  setOtherMealText,
  selectedFreezerMeal,
  setSelectedFreezerMeal,
  isDinnerEditing,
  setIsDinnerEditing,
  dinnerEditInput,
  setDinnerEditInput,
  recipes,
  onLogDay
}: DinnerLoggingProps) {
  const freezerInventory = status?.week_data?.freezer_inventory || [];

  const handleMadeAsPlanned = () => {
    onLogDay(true);
  };

  const handleNotMade = () => {
    setShowAlternatives(true);
  };

  const handleAlternativeSelect = (alt: 'freezer' | 'outside' | 'other') => {
    setSelectedAlternative(alt);
  };

  const handleSubmitAlternative = async () => {
    if (selectedAlternative === 'freezer' && selectedFreezerMeal) {
      await onLogDay('freezer_backup', '', selectedFreezerMeal);
    } else if (selectedAlternative === 'outside') {
      await onLogDay('outside_meal');
    } else if (selectedAlternative === 'other' && otherMealText.trim()) {
      await onLogDay(false, '', '', otherMealText);
    }
  };

  const handleDinnerEditSubmitLocal = async (mealName: string, requestRecipe: boolean) => {
    const currentMade = status?.today_dinner?.made;
    let freezerMealArg = '';
    if (currentMade === 'freezer_backup' && status?.today_dinner?.freezer_used?.meal) {
      freezerMealArg = status.today_dinner.freezer_used.meal;
    }

    await onLogDay(
      currentMade!,
      status?.today_dinner?.kids_feedback || '',
      freezerMealArg,
      mealName,
      false,
      requestRecipe
    );
    setIsDinnerEditing(false);
  };

  // Already logged - show feedback emojis
  if (status?.today_dinner?.made && !isDinnerEditing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center bg-gray-50 p-1 rounded">
          {['❤️', '👍', '😐', '👎', '❌'].map(emoji => (
            <button
              key={emoji}
              onClick={() => onLogDay(true, emoji)}
              disabled={logLoading}
              className={`p-1 hover:scale-110 transition-transform ${status?.today_dinner?.kids_feedback?.includes(emoji) ? 'opacity-100' : 'opacity-40 grayscale'}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setIsDinnerEditing(true); setDinnerEditInput(status?.today_dinner?.actual_meal || ''); }}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-sage)] underline decoration-dotted text-center"
        >
          🔧 Fix / Edit Actual Meal
        </button>
      </div>
    );
  }

  if (status?.today_dinner?.made && isDinnerEditing) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">Correction / Actual meal:</span>
        <MealCorrectionInput
          recipes={recipes}
          onSave={handleDinnerEditSubmitLocal}
          onCancel={() => setIsDinnerEditing(false)}
          placeholder="e.g., Actually had Pizza"
          existingValue={status?.today_dinner?.actual_meal || ''}
        />
      </div>
    );
  }

  // Step 1: Made as planned or not?
  if (!showAlternatives) {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={handleMadeAsPlanned}
          disabled={logLoading}
          className="w-full py-2 bg-[var(--accent-green)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
        >
          ✓ Made
        </button>
        <button
          onClick={handleNotMade}
          disabled={logLoading}
          className="w-full py-1 border border-[var(--border-subtle)] text-xs rounded hover:bg-gray-50 disabled:opacity-50"
        >
          ✗ Did Not Make
        </button>
      </div>
    );
  }

  // Step 2: What did you eat instead?
  if (!selectedAlternative) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-[var(--text-muted)] mb-1">What did you eat instead?</span>
        <button
          onClick={() => handleAlternativeSelect('freezer')}
          className="w-full py-2 bg-[var(--accent-terracotta)] text-white text-xs rounded hover:opacity-90"
        >
          🧊 Freezer Meal
        </button>
        <button
          onClick={() => handleAlternativeSelect('outside')}
          className="w-full py-2 bg-[var(--accent-gold)] text-white text-xs rounded hover:opacity-90"
        >
          🍽️ Ate Out / Restaurant
        </button>
        <button
          onClick={() => handleAlternativeSelect('other')}
          className="w-full py-2 border border-[var(--border-subtle)] text-xs rounded hover:bg-gray-50"
        >
          📝 Something Else
        </button>
      </div>
    );
  }

  // Step 3a: Select freezer meal
  if (selectedAlternative === 'freezer') {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">Select freezer meal used:</span>
        {freezerInventory.length > 0 ? (
          <div className="max-h-32 overflow-y-auto space-y-1">
            {freezerInventory.map((item: any, idx: number) => (
              <label key={idx} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="radio"
                  name="freezer-meal"
                  value={item.meal}
                  checked={selectedFreezerMeal === item.meal}
                  onChange={(e) => setSelectedFreezerMeal(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-xs">{item.meal}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] italic">No freezer inventory available</p>
        )}
        <button
          onClick={handleSubmitAlternative}
          disabled={logLoading || !selectedFreezerMeal}
          className="w-full py-2 bg-[var(--accent-sage)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={() => { setSelectedAlternative(null); setSelectedFreezerMeal(''); }}
          className="w-full py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          ← Back
        </button>
      </div>
    );
  }

  // Step 3b: Ate out confirmation
  if (selectedAlternative === 'outside') {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs text-[var(--text-muted)]">Confirm: Ate at restaurant or ordered out</span>
        <button
          onClick={handleSubmitAlternative}
          disabled={logLoading}
          className="w-full py-2 bg-[var(--accent-sage)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          onClick={() => setSelectedAlternative(null)}
          className="w-full py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          ← Back
        </button>
      </div>
    );
  }

  // Step 3c: Something else - text input
  if (selectedAlternative === 'other') {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">What did you eat?</span>
        <input
          type="text"
          value={otherMealText}
          onChange={(e) => setOtherMealText(e.target.value)}
          placeholder="e.g., Leftovers, Sandwiches, Cereal"
          className="w-full px-2 py-1 text-xs border border-[var(--border-subtle)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-sage)]"
          disabled={logLoading}
        />
        <button
          onClick={handleSubmitAlternative}
          disabled={logLoading || !otherMealText.trim()}
          className="w-full py-2 bg-[var(--accent-sage)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={() => { setSelectedAlternative(null); setOtherMealText(''); }}
          className="w-full py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          ← Back
        </button>
      </div>
    );
  }

  return null;
}
