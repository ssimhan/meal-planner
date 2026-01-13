'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface RecipeCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    mealName: string;
    onSuccess: () => void;
}

export default function RecipeCaptureModal({ isOpen, onClose, mealName, onSuccess }: RecipeCaptureModalProps) {
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

            toast.success(`Successfully added ${mealName}!`);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[var(--card-bg)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)] flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Capture Recipe</h2>
                        <p className="text-[var(--text-secondary)]">{mealName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--hover-bg)] rounded-full transition-colors">
                        <span className="text-2xl">✕</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div className="flex p-1 bg-[var(--hover-bg)] rounded-xl">
                        <button
                            type="button"
                            onClick={() => setMode('url')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'url' ? 'bg-white text-[var(--accent-indigo)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                        >
                            Recipe URL
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('manual')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'manual' ? 'bg-white text-[var(--accent-indigo)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                        >
                            Manual Entry
                        </button>
                    </div>

                    {mode === 'url' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-[var(--text-secondary)]">
                                    Website Link
                                </label>
                                <input
                                    autoFocus
                                    type="url"
                                    required
                                    placeholder="https://cooking.nytimes.com/recipes/..."
                                    className="w-full p-4 rounded-xl bg-[var(--hover-bg)] border-2 border-transparent focus:border-[var(--accent-indigo)] outline-none transition-all"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                                    Our AI will attempt to extract the ingredients and instructions automatically.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-[var(--text-secondary)]">
                                    Ingredients
                                </label>
                                <textarea
                                    required
                                    rows={6}
                                    placeholder="List components here..."
                                    className="w-full p-4 rounded-xl bg-[var(--hover-bg)] border-2 border-transparent focus:border-[var(--accent-indigo)] outline-none transition-all resize-none"
                                    value={ingredients}
                                    onChange={(e) => setIngredients(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-[var(--text-secondary)]">
                                    Instructions
                                </label>
                                <textarea
                                    required
                                    rows={8}
                                    placeholder="Step by step preparation..."
                                    className="w-full p-4 rounded-xl bg-[var(--hover-bg)] border-2 border-transparent focus:border-[var(--accent-indigo)] outline-none transition-all resize-none"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 py-4 font-bold text-white rounded-xl shadow-lg transition-all ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[var(--accent-indigo)] hover:scale-[1.02] active:scale-[0.98]'}`}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Recipe'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
