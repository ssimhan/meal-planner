'use client';

import React, { useState } from 'react';
import MealCorrectionInput from './MealCorrectionInput';

export interface FeedbackButtonsProps {
  feedbackType: 'school_snack' | 'home_snack' | 'kids_lunch' | 'adult_lunch';
  currentFeedback?: string;
  madeStatus?: boolean;
  mealName: string;
  logLoading: boolean;
  recipes: { id: string; name: string }[];
  onLogFeedback: (
    feedbackType: 'school_snack' | 'home_snack' | 'kids_lunch' | 'adult_lunch',
    emoji: string,
    made: boolean,
    overrideText?: string,
    needsFix?: boolean,
    requestRecipe?: boolean
  ) => Promise<void>;
}

export default function FeedbackButtons({
  feedbackType,
  currentFeedback,
  madeStatus,
  mealName,
  logLoading,
  recipes,
  onLogFeedback
}: FeedbackButtonsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState('');

  const handleEditSubmit = (mealName: string, requestRecipe: boolean) => {
    onLogFeedback(feedbackType, '', true, mealName, false, requestRecipe);
    setIsEditing(false);
  };

  // Step 1: Initial State (Not logged yet)
  if (madeStatus === undefined || madeStatus === null) {
    return (
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => onLogFeedback(feedbackType, '👍', true)}
          disabled={logLoading}
          className="btn-primary text-xs py-1 px-3"
        >
          ✓ Made
        </button>
        <button
          onClick={() => onLogFeedback(feedbackType, 'Skipped', false)}
          disabled={logLoading}
          className="btn-secondary text-xs py-1 px-3 border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
        >
          ✗ Not Made
        </button>
      </div>
    );
  }

  // Step 2b: If Made, show preference emojis + Fix button
  if (madeStatus === true && !isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-around items-center bg-[var(--bg-secondary)] p-1 rounded">
          {['❤️', '👍', '😐', '👎', '❌'].map(emoji => (
            <button
              key={emoji}
              onClick={() => onLogFeedback(feedbackType, emoji, true)}
              disabled={logLoading}
              className={`p-1 hover:scale-110 transition-transform ${currentFeedback?.includes(emoji) ? 'opacity-100' : 'opacity-40 grayscale'}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setIsEditing(true); setEditInput(currentFeedback || ''); }}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-sage)] underline decoration-dotted text-center"
        >
          🔧 Fix / Edit Details
        </button>
      </div>
    );
  }

  // Step 2c: Edit Mode
  if (madeStatus === true && isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">Correction / Actual details:</span>
        <MealCorrectionInput
          recipes={recipes}
          onSave={handleEditSubmit}
          onCancel={() => setIsEditing(false)}
          placeholder="e.g., Had apple instead"
          existingValue={currentFeedback || ''}
        />
      </div>
    );
  }

  // Step 3: Show status badge if already logged (skipped)
  return (
    <div className="text-xs text-[var(--text-muted)] text-center">
      {madeStatus === false ? `✗ Skipped: ${currentFeedback || 'No details'}` : `✓ Made ${currentFeedback || ''}`}
    </div>
  );
}
