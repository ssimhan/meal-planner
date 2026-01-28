'use client';

import { useState, useEffect } from 'react';
import { getShoppingList, smartAction } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

interface ReviewGroceriesModalProps {
    weekOf: string;
    onClose: () => void;
}

interface GroceryItem {
    item: string;
    store: string;
    status: 'keep' | 'have' | 'skip';
}

export default function ReviewGroceriesModal({ weekOf, onClose }: ReviewGroceriesModalProps) {
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getShoppingList(weekOf);
                const list = data.shopping_list || [];
                setItems(list.map((i: any) => ({ ...i, status: 'keep' })));
            } catch (e) {
                console.error(e);
                showToast('Failed to load shopping list', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [weekOf, showToast]);

    const handleAction = (index: number, action: 'keep' | 'have' | 'skip') => {
        const newItems = [...items];
        newItems[index].status = action;
        setItems(newItems);
    };

    const handleCommit = async () => {
        setProcessing(true);
        let inventoryCount = 0;
        let skipCount = 0;
        let failCount = 0;

        try {
            // Process 'have' and 'skip' items
            const actions = items.filter(i => i.status !== 'keep');

            // Execute in parallel with individual error handling
            await Promise.all(actions.map(async (i) => {
                try {
                    const apiAction = i.status === 'have' ? 'add_to_inventory' : 'exclude_from_plan';
                    await smartAction(weekOf, i.item, apiAction);
                    if (i.status === 'have') {
                        inventoryCount++;
                    } else {
                        skipCount++;
                    }
                } catch (e) {
                    console.error(`Failed to update ${i.item}`, e);
                    failCount++;
                }
            }));

            // Show specific feedback
            if (inventoryCount > 0) {
                showToast(`✅ Added ${inventoryCount} item${inventoryCount > 1 ? 's' : ''} to inventory`, 'success');
            }
            if (skipCount > 0) {
                showToast(`🛒 Removed ${skipCount} item${skipCount > 1 ? 's' : ''} from shopping list`, 'success');
            }
            if (failCount > 0) {
                showToast(`Failed to update ${failCount} items`, 'error');
            }

            onClose();
        } catch (e) {
            console.error(e);
            showToast('System error during update', 'error');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 bg-[var(--accent-sage)]/10 border-b border-[var(--accent-sage)]/20">
                    <h2 className="text-xl font-bold text-gray-800">Review Shopping List</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        These ingredients are missing. Let me know what you already have so I can update your inventory and shopping list.
                    </p>
                    <div className="mt-4 p-3 bg-white/60 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">How to mark items:</p>
                        <div className="flex flex-col gap-1.5 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-20 px-2 py-1 bg-green-100 text-green-700 rounded text-center font-bold">I Have It</div>
                                <span className="text-gray-600">→ Adds to your inventory</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-20 px-2 py-1 bg-gray-100 text-gray-500 rounded text-center font-bold">Don't Need</div>
                                <span className="text-gray-600">→ Removes from shopping list</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-20 px-2 py-1 bg-white border border-gray-300 text-gray-800 rounded text-center font-bold text-[10px]">Unmarked</div>
                                <span className="text-gray-600">→ Stays on shopping list</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-2">
                    {items.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 italic">No new ingredients needed!</p>
                    ) : (
                        items.map((item, idx) => (
                            <div
                                key={idx}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${item.status === 'have' ? 'bg-green-50 border-green-200 opacity-60' :
                                    item.status === 'skip' ? 'bg-gray-50 border-gray-200 opacity-50 grayscale' :
                                        'bg-white border-gray-100 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex-1">
                                    <span className={`font-medium ${item.status !== 'keep' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                        {item.item}
                                    </span>
                                    <span className="text-xs text-gray-400 block">{item.store}</span>
                                </div>

                                <div className="flex gap-2">
                                    {item.status === 'keep' ? (
                                        <>
                                            <button
                                                onClick={() => handleAction(idx, 'have')}
                                                className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                                            >
                                                I Have It
                                            </button>
                                            <button
                                                onClick={() => handleAction(idx, 'skip')}
                                                className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                            >
                                                Don't Need
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleAction(idx, 'keep')}
                                            className="text-xs text-[var(--accent-sage)] underline hover:text-[var(--accent-primary)]"
                                        >
                                            Undo
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={handleCommit}
                        disabled={processing}
                        className="px-6 py-3 bg-[var(--accent-primary)] text-white font-bold rounded-lg shadow hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {processing ? <span className="animate-spin">⟳</span> : null}
                        {processing ? 'Updating...' : 'Confirm List'}
                    </button>
                </div>
            </div>
        </div>
    );
}
