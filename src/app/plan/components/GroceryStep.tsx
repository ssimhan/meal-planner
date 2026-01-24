import React, { useState } from 'react';
import { useWizardContext } from '../context/WizardContext';
import Skeleton from '@/components/Skeleton';
import { WizardProgress } from './WizardProgress';
import { toTitleCase } from '@/lib/utils';

export const GroceryStep: React.FC = () => {
    const {
        step,
        planningWeek,
        shoppingList,
        customShoppingItems,
        setCustomShoppingItems,
        purchasedItems,
        setPurchasedItems,
        submitting,
        setSubmitting,
        setStep,
        bulkUpdateInventory,
        finalizePlan,
        showToast,
        router,
        loading
    } = useWizardContext();
    const [newShoppingItem, setNewShoppingItem] = useState('');

    // Normalize shoppingList items to strings for display
    const shoppingListStrings = shoppingList.map(item =>
        typeof item === 'string' ? item : item.item
    );
    const allItems = [...new Set([...shoppingListStrings, ...customShoppingItems])];

    const togglePurchased = (itemName: string) => {
        setPurchasedItems(prev =>
            prev.includes(itemName) ? prev.filter(i => i !== itemName) : [...prev, itemName]
        );
    };

    const handleAddCustomItem = () => {
        if (!newShoppingItem.trim()) return;
        setCustomShoppingItems(prev => [...prev, toTitleCase(newShoppingItem.trim())]);
        setNewShoppingItem('');
    };

    // Group items by store for better display
    const getStore = (itemName: string): string => {
        const found = shoppingList.find(i =>
            (typeof i === 'string' ? i : i.item) === itemName
        );
        return found && typeof found === 'object' ? found.store : 'Other';
    };

    // Group by store
    const itemsByStore: Record<string, string[]> = {};
    allItems.forEach(itemName => {
        const store = getStore(itemName);
        if (!itemsByStore[store]) itemsByStore[store] = [];
        itemsByStore[store].push(itemName);
    });

    return (
        <main className="container mx-auto max-w-3xl px-4 py-12">
            <WizardProgress currentStep={step} />

            <header className="mb-8">
                <div className="flex flex-col items-end gap-3">
                    <button
                        onClick={async () => {
                            setSubmitting(true);
                            try {
                                if (purchasedItems.length > 0) {
                                    const changes = purchasedItems.map(item => ({
                                        category: 'fridge',
                                        item,
                                        operation: 'add' as const
                                    }));
                                    await bulkUpdateInventory(changes);
                                }
                                await finalizePlan(planningWeek!);
                                showToast('Plan finalized and inventory updated!', 'success');
                                router.push('/');
                            } catch (e) {
                                showToast('Failed to finalize plan', 'error');
                            } finally {
                                setSubmitting(false);
                            }
                        }}
                        disabled={submitting}
                        className="btn-premium px-8 py-4 shadow-xl flex items-center gap-2 text-sm"
                    >
                        {submitting ? '...' : 'Finalize Plan 🎉'}
                    </button>
                    <button onClick={() => setStep('draft')} className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-sage)] transition-colors">
                        ← Back to Draft
                    </button>
                </div>
            </header>

            <div className="card mb-8">
                {loading ? (
                    <Skeleton className="h-48 w-full" />
                ) : (
                    <div className="space-y-6">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Add custom item (e.g. Milk, Apples)..."
                                value={newShoppingItem}
                                onChange={(e) => setNewShoppingItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem()}
                                className="flex-1 p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg"
                            />
                            <button onClick={handleAddCustomItem} className="btn-secondary px-6">Add</button>
                        </div>

                        {Object.entries(itemsByStore).length > 0 ? (
                            Object.entries(itemsByStore).map(([store, items]) => (
                                <div key={store}>
                                    <h3 className="text-sm font-bold uppercase text-[var(--accent-sage)] mb-2">{store}</h3>
                                    <ul className="space-y-3">
                                        {items.map((itemName, i) => {
                                            const isPurchased = purchasedItems.includes(itemName);
                                            return (
                                                <li key={i} className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer ${isPurchased ? 'bg-green-50 border-[var(--accent-sage)] opacity-80' : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)]'}`}
                                                    onClick={() => togglePurchased(itemName)}>
                                                    <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${isPurchased ? 'bg-[var(--accent-sage)] border-[var(--accent-sage)]' : 'border-[var(--text-muted)]'}`}>
                                                        {isPurchased && <span className="text-white">✓</span>}
                                                    </div>
                                                    <span className={`text-lg ${isPurchased ? 'line-through text-[var(--text-muted)]' : ''}`}>{itemName}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-8 text-[var(--text-muted)] italic">No items needed! Use the input above to add extras.</p>
                        )}
                    </div>
                )}
            </div>

        </main>
    );
};
