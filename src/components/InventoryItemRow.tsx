import React, { useState } from 'react';

interface InventoryItemRowProps {
    item: any;
    category: string;
    onUpdate: (category: string, item: string, updates: any) => Promise<void>;
    onDelete: (category: string, item: any) => Promise<void>;
    onMove: (item: string, fromCategory: string, toCategory: string) => Promise<void>;
    disabled?: boolean;
}

export default function InventoryItemRow({ item, category, onUpdate, onDelete, onMove, disabled }: InventoryItemRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState<any>({});
    const [showMoveMenu, setShowMoveMenu] = useState(false);

    const itemName = category === 'meals' ? item.meal : item.item;
    const quantity = category === 'meals' ? (item.servings || 4) : (item.quantity || 1);
    const unit = category === 'meals' ? 'p' : (item.unit || 'count');

    // Date display
    const dateStr = category === 'meals' ? item.frozen_date : (category === 'fridge' ? item.added : null);

    const handleStartEdit = () => {
        setEditValue({ ...item });
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        // Determine what changed
        const updates: any = {};
        if (category === 'meals') {
            if (editValue.meal !== item.meal) {
                // Renaming is tricky because ID changes. 
                // For now, let's assume we use delete+add logic or backend handles rename if we passed old name.
                // Current backend update uses item name to find. So renaming isn't supported securely via update.
                // Let's just update servings/dates.
            }
            updates.servings = parseInt(editValue.servings);
        } else {
            updates.quantity = parseInt(editValue.quantity);
            if (editValue.unit) updates.unit = editValue.unit;
        }

        // Pass the ORIGINAL name so backend can find it
        onUpdate(category, itemName, updates);
        setIsEditing(false);
    };

    const handleQuickAdjust = (delta: number) => {
        const newQty = Math.max(0, quantity + delta);
        if (newQty === 0) {
            if (confirm(`Remove ${itemName} from inventory?`)) {
                onDelete(category, item);
            }
            return;
        }

        const updates = category === 'meals' ? { servings: newQty } : { quantity: newQty };
        onUpdate(category, itemName, updates);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] -mx-2 px-2 rounded">
                <span className="flex-1 font-medium">{itemName}</span>
                <input
                    type="number"
                    className="w-16 p-1 border border-[var(--border-subtle)] rounded text-sm text-center"
                    value={category === 'meals' ? editValue.servings : editValue.quantity}
                    onChange={(e) => setEditValue({ ...editValue, [category === 'meals' ? 'servings' : 'quantity']: e.target.value })}
                />
                <button onClick={handleSaveEdit} className="text-xs font-bold text-[var(--accent-green)] uppercase px-2">Save</button>
                <button onClick={() => setIsEditing(false)} className="text-xs text-[var(--text-muted)] uppercase px-2">Cancel</button>
            </div>
        );
    }

    return (
        <div className="group flex items-center justify-between py-2 border-b border-[var(--border-subtle)] hover:bg-gray-50 transition-colors -mx-2 px-2 rounded">
            {/* Left: Item Info */}
            <div className="flex flex-col flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${category === 'fridge' ? 'text-[var(--text-primary)]' : 'text-gray-700'}`}>
                        {itemName}
                    </span>
                    {dateStr && (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                            {dateStr}
                        </span>
                    )}
                </div>
                <div className="flex gap-2 text-[10px] text-[var(--text-muted)] md:hidden">
                    {/* Mobile-only info line if needed */}
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">

                {/* Quantity Controls */}
                <div className="flex items-center bg-white border border-[var(--border-subtle)] rounded-lg shadow-sm">
                    <button
                        onClick={() => handleQuickAdjust(-1)}
                        disabled={disabled}
                        className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-l-lg transition-colors"
                    >
                        -
                    </button>
                    <span className="w-8 text-center text-xs font-mono font-bold">
                        {quantity}{unit !== 'count' && unit !== 'p' ? unit[0] : ''}
                    </span>
                    <button
                        onClick={() => handleQuickAdjust(1)}
                        disabled={disabled}
                        className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-green-500 hover:bg-green-50 rounded-r-lg transition-colors border-l border-gray-100"
                    >
                        +
                    </button>
                </div>

                {/* Move Action */}
                <div className="relative">
                    <button
                        onClick={() => setShowMoveMenu(!showMoveMenu)}
                        disabled={disabled}
                        className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-sage)] rounded hover:bg-[var(--bg-secondary)] transition-colors"
                        title="Move to..."
                    >
                        ➔
                    </button>

                    {showMoveMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMoveMenu(false)}></div>
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-[var(--border-subtle)] shadow-xl rounded z-20 overflow-hidden flex flex-col">
                                {['fridge', 'pantry', 'meals', 'frozen_ingredient'].filter(c => c !== category).map(target => (
                                    <button
                                        key={target}
                                        className="text-left px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] capitalize"
                                        onClick={() => {
                                            onMove(itemName, category, target);
                                            setShowMoveMenu(false);
                                        }}
                                    >
                                        To {target.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Delete Action */}
                <button
                    onClick={() => onDelete(category, item)}
                    disabled={disabled}
                    className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                    title="Delete"
                >
                    <span className="sr-only">Delete</span>
                    ✕
                </button>
            </div>
        </div>
    );
}
