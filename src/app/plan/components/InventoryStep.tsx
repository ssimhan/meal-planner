import React from 'react';
import ReplacementModal from '@/components/ReplacementModal';
import { InventoryState } from '@/types';
import { WizardProgress } from './WizardProgress';
import { toTitleCase } from '@/lib/utils';

interface InventoryStepProps {
    step: 'inventory';
    planningWeek: string | null;
    submitting: boolean;
    setStep: (step: any) => void;
    handleSaveInventory: () => void;
    newItemInputs: Record<string, { name: string, qty: number, type?: 'meal' | 'ingredient' }>;
    setNewItemInputs: React.Dispatch<React.SetStateAction<Record<string, { name: string, qty: number, type?: 'meal' | 'ingredient' }>>>;
    handleAddItem: (category: string, subType?: 'meal' | 'ingredient') => void;
    handleRemoveItem: (category: string, item: string, type?: 'meal' | 'ingredient') => void;
    handleUpdateQuantity: (category: string, item: string, delta: number, type?: 'meal' | 'ingredient') => void;
    getDisplayList: (mode: string) => any[];
    pendingChanges: any[];
    isReplacing: { day: string, slot: string, currentMeal: string } | null;
    setIsReplacing: (val: any) => void;
    handleReplacementConfirm: (newMeal: string, req: boolean, status: any) => void;
    recipes: { id: string, name: string }[];
    inventory: InventoryState | null;

}

