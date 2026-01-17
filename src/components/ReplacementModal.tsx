import { useState, useEffect } from 'react';
import { getSuggestions } from '@/lib/api';
import MealCorrectionInput from './MealCorrectionInput';
import { InventoryItem } from '@/types';

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
    recipes: { id: string; name: string }[];
    leftoverInventory?: InventoryItem[];
    onConfirm: (newMeal: string, requestRecipe?: boolean, madeStatus?: boolean | string) => void;
    onCancel: () => void;
}

export default function ReplacementModal({ currentMeal, day, recipes, leftoverInventory = [], onConfirm, onCancel }: ReplacementModalProps) {
    const [activeTab, setActiveTab] = useState<'leftovers' | 'fridge' | 'freezer' | 'manual'>('leftovers');
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<{
        fridge_shop: RecipeSuggestion[];
        freezer_stash: RecipeSuggestion[];
    } | null>(null);

    useEffect(() => {
        async function fetchSuggestions() {
            try {
                const data = await getSuggestions();
                if (data.status === 'success') {
                    setSuggestions(data.suggestions);
                    // Set initial tab based on availability
                    if (leftoverInventory.length > 0) setActiveTab('leftovers');
                    else if (data.suggestions.fridge_shop.length > 0) setActiveTab('fridge');
                    else if (data.suggestions.freezer_stash.length > 0) setActiveTab('freezer');
                    else setActiveTab('manual');
                }
            } catch (err) {
                console.error('Failed to fetch suggestions:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchSuggestions();
    }, [leftoverInventory.length]);

    const renderActiveTabContent = () => {
        if (activeTab === 'manual') {
            return (
                <div className="pt-2">
                    <p className="text-sm text-gray-500 mb-4">
                        Search for a recipe from your index or enter a new meal description.
                    </p>
                    <MealCorrectionInput
                        recipes={recipes}
                        onSave={(meal, req) => onConfirm(meal, req, true)}
                        onCancel={onCancel}
                        placeholder="What are you making instead?"
                        existingValue=""
                    />
                </div>
            );
        }

        if (activeTab === 'leftovers') {
            const meals = leftoverInventory.filter(i => i.type === 'meal');
            if (meals.length === 0) {
                return (
                    <div className="text-center py-8 text-gray-500 bg-purple-50/30 rounded-lg border border-dashed border-purple-200">
                        <p>No prepared leftovers found in the fridge.</p>
                    </div>
                );
            }

            return (
                <div className="space-y-2">
                    {meals.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => onConfirm(item.item, false, 'leftovers')}
                            className="w-full text-left p-4 rounded-xl border border-purple-100 bg-white hover:bg-purple-50 hover:border-purple-200 transition-all group flex justify-between items-center shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🍱</span>
                                <div>
                                    <p className="font-bold text-gray-800 group-hover:text-purple-700 transition-colors uppercase tracking-tight text-xs">{item.item}</p>
                                    <p className="text-[10px] text-purple-600/70 font-black uppercase tracking-widest mt-0.5">
                                        Qty: {item.quantity}
                                    </p>
                                </div>
                            </div>
                            <span className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity font-black text-[10px] uppercase tracking-widest">
                                Select →
                            </span>
                        </button>
                    ))}
                </div>
            );
        }

        if (!suggestions) return null;

        let items: RecipeSuggestion[] = [];
        let emptyMessage = "";
        let colorTheme = "sage";

        switch (activeTab) {
            case 'fridge':
                items = suggestions.fridge_shop;
                emptyMessage = "No direct matches found for your current ingredients.";
                colorTheme = "sage";
                break;
            case 'freezer':
                items = suggestions.freezer_stash;
                emptyMessage = "Your freezer backup stash is empty.";
                colorTheme = "blue";
                break;
        }

        if (items.length === 0) {
            const bgClass = colorTheme === 'blue' ? 'bg-blue-50/30 border-blue-200' : 'bg-green-50/30 border-green-200';
            return (
                <div className={`text-center py-8 text-gray-500 ${bgClass} rounded-lg border border-dashed`}>
                    <p>{emptyMessage}</p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {items.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => onConfirm(item.name, false, activeTab === 'freezer' ? 'freezer_backup' : true)}
                        className={`w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-${colorTheme === 'blue' ? 'blue' : 'green'}-50 hover:border-${colorTheme === 'blue' ? 'blue' : 'green'}-200 transition-all group flex justify-between items-center`}
                    >
                        <div>
                            <p className="font-semibold text-gray-800 transition-colors">{item.name}</p>
                            {activeTab === 'fridge' && item.matches && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Matches: {item.matches.join(', ')}
                                </p>
                            )}
                            {activeTab === 'freezer' && (
                                <p className="text-xs text-blue-500 mt-1 font-medium">
                                    {item.servings} serving{item.servings !== 1 ? 's' : ''} • Frozen {item.frozen_date || 'recently'}
                                </p>
                            )}
                        </div>
                        <span className={`text-${colorTheme === 'blue' ? 'blue' : 'green'}-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs`}>
                            Select →
                        </span>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh] min-h-[450px] border border-white/20">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="font-black uppercase tracking-tight text-gray-800">Replace Meal</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Substitute for {day.toUpperCase()}</p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl font-light">×</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10 px-2 pt-2 gap-1">
                    <button
                        onClick={() => setActiveTab('leftovers')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'leftovers' ? 'border-purple-500 text-purple-600 bg-purple-50/50' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'} rounded-t-xl`}
                    >
                        🍱 Leftovers
                    </button>
                    <button
                        onClick={() => setActiveTab('fridge')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'fridge' ? 'border-[var(--accent-sage)] text-[var(--accent-sage)] bg-green-50/50' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'} rounded-t-xl`}
                    >
                        🥦 Shop Fridge
                    </button>
                    <button
                        onClick={() => setActiveTab('freezer')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'freezer' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'} rounded-t-xl`}
                    >
                        🧊 Freezer
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'manual' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'} rounded-t-xl`}
                    >
                        ✎ Manual
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-white">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="animate-spin h-8 w-8 border-[3px] border-gray-200 border-t-purple-500 rounded-full"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading suggestions...</p>
                        </div>
                    ) : (
                        renderActiveTabContent()
                    )}
                </div>

                <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex flex-col gap-2">
                    <button
                        onClick={onCancel}
                        className="w-full py-3 bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 hover:border-gray-300 rounded-xl shadow-sm transition-all"
                    >
                        Cancel Replacement
                    </button>
                </div>
            </div>
        </div>
    );
}
