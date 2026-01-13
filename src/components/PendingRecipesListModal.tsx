'use client';

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { ignoreRecipe } from '@/lib/api';
import RecipeCaptureModal from './RecipeCaptureModal';

interface PendingRecipesListModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendingRecipes: string[];
    onRefresh: () => void;
}

export default function PendingRecipesListModal({ isOpen, onClose, pendingRecipes, onRefresh }: PendingRecipesListModalProps) {
    const { showToast } = useToast();
    const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);
    const [removedMeals, setRemovedMeals] = useState<string[]>([]);

    const visibleRecipes = pendingRecipes.filter(m => !removedMeals.includes(m));

    // Filter out recipes that are currently being processed or ignored locally to give immediate feedback
    // Since pendingRecipes comes from props, we might need local state if we want to animate removal before refresh
    // For now we rely on onRefresh to update the list, but we can optimistically hide items?
    // Let's just rely on refresh for simplicity first.

    if (!isOpen) return null;

    const handleDiscard = async (meal: string) => {
        if (!confirm(`Are you sure you want to discard "${meal}"? It will be added to the ignore list.`)) return;

        setProcessing(meal);
        try {
            await ignoreRecipe(meal);
            showToast(`Discarded "${meal}"`, 'info');
            setRemovedMeals(prev => [...prev, meal]);
            onRefresh();
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setProcessing(null);
        }
    };

    const handleCapture = (meal: string) => {
        setSelectedMeal(meal);
    };

    const handleCaptureSuccess = () => {
        setSelectedMeal(null);
        if (selectedMeal) {
            setRemovedMeals(prev => [...prev, selectedMeal]);
        }
        onRefresh();
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-sm shadow-2xl overflow-hidden border border-[var(--border-subtle)] flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex justify-between items-center">
                    <h2 className="text-xl font-serif font-black text-[var(--accent-green)]">Pending Recipes ({pendingRecipes.length})</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--accent-terracotta)] text-xl">✕</button>
                </div>

                <div className="p-0 overflow-y-auto bg-[var(--bg-primary)]">
                    {visibleRecipes.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text-muted)] italic">
                            All updated! No pending recipes found.
                        </div>
                    ) : (
                        <ul className="divide-y divide-[var(--border-subtle)]">
                            {visibleRecipes.map((meal) => (
                                <li key={meal} className="p-4 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors group">
                                    <span className="font-medium text-lg capitalize">{meal}</span>
                                    <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDiscard(meal)}
                                            disabled={processing === meal}
                                            className="px-3 py-1 text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-terracotta)] hover:bg-neutral-100 rounded border border-transparent hover:border-[var(--border-subtle)]"
                                        >
                                            {processing === meal ? '...' : 'Discard'}
                                        </button>
                                        <button
                                            onClick={() => handleCapture(meal)}
                                            className="px-3 py-1 text-xs font-black uppercase tracking-widest text-white bg-[var(--accent-green)] hover:bg-opacity-90 rounded shadow-sm hover:shadow-md transition-all active:translate-y-[1px]"
                                        >
                                            Capture
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {selectedMeal && (
                <RecipeCaptureModal
                    isOpen={!!selectedMeal}
                    onClose={() => setSelectedMeal(null)}
                    mealName={selectedMeal}
                    onSuccess={handleCaptureSuccess}
                />
            )}
        </div>
    );
}
