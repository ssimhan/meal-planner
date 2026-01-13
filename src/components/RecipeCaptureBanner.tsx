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
        <div className="bg-[var(--accent-indigo)] text-white p-4 rounded-lg mb-8 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                        <h3 className="font-bold text-lg">New Recipes Detected</h3>
                        <p className="text-sm opacity-90">
                            You've logged {pendingCount} meal{pendingCount > 1 ? 's' : ''} that {pendingCount > 1 ? 'aren\'t' : 'isn\'t'} in your recipe book yet.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                    {status.pending_recipes.map((meal) => (
                        <button
                            key={meal}
                            onClick={() => handleCapture(meal)}
                            className="bg-white text-[var(--accent-indigo)] px-4 py-1.5 rounded-full font-bold hover:bg-opacity-90 transition-all text-xs whitespace-nowrap"
                        >
                            Log {meal}
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
