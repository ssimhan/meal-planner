'use client';

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { extractRecipe, captureRecipe } from '@/lib/api';
import { Loader2, Link as LinkIcon, CheckCircle, AlertCircle } from 'lucide-react';

interface ImportRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ImportRecipeModal({ isOpen, onClose, onSuccess }: ImportRecipeModalProps) {
    const { showToast } = useToast();
    const [step, setStep] = useState<'input' | 'verify'>('input');
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Extracted Data State
    const [name, setName] = useState('');
    const [ingredients, setIngredients] = useState('');
    const [instructions, setInstructions] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');

    if (!isOpen) return null;

    const handleExtract = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setIsLoading(true);
        try {
            const response = await extractRecipe(url);
            if (response.status === 'success' && response.data) {
                const data = response.data;
                setName(data.name || 'Untitled Recipe');
                setIngredients(data.ingredients.join('\n'));
                setInstructions(data.instructions.join('\n'));
                setSourceUrl(data.source_url);
                setStep('verify');
            } else {
                throw new Error(response.message || 'Failed to extract recipe');
            }
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await captureRecipe({
                name: name,
                mode: 'manual', // We send as manual because we've already extracted and verified the text
                url: sourceUrl, // Maintain the link for reference
                ingredients: ingredients,
                instructions: instructions,
                is_snack_only: false
            });

            showToast(`Successfully imported ${name}!`, 'success');
            onClose();
            onSuccess();
            // Reset state
            setStep('input');
            setUrl('');
            setName('');
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--beetroot)]/10 backdrop-blur-md animate-in fade-in duration-300">
            {/* TD-011 FIX: max-h-[80vh] -> max-h-[85vh] + better flex layout */}
            <div className="bg-[var(--bg-card)] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-subtle)] flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-[var(--cardamom)] mb-1 flex items-center gap-2">
                            <LinkIcon className="w-6 h-6" />
                            Import Recipe
                        </h2>
                        <p className="text-[var(--text-muted)] text-sm font-medium">
                            {step === 'input' ? 'Paste a URL to magically extract details' : 'Verify details before saving'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-200/50 rounded-full transition-colors">
                        <span className="text-xl text-[var(--cardamom)]">✕</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex-1 overflow-y-auto bg-[var(--bg-primary)]">
                    {step === 'input' ? (
                        <form onSubmit={handleExtract} className="space-y-6 max-w-xl mx-auto mt-8">
                            <div className="space-y-2">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-[var(--turmeric)]">
                                    Recipe URL
                                </label>
                                <input
                                    autoFocus
                                    type="url"
                                    required
                                    placeholder="https://cooking.nytimes.com/..."
                                    className="w-full p-4 rounded-xl bg-white border-2 border-[var(--border-subtle)] focus:border-[var(--turmeric)] outline-none transition-all shadow-sm text-lg"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !url}
                                className="w-full py-4 bg-[var(--turmeric)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Analyze Link'}
                            </button>

                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded text-sm text-blue-800 flex gap-3">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>This uses <strong>Recipe-Scrapers</strong> to automatically parse ingredients and instructions from hundreds of popular cooking sites.</p>
                            </div>
                        </form>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[400px]">
                            {/* Left Column: Meta & Ingredients */}
                            <div className="space-y-6 flex flex-col h-full">
                                <div>
                                    <label className="block text-xs font-black mb-2 uppercase tracking-[0.2em] text-[var(--cardamom)]">
                                        Recipe Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-3 rounded-xl bg-white border border-[var(--border-subtle)] focus:border-[var(--turmeric)] outline-none font-bold text-xl text-[var(--beetroot)]"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                {/* TD-011 FIX: Added min-h-[250px] to prevent collapse */}
                                <div className="flex-1 flex flex-col min-h-[250px]">
                                    <label className="block text-xs font-black mb-2 uppercase tracking-[0.2em] text-[var(--accent-sage)]">
                                        Ingredients
                                    </label>
                                    <textarea
                                        className="flex-1 w-full p-4 rounded-xl bg-white border border-[var(--border-subtle)] focus:border-[var(--turmeric)] outline-none resize-none font-mono text-sm leading-relaxed min-h-[200px]"
                                        value={ingredients}
                                        onChange={(e) => setIngredients(e.target.value)}
                                        placeholder="- 1 cup flour..."
                                    />
                                </div>
                            </div>

                            {/* Right Column: Instructions */}
                            {/* TD-011 FIX: Added min-h-[250px] to prevent collapse */}
                            <div className="flex flex-col h-full min-h-[250px]">
                                <label className="block text-xs font-black mb-2 uppercase tracking-[0.2em] text-[var(--accent-sage)]">
                                    Instructions
                                </label>
                                <textarea
                                    className="flex-1 w-full p-4 rounded-xl bg-white border border-[var(--border-subtle)] focus:border-[var(--turmeric)] outline-none resize-none leading-relaxed min-h-[280px]"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder="1. Preheat oven..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions (Verify Step Only) */}
                {step === 'verify' && (
                    <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex justify-between items-center gap-4">
                        <button
                            onClick={() => setStep('input')}
                            className="px-6 py-3 font-bold uppercase tracking-wide text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            ← Back
                        </button>
                        {/* TD-011 FIX: Made Save button MUCH more prominent */}
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-10 py-4 bg-[var(--beetroot)] text-white font-black text-lg uppercase tracking-widest rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-3 ring-4 ring-[var(--beetroot)]/30 animate-pulse"
                            style={{ animationDuration: '2s' }}
                        >
                            {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <><CheckCircle className="w-6 h-6" /> Save to Cookbook</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
