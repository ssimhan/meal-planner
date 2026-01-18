'use client';

import React, { useState } from 'react';
import StepByStepCooking from './StepByStepCooking';
import { Play } from 'lucide-react';

interface RecipeDetailClientWrapperProps {
    name: string;
    ingredients: string[];
    prepSteps: string[];
    instructions: string[];
    children: React.ReactNode;
}

export default function RecipeDetailClientWrapper({ name, ingredients, prepSteps, instructions, children }: RecipeDetailClientWrapperProps) {
    const [isCooking, setIsCooking] = useState(false);

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

                {/* Desktop "Start Cooking" inline button */}
                <div className="hidden md:block mb-8">
                    <button
                        onClick={() => setIsCooking(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-sage)] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        <Play size={18} fill="currentColor" />
                        <span>Open Focus Mode</span>
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
