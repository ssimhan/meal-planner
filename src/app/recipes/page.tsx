'use client';

import { useState, useEffect } from 'react';
import { getRecipes } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter States
    const [filterCuisine, setFilterCuisine] = useState<string>('all');
    const [filterEffort, setFilterEffort] = useState<string>('all');
    const [filterTag, setFilterTag] = useState<string>('all');

    useEffect(() => {
        async function fetchRecipes() {
            try {
                const data = await getRecipes();
                setRecipes(Object.values(data.recipes));
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
        const matchesEffort = filterEffort === 'all' || r.energy === filterEffort;
        const matchesTag = filterTag === 'all' || (r.tags && r.tags.includes(filterTag));

        return matchesSearch && matchesCuisine && matchesEffort && matchesTag;
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
                    <div className="text-[var(--text-muted)] font-mono">{filteredRecipes.length} Recipes</div>
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
                                <option value="high">High Energy</option>
                                <option value="mild">Mild Energy</option>
                                <option value="low">Low Energy</option>
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

                {error ? (
                    <div className="card text-red-700">{error}</div>
                ) : (
                    <div className="grid gap-4">
                        {filteredRecipes.map((recipe, idx) => (
                            <div key={idx} className="card hover:shadow-md transition-shadow group relative">
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
                                        {recipe.energy && (
                                            <span className={`px-2 py-1 text-xs font-bold rounded-sm border ${recipe.energy === 'high' ? 'bg-[var(--accent-green)] text-white' :
                                                recipe.energy === 'mild' ? 'bg-[var(--accent-gold)]' : 'bg-[var(--accent-terracotta)] text-white'
                                                }`}>
                                                {recipe.energy.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
