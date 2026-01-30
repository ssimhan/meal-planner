import React, { useState, useEffect } from 'react';
import { X, ChefHat, History, Search, Plus, Check } from 'lucide-react';
import { getPairedRecipes } from '@/lib/api';

interface Recipe {
    id: string;
    name: string;
    tags?: string[];
    requires_side?: boolean;
}

interface PairingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    mainRecipe: Recipe;
    allRecipes: Recipe[];
    selectedSides: string[];
    onAddSide: (recipeId: string) => void;
    onRemoveSide: (recipeId: string) => void;
}

export const PairingDrawer: React.FC<PairingDrawerProps> = ({
    isOpen,
    onClose,
    mainRecipe,
    allRecipes,
    selectedSides,
    onAddSide,
    onRemoveSide
}) => {
    const [historySuggestions, setHistorySuggestions] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && mainRecipe) {
            const fetchHistory = async () => {
                setLoading(true);
                try {
                    const res = await getPairedRecipes(mainRecipe.id);
                    if (res.status === 'success') {
                        setHistorySuggestions(res.suggestions);
                    }
                } catch (err) {
                    console.error('Failed to fetch paired recipes:', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchHistory();
        }
    }, [isOpen, mainRecipe]);

    const sides = allRecipes.filter(r =>
        r.tags?.includes('side') ||
        (searchQuery && r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ).filter(r => r.id !== mainRecipe.id);

    const suggestedRecipes = allRecipes.filter(r => historySuggestions.includes(r.id));

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm animate-in fade-in transition-all"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm md:max-w-md bg-[var(--background)] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
                onClick={e => e.stopPropagation()}
                style={{ backgroundColor: '#FFFDF9' }} // Fallback if var not loaded
            >
                {/* Header */}
                <header className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ChefHat className="text-[#E2B007]" size={20} />
                            Pair with {mainRecipe.name}
                        </h2>
                        <p className="text-xs text-[var(--text-muted)] mt-1 font-medium uppercase tracking-widest">
                            Select your favorite sides
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* History-based Suggestions */}
                    <section>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#E2B007] mb-4 flex items-center gap-2">
                            <History size={14} />
                            Frequently Paired With
                        </h3>
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin h-5 w-5 border-2 border-[#E2B007] border-t-transparent rounded-full" />
                            </div>
                        ) : suggestedRecipes.length > 0 ? (
                            <div className="grid gap-3">
                                {suggestedRecipes.map(recipe => (
                                    <RecipePairCard
                                        key={recipe.id}
                                        recipe={recipe}
                                        isSelected={selectedSides.includes(recipe.id)}
                                        onToggle={() => selectedSides.includes(recipe.id) ? onRemoveSide(recipe.id) : onAddSide(recipe.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-[var(--text-muted)] italic">No pairing history yet. Choose items below to start building it!</p>
                        )}
                    </section>

                    {/* Search / All Sides */}
                    <section className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search all recipes..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-white text-sm focus:ring-2 focus:ring-[#E2B007] focus:border-transparent transition-all"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-6">
                            {searchQuery ? 'Search Results' : 'Explore Sides'}
                        </h3>
                        <div className="grid gap-3">
                            {sides.slice(0, searchQuery ? 20 : 10).map(recipe => (
                                <RecipePairCard
                                    key={recipe.id}
                                    recipe={recipe}
                                    isSelected={selectedSides.includes(recipe.id)}
                                    onToggle={() => selectedSides.includes(recipe.id) ? onRemoveSide(recipe.id) : onAddSide(recipe.id)}
                                />
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <footer className="p-6 bg-white border-t border-[var(--border-subtle)]">
                    <button
                        onClick={onClose}
                        className="w-full btn-premium py-4 shadow-lg flex justify-center items-center gap-2"
                        style={{ backgroundColor: '#2D2D2D', color: 'white', borderRadius: '12px', fontWeight: 'bold' }}
                    >
                        Done Planning Side Dishes
                    </button>
                </footer>
            </div>
        </div>
    );
};

const RecipePairCard: React.FC<{
    recipe: Recipe;
    isSelected: boolean;
    onToggle: () => void
}> = ({ recipe, isSelected, onToggle }) => (
    <button
        onClick={onToggle}
        className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center group
      ${isSelected
                ? 'border-[#E2B007] bg-[#E2B007]/5 shadow-sm'
                : 'border-[var(--border-subtle)] bg-white hover:border-[#E2B007]/50 hover:shadow-md'}`}
    >
        <div>
            <h4 className={`font-bold text-sm ${isSelected ? 'text-[#8B0000]' : 'text-[var(--text-main)]'}`}>
                {recipe.name}
            </h4>
            <div className="flex gap-2 mt-1">
                {recipe.tags?.map(tag => (
                    <span key={tag} className="text-[9px] uppercase font-black tracking-widest text-gray-400">
                        {tag}
                    </span>
                ))}
            </div>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all
      ${isSelected ? 'bg-[#E2B007] text-white' : 'bg-gray-50 border border-gray-200 text-gray-300 group-hover:border-[#E2B007]'}`}>
            {isSelected ? <Check size={14} /> : <Plus size={14} />}
        </div>
    </button>
);
