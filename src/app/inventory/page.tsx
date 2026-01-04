'use client';

import { useState, useEffect } from 'react';
import { getInventory } from '@/lib/api';
import Link from 'next/link';

export default function InventoryPage() {
    const [inventory, setInventory] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchInventory() {
            try {
                const data = await getInventory();
                setInventory(data.inventory);
            } catch (err) {
                setError('Failed to load inventory.');
            } finally {
                setLoading(false);
            }
        }
        fetchInventory();
    }, []);

    if (loading) return <div className="p-8 font-mono animate-pulse">LOADING INVENTORY...</div>;

    return (
        <main className="container mx-auto max-w-4xl px-4 py-12">
            <header className="mb-12">
                <Link href="/" className="text-[var(--accent-green)] hover:underline mb-4 inline-block font-mono">← Dashboard</Link>
                <h1 className="text-5xl">Inventory</h1>
            </header>

            {error ? (
                <div className="card text-red-700">{error}</div>
            ) : (
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Freezer Section */}
                    <section className="card">
                        <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-6">Freezer Meals</h2>
                        <div className="space-y-4">
                            {inventory?.freezer?.meals ? Object.entries(inventory.freezer.meals).map(([name, count]: any) => (
                                <div key={name} className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
                                    <span className="font-medium">{name}</span>
                                    <span className="px-3 py-1 bg-[var(--bg-secondary)] rounded-sm font-mono font-bold text-[var(--accent-green)]">{count}</span>
                                </div>
                            )) : <p className="text-[var(--text-muted)]">No freezer meals found.</p>}
                        </div>
                    </section>

                    {/* Pantry/Fridge Section */}
                    <section className="card">
                        <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-6">Vegetables & Core</h2>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xs uppercase text-[var(--accent-sage)] mb-2">Pantry</h3>
                                <p className="text-sm">{inventory?.vegetables?.pantry?.join(', ') || 'None'}</p>
                            </div>
                            <div>
                                <h3 className="text-xs uppercase text-[var(--accent-sage)] mb-2">Fridge</h3>
                                <p className="text-sm">{inventory?.vegetables?.fridge?.join(', ') || 'None'}</p>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            <footer className="mt-12 p-6 bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <p className="text-sm text-[var(--text-muted)] italic">
                    Tip: Currently viewer only. Persisting changes via UI coming in Phase 3.
                </p>
            </footer>
        </main>
    );
}
