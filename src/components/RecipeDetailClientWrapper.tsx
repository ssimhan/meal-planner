'use client';

import React, { useState } from 'react';
import StepByStepCooking from './StepByStepCooking';

interface RecipeDetailClientWrapperProps {
    recipeId: string;
    name: string;
    ingredients: string[];
    prepSteps: string[];
    instructions: string[];
    children: React.ReactNode;
}

import { useRouter } from 'next/navigation';
import { Play, Edit } from 'lucide-react';
import RecipeEditor from './RecipeEditor';

export default function RecipeDetailClientWrapper({ recipeId, name, ingredients, prepSteps, instructions, children }: RecipeDetailClientWrapperProps) {
    const [isCooking, setIsCooking] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    if (isEditing) {
        return (
            <RecipeEditor
                recipeId={recipeId}
                initialData={{ name, ingredients, prepSteps, instructions }}
                onSave={() => {
                    setIsEditing(false);
                    router.refresh();
                }}
                onCancel={() => setIsEditing(false)}
            />
        );
    }

    return (
        <>
            <div className="relative">
                {/* Floating "Start Cooking" button for mobile */}
                <button
                    onClick={() => setIsCooking(true)}
                    className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-6 py-4 bg-[var(--accent-sage)] text-white rounded-full font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all md:hidden"
                >
                    <Play size={20} fill="currentColor" />
                    <span>Start Cooking</span>
                </button>

                {/* Desktop Toolbar */}
                <div className="hidden md:flex gap-3 mb-8">
                    <button
                        onClick={() => setIsCooking(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-sage)] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        <Play size={18} fill="currentColor" />
                        <span>Open Focus Mode</span>
                    </button>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl font-bold shadow-sm hover:shadow-md hover:bg-gray-50 transition-all"
                    >
                        <Edit size={18} />
                        <span>Edit Content</span>
                    </button>
                </div>

                {children}
            </div>

            {isCooking && (
                <StepByStepCooking
                    recipe={{ name, ingredients, prepSteps, instructions }}
                    onClose={() => setIsCooking(false)}
                />
            )}
        </>
    );
}
