'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { updateRecipeContent } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Loader2, Save, X } from 'lucide-react';

interface RecipeEditorProps {
    recipeId: string;
    initialData: {
        name: string;
        ingredients: string[];
        prepSteps: string[];
        instructions: string[];
    };
    onSave: () => void;
    onCancel: () => void;
}

export default function RecipeEditor({ recipeId, initialData, onSave, onCancel }: RecipeEditorProps) {
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [ingredients, setIngredients] = useState(initialData.ingredients.join('\n'));
    // Handle cases where prepSteps might be undefined coming from older APIs
    const [prepSteps, setPrepSteps] = useState((initialData.prepSteps || []).join('\n'));
    const [instructions, setInstructions] = useState(initialData.instructions.join('\n'));

    // Handle Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [ingredients, prepSteps, instructions]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateRecipeContent(recipeId, {
                ingredients: ingredients.split('\n').filter(line => line.trim()),
                prep_steps: prepSteps.split('\n').filter(line => line.trim()),
                instructions: instructions.split('\n').filter(line => line.trim()),
            });
            showToast('Recipe saved successfully!', 'success');
            onSave();
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'Failed to save recipe', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-subtle)] sticky top-4 z-10 shadow-sm">
                <h2 className="text-xl font-bold text-[var(--text-primary)] pl-2 border-l-4 border-[var(--accent-sage)]">
                    Editing Mode
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        className="px-4 py-2 text-[var(--text-muted)] font-bold hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
                    >
                        <X size={18} />
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-[var(--accent-sage)] text-white font-bold rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* 3-Column Layout for Desktop, Stacked for Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh] min-h-[600px]">

                {/* Ingredients Column */}
                <div className="flex flex-col h-full">
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-sage)] mb-2">
                        Ingredients
                    </label>
                    <textarea
                        value={ingredients}
                        onChange={(e) => setIngredients(e.target.value)}
                        className="flex-1 w-full p-4 rounded-lg bg-white border border-[var(--border-subtle)] focus:border-[var(--accent-green)] focus:ring-1 focus:ring-[var(--accent-green)] outline-none resize-none font-mono text-sm leading-relaxed shadow-sm"
                        placeholder="- 1 cup flour..."
                    />
                </div>

                {/* Prep Steps Column */}
                <div className="flex flex-col h-full">
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-gold)] mb-2">
                        Prep Steps
                    </label>
                    <textarea
                        value={prepSteps}
                        onChange={(e) => setPrepSteps(e.target.value)}
                        className="flex-1 w-full p-4 rounded-lg bg-white border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] outline-none resize-none leading-relaxed shadow-sm"
                        placeholder="- Chop onions..."
                    />
                </div>

                {/* Instructions Column */}
                <div className="flex flex-col h-full">
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-terracotta)] mb-2">
                        Instructions
                    </label>
                    <textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="flex-1 w-full p-4 rounded-lg bg-white border border-[var(--border-subtle)] focus:border-[var(--accent-terracotta)] focus:ring-1 focus:ring-[var(--accent-terracotta)] outline-none resize-none leading-relaxed shadow-sm"
                        placeholder="1. Preheat oven..."
                    />
                </div>
            </div>

            <div className="text-center text-xs text-[var(--text-muted)] font-mono">
                ⌘+S to save
            </div>
        </div>
    );
}
