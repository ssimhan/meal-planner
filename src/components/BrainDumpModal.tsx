import React, { useState } from 'react';

interface BrainDumpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBulkAdd: (items: any[]) => Promise<void>;
    loading?: boolean;
}

export default function BrainDumpModal({ isOpen, onClose, onBulkAdd, loading }: BrainDumpModalProps) {
    const [input, setInput] = useState('');
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [view, setView] = useState<'input' | 'review'>('input');

    if (!isOpen) return null;

    const handleParse = () => {
        if (!input.trim()) return;

        // Simple heuristic parsing
        const lines = input.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
        const newItems = lines.map(line => {
            // "3 bell peppers" -> qty:3, item:"bell peppers"
            const match = line.match(/^(\d+)\s+(.*)$/);
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
        setView('review');
    };

    const handleConfirm = () => {
        onBulkAdd(parsedItems);
        setInput('');
        setParsedItems([]);
        setView('input');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <header className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        🧠 Inventory Brain Dump
                    </h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">✕</button>
                </header>

                <div className="p-6 overflow-y-auto flex-1">
                    {view === 'input' ? (
                        <>
                            <p className="text-sm text-[var(--text-muted)] mb-4">
                                Paste your grocery list or type items quickly. Each line will be parsed.
                            </p>
                            <textarea
                                className="w-full h-64 p-4 border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-md font-mono text-sm focus:ring-2 focus:ring-[var(--accent-sage)] focus:border-transparent text-[var(--text-main)]"
                                placeholder={"3 avocados\n1 bag spinach\nmilk\neggs\nfrozen pizza"}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                autoFocus
                            />
                        </>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-[var(--text-muted)]">Review items before adding to inventory:</p>
                            <div className="border border-[var(--border-subtle)] rounded-md overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)] font-medium">
                                        <tr>
                                            <th className="p-3">Item</th>
                                            <th className="p-3 w-20">Qty</th>
                                            <th className="p-3 w-32">Category</th>
                                            <th className="p-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-subtle)]">
                                        {parsedItems.map((item, idx) => (
                                            <tr key={idx} className="group hover:bg-[var(--bg-secondary)]">
                                                <td className="p-2">
                                                    <input
                                                        className="w-full bg-transparent border-none p-1 focus:ring-1 rounded"
                                                        value={item.item}
                                                        onChange={(e) => {
                                                            const n = [...parsedItems];
                                                            n[idx].item = e.target.value;
                                                            setParsedItems(n);
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent border-none p-1 focus:ring-1 rounded text-center"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const n = [...parsedItems];
                                                            n[idx].quantity = parseInt(e.target.value);
                                                            setParsedItems(n);
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <select
                                                        className="w-full bg-transparent border-none p-1 focus:ring-1 rounded text-xs"
                                                        value={item.category}
                                                        onChange={(e) => {
                                                            const n = [...parsedItems];
                                                            n[idx].category = e.target.value;
                                                            setParsedItems(n);
                                                        }}
                                                    >
                                                        <option value="fridge">Fridge</option>
                                                        <option value="pantry">Pantry</option>
                                                        <option value="meals">Freezer (Meal)</option>
                                                        <option value="frozen_ingredient">Freezer (Ingr)</option>
                                                    </select>
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button onClick={() => setParsedItems(parsedItems.filter((_, i) => i !== idx))} className="text-[var(--text-muted)] hover:text-red-500">✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex justify-end gap-3">
                    {view === 'input' ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)]">Cancel</button>
                            <button
                                onClick={handleParse}
                                disabled={!input.trim()}
                                className="btn-primary"
                            >
                                Parse List →
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setView('input')} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)]">Back</button>
                            <button
                                onClick={handleConfirm}
                                disabled={loading || parsedItems.length === 0}
                                className="btn-primary"
                            >
                                {loading ? 'Adding...' : `Add ${parsedItems.length} Items`}
                            </button>
                        </>
                    )}
                </footer>
            </div>
        </div>
    );
}
