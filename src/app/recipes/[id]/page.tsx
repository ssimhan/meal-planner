'use server';

import { promises as fs } from 'fs';
import path from 'path';
import Link from 'next/link';

interface RecipeViewerProps {
    params: Promise<{ id: string }>;
}

export default async function RecipeViewer({ params }: RecipeViewerProps) {
    const { id } = await params;

    // Convert snake_case ID to Title Case Name
    // e.g., easy_french_toast_sticks -> Easy French Toast Sticks
    const recipeName = id
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    const filePath = path.join(process.cwd(), 'recipes/raw_html', `${recipeName}.html`);

    let htmlContent = '';
    let error: string | null = null;

    try {
        htmlContent = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
        console.error(`Failed to load recipe: ${filePath}`, err);
        error = `Recipe "${recipeName}" not found.`;
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-6">
                    <Link href="/week-view" className="text-[var(--accent-sage)] hover:underline mb-4 inline-block">
                        ← Back to Week View
                    </Link>
                    <h1 className="text-3xl font-bold mt-2">{recipeName}</h1>
                </header>

                {error ? (
                    <div className="card border-red-200 bg-red-50 text-red-700 p-6">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                    </div>
                ) : (
                    <div
                        className="prose prose-stone max-w-none bg-white p-8 rounded shadow-sm"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                )}
            </div>
        </div>
    );
}
