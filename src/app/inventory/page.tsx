'use client';

import { useState, useEffect } from 'react';
import { getInventory, addItemToInventory, bulkAddItemsToInventory } from '@/lib/api';
import Link from 'next/link';

export default function InventoryPage() {
    const [inventory, setInventory] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newItem, setNewItem] = useState({ category: 'meals', name: '' });
    const [updating, setUpdating] = useState(false);

    // Brain Dump states
    const [brainDump, setBrainDump] = useState('');
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [showParser, setShowParser] = useState(false);

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

    function handleParseBrainDump() {
        if (!brainDump.trim()) return;

        // Split by lines or commas
        const lines = brainDump.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
        const newItems = lines.map(line => {
            // Try to extract quantity/unit (e.g. "3 bell peppers", "2 cans black beans")
            const match = line.match(/^(\d+)\s*(.*)$/);
            if (match) {
                return {
                    item: match[2].trim(),
                    quantity: parseInt(match[1]),
                    category: 'fridge', // Default
                    unit: 'count'
                };
            }
            return {
                item: line,
                quantity: 1,
                category: 'fridge',
                unit: 'count'
            };
        });

        setParsedItems(newItems);
        setShowParser(true);
    }

    async function handleBulkAdd() {
        try {
            setUpdating(true);
            const result = await bulkAddItemsToInventory(parsedItems.map(p => ({
                category: p.category,
                item: p.item,
                quantity: p.quantity,
                unit: p.unit
            })));
            setInventory(result.inventory);
            setParsedItems([]);
            setBrainDump('');
            setShowParser(false);
        } catch (err) {
            setError('Failed to bulk add items.');
        } finally {
            setUpdating(false);
        }
    }

    if (loading) return <div className="p-8 font-mono animate-pulse">LOADING INVENTORY...</div>;

    return (
        <main className="container mx-auto max-w-4xl px-4 py-12">
            <header className="mb-12">
                <Link href="/" className="text-[var(--accent-green)] hover:underline mb-4 inline-block font-mono">← Dashboard</Link>
                <div className="flex justify-between items-baseline">
                    <h1 className="text-5xl">Inventory</h1>
                    <p className="text-sm font-mono text-[var(--text-muted)]">Last updated: {inventory?.last_updated || 'Never'}</p>
                </div>
            </header>

            {error && (
                <div className="card text-red-700 mb-8 border-red-200 bg-red-50">{error}</div>
            )}

            {/* Brain Dump Section */}
            <section className="card mb-12 border-[var(--accent-sage)] bg-[var(--bg-secondary)]/30">
                <h2 className="text-xl mb-4 flex items-center gap-2">
                    <span className="text-2xl">🧠</span> Brain Dump
                </h2>
                <div className="space-y-4">
                    <textarea
                        className="w-full h-32 p-4 border border-[var(--border-subtle)] rounded-sm bg-[var(--bg-secondary)] font-mono text-sm"
                        placeholder="Paste your grocery list or inventory notes here...
Example:
3 bell peppers
1 bag spinach
2 frozen pizzas
milk"
                        value={brainDump}
                        onChange={(e) => setBrainDump(e.target.value)}
                    ></textarea>
                    {!showParser ? (
                        <button
                            className="btn-primary w-full py-3"
                            onClick={handleParseBrainDump}
                            disabled={!brainDump.trim()}
                        >
                            Parse List
                        </button>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <h3 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">Confirm Parsed Items</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-[var(--border-subtle)]">
                                        <tr>
                                            <th className="py-2">Item</th>
                                            <th className="py-2">Qty</th>
                                            <th className="py-2">Category</th>
                                            <th className="py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-subtle)]">
                                        {parsedItems.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="py-2">
                                                    <input
                                                        className="bg-transparent border-none w-full focus:ring-1 focus:ring-[var(--accent-green)] rounded px-1"
                                                        value={item.item}
                                                        onChange={(e) => {
                                                            const newItems = [...parsedItems];
                                                            newItems[idx].item = e.target.value;
                                                            setParsedItems(newItems);
                                                        }}
                                                    />
                                                </td>
                                                <td className="py-2 w-16">
                                                    <input
                                                        type="number"
                                                        className="bg-transparent border-none w-full focus:ring-1 focus:ring-[var(--accent-green)] rounded px-1"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const newItems = [...parsedItems];
                                                            newItems[idx].quantity = parseInt(e.target.value);
                                                            setParsedItems(newItems);
                                                        }}
                                                    />
                                                </td>
                                                <td className="py-2">
                                                    <select
                                                        className="bg-transparent border-none focus:ring-1 focus:ring-[var(--accent-green)] rounded px-1 text-xs"
                                                        value={item.category}
                                                        onChange={(e) => {
                                                            const newItems = [...parsedItems];
                                                            newItems[idx].category = e.target.value;
                                                            setParsedItems(newItems);
                                                        }}
                                                    >
                                                        <option value="fridge">Fridge</option>
                                                        <option value="pantry">Pantry</option>
                                                        <option value="meals">Freezer</option>
                                                    </select>
                                                </td>
                                                <td className="py-2 text-right">
                                                    <button
                                                        className="text-red-400 hover:text-red-600 px-2"
                                                        onClick={() => {
                                                            setParsedItems(parsedItems.filter((_, i) => i !== idx));
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    className="btn-secondary flex-1 py-2"
                                    onClick={() => setShowParser(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn-primary flex-1 py-2"
                                    onClick={handleBulkAdd}
                                    disabled={updating || parsedItems.length === 0}
                                >
                                    {updating ? 'Adding...' : `Add ${parsedItems.length} Items`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Freezer Section */}
                <section className="card">
                    <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-6">Freezer Backups</h2>

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

                    <div className="space-y-2">
                        {inventory?.freezer?.backups && inventory.freezer.backups.length > 0 ? (
                            inventory.freezer.backups.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{item.meal}</span>
                                        <span className="text-[10px] text-[var(--text-muted)] font-mono">{item.frozen_date}</span>
                                    </div>
                                    <span className="px-3 py-1 bg-[var(--bg-secondary)] rounded-sm font-mono font-bold text-[var(--accent-green)]">
                                        {item.servings || 4}p
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-[var(--text-muted)] italic">No freezer backups found.</p>
                        )}
                    </div>
                </section>

                <div className="space-y-8">
                    {/* Fridge Section */}
                    <section className="card">
                        <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-6">Fridge</h2>
                        <div className="flex gap-2 mb-4">
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
                        <div className="space-y-1">
                            {inventory?.fridge && inventory.fridge.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {inventory.fridge.map((item: any, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm group relative">
                                            {item.item}
                                            {item.quantity > 1 && <span className="ml-1 opacity-50">x{item.quantity}</span>}
                                        </span>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--text-muted)] italic">Empty</p>}
                        </div>
                    </section>

                    {/* Pantry Section */}
                    <section className="card">
                        <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-6">Pantry</h2>
                        <div className="flex gap-2 mb-4">
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
                        <div className="space-y-1">
                            {inventory?.pantry && inventory.pantry.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {inventory.pantry.map((item: any, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm">
                                            {item.item}
                                            {item.quantity > 1 && <span className="ml-1 opacity-50">x{item.quantity}</span>}
                                        </span>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--text-muted)] italic">Empty</p>}
                        </div>
                    </section>
                </div>
            </div>

            <footer className="mt-12 p-6 bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <p className="text-sm text-[var(--text-muted)] italic">
                    Tip: Quick Add and Brain Dump are active. Changes are persisted to GitHub automatically.
                </p>
            </footer>
        </main>
    );
}
