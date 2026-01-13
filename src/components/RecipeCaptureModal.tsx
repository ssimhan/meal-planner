'use client';

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';

interface RecipeCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    mealName: string;
    onSuccess: () => void;
}

export default function RecipeCaptureModal({ isOpen, onClose, mealName, onSuccess }: RecipeCaptureModalProps) {
    const { showToast } = useToast();
    const [mode, setMode] = useState<'url' | 'manual'>('url');
    const [url, setUrl] = useState('');
    const [ingredients, setIngredients] = useState('');
    const [instructions, setInstructions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                name: mealName,
                mode,
                url: mode === 'url' ? url : undefined,
                ingredients: mode === 'manual' ? ingredients : undefined,
                instructions: mode === 'manual' ? instructions : undefined
            };

            const response = await fetch('/api/recipes/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to capture recipe');
            }

            showToast(`Successfully added ${mealName}!`, 'success');
            onSuccess();
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-teal-950/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[var(--bg-card)] w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden border-2 border-[var(--accent-green)] flex flex-col max-h-[90vh]">
                {/* Header with textured background */}
                <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="none" stroke="currentColor" stroke-width="0.5" stroke-dasharray="4 4" /></svg>')` }}>
                    </div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-serif font-black text-[var(--accent-green)] mb-1">Capture Recipe</h2>
                            <p className="text-[var(--text-muted)] font-medium">Adding details for: <span className="text-[var(--accent-terracotta)] font-bold">{mealName}</span></p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-200/50 rounded-full transition-colors">
                            <span className="text-2xl text-[var(--accent-green)]">✕</span>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 flex-1 overflow-y-auto space-y-8 bg-[var(--bg-primary)]">
                    {/* Mode Toggle */}
                    <div className="flex p-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-sm">
                        <button
                            type="button"
                            onClick={() => setMode('url')}
                            className={`flex-1 py-3 text-sm font-black uppercase tracking-widest transition-all ${mode === 'url' ? 'bg-[var(--accent-green)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--accent-green)]'}`}
                        >
                            Website URL
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('manual')}
                            className={`flex-1 py-3 text-sm font-black uppercase tracking-widest transition-all ${mode === 'manual' ? 'bg-[var(--accent-green)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--accent-green)]'}`}
                        >
                            Manual Entry
                        </button>
                    </div>

                    {mode === 'url' ? (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <label className="block text-xs font-black mb-3 uppercase tracking-[0.2em] text-[var(--accent-sage)]">
                                Recipe Website Link
                            </label>
                            <input
                                autoFocus
                                type="url"
                                required
                                placeholder="Paste link (NYT, Bon Appétit, etc.)"
                                className="w-full p-5 rounded-sm bg-white border-2 border-[var(--border-subtle)] focus:border-[var(--accent-green)] outline-none transition-all shadow-inner text-lg"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-sm flex gap-3 items-start">
                                <span className="text-xl">✨</span>
                                <p className="text-sm text-amber-800 leading-relaxed">
                                    Our parser will Extract ingredients and instructions automatically. You can always edit them later.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div>
                                <label className="block text-xs font-black mb-3 uppercase tracking-[0.2em] text-[var(--accent-sage)]">
                                    Ingredients List
                                </label>
                                <textarea
                                    required
                                    rows={5}
                                    placeholder="e.g., 2 cups flour, 1 tsp salt..."
                                    className="w-full p-5 rounded-sm bg-white border-2 border-[var(--border-subtle)] focus:border-[var(--accent-green)] outline-none transition-all shadow-inner resize-none font-mono text-sm"
                                    value={ingredients}
                                    onChange={(e) => setIngredients(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black mb-3 uppercase tracking-[0.2em] text-[var(--accent-sage)]">
                                    Preparation Steps
                                </label>
                                <textarea
                                    required
                                    rows={7}
                                    placeholder="Describe how to cook it..."
                                    className="w-full p-5 rounded-sm bg-white border-2 border-[var(--border-subtle)] focus:border-[var(--accent-green)] outline-none transition-all shadow-inner resize-none leading-relaxed"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-[var(--border-subtle)] flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] rounded-sm transition-all border border-transparent hover:border-[var(--border-subtle)]"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 py-4 font-black uppercase tracking-widest text-white rounded-sm shadow-xl transition-all ${isSubmitting ? 'bg-neutral-400 cursor-not-allowed' : 'bg-[var(--accent-green)] hover:translate-y-[-2px] hover:shadow-2xl active:translate-y-[0]'}`}
                        >
                            {isSubmitting ? 'Processing...' : 'Save & Capture'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
    );
}
