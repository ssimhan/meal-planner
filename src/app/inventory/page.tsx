'use client';

import { useState, useEffect, useMemo } from 'react';
import { getInventory, addItemToInventory, bulkAddItemsToInventory, deleteItemFromInventory, updateInventoryItem, moveInventoryItem } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
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
    const [activeTab, setActiveTab] = useState<'fridge' | 'pantry' | 'frozen_ingredient'>('fridge');

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

    if (loading) return (
        <AppLayout>
            <div className="font-mono animate-pulse">LOADING INVENTORY...</div>
        </AppLayout>
    );

    return (
        <AppLayout>
            <div className="container mx-auto max-w-4xl pb-32">
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
                    <div className="space-y-8">
                        {/* High Priority: Leftovers & Freezer Meals */}
                        <div className="grid gap-8 md:grid-cols-2">
                            {/* Leftovers (Filtered from Fridge) */}
                            <section className="card border-[var(--accent-sage)] bg-green-50/30">
                                <header className="flex justify-between items-center mb-4">
                                    <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--accent-sage)] font-bold">Leftovers</h2>
                                    <span className="text-xs bg-white border border-[var(--accent-sage)] text-[var(--accent-sage)] px-2 py-0.5 rounded-full">
                                        {inventory?.fridge?.filter((i: any) => i.item.toLowerCase().includes('leftover')).length || 0}
                                    </span>
                                </header>
                                <div className="space-y-1">
                                    {inventory?.fridge?.filter((i: any) => i.item.toLowerCase().includes('leftover')).length > 0 ? (
                                        inventory.fridge
                                            .filter((i: any) => i.item.toLowerCase().includes('leftover'))
                                            .map((item: any, idx: number) => (
                                                <InventoryItemRow
                                                    key={`leftover-${idx}`}
                                                    item={item}
                                                    category="fridge"
                                                    onUpdate={handleUpdateItem}
                                                    onDelete={handleDeleteItem}
                                                    onMove={handleMoveItem}
                                                    disabled={updating}
                                                />
                                            ))
                                    ) : <p className="text-sm text-[var(--text-muted)] italic">No leftovers recorded.</p>}
                                </div>
                            </section>

                            {/* Freezer Meals (Backups) */}
                            <section className="card border-[var(--accent-terracotta)] bg-orange-50/30">
                                <header className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🧊</span>
                                        <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--accent-terracotta)] font-bold">Freezer Stash</h2>
                                    </div>
                                    <span className="text-xs bg-white border border-[var(--accent-terracotta)] text-[var(--accent-terracotta)] px-2 py-0.5 rounded-full">
                                        {inventory?.freezer?.backups?.length || 0}
                                    </span>
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
                                    ) : <p className="text-sm text-[var(--text-muted)] italic">No freezer meals.</p>}
                                </div>
                            </section>
                        </div>

                        {/* Tabbed Inventory View */}
                        <div className="card">
                            <div className="flex border-b border-[var(--border-subtle)] mb-6">
                                {/* Tabs Header */}
                                {['fridge', 'pantry', 'frozen_ingredient'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab as any)}
                                        className={`px-6 py-3 text-sm font-mono uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab
                                            ? 'border-[var(--accent-sage)] text-[var(--accent-sage)] font-bold'
                                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                            }`}
                                    >
                                        {tab.replace('_', ' ')}
                                        <span className="ml-2 text-xs opacity-50">
                                            {tab === 'fridge' ? (inventory?.fridge?.length || 0) :
                                                tab === 'pantry' ? (inventory?.pantry?.length || 0) :
                                                    (inventory?.freezer?.ingredients?.length || 0)}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="space-y-8 min-h-[300px]">
                                {(() => {
                                    const currentItems = activeTab === 'fridge' ? inventory?.fridge :
                                        activeTab === 'pantry' ? inventory?.pantry :
                                            inventory?.freezer?.ingredients;

                                    if (!currentItems?.length) {
                                        return <p className="text-sm text-[var(--text-muted)] italic">No items found.</p>;
                                    }

                                    // Group items
                                    const grouped = (currentItems as any[]).reduce((acc, item) => {
                                        const cat = classifyItem(item.item, activeTab);
                                        if (!acc[cat]) acc[cat] = [];
                                        acc[cat].push(item);
                                        return acc;
                                    }, {} as Record<string, any[]>);

                                    // Sort categories (put 'General' last)
                                    const categories = Object.keys(grouped).sort((a, b) => {
                                        if (a === 'General') return 1;
                                        if (b === 'General') return -1;
                                        return a.localeCompare(b);
                                    });

                                    return categories.map(group => (
                                        <div key={group}>
                                            <h3 className="text-xs font-bold text-[var(--accent-sage)] uppercase tracking-wider mb-2 border-b border-[var(--border-subtle)] pb-1">
                                                {group}
                                            </h3>
                                            <div className="space-y-1">
                                                {grouped[group].map((item: any, idx: number) => (
                                                    <InventoryItemRow
                                                        key={`${activeTab}-${idx}`}
                                                        item={item}
                                                        category={activeTab}
                                                        onUpdate={handleUpdateItem}
                                                        onDelete={handleDeleteItem}
                                                        onMove={handleMoveItem}
                                                        disabled={updating}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
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

            </div>
        </AppLayout>
    );
}

function classifyItem(itemName: string, categoryType: 'fridge' | 'pantry' | 'frozen_ingredient'): string {
    const item = itemName.toLowerCase();

    if (categoryType === 'fridge') {
        const produce = [
            'apple', 'banana', 'carrot', 'lettuce', 'onion', 'garlic', 'lemon', 'lime', 'tomato', 'potato',
            'spinach', 'cilantro', 'ginger', 'cucumber', 'pepper', 'squash', 'fruit', 'veg', 'herb', 'avocado',
            'berry', 'berries', 'grape', 'mushroom', 'broccoli', 'cauliflower', 'cabbage', 'celery', 'kale', 'chard'
        ];
        if (produce.some(k => item.includes(k))) return 'Produce';

        const dairy = ['milk', 'cheese', 'yogurt', 'butter', 'egg', 'cream', 'paneer', 'sour cream', 'ghee'];
        if (dairy.some(k => item.includes(k))) return 'Dairy & Eggs';

        const meat = ['chicken', 'beef', 'pork', 'fish', 'tofu', 'tempeh', 'shrimp', 'meat', 'sausage', 'bacon', 'ham'];
        if (meat.some(k => item.includes(k))) return 'Meat & Protein';

        const sauces = ['sauce', 'mayo', 'mustard', 'ketchup', 'dressing', 'salsa', 'hummus', 'dip', 'jam', 'jelly', 'pickle', 'miso', 'paste'];
        if (sauces.some(k => item.includes(k))) return 'Condiments & Sauces';

        const drinks = ['juice', 'drink', 'soda', 'water', 'beer', 'wine'];
        if (drinks.some(k => item.includes(k))) return 'Beverages';

        if (item.includes('leftover')) return 'Leftovers';
    }

    if (categoryType === 'pantry') {
        const grains = ['rice', 'pasta', 'noodle', 'quinoa', 'oat', 'bread', 'flour', 'tortilla', 'couscous', 'barley', 'cereal'];
        if (grains.some(k => item.includes(k))) return 'Grains & Bread';

        const canned = ['can', 'jar', 'tin', 'soup', 'bean', 'chickpea', 'lentil', 'sauce', 'paste', 'broth', 'stock'];
        if (canned.some(k => item.includes(k))) return 'Canned & Jars';

        const baking = ['sugar', 'salt', 'pepper', 'spice', 'powder', 'extract', 'cocoa', 'chocolate', 'chip', 'nut', 'yeast', 'soda', 'oil', 'vinegar', 'honey', 'syrup'];
        if (baking.some(k => item.includes(k))) return 'Baking & Spices';

        const snacks = ['chip', 'cracker', 'cookie', 'bar', 'snack', 'popcorn', 'pretzel', 'nut', 'dried'];
        if (snacks.some(k => item.includes(k))) return 'Snacks';
    }

    if (categoryType === 'frozen_ingredient') {
        if (item.includes('veg') || item.includes('pea') || item.includes('corn') || item.includes('spinach') || item.includes('broccoli')) return 'Vegetables';
        if (item.includes('berry') || item.includes('fruit')) return 'Fruit';
        if (item.includes('chicken') || item.includes('beef') || item.includes('pork') || item.includes('shrimp') || item.includes('fish')) return 'Meat';
        if (item.includes('bread') || item.includes('tortilla') || item.includes('waffle')) return 'Breads';
    }

    return 'General';
}
