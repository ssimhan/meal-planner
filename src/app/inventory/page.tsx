'use client';

import { useState, useEffect, useMemo } from 'react';
import { getInventory, addItemToInventory, bulkAddItemsToInventory, deleteItemFromInventory, updateInventoryItem, moveInventoryItem } from '@/lib/api';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import InventoryItemRow from '@/components/InventoryItemRow';
import BrainDumpModal from '@/components/BrainDumpModal';

export default function InventoryPage() {
    const [inventory, setInventory] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [newItem, setNewItem] = useState({ category: 'fridge', name: '' });
    const [updating, setUpdating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Undo states
    const [lastDeleted, setLastDeleted] = useState<{ category: string, item: any } | null>(null);
    const [showUndo, setShowUndo] = useState(false);

    // Modal state
    const [showBrainDump, setShowBrainDump] = useState(false);

    // Brain dump parser states
    const [brainDump, setBrainDump] = useState('');
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [showParser, setShowParser] = useState(false);

    // Edit states
    const [editingItem, setEditingItem] = useState<{ category: string, name: string } | null>(null);
    const [editValue, setEditValue] = useState<any>({});

    useEffect(() => {
        fetchInventory();
    }, []);

    async function fetchInventory() {
        try {
            setLoading(true);
            const data = await getInventory();
            setInventory(data.inventory);
        } catch (err: any) {
            showToast(err.message || 'Failed to load inventory.', 'error');
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
            showToast('Item added successfully!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to add item.', 'error');
        } finally {
            setUpdating(false);
        }
    }

    async function handleDeleteItem(category: string, item: any) {
        try {
            const itemName = category === 'meals' ? item.meal : item.item;
            setUpdating(true);
            const result = await deleteItemFromInventory(category, itemName);

            // Set up undo
            setLastDeleted({ category, item });
            setShowUndo(true);
            setTimeout(() => setShowUndo(false), 5000); // Hide after 5 seconds

            setInventory(result.inventory);
        } catch (err: any) {
            showToast(err.message || 'Failed to delete item.', 'error');
        } finally {
            setUpdating(false);
        }
    }

    async function handleUpdateItem(category: string, item: string, updates: any) {
        try {
            setUpdating(true);
            const result = await updateInventoryItem(category, item, updates);
            setInventory(result.inventory);
            // Don't toast for minor updates to avoid spam
        } catch (err: any) {
            showToast(err.message || 'Failed to update item.', 'error');
        } finally {
            setUpdating(false);
        }
    }

    async function handleMoveItem(item: string, fromCategory: string, toCategory: string) {
        try {
            setUpdating(true);
            const result = await moveInventoryItem(item, fromCategory, toCategory);
            setInventory(result.inventory);
            showToast(`Moved to ${toCategory.replace('_', ' ')}`, 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to move item.', 'error');
        } finally {
            setUpdating(false);
        }
    }

    async function handleUndoDelete() {
        if (!lastDeleted) return;
        try {
            setUpdating(true);
            const itemName = lastDeleted.category === 'meals' ? lastDeleted.item.meal : lastDeleted.item.item;
            const result = await addItemToInventory(lastDeleted.category, itemName);

            if (lastDeleted.category !== 'meals' && (lastDeleted.item.quantity > 1 || lastDeleted.item.unit)) {
                await updateInventoryItem(lastDeleted.category, itemName, {
                    quantity: lastDeleted.item.quantity,
                    unit: lastDeleted.item.unit
                });
                const final = await getInventory();
                setInventory(final.inventory);
            } else if (lastDeleted.category === 'meals' && lastDeleted.item.servings) {
                await updateInventoryItem(lastDeleted.category, itemName, {
                    servings: lastDeleted.item.servings
                });
                const final = await getInventory();
                setInventory(final.inventory);
            } else {
                setInventory(result.inventory);
            }

            setLastDeleted(null);
            setShowUndo(false);
            showToast('Restored deleted item', 'info');
        } catch (err: any) {
            showToast(err.message || 'Failed to undo deletion.', 'error');
        } finally {
            setUpdating(false);
        }
    }

    async function handleBulkAdd(items: any[]) {
        try {
            setUpdating(true);
            const result = await bulkAddItemsToInventory(items);
            setInventory(result.inventory);
            showToast(`Added ${items.length} items!`, 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to bulk add items.', 'error');
        } finally {
            setUpdating(false);
        }
    }

    // Unified list computation
    const allItems = useMemo(() => {
        if (!inventory) return [];
        const items = [];
        if (inventory.fridge) items.push(...inventory.fridge.map((i: any) => ({ ...i, category: 'fridge' })));
        if (inventory.pantry) items.push(...inventory.pantry.map((i: any) => ({ ...i, category: 'pantry' })));
        if (inventory.freezer?.backups) items.push(...inventory.freezer.backups.map((i: any) => ({ ...i, category: 'meals' })));
        if (inventory.freezer?.ingredients) items.push(...inventory.freezer.ingredients.map((i: any) => ({ ...i, category: 'frozen_ingredient' })));
        return items;
    }, [inventory]);

    const filteredItems = useMemo(() => {
        if (!searchQuery) return allItems;
        const q = searchQuery.toLowerCase();
        return allItems.filter(i => {
            const name = i.category === 'meals' ? i.meal : i.item;
            return name.toLowerCase().includes(q) || i.category.includes(q);
        });
    }, [allItems, searchQuery]);

    // If not searching, we can split them back out for standard view
    const viewItems = searchQuery ? filteredItems : null; // If null, use standard view

    if (loading) return <div className="p-8 font-mono animate-pulse">LOADING INVENTORY...</div>;

    return (
        <main className="container mx-auto max-w-4xl px-4 py-8 pb-32">
            <header className="mb-8">
                <Link href="/" className="text-sm text-[var(--accent-green)] hover:underline mb-4 inline-block font-mono">← Dashboard</Link>
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-bold mb-1">Inventory</h1>
                        <p className="text-sm font-mono text-[var(--text-muted)]">
                            {allItems.length} items • Last updated: {inventory?.last_updated || 'Never'}
                        </p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={() => setShowBrainDump(true)}
                            className="btn-secondary flex items-center gap-2 whitespace-nowrap"
                        >
                            <span>🧠</span> Brain Dump
                        </button>
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text"
                                placeholder="Search all items..."
                                className="w-full pl-9 pr-4 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Quick Add Bar (Sticky) */}
            <div className={`sticky top-4 z-40 bg-white/95 backdrop-blur shadow-sm border border-[var(--border-subtle)] rounded-lg p-2 mb-8 flex gap-2 transition-all duration-300 ${searchQuery ? 'opacity-50 pointer-events-none' : ''}`}>
                <select
                    className="bg-transparent border-none text-sm font-bold text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                >
                    <option value="fridge">Fridge</option>
                    <option value="pantry">Pantry</option>
                    <option value="meals">Freezer Meal</option>
                    <option value="frozen_ingredient">Freezer Ingr</option>
                </select>
                <div className="w-px bg-gray-200"></div>
                <input
                    type="text"
                    placeholder={`Add item to ${newItem.category.replace('_', ' ')}...`}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddItem(newItem.category, newItem.name);
                    }}
                />
                <button
                    onClick={() => handleAddItem(newItem.category, newItem.name)}
                    disabled={updating || !newItem.name.trim()}
                    className="btn-primary py-1 px-4 text-xs h-auto"
                >
                    Add
                </button>
            </div>

            {/* Unified Search Results */}
            {searchQuery ? (
                <section className="card">
                    <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
                        Search Results ({filteredItems.length})
                    </h2>
                    <div className="space-y-1">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item: any, idx) => (
                                <InventoryItemRow
                                    key={`${item.category}-${item.item || item.meal}-${idx}`}
                                    item={item}
                                    category={item.category}
                                    onUpdate={handleUpdateItem}
                                    onDelete={handleDeleteItem}
                                    onMove={handleMoveItem}
                                    disabled={updating}
                                />
                            ))
                        ) : (
                            <p className="text-center py-8 text-[var(--text-muted)]">No items found matching "{searchQuery}"</p>
                        )}
                    </div>
                </section>
            ) : (
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Standard Category Layout */}

                    {/* Fridge */}
                    <section className="card">
                        <header className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">Fridge</h2>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{inventory?.fridge?.length || 0}</span>
                        </header>
                        <div className="space-y-1">
                            {inventory?.fridge?.length ? (
                                inventory.fridge.map((item: any, idx: number) => (
                                    <InventoryItemRow
                                        key={`fridge-${idx}`}
                                        item={item}
                                        category="fridge"
                                        onUpdate={handleUpdateItem}
                                        onDelete={handleDeleteItem}
                                        onMove={handleMoveItem}
                                        disabled={updating}
                                    />
                                ))
                            ) : <p className="text-sm text-[var(--text-muted)] italic">Empty</p>}
                        </div>
                    </section>

                    {/* Pantry */}
                    <section className="card">
                        <header className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">Pantry</h2>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{inventory?.pantry?.length || 0}</span>
                        </header>
                        <div className="space-y-1">
                            {inventory?.pantry?.length ? (
                                inventory.pantry.map((item: any, idx: number) => (
                                    <InventoryItemRow
                                        key={`pantry-${idx}`}
                                        item={item}
                                        category="pantry"
                                        onUpdate={handleUpdateItem}
                                        onDelete={handleDeleteItem}
                                        onMove={handleMoveItem}
                                        disabled={updating}
                                    />
                                ))
                            ) : <p className="text-sm text-[var(--text-muted)] italic">Empty</p>}
                        </div>
                    </section>

                    {/* Freezer Backups */}
                    <section className="card">
                        <header className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">Freezer Meals</h2>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{inventory?.freezer?.backups?.length || 0}</span>
                        </header>
                        <div className="space-y-1">
                            {inventory?.freezer?.backups?.length ? (
                                inventory.freezer.backups.map((item: any, idx: number) => (
                                    <InventoryItemRow
                                        key={`meals-${idx}`}
                                        item={item}
                                        category="meals"
                                        onUpdate={handleUpdateItem}
                                        onDelete={handleDeleteItem}
                                        onMove={handleMoveItem}
                                        disabled={updating}
                                    />
                                ))
                            ) : <p className="text-sm text-[var(--text-muted)] italic">Empty</p>}
                        </div>
                    </section>

                    {/* Freezer Ingredients */}
                    <section className="card">
                        <header className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">frozen Ingredients</h2>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{inventory?.freezer?.ingredients?.length || 0}</span>
                        </header>
                        <div className="space-y-1">
                            {inventory?.freezer?.ingredients?.length ? (
                                inventory.freezer.ingredients.map((item: any, idx: number) => (
                                    <InventoryItemRow
                                        key={`frozen-${idx}`}
                                        item={item}
                                        category="frozen_ingredient"
                                        onUpdate={handleUpdateItem}
                                        onDelete={handleDeleteItem}
                                        onMove={handleMoveItem}
                                        disabled={updating}
                                    />
                                ))
                            ) : <p className="text-sm text-[var(--text-muted)] italic">Empty</p>}
                        </div>
                    </section>
                </div>
            )}

            {/* Undo Toast */}
            {showUndo && lastDeleted && (
                <div className="fixed bottom-8 right-8 z-40 animate-in slide-in-from-bottom-4">
                    <div className="bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-6 border border-gray-700">
                        <span className="text-sm font-medium">
                            Deleted <span className="text-[var(--accent-sage)]">{lastDeleted.category === 'meals' ? lastDeleted.item.meal : lastDeleted.item.item}</span>
                        </span>
                        <button
                            onClick={handleUndoDelete}
                            className="text-xs font-bold uppercase tracking-widest text-[var(--accent-sage)] hover:text-white transition-colors"
                        >
                            Undo
                        </button>
                    </div>
                </div>
            )}

            <BrainDumpModal
                isOpen={showBrainDump}
                onClose={() => setShowBrainDump(false)}
                onBulkAdd={handleBulkAdd}
                loading={updating}
            />

        </main>
    );
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

        {/* Undo Toast */}
        {showUndo && lastDeleted && (
            <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4">
                <div className="bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-6 border border-gray-700">
                    <span className="text-sm font-medium">
                        Deleted <span className="text-[var(--accent-sage)]">{lastDeleted.category === 'meals' ? lastDeleted.item.meal : lastDeleted.item.item}</span>
                    </span>
                    <button
                        onClick={handleUndoDelete}
                        className="text-xs font-bold uppercase tracking-widest text-[var(--accent-sage)] hover:text-white transition-colors"
                    >
                        Undo
                    </button>
                </div>
            </div>
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

                <div className="space-y-4">
                    {inventory?.freezer?.backups && inventory.freezer.backups.length > 0 ? (
                        inventory.freezer.backups.map((item: any, idx: number) => (
                            <div key={idx} className="group flex justify-between items-center py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]/10 px-2 -mx-2 rounded transition-colors">
                                {editingItem?.category === 'meals' && editingItem.name === item.meal ? (
                                    <div className="flex-1 flex gap-2 items-center">
                                        <input
                                            className="flex-1 bg-white border border-[var(--border-subtle)] p-1 text-sm rounded"
                                            value={editValue.meal || ''}
                                            onChange={(e) => setEditValue({ ...editValue, meal: e.target.value })}
                                        />
                                        <input
                                            type="number"
                                            className="w-16 bg-white border border-[var(--border-subtle)] p-1 text-sm rounded font-mono"
                                            value={editValue.servings || 4}
                                            onChange={(e) => setEditValue({ ...editValue, servings: parseInt(e.target.value) })}
                                        />
                                        <button onClick={handleUpdateItem} className="text-[var(--accent-green)] text-xs font-bold uppercase">Save</button>
                                        <button onClick={() => setEditingItem(null)} className="text-[var(--text-muted)] text-xs">Esc</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{item.meal}</span>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setEditingItem({ category: 'meals', name: item.meal, original: item });
                                                            setEditValue({ ...item });
                                                        }}
                                                        className="text-xs hover:scale-120 transition-transform"
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem('meals', item)}
                                                        className="text-xs hover:scale-120 transition-transform"
                                                        title="Delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{item.frozen_date}</span>
                                        </div>
                                        <span className="px-3 py-1 bg-[var(--bg-secondary)] rounded-sm font-mono font-bold text-[var(--accent-green)]">
                                            {item.servings || 4}p
                                        </span>
                                    </>
                                )}
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
                                    <div key={idx} className="group relative">
                                        {editingItem?.category === 'fridge' && editingItem.name === item.item ? (
                                            <div className="flex gap-1 items-center bg-white border border-[var(--accent-sage)] rounded px-1 py-0.5 shadow-sm">
                                                <input
                                                    className="w-24 bg-transparent border-none p-0 text-sm focus:ring-0"
                                                    value={editValue.item || ''}
                                                    onChange={(e) => setEditValue({ ...editValue, item: e.target.value })}
                                                />
                                                <input
                                                    type="number"
                                                    className="w-8 bg-transparent border-none p-0 text-sm focus:ring-0 font-mono"
                                                    value={editValue.quantity || 1}
                                                    onChange={(e) => setEditValue({ ...editValue, quantity: parseInt(e.target.value) })}
                                                />
                                                <button onClick={handleUpdateItem} className="text-[var(--accent-green)] text-[10px] font-bold">✓</button>
                                                <button onClick={() => setEditingItem(null)} className="text-[var(--text-muted)] text-[10px]">✗</button>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm hover:border-[var(--accent-sage)] transition-colors">
                                                {item.item}
                                                {item.quantity > 1 && <span className="opacity-50">x{item.quantity}</span>}
                                                <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-1 scale-90 origin-left transition-all">
                                                    <button
                                                        onClick={() => {
                                                            setEditingItem({ category: 'fridge', name: item.item, original: item });
                                                            setEditValue({ ...item });
                                                        }}
                                                        className="hover:scale-120"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem('fridge', item)}
                                                        className="hover:scale-120"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </span>
                                        )}
                                    </div>
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
                                    <div key={idx} className="group relative">
                                        {editingItem?.category === 'pantry' && editingItem.name === item.item ? (
                                            <div className="flex gap-1 items-center bg-white border border-[var(--accent-sage)] rounded px-1 py-0.5 shadow-sm">
                                                <input
                                                    className="w-24 bg-transparent border-none p-0 text-sm focus:ring-0"
                                                    value={editValue.item || ''}
                                                    onChange={(e) => setEditValue({ ...editValue, item: e.target.value })}
                                                />
                                                <input
                                                    type="number"
                                                    className="w-8 bg-transparent border-none p-0 text-sm focus:ring-0 font-mono"
                                                    value={editValue.quantity || 1}
                                                    onChange={(e) => setEditValue({ ...editValue, quantity: parseInt(e.target.value) })}
                                                />
                                                <button onClick={handleUpdateItem} className="text-[var(--accent-green)] text-[10px] font-bold">✓</button>
                                                <button onClick={() => setEditingItem(null)} className="text-[var(--text-muted)] text-[10px]">✗</button>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm hover:border-[var(--accent-sage)] transition-colors">
                                                {item.item}
                                                {item.quantity > 1 && <span className="opacity-50">x{item.quantity}</span>}
                                                <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-1 scale-90 origin-left transition-all">
                                                    <button
                                                        onClick={() => {
                                                            setEditingItem({ category: 'pantry', name: item.item, original: item });
                                                            setEditValue({ ...item });
                                                        }}
                                                        className="hover:scale-120"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem('pantry', item)}
                                                        className="hover:scale-120"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </span>
                                        )}
                                    </div>
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