export const InventoryStep: React.FC<InventoryStepProps> = ({
    step,
    planningWeek,
    submitting,
    setStep,
    handleSaveInventory,
    newItemInputs,
    setNewItemInputs,
    handleAddItem,
    handleRemoveItem,
    handleUpdateQuantity,
    getDisplayList,
    pendingChanges,
    isReplacing,
    setIsReplacing,
    handleReplacementConfirm,
    recipes,
    inventory,

}) => {
    return (
        <main className="container mx-auto max-w-5xl px-4 py-12">
            <WizardProgress currentStep={step} />

            <header className="mb-8">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-3xl font-bold">Update Inventory</h1>
                        <p className="text-[var(--text-muted)] mt-1">Planning for week of: <strong>{planningWeek}</strong></p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <button onClick={handleSaveInventory} disabled={submitting} className="btn-premium px-8 py-4 shadow-xl flex items-center gap-2 text-sm">
                            {submitting ? '...' : 'Next: Plan Week →'}
                        </button>
                        <button onClick={() => setStep('review_snacks')} className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-sage)] transition-colors">
                            ← Back to Snacks
                        </button>
                    </div>
                </div>
            </header>

            <div className="space-y-12">
                {/* MEALS SECTION: The "Ready-to-Eat" unified view */}
                <section className="card p-8 border-2 border-[var(--accent-sage)] bg-[var(--bg-primary)] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🍱</div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <span className="p-2 bg-[var(--accent-sage)] bg-opacity-20 rounded-lg">🍱</span>
                        Ready-to-Eat / Leftovers
                    </h2>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Fridge Leftovers */}
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--accent-sage)] mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[var(--accent-sage)]"></span>
                                In the Fridge
                            </h3>

                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    placeholder="Add fridge leftover..."
                                    value={newItemInputs['fridge']?.type === 'meal' ? newItemInputs['fridge']?.name : ''}
                                    onChange={e => setNewItemInputs(prev => ({ ...prev, 'fridge': { ...prev['fridge'], name: e.target.value, type: 'meal' } }))}
                                    onKeyDown={e => e.key === 'Enter' && handleAddItem('fridge', 'meal')}
                                    className="flex-1 p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent-sage)]"
                                />
                                <div className="flex flex-col">
                                    <input
                                        type="number"
                                        placeholder="#"
                                        min="1"
                                        className="w-14 p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-sm font-bold text-center"
                                        value={newItemInputs['fridge']?.type === 'meal' ? (newItemInputs['fridge']?.qty || 1) : 1}
                                        onChange={e => setNewItemInputs(prev => ({ ...prev, 'fridge': { ...prev['fridge'], qty: parseInt(e.target.value) || 1, type: 'meal' } }))}
                                    />
                                </div>
                                <button onClick={() => handleAddItem('fridge', 'meal')} className="bg-[var(--accent-sage)] text-white p-3 rounded-xl hover:opacity-90 transition-all font-bold shadow-sm">+</button>
                            </div>

                            <ul className="space-y-3">
                                {getDisplayList('meals').filter(i => i.location !== 'freezer').map((item: any, idx: number) => {
                                    const name = typeof item === 'string' ? item : item.item;
                                    const qty = typeof item === 'object' ? item.quantity : 1;
                                    const isNew = item.is_new || pendingChanges.some(c => c.category === 'fridge' && c.item === name && c.operation === 'add');
                                    return (
                                        <li key={`fridge-meal-${name}-${idx}`} className={`flex justify-between items-center text-sm p-3 rounded-xl transition-all ${isNew ? 'bg-green-50 border-l-4 border-[var(--accent-sage)] shadow-sm animate-in slide-in-from-left-2' : 'bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)]/60'}`}>
                                            <span className="font-medium flex-1">{name}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center bg-white/50 rounded-lg p-1 border border-[var(--border-subtle)]">
                                                    <button onClick={() => handleUpdateQuantity('fridge', name, -1, 'meal')} className="w-6 h-6 flex items-center justify-center text-[var(--accent-terracotta)] hover:bg-black/5 rounded">-</button>
                                                    <span className="w-8 text-center text-xs font-bold">{qty}</span>
                                                    <button onClick={() => handleUpdateQuantity('fridge', name, 1, 'meal')} className="w-6 h-6 flex items-center justify-center text-[var(--accent-sage)] hover:bg-black/5 rounded">+</button>
                                                </div>
                                                <button onClick={() => handleRemoveItem('fridge', name, 'meal')} className="text-[var(--text-muted)] hover:text-[var(--accent-terracotta)] p-1">×</button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Freezer Backups */}
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                In the Freezer
                            </h3>

                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    placeholder="Add freezer meal..."
                                    value={newItemInputs['meals']?.name || ''}
                                    onChange={e => setNewItemInputs(prev => ({ ...prev, 'meals': { ...prev['meals'], name: e.target.value, type: 'meal' } }))}
                                    onKeyDown={e => e.key === 'Enter' && handleAddItem('meals', 'meal')}
                                    className="flex-1 p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex flex-col">
                                    <input
                                        type="number"
                                        placeholder="#"
                                        min="1"
                                        className="w-14 p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-sm font-bold text-center"
                                        value={newItemInputs['meals']?.qty || 4}
                                        onChange={e => setNewItemInputs(prev => ({ ...prev, 'meals': { ...prev['meals'], qty: parseInt(e.target.value) || 1 } }))}
                                    />
                                </div>
                                <button onClick={() => handleAddItem('meals', 'meal')} className="bg-blue-500 text-white p-3 rounded-xl hover:opacity-90 transition-all font-bold shadow-sm">+</button>
                            </div>

                            <ul className="space-y-3">
                                {getDisplayList('meals').filter(i => i.location === 'freezer').map((item: any, idx: number) => {
                                    const name = typeof item === 'string' ? item : item.item;
                                    const qty = typeof item === 'object' ? item.quantity : 1;
                                    const isNew = item.is_new || pendingChanges.some(c => c.category === 'meals' && c.item === name && c.operation === 'add');
                                    return (
                                        <li key={`freezer-meal-${name}-${idx}`} className={`flex justify-between items-center text-sm p-3 rounded-xl transition-all ${isNew ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm animate-in slide-in-from-left-2' : 'bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)]/60'}`}>
                                            <span className="font-medium flex-1">{name}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center bg-white/50 rounded-lg p-1 border border-[var(--border-subtle)]">
                                                    <button onClick={() => handleUpdateQuantity('meals', name, -1, 'meal')} className="w-6 h-6 flex items-center justify-center text-[var(--accent-terracotta)] hover:bg-black/5 rounded">-</button>
                                                    <span className="w-8 text-center text-xs font-bold">{qty}</span>
                                                    <button onClick={() => handleUpdateQuantity('meals', name, 1, 'meal')} className="w-6 h-6 flex items-center justify-center text-blue-500 hover:bg-black/5 rounded">+</button>
                                                </div>
                                                <button onClick={() => handleRemoveItem('meals', name, 'meal')} className="text-[var(--text-muted)] hover:text-[var(--accent-terracotta)] p-1">×</button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* INGREDIENTS SECTION: Split by Storage */}
                <section className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 px-2">
                        <span className="p-2 bg-[var(--accent-gold)] bg-opacity-20 rounded-lg">🥑</span>
                        Ingredients & Produce
                    </h2>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Fridge Ingredients */}
                        <div className="card border-t-4 border-[var(--accent-gold)]">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-gold)] mb-4 pb-2 border-b border-[var(--border-subtle)] flex justify-between">
                                Fridge
                                <span className="opacity-50 font-normal">{getDisplayList('fridge').length} items</span>
                            </h4>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="Add to fridge..."
                                    value={newItemInputs['fridge']?.type === 'ingredient' ? newItemInputs['fridge']?.name : ''}
                                    onChange={e => setNewItemInputs(prev => ({ ...prev, 'fridge': { ...prev['fridge'], name: e.target.value, type: 'ingredient' } }))}
                                    onKeyDown={e => e.key === 'Enter' && handleAddItem('fridge', 'ingredient')}
                                    className="flex-1 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs"
                                />
                                <button onClick={() => handleAddItem('fridge', 'ingredient')} className="bg-[var(--accent-gold)] text-white px-3 py-1 rounded shadow-sm hover:opacity-90">+</button>
                            </div>
                            <ul className="space-y-1">
                                {getDisplayList('fridge').map((item: any, idx: number) => {
                                    const name = typeof item === 'string' ? item : item.item;
                                    const qty = typeof item === 'object' ? item.quantity : 1;
                                    const isNew = item.is_new || pendingChanges.some(c => c.category === 'fridge' && c.item === name && c.operation === 'add');
                                    return (
                                        <li key={`f-ing-${name}-${idx}`} className={`flex justify-between items-center text-xs p-2 rounded transition-all ${isNew ? 'bg-yellow-50 border-l border-[var(--accent-gold)]' : 'hover:bg-[var(--bg-secondary)]/30'}`}>
                                            <span className="truncate flex-1">{name}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center bg-white/80 rounded border border-[var(--border-subtle)] px-1">
                                                    <button onClick={() => handleUpdateQuantity('fridge', name, -1)} className="text-[var(--accent-terracotta)] px-1 hover:bg-black/5">-</button>
                                                    <span className="w-5 text-center font-bold opacity-70">{qty}</span>
                                                    <button onClick={() => handleUpdateQuantity('fridge', name, 1)} className="text-[var(--accent-gold)] px-1 hover:bg-black/5">+</button>
                                                </div>
                                                <button onClick={() => handleRemoveItem('fridge', name)} className="text-[var(--text-muted)] hover:text-[var(--accent-terracotta)]">×</button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Freezer Ingredients */}
                        <div className="card border-t-4 border-blue-400">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4 pb-2 border-b border-[var(--border-subtle)] flex justify-between">
                                Freezer
                                <span className="opacity-50 font-normal">{getDisplayList('frozen_ingredient').length} items</span>
                            </h4>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="Add to freezer..."
                                    value={newItemInputs['frozen_ingredient']?.name || ''}
                                    onChange={e => setNewItemInputs(prev => ({ ...prev, 'frozen_ingredient': { ...prev['frozen_ingredient'], name: e.target.value, type: 'ingredient' } }))}
                                    onKeyDown={e => e.key === 'Enter' && handleAddItem('frozen_ingredient', 'ingredient')}
                                    className="flex-1 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs"
                                />
                                <button onClick={() => handleAddItem('frozen_ingredient', 'ingredient')} className="bg-blue-400 text-white px-3 py-1 rounded shadow-sm hover:opacity-90">+</button>
                            </div>
                            <ul className="space-y-1">
                                {getDisplayList('frozen_ingredient').map((item: any, idx: number) => {
                                    const name = typeof item === 'string' ? item : item.item;
                                    const qty = typeof item === 'object' ? item.quantity : 1;
                                    const isNew = item.is_new || pendingChanges.some(c => c.category === 'frozen_ingredient' && c.item === name && c.operation === 'add');
                                    return (
                                        <li key={`fz-ing-${name}-${idx}`} className={`flex justify-between items-center text-xs p-2 rounded transition-all ${isNew ? 'bg-blue-50 border-l border-blue-300' : 'hover:bg-[var(--bg-secondary)]/30'}`}>
                                            <span className="truncate flex-1">{name}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center bg-white/80 rounded border border-[var(--border-subtle)] px-1">
                                                    <button onClick={() => handleUpdateQuantity('frozen_ingredient', name, -1)} className="text-[var(--accent-terracotta)] px-1 hover:bg-black/5">-</button>
                                                    <span className="w-5 text-center font-bold opacity-70">{qty}</span>
                                                    <button onClick={() => handleUpdateQuantity('frozen_ingredient', name, 1)} className="text-blue-500 px-1 hover:bg-black/5">+</button>
                                                </div>
                                                <button onClick={() => handleRemoveItem('frozen_ingredient', name)} className="text-[var(--text-muted)] hover:text-[var(--accent-terracotta)]">×</button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Pantry (Merged with Spices) */}
                        <div className="card border-t-4 border-[var(--accent-sage)]">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-sage)] mb-4 pb-2 border-b border-[var(--border-subtle)] flex justify-between">
                                Pantry & Spices
                                <span className="opacity-50 font-normal">{getDisplayList('pantry').length} items</span>
                            </h4>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="Add to pantry..."
                                    value={newItemInputs['pantry']?.name || ''}
                                    onChange={e => setNewItemInputs(prev => ({ ...prev, 'pantry': { ...prev['pantry'], name: e.target.value } }))}
                                    onKeyDown={e => e.key === 'Enter' && handleAddItem('pantry')}
                                    className="flex-1 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs"
                                />
                                <button onClick={() => handleAddItem('pantry')} className="bg-[var(--accent-sage)] text-white px-3 py-1 rounded shadow-sm hover:opacity-90">+</button>
                            </div>
                            <ul className="space-y-1">
                                {getDisplayList('pantry').map((item: any, idx: number) => {
                                    const name = typeof item === 'string' ? item : item.item;
                                    const qty = typeof item === 'object' ? item.quantity : 1;
                                    const isNew = item.is_new || pendingChanges.some(c => c.category === 'pantry' && c.item === name && c.operation === 'add');
                                    return (
                                        <li key={`p-${name}-${idx}`} className={`flex justify-between items-center text-xs p-2 rounded transition-all ${isNew ? 'bg-green-50 border-l border-[var(--accent-sage)]' : 'hover:bg-[var(--bg-secondary)]/30'}`}>
                                            <span className="truncate flex-1">{name}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center bg-white/80 rounded border border-[var(--border-subtle)] px-1">
                                                    <button onClick={() => handleUpdateQuantity('pantry', name, -1)} className="text-[var(--accent-terracotta)] px-1 hover:bg-black/5">-</button>
                                                    <span className="w-5 text-center font-bold opacity-70">{qty}</span>
                                                    <button onClick={() => handleUpdateQuantity('pantry', name, 1)} className="text-[var(--accent-sage)] px-1 hover:bg-black/5">+</button>
                                                </div>
                                                <button onClick={() => handleRemoveItem('pantry', name)} className="text-[var(--text-muted)] hover:text-[var(--accent-terracotta)]">×</button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </section>
            </div>
            {isReplacing && (
                <ReplacementModal
                    day={isReplacing.day}
                    currentMeal={isReplacing.currentMeal}
                    recipes={recipes}
                    leftoverInventory={inventory?.meals || []}
                    onConfirm={(newMeal, req, status) => handleReplacementConfirm(newMeal, req || false, status)}
                    onCancel={() => setIsReplacing(null)}
                />
            )}
        </main>
    );
};
