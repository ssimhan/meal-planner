'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getRecipes, updateRecipeMetadata, deleteRecipe, updateRecipeContent, searchRecipes } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { RecipeListItem } from '@/types';
import EffortIndicator from '@/components/EffortIndicator';
import ImportRecipeModal from '@/components/ImportRecipeModal';

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [groupBy, setGroupBy] = useState<'none' | 'cuisine' | 'effort'>('none');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);

    // Filter States
    const [filterCuisine, setFilterCuisine] = useState<string>('all');
    const [filterEffort, setFilterEffort] = useState<string>('all');
    const [filterTag, setFilterTag] = useState<string>('all');

    useEffect(() => {
        async function fetchRecipes() {
            try {
                const data = await getRecipes();
                setRecipes(data.recipes);
            } catch (err) {
                setError('Failed to load recipes.');
            } finally {
                setLoading(false);
            }
        }
        fetchRecipes();
    }, []);

    // Derived Filter Options
    const cuisines = ['all', ...Array.from(new Set(recipes.map(r => r.cuisine).filter(Boolean)))].sort();
    const efforts = ['all', 'high', 'mild', 'low']; // Preset for sorting
    // Extract all unique tags
    const allTags = Array.from(new Set(recipes.flatMap(r => r.tags || []).filter(Boolean))).sort();
    const tags = ['all', ...allTags];

    const filteredRecipes = recipes.filter(r => {
        const matchesSearch = r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.meal_type?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCuisine = filterCuisine === 'all' || r.cuisine === filterCuisine;
        const matchesEffort = filterEffort === 'all' || r.effort_level === filterEffort;
        const matchesTag = filterTag === 'all' || (r.tags && r.tags.includes(filterTag));

        return matchesSearch && matchesCuisine && matchesEffort && matchesTag;
    });

    // Grouping Logic
    const groupedRecipes = filteredRecipes.reduce((groups: { [key: string]: typeof recipes }, recipe) => {
        let groupKey = 'Other';
        if (groupBy === 'cuisine') {
            groupKey = recipe.cuisine || 'Unknown';
        } else if (groupBy === 'effort') {
            groupKey = recipe.effort_level || 'Normal';
        }

        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(recipe);
        return groups;
    }, {});

    // Sort group keys
    const sortedGroupKeys = Object.keys(groupedRecipes).sort((a, b) => {
        if (groupBy === 'effort') {
            const effortOrder = ['low', 'mild', 'normal', 'high'];
            return effortOrder.indexOf(a.toLowerCase()) - effortOrder.indexOf(b.toLowerCase());
        }
        return a.localeCompare(b);
    });

    if (loading) return (
        <AppLayout>
            <div className="font-mono animate-pulse">LOADING RECIPES...</div>
        </AppLayout>
    );

    return (
        <AppLayout>
            <div className="container mx-auto max-w-4xl">
                <header className="mb-8 flex justify-between items-end">
                    <div>
                        <Link href="/" className="text-[var(--accent-green)] hover:underline mb-4 inline-block font-mono">← Dashboard</Link>
                        <h1 className="text-5xl">Recipe Browser</h1>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsImportOpen(true)}
                                className="px-6 py-2.5 bg-[var(--accent-gold)] text-[var(--bg-primary)] rounded-full font-bold text-sm transition-all hover:bg-yellow-400 hover:scale-105 active:scale-95 shadow-md flex items-center gap-2"
                            >
                                <span className="text-lg">✨</span> Import
                            </button>
                            {(() => {
                                const needsReviewCount = recipes.filter(r => {
                                    const tags = r.tags || [];
                                    const hasAuditTags = tags.some(t =>
                                        ['not meal', 'missing ingredients', 'missing instructions'].includes(t)
                                    );
                                    const noCuisine = !r.cuisine || r.cuisine === 'unknown';
                                    const noEffort = !r.effort_level;
                                    return hasAuditTags || noCuisine || noEffort;
                                }).length;

                                if (needsReviewCount > 0) {
                                    return (
                                        <Link
                                            href="/recipes/batch-edit"
                                            className="relative group px-6 py-2.5 bg-emerald-600 text-white rounded-full font-bold text-sm transition-all hover:bg-emerald-700 hover:scale-105 active:scale-95 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] flex items-center gap-2"
                                        >
                                            <span>Review</span>
                                            <span className="bg-white text-emerald-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-inner">
                                                {needsReviewCount}
                                            </span>
                                        </Link>
                                    );
                                } else {
                                    return (
                                        <Link
                                            href="/recipes/batch-edit"
                                            className="px-6 py-2.5 border border-gray-200 text-gray-400 rounded-full font-bold text-sm transition-all hover:border-gray-300 hover:text-gray-500 opacity-60"
                                        >
                                            Review
                                        </Link>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                </header>

                <section className="mb-8 space-y-4">
                    <input
                        type="text"
                        placeholder="Search recipes or meal types..."
                        className="w-full p-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent-sage)] focus:border-transparent outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {/* Filters Row - Compact */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg border border-[var(--border-subtle)]">
                        <select
                            value={filterCuisine}
                            onChange={(e) => setFilterCuisine(e.target.value)}
                            className="text-xs p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] min-w-[110px]"
                        >
                            {cuisines.map(c => (
                                <option key={c} value={c}>{c === 'all' ? 'All Cuisines' : c}</option>
                            ))}
                        </select>

                        <select
                            value={filterEffort}
                            onChange={(e) => setFilterEffort(e.target.value)}
                            className="text-xs p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] min-w-[100px]"
                        >
                            <option value="all">Any Effort</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>

                        <select
                            value={filterTag}
                            onChange={(e) => setFilterTag(e.target.value)}
                            className="text-xs p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] min-w-[100px]"
                        >
                            <option value="all">All Tags</option>
                            {tags.filter(t => t !== 'all').map(t => (
                                <option key={String(t)} value={String(t)}>{String(t)}</option>
                            ))}
                        </select>

                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value as any)}
                            className="text-xs p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] min-w-[100px]"
                        >
                            <option value="none">No Grouping</option>
                            <option value="cuisine">By Cuisine</option>
                            <option value="effort">By Effort</option>
                        </select>

                        {(filterCuisine !== 'all' || filterEffort !== 'all' || filterTag !== 'all') && (
                            <button
                                onClick={() => {
                                    setFilterCuisine('all');
                                    setFilterEffort('all');
                                    setFilterTag('all');
                                }}
                                className="text-xs text-[var(--accent-terracotta)] hover:underline font-bold px-2"
                            >
                                Clear ✕
                            </button>
                        )}
                    </div>
                </section>


                {error ? (
                    <div className="card text-red-700">{error}</div>
                ) : (
                    <div className="grid gap-8">
                        {groupBy === 'none' ? (
                            <div className="grid gap-4">
                                {filteredRecipes.map((recipe, idx) => (
                                    <RecipeCard key={idx} recipe={recipe} />
                                ))}
                            </div>
                        ) : (
                            sortedGroupKeys.map(groupKey => (
                                <div key={groupKey} className="space-y-4">
                                    <h2 className="text-xl font-bold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-subtle)] pb-2">
                                        {groupKey}
                                    </h2>
                                    <div className="grid gap-4">
                                        {groupedRecipes[groupKey].map((recipe, idx) => (
                                            <RecipeCard key={idx} recipe={recipe} />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                        {filteredRecipes.length === 0 && !loading && (
                            <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-subtle)]">
                                <span className="text-4xl block mb-4">🔍</span>
                                <h3 className="text-[var(--text-muted)] font-mono">No recipes found matching your criteria.</h3>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isReviewOpen && (
                <RecipeReviewModal
                    recipes={recipes.filter(r => !r.effort_level || r.cuisine === 'unknown' || !r.cuisine)}
                    onClose={() => {
                        setIsReviewOpen(false);
                    }}
                    onRefresh={async () => {
                        // Refresh recipes after delete/rename
                        const data = await getRecipes();
                        setRecipes(data.recipes);
                    }}
                />
            )}

            <ImportRecipeModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={async () => {
                    const data = await getRecipes();
                    setRecipes(data.recipes);
                }}
            />
        </AppLayout >
    );
}

function RecipeCard({ recipe }: { recipe: any }) {
    return (
        <div className="card hover:shadow-md transition-shadow group relative">
            <Link href={`/recipes/${recipe.id}`} className="absolute inset-0 z-10" />
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl mb-1 group-hover:text-[var(--accent-sage)] transition-colors">{recipe.name}</h3>
                    <div className="flex gap-2 text-sm text-[var(--text-muted)] font-mono uppercase tracking-widest items-center">
                        <span>{recipe.meal_type}</span>
                        {recipe.cuisine && <span className="opacity-50">• {recipe.cuisine}</span>}
                    </div>
                    {/* Render Tags */}
                    {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                            {recipe.tags.slice(0, 3).map((tag: string) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[var(--text-muted)]">
                                    #{tag}
                                </span>
                            ))}
                            {recipe.tags.length > 3 && <span className="text-[10px] text-[var(--text-muted)]">+{recipe.tags.length - 3}</span>}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-end justify-center h-full">
                    <EffortIndicator level={recipe.effort_level} size="md" />
                </div>
            </div>
        </div>
    );
}

function RecipeReviewModal({ recipes, onClose, onRefresh }: { recipes: RecipeListItem[], onClose: () => void, onRefresh?: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [name, setName] = useState('');
    const [cuisine, setCuisine] = useState('');
    const [effort, setEffort] = useState('');
    const [saving, setSaving] = useState(false);
    const [similarRecipes, setSimilarRecipes] = useState<RecipeListItem[]>([]);
    const cuisineRef = useRef<HTMLInputElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    const recipe = recipes[currentIndex];

    // Reset fields when changing recipe
    useEffect(() => {
        if (recipe) {
            setName(recipe.name || '');
            setCuisine(recipe.cuisine === 'unknown' ? '' : (recipe.cuisine || ''));
            setEffort(recipe.effort_level || '');
            setSimilarRecipes([]);
        }
    }, [currentIndex, recipe]);

    // Check for similar recipes
    useEffect(() => {
        if (!name.trim() || name.length < 3 || (recipe && name === recipe.name)) {
            setSimilarRecipes([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await searchRecipes(name);
                if (res.status === 'success') {
                    // Filter out current recipe from similar results
                    setSimilarRecipes(res.matches.filter((m: any) => m.id !== recipe?.id));
                }
            } catch (err) {
                console.error('Search failed:', err);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [name, recipe]);

    const handleSave = useCallback(async () => {
        if (!recipe || saving) return;
        setSaving(true);
        try {
            await updateRecipeMetadata(recipe.id, {
                name: name.trim() || recipe.name,
                cuisine: cuisine.trim().toLowerCase() || 'unknown',
                effort_level: effort || 'normal'
            });

            if (currentIndex < recipes.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                if (onRefresh) onRefresh();
                onClose();
            }
        } catch (err) {
            console.error('Failed to save changes:', err);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    }, [recipe, saving, name, cuisine, effort, currentIndex, recipes.length, onRefresh, onClose]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (saving) return;

            // Effort shortcuts
            if (e.key === '1') setEffort('low');
            if (e.key === '2') setEffort('mild');
            if (e.key === '3') setEffort('normal');
            if (e.key === '4') setEffort('high');

            // Save shortcut
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (document.activeElement !== cuisineRef.current && document.activeElement !== nameRef.current))) {
                handleSave();
            }

            // Cuisine focus shortcut
            if (e.key.toLowerCase() === 'c' && document.activeElement !== cuisineRef.current && document.activeElement !== nameRef.current) {
                e.preventDefault();
                cuisineRef.current?.focus();
            }

            // Escape to close
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, cuisine, name, effort, saving, onClose, recipes.length, handleSave]);

    async function handleDelete() {
        if (!recipe || !confirm(`Are you sure you want to delete "${recipe.name}"?`)) return;
        setSaving(true);
        try {
            await deleteRecipe(recipe.id);
            if (currentIndex < recipes.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                if (onRefresh) onRefresh();
                onClose();
            }
        } catch (err) {
            console.error('Failed to delete recipe:', err);
            alert('Failed to delete recipe');
        } finally {
            setSaving(false);
        }
    }

    if (!recipe) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1 mr-4">
                            <span className="text-[10px] font-bold text-[var(--accent-sage)] uppercase tracking-widest mb-1 block">
                                Reviewing {currentIndex + 1} of {recipes.length}
                            </span>
                            <div className="flex items-center gap-3">
                                <input
                                    ref={nameRef}
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="text-2xl font-bold text-[var(--text-main)] border-none bg-transparent focus:ring-1 focus:ring-[var(--border-color)] rounded-lg flex-1 outline-none p-0"
                                    placeholder="Recipe Name"
                                />
                                <EffortIndicator level={effort} size="md" />
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                            ✕
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Similar Recipes Alert */}
                        {similarRecipes.length > 0 && (
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                                        Potential Duplicates Found
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {similarRecipes.map(r => (
                                        <div key={r.id} className="text-xs text-amber-700 font-medium">
                                            • {r.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cuisine Input */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Cuisine
                                </label>
                                <span className="text-[10px] font-mono text-gray-400 uppercase">Press 'C' to focus</span>
                            </div>
                            <input
                                ref={cuisineRef}
                                type="text"
                                value={cuisine}
                                onChange={(e) => setCuisine(e.target.value)}
                                placeholder="e.g. Indian, Italian"
                                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--accent-sage)] focus:bg-white outline-none transition-all"
                            />
                        </div>

                        {/* Effort Selection */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Effort Level
                                </label>
                                <span className="text-[10px] font-mono text-gray-400 uppercase">Keys 1-4</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'low', label: '1 - Low', color: 'bg-[var(--accent-green)]' },
                                    { id: 'mild', label: '2 - Mild', color: 'bg-[var(--accent-gold)]' },
                                    { id: 'normal', label: '3 - Normal', color: 'bg-gray-400' },
                                    { id: 'high', label: '4 - High', color: 'bg-[var(--accent-terracotta)]' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setEffort(opt.id) as any}
                                        className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${effort === opt.id
                                            ? `${opt.color} border-transparent text-white shadow-md scale-105`
                                            : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 flex gap-3">
                    <button
                        onClick={handleDelete}
                        disabled={saving}
                        className="bg-white text-rose-600 font-bold border-2 border-rose-50 px-4 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-50"
                        title="Delete Recipe"
                    >
                        Delete
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-lg"
                    >
                        {saving ? 'Saving...' : 'Save & Next (Enter)'}
                    </button>
                </div>
            </div>
        </div>
    );
}
