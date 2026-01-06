'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAnalytics } from '@/lib/api';

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const stats = await getAnalytics();
                setData(stats);
            } catch (err) {
                console.error(err);
                setError('Failed to load analytics data.');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-[var(--accent-green)] font-mono animate-pulse">
                    HARVESTING DATA...
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
                <p className="text-red-500 mb-4">{error || 'No data found.'}</p>
                <Link href="/" className="btn-secondary inline-block">Back to Dashboard</Link>
            </div>
        );
    }

    const { overall, popularity, retirement, weekly_adherence } = data;

    return (
        <main className="container mx-auto max-w-6xl px-4 py-12">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-5xl mb-2">Family Analytics</h1>
                    <p className="text-[var(--text-muted)] font-mono uppercase tracking-widest text-sm">
                        Insights from the last {overall.total_weeks} weeks
                    </p>
                </div>
                <Link href="/" className="btn-secondary">
                    Dashboard →
                </Link>
            </header>

            {/* Primary Highlights */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <HighlightCard
                    title="Adherence"
                    value={`${overall.adherence_avg}%`}
                    subtitle="Avg plan follow rate"
                    icon="📈"
                />
                <HighlightCard
                    title="Freezer Harvest"
                    value={overall.total_freezer_created}
                    subtitle="Meals added to freezer"
                    icon="❄️"
                />
                <HighlightCard
                    title="Freezer Usage"
                    value={overall.total_freezer_used}
                    subtitle="Emergency meals used"
                    icon="🧊"
                />
                <HighlightCard
                    title="Total Weeks"
                    value={overall.total_weeks}
                    subtitle="History depth"
                    icon="📅"
                />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Popularity Table */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="card">
                        <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-6">
                            Recipe Popularity & Feedback
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-[var(--border-subtle)]">
                                    <tr className="text-xs font-mono text-[var(--text-muted)] uppercase">
                                        <th className="py-3 px-2">Recipe</th>
                                        <th className="py-3 px-2 text-center">Score</th>
                                        <th className="py-3 px-2 text-center">Frequency</th>
                                        <th className="py-3 px-2 text-center">Skip Rate</th>
                                        <th className="py-3 px-2 text-right">Cuisine</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {popularity.slice(0, 10).map((recipe: any) => (
                                        <tr key={recipe.id} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                                            <td className="py-4 px-2">
                                                <p className="font-bold border-l-2 border-transparent group-hover:border-[var(--accent-sage)] pl-2 transition-all">
                                                    {recipe.name}
                                                </p>
                                            </td>
                                            <td className="py-4 px-2 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(recipe.avg_score)}`}>
                                                    {recipe.avg_score || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-2 text-center font-mono text-sm">{recipe.count}x</td>
                                            <td className="py-4 px-2 text-center font-mono text-sm">
                                                {recipe.skip_rate}%
                                            </td>
                                            <td className="py-4 px-2 text-right">
                                                {recipe.cuisines.map((c: string) => (
                                                    <span key={c} className="text-[10px] uppercase tracking-tighter bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded ml-1">
                                                        {c}
                                                    </span>
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {popularity.length > 10 && (
                            <p className="mt-4 text-xs text-[var(--text-muted)] text-center italic">
                                Showing top 10 of {popularity.length} recipes
                            </p>
                        )}
                    </section>

                    <section className="card">
                        <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-6">
                            Weekly Adherence History
                        </h2>
                        <div className="h-48 flex items-end gap-1 px-2 border-b border-l border-[var(--border-subtle)] pt-4">
                            {weekly_adherence.map((w: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="flex-1 bg-[var(--accent-sage)] rounded-t hover:bg-[var(--accent-green)] transition-all group relative"
                                    style={{ height: `${w.adherence}%` }}
                                >
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {w.week_of}: {w.adherence}%
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-mono text-[var(--text-muted)] uppercase">
                            <span>{weekly_adherence[0]?.week_of}</span>
                            <span>Timeline (Past 12 Weeks)</span>
                            <span>{weekly_adherence[weekly_adherence.length - 1]?.week_of}</span>
                        </div>
                    </section>
                </div>

                {/* Right Column: Summaries & Flags */}
                <div className="space-y-8">
                    <section className="card">
                        <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-6">
                            Kid Preference Mix
                        </h2>
                        <div className="space-y-4">
                            {Object.entries(overall.kid_preference_counts)
                                .sort((a, b) => (b[1] as number) - (a[1] as number))
                                .map(([emoji, count]) => (
                                    <div key={emoji} className="flex items-center gap-4">
                                        <span className="text-2xl w-8 text-center">{emoji}</span>
                                        <div className="flex-grow bg-[var(--bg-secondary)] h-4 rounded-full overflow-hidden">
                                            <div
                                                className="bg-[var(--accent-gold)] h-full opacity-60"
                                                style={{ width: `${(count as number / Math.max(...Object.values(overall.kid_preference_counts) as number[])) * 100}%` }}
                                            />
                                        </div>
                                        <span className="font-mono text-sm w-8 text-right px-4">{count as number}</span>
                                    </div>
                                ))}
                        </div>
                    </section>

                    <section className="card">
                        <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-6">
                            Cuisine Diversity
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(overall.cuisine_distribution)
                                .sort((a, b) => (b[1] as number) - (a[1] as number))
                                .map(([cuisine, count]) => (
                                    <div key={cuisine} className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded flex items-center gap-2">
                                        <span className="text-sm font-bold capitalize">{cuisine}</span>
                                        <span className="text-xs font-mono text-[var(--text-muted)]">{count as number}x</span>
                                    </div>
                                ))}
                        </div>
                    </section>

                    {retirement.length > 0 && (
                        <section className="card border-l-4 border-l-[var(--accent-terracotta)]">
                            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--accent-terracotta)] mb-4">
                                Retirement Candidates ⚠️
                            </h2>
                            <p className="text-xs text-[var(--text-muted)] mb-4">
                                These recipes have low feedback or high skip rates and may need to be refreshed or removed.
                            </p>
                            <ul className="space-y-2">
                                {retirement.slice(0, 5).map((r: any) => (
                                    <li key={r.id} className="text-sm flex justify-between items-center group">
                                        <span className="group-hover:text-[var(--accent-terracotta)] transition-colors">{r.name}</span>
                                        <span className="text-[10px] font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                                            {r.avg_score > 0 ? `Avg ${r.avg_score}` : `Skipped ${r.skip_rate}%`}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}

function HighlightCard({ title, value, subtitle, icon }: any) {
    return (
        <div className="card text-center hover:scale-[1.02] transition-transform cursor-default">
            <div className="text-3xl mb-2">{icon}</div>
            <p className="text-xs font-mono uppercase tracking-tighter text-[var(--text-muted)] mb-1">{title}</p>
            <p className="text-3xl font-bold mb-1">{value}</p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{subtitle}</p>
        </div>
    );
}

function getScoreColor(score: number) {
    if (score >= 4.5) return 'bg-emerald-100 text-emerald-700';
    if (score >= 3.5) return 'bg-green-100 text-green-700';
    if (score >= 2.5) return 'bg-yellow-100 text-yellow-700';
    if (score > 0) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-500';
}
