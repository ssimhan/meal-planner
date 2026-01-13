'use client';

import React, { useState } from 'react';
import { WorkflowStatus } from '@/types';
import RecipeCaptureModal from './RecipeCaptureModal';

interface RecipeCaptureBannerProps {
    status: WorkflowStatus;
    onRefresh: () => void;
}

export default function RecipeCaptureBanner({ status, onRefresh }: RecipeCaptureBannerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMeal, setSelectedMeal] = useState<string | null>(null);

    if (!status.pending_recipes || status.pending_recipes.length === 0) return null;

    const pendingCount = status.pending_recipes.length;

    const handleCapture = (mealName: string) => {
        setSelectedMeal(mealName);
        setIsModalOpen(true);
    };

    return (
        <div className="bg-[var(--bg-secondary)] border-2 border-[var(--accent-sage)] p-6 rounded-sm mb-8 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
            {/* Subtle background texture */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><path d="M0 0 L60 60 M60 0 L0 60" stroke="currentColor" stroke-width="0.5" fill="none"/></svg>')` }}>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--accent-sage)] rounded-full flex items-center justify-center text-2xl shadow-inner">
                        🌱
                    </div>
                    <div>
                        <h3 className="font-serif font-black text-xl text-[var(--accent-green)]">New Recipes Detected</h3>
                        <p className="text-sm text-[var(--text-muted)] font-medium">
                            You've logged <span className="text-[var(--accent-terracotta)] font-bold">{pendingCount}</span> meal{pendingCount > 1 ? 's' : ''} not yet in your recipe index.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                    {status.pending_recipes.map((meal) => (
                        <button
                            key={meal}
                            onClick={() => handleCapture(meal)}
                            className="bg-[var(--accent-green)] text-white px-5 py-2 rounded-sm font-black uppercase tracking-widest text-[10px] hover:bg-opacity-90 hover:translate-y-[-1px] transition-all shadow-md active:translate-y-0"
                        >
                            Capture {meal}
                        </button>
                    ))}
                </div>
            </div>

            {selectedMeal && (
                <RecipeCaptureModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedMeal(null);
                    }}
                    mealName={selectedMeal}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        setSelectedMeal(null);
                        onRefresh();
                    }}
                />
            )}
        </div>
    );
}
