'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, Timer, Utensils, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface StepByStepCookingProps {
    recipe: {
        name: string;
        ingredients: string[];
        prepSteps: string[];
        instructions: string[];
    };
    onClose?: () => void;
}

type Phase = 'ingredients' | 'prep' | 'cook';

export default function StepByStepCooking({ recipe, onClose }: StepByStepCookingProps) {
    const [phase, setPhase] = useState<Phase>('ingredients');
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

    const phases: { id: Phase; label: string; icon: any; color: string; items: string[] }[] = [
        { id: 'ingredients', label: 'Ingredients', icon: Zap, color: 'emerald', items: recipe.ingredients },
        { id: 'prep', label: 'Prep Steps', icon: Utensils, color: 'amber', items: recipe.prepSteps },
        { id: 'cook', label: 'Cooking', icon: Timer, color: 'rose', items: recipe.instructions }
    ].filter(p => p.items.length > 0) as any;

    const currentPhaseIndex = phases.findIndex(p => p.id === phase);
    const currentPhase = phases[currentPhaseIndex];

    const colorClasses = {
        emerald: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-100',
            accent: 'bg-emerald-600',
            hover: 'hover:bg-emerald-50',
            light: 'bg-emerald-50/50'
        },
        amber: {
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-100',
            accent: 'bg-amber-600',
            hover: 'hover:bg-amber-50',
            light: 'bg-amber-50/50'
        },
        rose: {
            bg: 'bg-rose-50',
            text: 'text-rose-700',
            border: 'border-rose-100',
            accent: 'bg-rose-600',
            hover: 'hover:bg-rose-50',
            light: 'bg-rose-50/50'
        }
    }[currentPhase.color as keyof typeof colorClasses] || {
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-100',
        accent: 'bg-gray-600',
        hover: 'hover:bg-gray-50',
        light: 'bg-gray-50/50'
    };

    const handleToggleStep = (index: number) => {
        const next = new Set(completedSteps);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        setCompletedSteps(next);
    };

    const nextPhase = () => {
        if (currentPhaseIndex < phases.length - 1) {
            setPhase(phases[currentPhaseIndex + 1].id);
            setCompletedSteps(new Set());
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevPhase = () => {
        if (currentPhaseIndex > 0) {
            setPhase(phases[currentPhaseIndex - 1].id);
            setCompletedSteps(new Set());
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col sm:p-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <header className="p-6 border-b border-[var(--border-subtle)] bg-white sticky top-0 z-10 flex justify-between items-center shadow-sm">
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-900 line-clamp-1">{recipe.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold ${colorClasses.text} uppercase tracking-widest ${colorClasses.bg} px-2 py-0.5 rounded-full border ${colorClasses.border}`}>
                            Step {currentPhaseIndex + 1} of {phases.length}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{currentPhase.label}</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                >
                    ✕
                </button>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto px-6 py-8 relative flex flex-col items-center">
                {/* Visual Progress Bar (Mobile and Desktop) */}
                <div className="w-full max-w-2xl flex gap-2 mb-8">
                    {phases.map((p, idx) => (
                        <div
                            key={p.id}
                            className={`flex-1 h-2 rounded-full transition-all duration-700 ${idx <= currentPhaseIndex ? colorClasses.accent : 'bg-gray-100'
                                }`}
                        />
                    ))}
                </div>

                <div className="flex w-full max-w-4xl">
                    {/* Vertical Progress Line (Desktop) */}
                    <div className="hidden lg:flex flex-col items-center mr-12 pt-2">
                        {phases.map((p, idx) => (
                            <React.Fragment key={p.id}>
                                <div
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-500 ${idx === currentPhaseIndex ? `${colorClasses.accent} text-white scale-110 shadow-xl rotate-3` :
                                            idx < currentPhaseIndex ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-300'
                                        }`}
                                >
                                    <p.icon size={20} />
                                </div>
                                {idx < phases.length - 1 && (
                                    <div className={`w-1 h-20 transition-colors duration-500 rounded-full ${idx < currentPhaseIndex ? colorClasses.accent : 'bg-gray-50'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* List Items */}
                    <div className="flex-1 max-w-2xl mx-auto lg:mx-0">
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`p-3 rounded-2xl ${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}`}>
                                <currentPhase.icon size={32} />
                            </div>
                            <h2 className="text-4xl font-black text-gray-900 tracking-tight">
                                {currentPhase.label}
                            </h2>
                        </div>

                        <div className="space-y-4 animate-in slide-in-from-right-10 duration-500 ease-out">
                            {currentPhase.items.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleToggleStep(idx)}
                                    className={`group p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex items-start gap-5 overflow-hidden relative ${completedSteps.has(idx)
                                            ? `${colorClasses.light} border-${currentPhase.color}-200 opacity-50 scale-[0.97]`
                                            : `bg-white border-transparent shadow-[0_4px_20px_-5px_var(--shadow)] ${colorClasses.hover} hover:border-${currentPhase.color}-100 hover:-translate-y-1 active:scale-[0.98]`
                                        }`}
                                >
                                    {/* Animated background decoration */}
                                    {!completedSteps.has(idx) && (
                                        <div className={`absolute -right-4 -top-4 w-12 h-12 rounded-full ${colorClasses.bg} opacity-50 blur-xl group-hover:scale-150 transition-transform duration-700`} />
                                    )}

                                    <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${completedSteps.has(idx) ? `${colorClasses.accent} text-white rotate-0` : 'bg-gray-50 text-gray-300 group-hover:bg-white group-hover:shadow-sm -rotate-3'
                                        }`}>
                                        {completedSteps.has(idx) ? <Check size={20} strokeWidth={3} /> : <span className="text-sm font-black">{idx + 1}</span>}
                                    </div>
                                    <div className={`text-xl leading-relaxed py-1 transition-all duration-300 ${completedSteps.has(idx) ? 'text-gray-400 line-through grayscale italic' : 'text-gray-800 font-semibold'}`}>
                                        <ReactMarkdown>{item}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Completion State */}
                        {completedSteps.size === currentPhase.items.length && currentPhase.items.length > 0 && (
                            <div className={`mt-12 p-10 ${colorClasses.accent} text-white rounded-[2.5rem] text-center animate-in zoom-in duration-500 shadow-2xl relative overflow-hidden group/card`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm animate-bounce">
                                        <currentPhase.icon size={32} />
                                    </div>
                                    <h3 className="text-3xl font-black mb-3">Excellent work!</h3>
                                    <p className="text-lg opacity-90 mb-8 font-medium italic underline decoration-white/30 underline-offset-4">
                                        Phase "{currentPhase.label}" is complete.
                                    </p>
                                    {currentPhaseIndex < phases.length - 1 ? (
                                        <button
                                            onClick={nextPhase}
                                            className="w-full sm:w-auto px-10 py-4 bg-white text-gray-900 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
                                        >
                                            <span>Onward!</span>
                                            <ChevronRight size={24} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={onClose}
                                            className="w-full sm:w-auto px-10 py-4 bg-white text-gray-900 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
                                        >
                                            <Check size={24} />
                                            <span>Enjoy your meal!</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Bottom Nav Bar */}
            <footer className="p-6 bg-white border-t border-[var(--border-subtle)] safe-bottom flex gap-3 shadow-[0_-4px_20px_-5px_var(--shadow)]">
                {currentPhaseIndex > 0 && (
                    <button
                        onClick={prevPhase}
                        className="flex-1 flex items-center justify-center gap-2 py-5 px-6 border-2 border-gray-100 text-gray-400 rounded-2xl font-black hover:bg-gray-50 hover:text-gray-600 active:scale-95 transition-all text-lg"
                    >
                        <ChevronLeft size={24} strokeWidth={3} />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                )}
                {currentPhaseIndex < phases.length - 1 && (
                    <button
                        onClick={nextPhase}
                        className={`flex-[3] flex items-center justify-center gap-2 py-5 px-6 ${colorClasses.accent} text-white rounded-3xl font-black shadow-lg shadow-${currentPhase.color}-200/50 hover:brightness-110 active:scale-95 transition-all text-xl tracking-tight`}
                    >
                        <span>Next Step</span>
                        <ChevronRight size={28} strokeWidth={3} />
                    </button>
                )}
                {currentPhaseIndex === phases.length - 1 && (
                    <button
                        onClick={onClose}
                        className="flex-[3] flex items-center justify-center gap-3 py-5 px-6 bg-gray-900 text-white rounded-3xl font-black shadow-xl hover:bg-black active:scale-95 transition-all text-xl tracking-tight"
                    >
                        <Check size={28} strokeWidth={3} />
                        <span>I'm Done Cooking</span>
                    </button>
                )}
            </footer>
        </div>
    );
}
