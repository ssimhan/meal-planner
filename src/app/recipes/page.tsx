'use client';

import { useState, useEffect, useRef } from 'react';
import { getRecipes, updateRecipeMetadata } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { RecipeListItem } from '@/types';

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [groupBy, setGroupBy] = useState<'none' | 'cuisine' | 'effort'>('none');
    const [isReviewOpen, setIsReviewOpen] = useState(false);

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
            r.template?.toLowerCase().includes(searchTerm.toLowerCase());
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
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-[var(--text-muted)] font-mono">{filteredRecipes.length} Recipes</div>
                        {recipes.filter(r => !r.effort_level || r.cuisine === 'unknown' || !r.cuisine).length > 0 && (
                            <button
                                onClick={() => setIsReviewOpen(true)}
                                className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 bg-[var(--accent-sage)] text-white rounded-md hover:bg-opacity-90 transition-all shadow-sm"
                            >
                                Review Incomplete ({recipes.filter(r => !r.effort_level || r.cuisine === 'unknown' || !r.cuisine).length})
                            </button>
                        )}
                    </div>
                </header>

                <section className="mb-8 space-y-4">
                    <input
                        type="text"
                        placeholder="Search recipes or templates..."
                        className="w-full p-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent-sage)] focus:border-transparent outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {/* Filters Row */}
                    <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg border border-[var(--border-subtle)]">

                        {/* Cuisine Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Cuisine</label>
                            <select
                                value={filterCuisine}
                                onChange={(e) => setFilterCuisine(e.target.value)}
                                className="text-sm p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] min-w-[140px]"
                            >
                                {cuisines.map(c => (
                                    <option key={c} value={c}>{c === 'all' ? 'All Cuisines' : c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Effort Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Effort</label>
                            <select
                                value={filterEffort}
                                onChange={(e) => setFilterEffort(e.target.value)}
                                className="text-sm p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] min-w-[120px]"
                            >
                                <option value="all">Any Effort</option>
                                <option value="high">High Effort</option>
                                <option value="mild">Mild Effort</option>
                                <option value="normal">Normal Effort</option>
                                <option value="low">Low Effort</option>
                            </select>
                        </div>

                        {/* Tags Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Tags</label>
                            <select
                                value={filterTag}
                                onChange={(e) => setFilterTag(e.target.value)}
                                className="text-sm p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] min-w-[140px]"
                            >
                                <option value="all">All Tags</option>
                                {/* Limit tags if too many? */}
                                {tags.filter(t => t !== 'all').map(t => (
                                    <option key={String(t)} value={String(t)}>{String(t)}</option>
                                ))}
                            </select>
                        </div>

                        {/* Clear Filters Button */}
                        {(filterCuisine !== 'all' || filterEffort !== 'all' || filterTag !== 'all') && (
                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setFilterCuisine('all');
                                        setFilterEffort('all');
                                        setFilterTag('all');
                                    }}
                                    className="text-sm text-[var(--accent-terracotta)] hover:underline font-bold px-4 py-2"
                                >
                                    Clear x
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Grouping Toggle */}
                <div className="mb-6 flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Group by:</span>
                    <div className="flex bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)]">
                        {[
                            { id: 'none', label: 'None' },
                            { id: 'cuisine', label: 'Cuisine' },
                            { id: 'effort', label: 'Effort' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setGroupBy(opt.id as any)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${groupBy === opt.id
                                    ? 'bg-white shadow-sm text-[var(--accent-sage)]'
                                    : 'text-[var(--text-muted)] hover:text-gray-900'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

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
                        // Refresh recipes
                        getRecipes().then(data => setRecipes(Object.values(data.recipes)));
                    }}
                />
            )}
        </AppLayout >
    );
}

function RecipeCard({ recipe }: { recipe: any }) {
    return (
        <div className="card hover:shadow-md transition-shadow group relative bg-white">
            <Link href={`/recipes/${recipe.id}`} className="absolute inset-0 z-10" />
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl mb-1 group-hover:text-[var(--accent-sage)] transition-colors">{recipe.name}</h3>
                    <div className="flex gap-2 text-sm text-[var(--text-muted)] font-mono uppercase tracking-widest items-center">
                        <span>{recipe.template}</span>
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
                <div className="flex flex-col items-end gap-2">
                    {recipe.effort_level && (
                        <span className={`px-2 py-1 text-xs font-bold rounded-sm border ${recipe.effort_level === 'high' ? 'bg-[var(--accent-terracotta)] text-white border-[var(--accent-terracotta)]' :
                            recipe.effort_level === 'mild' ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)]' :
                                recipe.effort_level === 'low' ? 'bg-[var(--accent-green)] text-white border-[var(--accent-green)]' :
                                    'bg-gray-100 text-gray-800 border-gray-200'
                            }`}>
                            {recipe.effort_level.toUpperCase()}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function RecipeReviewModal({ recipes, onClose }: { recipes: RecipeListItem[], onClose: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [cuisine, setCuisine] = useState('');
    const [effort, setEffort] = useState('');
    const [saving, setSaving] = useState(false);
    const cuisineRef = useRef<HTMLInputElement>(null);

    const recipe = recipes[currentIndex];

    useEffect(() => {
        if (recipe) {
            setCuisine(recipe.cuisine === 'unknown' ? '' : (recipe.cuisine || ''));
            setEffort(recipe.effort_level || '');
        }
    }, [currentIndex, recipe]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (saving) return;

            // Effort shortcuts
            if (e.key === '1') setEffort('low');
            if (e.key === '2') setEffort('mild');
            if (e.key === '3') setEffort('normal');
            if (e.key === '4') setEffort('high');

            // Save shortcut
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || document.activeElement !== cuisineRef.current)) {
                handleSave();
            }

            // Cuisine focus shortcut
            if (e.key.toLowerCase() === 'c' && document.activeElement !== cuisineRef.current) {
                e.preventDefault();
                cuisineRef.current?.focus();
            }

            // Escape to close
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, cuisine, effort, saving, onClose, recipes.length]);

    async function handleSave() {
        if (!recipe || saving) return;
        setSaving(true);
        try {
            await updateRecipeMetadata(recipe.id, {
                cuisine: cuisine.trim().toLowerCase() || 'unknown',
                effort_level: effort || 'normal'
            });

            if (currentIndex < recipes.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                onClose();
            }
        } catch (err) {
            console.error('Failed to save changes:', err);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    }

    if (!recipe) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="text-[10px] font-bold text-[var(--accent-sage)] uppercase tracking-widest mb-1 block">
                                Reviewing {currentIndex + 1} of {recipes.length}
                            </span>
                            <h2 className="text-2xl font-bold text-gray-900">{recipe.name}</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                            ✕
                        </button>
                    </div>

                    <div className="space-y-6">
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
