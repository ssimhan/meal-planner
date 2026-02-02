'use client';

import { useState, useEffect } from 'react';
import { getRecipes, updateRecipeMetadata, deleteRecipe, getRecipeContent, updateRecipeContent, bulkUpdateRecipes } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { RecipeListItem } from '@/types';
import EffortIndicator from '@/components/EffortIndicator';

export default function BatchEditPage() {
    const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<Set<string>>(new Set());
    const [savingAll, setSavingAll] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<RecipeListItem | null>(null);

    useEffect(() => {
        fetchRecipesNeedingReview();
    }, []);

    async function fetchRecipesNeedingReview() {
        try {
            const data = await getRecipes();

            // Filter to show recipes that:
            // - have no cuisine (or 'unknown')
            // - have no effort level
            // - have any audit tags
            const needsReview = data.recipes.filter((r: RecipeListItem) => {
                const tags = r.tags || [];
                const hasAuditTags = tags.some((t: string) =>
                    ['not meal', 'missing ingredients', 'missing instructions'].includes(t)
                );
                const noCuisine = !r.cuisine || r.cuisine === 'unknown';
                const noEffort = !r.effort_level;

                return hasAuditTags || noCuisine || noEffort;
            });

            setRecipes(needsReview);
        } catch (err) {
            console.error('Failed to load recipes:', err);
        } finally {
            setLoading(false);
        }
    }

    // Modal state update handler
    const handleRecipeChange = (recipeId: string, updates: Partial<RecipeListItem>) => {
        setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, ...updates } : r));
    };

    async function handleUpdate(recipeId: string, field: 'cuisine' | 'effort_level', value: string) {
        // Now this only updates local state, not Supabase immediately
        setRecipes(prev => prev.map(r =>
            r.id === recipeId ? { ...r, [field]: value } : r
        ));
    }

    async function saveAll() {
        setSavingAll(true);
        try {
            const updates = recipes.map(recipe => ({
                id: recipe.id,
                name: recipe.name,
                metadata: {
                    cuisine: recipe.cuisine,
                    effort_level: recipe.effort_level,
                    tags: recipe.tags,
                    requires_side: recipe.requires_side
                }
            }));

            await bulkUpdateRecipes(updates);
            alert(`Successfully synced ${recipes.length} recipes to Supabase`);
            fetchRecipesNeedingReview();
        } catch (err) {
            console.error('Save all failed:', err);
            alert('Failed to save recipes: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setSavingAll(false);
        }
    }

    async function handleDelete(recipeId: string) {
        if (!confirm('Delete this recipe?')) return;
        setSaving(prev => new Set(prev).add(recipeId));
        try {
            await deleteRecipe(recipeId);
            setRecipes(prev => prev.filter(r => r.id !== recipeId));
        } catch (err) {
            console.error('Failed to delete:', err);
            alert('Failed to delete recipe');
        } finally {
            setSaving(prev => {
                const next = new Set(prev);
                next.delete(recipeId);
                return next;
            });
        }
    }

    if (loading) {
        return (
            <AppLayout>
                <div className="font-mono animate-pulse">LOADING...</div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="container mx-auto max-w-6xl">
                <header className="mb-8">
                    <Link href="/recipes" className="text-[var(--cardamom)] hover:underline mb-4 inline-block font-mono">
                        ← Back to Recipes
                    </Link>
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-5xl font-black text-[var(--text-main)] mb-2">Review Recipes</h1>
                            <p className="text-[var(--text-muted)]">{recipes.length} recipes need review</p>
                        </div>
                        <button
                            onClick={saveAll}
                            disabled={savingAll || recipes.length === 0}
                            className="px-8 py-4 bg-[var(--cardamom)] text-white text-base font-bold rounded-full hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2"
                        >
                            {savingAll ? 'Syncing...' : '💾 Save All to Supabase'}
                        </button>
                    </div>
                </header>

                {recipes.length === 0 ? (
                    <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-xl">
                        <span className="text-4xl block mb-4">✓</span>
                        <h3 className="text-[var(--text-muted)] font-mono">All recipes reviewed!</h3>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                                <tr>
                                    <th className="text-left p-4 font-bold text-xs uppercase tracking-wider text-[var(--text-muted)]">
                                        Recipe Name
                                    </th>
                                    <th className="text-left p-4 font-bold text-xs uppercase tracking-wider text-[var(--text-muted)] w-32">
                                        Type
                                    </th>
                                    <th className="text-left p-4 font-bold text-xs uppercase tracking-wider text-[var(--text-muted)] w-32">
                                        Needs Side?
                                    </th>
                                    <th className="text-left p-4 font-bold text-xs uppercase tracking-wider text-[var(--text-muted)] w-24">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recipes.map((recipe) => (
                                    <tr
                                        key={recipe.id}
                                        className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer ${saving.has(recipe.id) ? 'opacity-50' : ''
                                            }`}
                                        onClick={() => setSelectedRecipe(recipe)}
                                    >
                                        <td className="p-4">
                                            <div className="font-medium">{recipe.name}</div>
                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                {(recipe.tags || []).map((tag: string) => (
                                                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[var(--cardamom)]/10 text-[var(--cardamom)] rounded">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={recipe.cuisine || 'unknown'}
                                                onChange={(e) => handleUpdate(recipe.id, 'cuisine', e.target.value)}
                                                disabled={saving.has(recipe.id)}
                                                className="w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-white focus:ring-2 focus:ring-[var(--turmeric)] outline-none text-sm"
                                            >
                                                <option value="unknown">Select cuisine...</option>
                                                <option value="american">American</option>
                                                <option value="asian">Asian</option>
                                                <option value="chinese">Chinese</option>
                                                <option value="dessert">Dessert</option>
                                                <option value="indian">Indian</option>
                                                <option value="italian">Italian</option>
                                                <option value="japanese">Japanese</option>
                                                <option value="mediterranean">Mediterranean</option>
                                                <option value="mexican">Mexican</option>
                                                <option value="thai">Thai</option>
                                                <option value="snack">Snack</option>
                                            </select>
                                        </td>
                                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => {
                                                        const tags = recipe.tags || [];
                                                        const newTags = tags.includes('main') ? tags.filter(t => t !== 'main') : [...tags.filter(t => t !== 'side'), 'main'];
                                                        handleRecipeChange(recipe.id, { tags: newTags });
                                                    }}
                                                    className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all ${recipe.tags?.includes('main') ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                >
                                                    Main
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const tags = recipe.tags || [];
                                                        const newTags = tags.includes('side') ? tags.filter(t => t !== 'side') : [...tags.filter(t => t !== 'main'), 'side'];
                                                        handleRecipeChange(recipe.id, { tags: newTags });
                                                    }}
                                                    className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all ${recipe.tags?.includes('side') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                >
                                                    Side
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleRecipeChange(recipe.id, { requires_side: !recipe.requires_side })}
                                                className={`w-12 h-6 rounded-full transition-all relative ${recipe.requires_side ? 'bg-[var(--cardamom)]' : 'bg-gray-200'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${recipe.requires_side ? 'right-1' : 'left-1'}`} />
                                            </button>
                                        </td>
                                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleDelete(recipe.id)}
                                                disabled={saving.has(recipe.id)}
                                                className="text-[var(--beetroot)] hover:underline text-sm font-bold disabled:opacity-50"
                                                title="Delete recipe permanently"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedRecipe && (
                <RecipeContentModal
                    recipe={selectedRecipe}
                    onClose={() => setSelectedRecipe(null)}
                    onSave={(updatedRecipe) => {
                        handleRecipeChange(selectedRecipe.id, updatedRecipe);
                        setSelectedRecipe(null);
                    }}
                />
            )}
        </AppLayout>
    );
}

function RecipeContentModal({ recipe, onClose, onSave }: { recipe: RecipeListItem, onClose: () => void, onSave: (updated: Partial<RecipeListItem>) => void }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Local editable state
    const [name, setName] = useState(recipe.name);
    const [cuisine, setCuisine] = useState(recipe.cuisine || 'unknown');
    const [effortLevel, setEffortLevel] = useState(recipe.effort_level || '');
    const [tags, setTags] = useState<string[]>(recipe.tags || []);
    const [requiresSide, setRequiresSide] = useState<boolean>(recipe.requires_side || false);
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [instructions, setInstructions] = useState<string[]>([]);

    const loadContent = useEffect(() => {
        let mounted = true;
        async function fetchContent() {
            try {
                const data = await getRecipeContent(recipe.id);
                if (mounted && data.status === 'success') {
                    const rawIngredients = data.recipe.ingredients || [];
                    const rawInstructions = data.recipe.instructions || [];

                    setIngredients(Array.isArray(rawIngredients) ? rawIngredients : [rawIngredients]);
                    setInstructions(Array.isArray(rawInstructions) ? rawInstructions : [rawInstructions]);
                }
            } catch (err) {
                console.error('Failed to load content:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetchContent();
        return () => { mounted = false; };
    }, [recipe.id]);

    async function handleLocalSave() {
        setSaving(true);
        try {
            // Save to local YAML file
            await updateRecipeContent(recipe.id, {
                ingredients,
                instructions,
                name,
                cuisine,
                effort_level: effortLevel,
                tags,
                requires_side: requiresSide
            });

            // Pass updated state back to parent
            onSave({
                name,
                cuisine,
                effort_level: effortLevel,
                tags,
                requires_side: requiresSide
            });
        } catch (err) {
            console.error('Failed to save content:', err);
            alert('Failed to save recipe content locally');
        } finally {
            setSaving(false);
        }
    }

    const removeTag = (tagToRemove: string) => {
        setTags(prev => prev.filter(t => t !== tagToRemove));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--beetroot)]/10 backdrop-blur-md p-4">
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-[var(--border-subtle)]">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 mr-4">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="text-2xl font-black text-[var(--text-main)] w-full p-1 border-b-2 border-transparent hover:border-[var(--turmeric)] focus:border-[var(--turmeric)] outline-none transition-colors bg-transparent"
                                placeholder="Recipe Name"
                            />
                            <div className="flex flex-wrap gap-2 mt-3">
                                <select
                                    value={cuisine}
                                    onChange={(e) => setCuisine(e.target.value)}
                                    className="text-xs px-2 py-1 bg-[var(--cardamom)]/10 text-[var(--cardamom)] rounded border border-[var(--cardamom)]/20 outline-none font-bold uppercase tracking-widest"
                                >
                                    <option value="unknown">Select cuisine...</option>
                                    <option value="american">American</option>
                                    <option value="asian">Asian</option>
                                    <option value="chinese">Chinese</option>
                                    <option value="dessert">Dessert</option>
                                    <option value="indian">Indian</option>
                                    <option value="italian">Italian</option>
                                    <option value="japanese">Japanese</option>
                                    <option value="mediterranean">Mediterranean</option>
                                    <option value="mexican">Mexican</option>
                                    <option value="thai">Thai</option>
                                    <option value="snack">Snack</option>
                                </select>
                                <select
                                    value={effortLevel}
                                    onChange={(e) => setEffortLevel(e.target.value)}
                                    className="text-xs px-2 py-1 bg-[var(--turmeric)]/10 text-[var(--turmeric)] rounded border border-[var(--turmeric)]/20 outline-none font-bold uppercase tracking-widest"
                                >
                                    <option value="">Select effort...</option>
                                    <option value="high">High</option>
                                </select>
                                <button
                                    onClick={() => setRequiresSide(!requiresSide)}
                                    className={`text-xs px-2 py-1 rounded border transition-all flex items-center gap-1 font-bold uppercase tracking-widest ${requiresSide ? 'bg-[var(--beetroot)] text-white border-[var(--beetroot)] shadow-md' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                                >
                                    {requiresSide ? '✓ Needs Side' : 'No Side Needed'}
                                </button>
                                <div className="h-6 w-px bg-gray-200 mx-1" />
                                <button
                                    onClick={() => setTags(prev => prev.includes('main') ? prev.filter(t => t !== 'main') : [...prev.filter(t => t !== 'side'), 'main'])}
                                    className={`text-xs px-2 py-1 rounded border transition-all font-bold uppercase tracking-widest ${tags.includes('main') ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                                >
                                    Main
                                </button>
                                <button
                                    onClick={() => setTags(prev => prev.includes('side') ? prev.filter(t => t !== 'side') : [...prev.filter(t => t !== 'main'), 'side'])}
                                    className={`text-xs px-2 py-1 rounded border transition-all font-bold uppercase tracking-widest ${tags.includes('side') ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                                >
                                    Side
                                </button>
                                {tags.map((tag) => (
                                    <span key={tag} className="text-[10px] px-2 py-1 bg-[var(--cardamom)]/10 text-[var(--cardamom)] rounded flex items-center gap-1 group font-bold uppercase tracking-widest">
                                        {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            className="hover:text-[var(--beetroot)] font-bold ml-1"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--beetroot)] text-2xl p-2 transition-colors">✕</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading recipe details...</div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Ingredients</label>
                                <textarea
                                    value={Array.isArray(ingredients) ? ingredients.join('\n') : String(ingredients)}
                                    onChange={(e) => setIngredients(e.target.value.split('\n'))}
                                    className="w-full h-48 p-4 border border-[var(--border-subtle)] rounded-xl font-mono text-sm focus:ring-2 focus:ring-[var(--turmeric)] outline-none bg-white shadow-inner"
                                    placeholder="Enter ingredients, one per line..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Instructions</label>
                                <textarea
                                    value={Array.isArray(instructions) ? instructions.join('\n') : String(instructions)}
                                    onChange={(e) => setInstructions(e.target.value.split('\n'))}
                                    className="w-full h-48 p-4 border border-[var(--border-subtle)] rounded-xl font-mono text-sm focus:ring-2 focus:ring-[var(--turmeric)] outline-none bg-white shadow-inner"
                                    placeholder="Enter instructions, one per line..."
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleLocalSave}
                        disabled={saving || loading}
                        className="px-8 py-3 bg-[var(--turmeric)] text-white rounded-full hover:brightness-110 disabled:opacity-50 transition-all font-black uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95"
                    >
                        {saving ? 'Saving...' : '💾 Save Locally (Files)'}
                    </button>
                </div>
            </div>
        </div>
    );
}
