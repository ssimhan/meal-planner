import { useState, useEffect } from 'react';
import { getSuggestions } from '@/lib/api';
import { InventoryItem, Recipe } from '@/types';
import MealCorrectionInput from './MealCorrectionInput';
import { PairingDrawer } from './PairingDrawer';
import { Check } from 'lucide-react';

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
    recipes: Recipe[];
    leftoverInventory?: InventoryItem[];
    onConfirm: (newMeal: string, requestRecipe?: boolean, madeStatus?: boolean | string, recipeIds?: string[]) => void;
    onCancel: () => void;
}

export default function ReplacementModal({ currentMeal, day, recipes, leftoverInventory = [], onConfirm, onCancel }: ReplacementModalProps) {
    const [activeTab, setActiveTab] = useState<'leftovers' | 'fridge' | 'freezer' | 'manual'>('leftovers');
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<{
        fridge_shop: RecipeSuggestion[];
        freezer_stash: RecipeSuggestion[];
    } | null>(null);
    const [selectedMain, setSelectedMain] = useState<Recipe | null>(null);
    const [selectedSides, setSelectedSides] = useState<string[]>([]);
    const [showPairingDrawer, setShowPairingDrawer] = useState(false);

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

    const handleConfirm = (name: string, isFromSearch = false, madeStatus: any = true, recipeId?: string) => {
        const recipe = recipes.find(r => r.id === recipeId || r.name === name);
        if (recipe && recipe.requires_side && !showPairingDrawer) {
            setSelectedMain(recipe);
            setShowPairingDrawer(true);
            return;
        }

        // Final confirmation
        const allIds = recipeId ? [recipeId, ...selectedSides] : [name, ...selectedSides];
        onConfirm(name, isFromSearch, madeStatus, allIds);
    };

    const handleFinalConfirm = () => {
        if (!selectedMain) return;
        const name = selectedMain.name;
        const allIds = [selectedMain.id, ...selectedSides];
        onConfirm(name, false, true, allIds);
    };

    const renderActiveTabContent = () => {
        if (activeTab === 'manual') {
            return (
                <div className="pt-2">
                    <p className="text-sm text-gray-500 mb-4">
                        Search for a recipe from your index or enter a new meal description.
                    </p>
                    <MealCorrectionInput
                        recipes={recipes}
                        onSave={(meal: string, req: boolean) => handleConfirm(meal, req, true)}
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
                    <div className="text-center py-8 text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-subtle)]">
                        <p>No prepared leftovers found in the fridge.</p>
                    </div>
                );
            }

            return (
                <div className="space-y-2">
                    {meals.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleConfirm(item.item, false, 'leftovers')}
                            className="w-full text-left p-4 rounded-xl border border-[var(--cardamom)]/20 bg-white hover:bg-[var(--cardamom)]/5 hover:border-[var(--cardamom)]/40 transition-all group flex justify-between items-center shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🍱</span>
                                <div>
                                    <p className="font-bold text-[var(--text-main)] group-hover:text-[var(--beetroot)] transition-colors uppercase tracking-tight text-xs">{item.item}</p>
                                    <p className="text-[10px] text-[var(--cardamom)] font-black uppercase tracking-widest mt-0.5">
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
        let colorTheme = "turmeric";

        const currentTab = activeTab as string;
        switch (currentTab) {
            case 'fridge':
                items = suggestions.fridge_shop;
                emptyMessage = "No direct matches found for your current ingredients.";
                colorTheme = "turmeric";
                break;
            case 'freezer':
                items = suggestions.freezer_stash;
                emptyMessage = "Your freezer backup stash is empty.";
                colorTheme = "beetroot";
                break;
        }

        if (items.length === 0) {
            const bgClass = colorTheme === 'blue' ? 'bg-blue-50/30 border-blue-200' : 'bg-[var(--turmeric)]/5 border-[var(--turmeric)]/20';
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
                        onClick={() => handleConfirm(item.name, false, activeTab === 'freezer' ? 'freezer_backup' : true, item.id)}
                        className={`w-full text-left p-3 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--turmeric)]/5 hover:border-[var(--turmeric)]/50 transition-all group flex justify-between items-center`}
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

    const isLeftoversActive = (activeTab as string) === 'leftovers';
    const isFridgeActive = (activeTab as string) === 'fridge';
    const isFreezerActive = (activeTab as string) === 'freezer';
    const isManualActive = (activeTab as string) === 'manual';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className={`bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh] min-h-[450px] border border-[var(--border-subtle)] transition-all ${showPairingDrawer ? 'translate-x-[-10%]' : ''}`}>
                <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--background)]">
                    <div>
                        <h3 className="font-extrabold uppercase tracking-tight text-[var(--text-main)]">Replace Meal</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Substitute for {day.toUpperCase()}</p>
                    </div>
                    <button onClick={onCancel} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xl font-light">×</button>
                </div>

                {/* Main Selection Area */}
                {!showPairingDrawer ? (
                    <>
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10 px-2 pt-2 gap-1">
                            <button
                                onClick={() => setActiveTab('leftovers')}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${isLeftoversActive ? 'border-[var(--beetroot)] text-[var(--beetroot)] bg-[var(--beetroot)]/5' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--background)]'} rounded-t-xl`}
                            >
                                🍱 Leftovers
                            </button>
                            <button
                                onClick={() => setActiveTab('fridge')}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${isFridgeActive ? 'border-[var(--turmeric)] text-[var(--turmeric)] bg-[var(--turmeric)]/5' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--background)]'} rounded-t-xl`}
                            >
                                🥦 Shop Fridge
                            </button>
                            <button
                                onClick={() => setActiveTab('freezer')}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${isFreezerActive ? 'border-[var(--beetroot)] text-[var(--beetroot)] bg-[var(--beetroot)]/5' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--background)]'} rounded-t-xl`}
                            >
                                🧊 Freezer
                            </button>
                            <button
                                onClick={() => setActiveTab('manual')}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${isManualActive ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'} rounded-t-xl`}
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
                    </>
                ) : (
                    <div className="p-8 flex flex-col items-center text-center justify-center flex-1 space-y-4">
                        <div className="w-16 h-16 bg-[var(--turmeric)]/10 text-[var(--turmeric)] rounded-full flex items-center justify-center animate-bounce">
                            <Check size={32} />
                        </div>
                        <h4 className="font-bold text-lg">{selectedMain?.name} Selected</h4>
                        <p className="text-sm text-gray-500 max-w-[250px]">
                            This dish usually requires a side. Choose pairings in the drawer on the right.
                        </p>
                        <button
                            onClick={handleFinalConfirm}
                            className="mt-4 px-6 py-2 bg-[var(--cardamom)] text-white rounded-lg font-bold text-sm shadow-md hover:opacity-90 transition-all"
                        >
                            Finalize with {selectedSides.length} side{selectedSides.length !== 1 ? 's' : ''}
                        </button>
                    </div>
                )}


                <div className="p-4 bg-[var(--background)] border-t border-[var(--border-subtle)] flex flex-col gap-2">
                    <button
                        onClick={onCancel}
                        className="w-full py-3 bg-white border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)] rounded-xl shadow-sm transition-all"
                    >
                        Cancel Replacement
                    </button>
                </div>
            </div>

            {selectedMain && (
                <PairingDrawer
                    isOpen={showPairingDrawer}
                    onClose={handleFinalConfirm}
                    mainRecipe={selectedMain}
                    allRecipes={recipes}
                    selectedSides={selectedSides}
                    onAddSide={(id) => setSelectedSides(prev => [...prev, id])}
                    onRemoveSide={(id) => setSelectedSides(prev => prev.filter(i => i !== id))}
                />
            )}
        </div>
    );
}
