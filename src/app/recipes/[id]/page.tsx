'use server';

import { promises as fs } from 'fs';
import path from 'path';
import Link from 'next/link';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';
import RecipeScaler from '@/components/RecipeScaler';

interface RecipeViewerProps {
    params: Promise<{ id: string }>;
}

export default async function RecipeViewer({ params }: RecipeViewerProps) {
    const { id } = await params;

    const filePath = path.join(process.cwd(), 'recipes/content', `${id}.md`);

    let recipeData: any = null;
    let markdownContent = '';
    let error: string | null = null;

    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data, content } = matter(fileContent);
        recipeData = data;
        markdownContent = content;
    } catch (err) {
        console.error(`Failed to load recipe: ${filePath}`, err);
        error = `Recipe "${id}" not found.`;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <header className="mb-6">
                        <Link href="/week-view" className="text-[var(--accent-sage)] hover:underline mb-4 inline-block">
                            ← Back to Week View
                        </Link>
                    </header>
                    <div className="card border-red-200 bg-red-50 text-red-700 p-6">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 border-b border-[var(--border-subtle)] pb-6">
                    <div className="flex justify-between items-start mb-4">
                        <Link href="/week-view" className="text-[var(--accent-sage)] hover:underline flex items-center gap-1 font-mono text-xs uppercase tracking-widest">
                            ← Back
                        </Link>
                        <div className="flex gap-2">
                            {recipeData.cuisine && (
                                <span className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-[10px] uppercase font-bold text-[var(--text-muted)]">
                                    {recipeData.cuisine}
                                </span>
                            )}
                            {recipeData.effort_level && (
                                <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${recipeData.effort_level === 'no_chop' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {recipeData.effort_level.replace('_', ' ')}
                                </span>
                            )}
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold mb-2">{recipeData.name || id}</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)] mt-4">
                        {recipeData.prep_time && (
                            <div className="flex items-center gap-1">
                                <span>⏱️ Prep: {recipeData.prep_time}m</span>
                            </div>
                        )}
                        {recipeData.cook_time && (
                            <div className="flex items-center gap-1">
                                <span>🔥 Cook: {recipeData.cook_time}m</span>
                            </div>
                        )}
                        {recipeData.appliances?.length > 0 && (
                            <div className="flex items-center gap-1">
                                <span>🍳 {recipeData.appliances.join(', ')}</span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <RecipeScaler markdownContent={markdownContent} />
                    </div>

                    <div className="space-y-6">
                        {recipeData.main_veg?.length > 0 && (
                            <section className="card">
                                <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">Key Vegetables</h3>
                                <div className="flex flex-wrap gap-1">
                                    {recipeData.main_veg.map((v: string) => (
                                        <span key={v} className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
                                            {v}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {recipeData.source_url && (
                            <section className="card">
                                <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">Original Link</h3>
                                <a
                                    href={recipeData.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-[var(--accent-sage)] hover:underline break-all"
                                >
                                    {new URL(recipeData.source_url).hostname} →
                                </a>
                            </section>
                        )}

                        {recipeData.categories?.length > 0 && (
                            <section className="card">
                                <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">Categories</h3>
                                <div className="flex flex-wrap gap-1">
                                    {recipeData.categories.map((c: string) => (
                                        <span key={c} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] uppercase font-mono">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}
