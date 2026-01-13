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
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="glass w-full max-w-lg rounded-[32px] overflow-hidden flex flex-col max-h-[80vh] relative shadow-2xl shadow-black/20"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]" />

                <div className="p-8 border-b border-[var(--border-subtle)] bg-white/40 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-[var(--accent-primary)] tracking-tight">Pending Recipes</h2>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-black opacity-60 mt-1">{pendingRecipes.length} items to capture</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-0 overflow-y-auto bg-transparent">
                    {visibleRecipes.length === 0 ? (
                        <div className="p-12 text-center text-[var(--text-muted)] italic">
                            All updated! No pending recipes found.
                        </div>
                    ) : (
                        <ul className="divide-y divide-[var(--border-subtle)]">
                            {visibleRecipes.map((meal) => (
                                <li key={meal} className="p-6 flex items-center justify-between hover:bg-white/40 transition-colors group">
                                    <span className="font-bold text-lg text-[var(--text-main)] capitalize tracking-tight">{meal}</span>
                                    <div className="flex gap-2 opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDiscard(meal)}
                                            disabled={processing === meal}
                                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            {processing === meal ? '...' : 'Discard'}
                                        </button>
                                        <button
                                            onClick={() => handleCapture(meal)}
                                            className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-[var(--accent-primary)] hover:brightness-110 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
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
