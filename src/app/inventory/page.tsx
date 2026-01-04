'use client';

import { useState, useEffect } from 'react';
import { getInventory, addItemToInventory } from '@/lib/api';
import Link from 'next/link';

export default function InventoryPage() {
    const [inventory, setInventory] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newItem, setNewItem] = useState({ category: 'meals', name: '' });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchInventory();
    }, []);

    async function fetchInventory() {
        try {
            setLoading(true);
            const data = await getInventory();
            setInventory(data.inventory);
        } catch (err) {
            setError('Failed to load inventory.');
        } finally {
            setLoading(false);
        }
    }

    async function handleAddItem(category: string, item: string) {
        if (!item.trim()) return;
        try {
            setUpdating(true);
            const result = await addItemToInventory(category, item.trim());
            setInventory(result.inventory);
            setNewItem({ ...newItem, name: '' });
        } catch (err) {
            setError('Failed to add item.');
        } finally {
            setUpdating(false);
        }
    }

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

                        {/* Quick Add Freezer */}
                        <div className="flex gap-2 mb-6">
                            <input
                                type="text"
                                placeholder="Add meal..."
                                className="flex-1 p-2 border border-[var(--border-subtle)] rounded-sm bg-[var(--bg-secondary)]"
                                value={newItem.category === 'meals' ? newItem.name : ''}
                                onChange={(e) => setNewItem({ category: 'meals', name: e.target.value })}
                            />
                            <button
                                onClick={() => handleAddItem('meals', newItem.name)}
                                disabled={updating}
                                className="btn-primary"
                            >
                                {updating && newItem.category === 'meals' ? '+' : 'Add'}
                            </button>
                        </div>

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
                        <div className="space-y-8">
                            {/* Pantry */}
                            <div>
                                <h3 className="text-xs uppercase text-[var(--accent-sage)] mb-2">Pantry</h3>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        placeholder="Add to pantry..."
                                        className="flex-1 p-2 border border-[var(--border-subtle)] rounded-sm bg-[var(--bg-secondary)] text-sm"
                                        value={newItem.category === 'pantry' ? newItem.name : ''}
                                        onChange={(e) => setNewItem({ category: 'pantry', name: e.target.value })}
                                    />
                                    <button
                                        onClick={() => handleAddItem('pantry', newItem.name)}
                                        disabled={updating}
                                        className="btn-primary text-xs"
                                    >
                                        Add
                                    </button>
                                </div>
                                <p className="text-sm">{inventory?.vegetables?.pantry?.join(', ') || 'None'}</p>
                            </div>

                            {/* Fridge */}
                            <div>
                                <h3 className="text-xs uppercase text-[var(--accent-sage)] mb-2">Fridge</h3>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        placeholder="Add to fridge..."
                                        className="flex-1 p-2 border border-[var(--border-subtle)] rounded-sm bg-[var(--bg-secondary)] text-sm"
                                        value={newItem.category === 'fridge' ? newItem.name : ''}
                                        onChange={(e) => setNewItem({ category: 'fridge', name: e.target.value })}
                                    />
                                    <button
                                        onClick={() => handleAddItem('fridge', newItem.name)}
                                        disabled={updating}
                                        className="btn-primary text-xs"
                                    >
                                        Add
                                    </button>
                                </div>
                                <p className="text-sm">{inventory?.vegetables?.fridge?.join(', ') || 'None'}</p>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            <footer className="mt-12 p-6 bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <p className="text-sm text-[var(--text-muted)] italic">
                    Tip: Quick Add is active. Changes are persisted to GitHub automatically.
                </p>
            </footer>
        </main>
    );
}
