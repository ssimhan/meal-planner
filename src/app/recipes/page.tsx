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

    const filteredRecipes = recipes.filter(r =>
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.template?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <AppLayout>
            <div className="font-mono animate-pulse">LOADING RECIPES...</div>
        </AppLayout>
    );

    return (
        <AppLayout>
            <div className="container mx-auto max-w-4xl">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <Link href="/" className="text-[var(--accent-green)] hover:underline mb-4 inline-block font-mono">← Dashboard</Link>
                    <h1 className="text-5xl">Recipe Browser</h1>
                </div>
                <div className="text-[var(--text-muted)] font-mono">{filteredRecipes.length} Recipes</div>
            </header>

            <section className="mb-8">
                <input
                    type="text"
                    placeholder="Search recipes or templates..."
                    className="w-full p-4 border border-[var(--border-subtle)] rounded-sm bg-[var(--bg-secondary)]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </section>

            {error ? (
                <div className="card text-red-700">{error}</div>
            ) : (
                <div className="grid gap-4">
                    {filteredRecipes.map((recipe, idx) => (
                        <div key={idx} className="card hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl mb-1">{recipe.name}</h3>
                                    <p className="text-sm text-[var(--text-muted)] font-mono uppercase tracking-widest">{recipe.template}</p>
                                </div>
                                {recipe.energy && (
                                    <span className={`px-2 py-1 text-xs font-bold rounded-sm border ${recipe.energy === 'high' ? 'bg-[var(--accent-green)] text-white' :
                                            recipe.energy === 'mild' ? 'bg-[var(--accent-gold)]' : 'bg-[var(--accent-terracotta)] text-white'
                                        }`}>
                                        {recipe.energy.toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </AppLayout>
    );
}
