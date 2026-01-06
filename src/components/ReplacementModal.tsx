'use client';

import { useState, useEffect } from 'react';

interface RecipeSuggestion {
    id: string;
    name: string;
    type?: string;
    reason?: string;
    matches?: string[];
    score?: number;
    servings?: number;
    active_time?: number;
    effort_level?: string;
    frozen_date?: string;
}

interface ReplacementModalProps {
    currentMeal: string;
    day: string;
    onConfirm: (newMeal: string) => void;
    onCancel: () => void;
}

export default function ReplacementModal({ currentMeal, day, onConfirm, onCancel }: ReplacementModalProps) {
    const [activeTab, setActiveTab] = useState<'fridge' | 'freezer' | 'quick'>('fridge');
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<{
        fridge_shop: RecipeSuggestion[];
        freezer_stash: RecipeSuggestion[];
        quick_fix: RecipeSuggestion[];
    } | null>(null);

    useEffect(() => {
        async function fetchSuggestions() {
            try {
                const res = await fetch('/api/suggestions');
                const data = await res.json();
                if (data.status === 'success') {
                    setSuggestions(data.suggestions);
                    // Set initial tab based on availability
                    if (data.suggestions.fridge_shop.length > 0) setActiveTab('fridge');
                    else if (data.suggestions.freezer_stash.length > 0) setActiveTab('freezer');
                    else setActiveTab('quick');
                }
            } catch (err) {
                console.error('Failed to fetch suggestions:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchSuggestions();
    }, []);

    const renderActiveTabContent = () => {
        if (!suggestions) return null;

        let items: RecipeSuggestion[] = [];
        let emptyMessage = "";

        switch (activeTab) {
            case 'fridge':
                items = suggestions.fridge_shop;
                emptyMessage = "No matches found in your inventory.";
                break;
            case 'freezer':
                items = suggestions.freezer_stash;
                emptyMessage = "Your freezer backup stash is empty.";
                break;
            case 'quick':
                items = suggestions.quick_fix;
                emptyMessage = "No quick recipes found.";
                break;
        }

        if (items.length === 0) {
            return (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p>{emptyMessage}</p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {items.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => onConfirm(item.name)}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-sage hover:bg-sage/5 transition-all group flex justify-between items-center"
                    >
                        <div>
                            <p className="font-semibold text-gray-800 group-hover:text-sage transition-colors">{item.name}</p>
                            {activeTab === 'fridge' && item.matches && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Matches: {item.matches.join(', ')}
                                </p>
                            )}
                            {activeTab === 'freezer' && (
                                <p className="text-xs text-blue-500 mt-1">
                                    {item.servings} serving{item.servings !== 1 ? 's' : ''} • Frozen since {item.frozen_date || 'unknown'}
                                </p>
                            )}
                            {activeTab === 'quick' && (
                                <p className="text-xs text-orange-600 mt-1">
                                    ⚡ {item.active_time ? `${item.active_time}m active` : item.effort_level}
                                </p>
                            )}
                        </div>
                        <span className="text-sage opacity-0 group-hover:opacity-100 transition-opacity font-medium text-sm">
                            Select →
                        </span>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-gray-800">Replace Meal</h3>
                        <p className="text-xs text-gray-500">Find a substitute for {day.toUpperCase()}</p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('fridge')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fridge' ? 'border-sage text-sage' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        🥦 Shop Fridge
                    </button>
                    <button
                        onClick={() => setActiveTab('freezer')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'freezer' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        🧊 Freezer
                    </button>
                    <button
                        onClick={() => setActiveTab('quick')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'quick' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        ⚡ Quick Fix
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin h-6 w-6 border-2 border-sage border-t-transparent rounded-full"></div>
                        </div>
                    ) : (
                        renderActiveTabContent()
                    )}
                </div>

                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                    <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800">
                        Cancel Replacement
                    </button>
                </div>
            </div>
        </div>
    );
}
