'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    getLastWeekReview,
    submitReview,
    getInventory,
    bulkUpdateInventory,
    getWasteNotSuggestions,
    generateDraft,
    getShoppingList,
    finalizePlan
} from '@/lib/api';
import Skeleton from '@/components/Skeleton';
import { useToast } from '@/context/ToastContext';

type ReviewDay = {
    day: string;
    planned_recipe_id: string | null;
    planned_recipe_name: string | null;
    made: boolean | string | null;
    actual_meal: string | null;
    leftovers: boolean;
    leftovers_note: string;
    review_status: 'made' | 'skipped' | 'leftovers' | null; // For UI state
};

type InventoryState = {
    fridge: string[];
    pantry: string[];
    freezer_backup: any[]; // complex object
    freezer_ingredient: any[];
    spice_rack: string[];
};

export default function PlanningWizard() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);

    // Step State
    const [reviews, setReviews] = useState<ReviewDay[]>([]);
    const [week, setWeek] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<'review' | 'inventory' | 'suggestions' | 'draft' | 'groceries'>('review');

    // Inventory State
    const [inventory, setInventory] = useState<InventoryState | null>(null);
    const [pendingChanges, setPendingChanges] = useState<{ category: string, item: string, operation: 'add' | 'remove' }[]>([]);
    const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

    // Suggestions State
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]); // Store IDs
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // Draft State
    const [draftPlan, setDraftPlan] = useState<any>(null);

    // Shopping List State
    const [shoppingList, setShoppingList] = useState<string[]>([]);
    const [purchasedItems, setPurchasedItems] = useState<string[]>([]);

    useEffect(() => {
        async function load() {
            try {
                const data = await getLastWeekReview();
                if (data.days && data.days.length > 0) {
                    const uiReviews = data.days.map((d: any) => ({
                        ...d,
                        leftovers: false,
                        leftovers_note: d.actual_meal || d.planned_recipe_name,
                        review_status: d.made === true ? 'made' : d.made === false ? 'skipped' : null
                    }));
                    setReviews(uiReviews);
                    setWeek(data.week_of);
                    setStep('review');
                } else {
                    await loadInventory();
                    setStep('inventory');
                }
            } catch (err) {
                console.error(err);
                showToast('Failed to load prior week review status', 'error');
                await loadInventory();
                setStep('inventory');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function loadInventory() {
        try {
            const res = await getInventory();
            if (res && res.inventory) {
                setInventory(res.inventory as any);
            }
        } catch (err) {
            showToast('Failed to load inventory', 'error');
        }
    }

    async function loadSuggestions() {
        try {
            setLoadingSuggestions(true);
            const res = await getWasteNotSuggestions();
            if (res && res.suggestions) {
                setSuggestions(res.suggestions);
            }
        } catch (err) {
            showToast('Failed to load suggestions', 'error');
        } finally {
            setLoadingSuggestions(false);
        }
    }

    async function loadShoppingList() {
        if (!week) return;
        try {
            const res = await getShoppingList(week);
            setShoppingList(res.shopping_list);
            setPurchasedItems([]); // Reset checks
        } catch (err) {
            showToast('Failed to load shopping list', 'error');
        }
    }

    // Handle Step Transitions
    const goToInventory = async () => {
        await loadInventory();
        setStep('inventory');
    };

    const goToSuggestions = async () => {
        await loadSuggestions();
        setStep('suggestions');
    };

    const goToDraft = async () => {
        if (!week) return;
        try {
            setSubmitting(true);
            const selections = selectedSuggestions.map((id, idx) => ({
                day: idx === 0 ? 'mon' : 'tue',
                recipe_id: id
            }));

            const res = await generateDraft(week, selections);
            setDraftPlan(res.plan_data);
            setStep('draft');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const goToGroceries = async () => {
        await loadShoppingList();
        setStep('groceries');
    };

    // Review Handlers
    const handleUpdateReview = (day: string, status: 'made' | 'skipped' | 'leftovers', note?: string) => {
        setReviews(prev => prev.map(r => {
            if (r.day === day) {
                let updates: Partial<ReviewDay> = { review_status: status };
                if (status === 'made') {
                    updates.made = true;
                    updates.leftovers = false;
                } else if (status === 'skipped') {
                    updates.made = false;
                    updates.leftovers = false;
                } else if (status === 'leftovers') {
                    updates.made = true;
                    updates.leftovers = true;
                    if (note) updates.leftovers_note = note;
                }
                return { ...r, ...updates };
            }
            return r;
        }));
    };

    const handleNoteChange = (day: string, note: string) => {
        setReviews(prev => prev.map(r => r.day === day ? { ...r, leftovers_note: note } : r));
    };

    const handleSubmitReview = async () => {
        if (!week) return;
        try {
            setSubmitting(true);
            const payload = reviews.map(r => ({
                day: r.day,
                made: r.review_status === 'skipped' ? false : true,
                actual_meal: r.actual_meal,
                leftovers: r.leftovers,
                leftovers_note: r.leftovers ? r.leftovers_note : undefined
            }));

            await submitReview(week, payload);
            showToast('Review submitted! Updating inventory...', 'success');

            await goToInventory();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Inventory Handlers
    const handleAddItem = (category: string) => {
        const val = newItemInputs[category]?.trim();
        if (!val) return;
        setPendingChanges(prev => [...prev, { category, item: val, operation: 'add' }]);
        setNewItemInputs(prev => ({ ...prev, [category]: '' }));
    };

    const handleRemoveItem = (category: string, item: string) => {
        setPendingChanges(prev => [...prev, { category, item, operation: 'remove' }]);
    };

    const getDisplayList = (category: string) => {
        if (!inventory) return [];
        const baseList = (inventory as any)[category] || [];

        const removed = new Set(pendingChanges.filter(c => c.category === category && c.operation === 'remove').map(c => c.item));
        let currentList = baseList.filter((i: any) => {
            const name = typeof i === 'string' ? i : i.item;
            return !removed.has(name);
        });

        const added = pendingChanges.filter(c => c.category === category && c.operation === 'add').map(c => c.item);
        currentList = [...currentList, ...added];

        return currentList;
    };

    const handleSaveInventory = async () => {
        try {
            setSubmitting(true);
            if (pendingChanges.length > 0) {
                await bulkUpdateInventory(pendingChanges);
                showToast('Inventory updated!', 'success');
            }
            await goToSuggestions();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Suggestions Handlers
    const toggleSuggestion = (recipeId: string) => {
        if (selectedSuggestions.includes(recipeId)) {
            setSelectedSuggestions(prev => prev.filter(id => id !== recipeId));
        } else {
            if (selectedSuggestions.length >= 2) return; // Limit to 2 for Mon/Tue
            setSelectedSuggestions(prev => [...prev, recipeId]);
        }
    };

    const handleConfirmSuggestions = () => {
        goToDraft();
    };

    // Groceries Handlers
    const togglePurchased = (item: string) => {
        if (purchasedItems.includes(item)) {
            setPurchasedItems(prev => prev.filter(i => i !== item));
        } else {
            setPurchasedItems(prev => [...prev, item]);
        }
    };

    const handleConfirmPurchase = async () => {
        if (!week) return;
        try {
            setSubmitting(true);
            if (purchasedItems.length > 0) {
                const changes = purchasedItems.map(item => ({
                    category: 'fridge',
                    item,
                    operation: 'add' as const
                }));
                await bulkUpdateInventory(changes);
            }

            await finalizePlan(week);
            showToast('Plan finalized! Moving to Dashboard.', 'success');
            router.push('/');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <main className="container mx-auto max-w-2xl px-4 py-12">
                <Skeleton className="h-8 w-1/2 mb-8" />
                <Skeleton className="h-64 w-full" />
            </main>
        );
    }

    // STEP 4: SMART GROCERY LIST UI
    if (step === 'groceries') {
        return (
            <main className="container mx-auto max-w-2xl px-4 py-12">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Step 4 of 7</div>
                        <h1 className="text-3xl">Shopping List</h1>
                        <p className="text-[var(--text-muted)] mt-2">Checked items will be added to your inventory.</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setStep('draft')} className="btn-secondary">
                            ← Back
                        </button>
                        <button
                            onClick={handleConfirmPurchase}
                            className="btn-primary"
                            disabled={submitting}
                        >
                            {submitting ? 'Finalizing...' : 'Lock In & Start Week →'}
                        </button>
                    </div>
                </header>

                <div className="card divide-y divide-[var(--border-subtle)]">
                    {shoppingList.map(item => (
                        <div
                            key={item}
                            onClick={() => togglePurchased(item)}
                            className="flex items-center gap-4 py-4 cursor-pointer hover:bg-[var(--bg-secondary)] px-2 rounded transition-colors"
                        >
                            <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${purchasedItems.includes(item) ? 'bg-[var(--accent-green)] border-[var(--accent-green)]' : 'border-[var(--border-subtle)]'}`}>
                                {purchasedItems.includes(item) && <span className="text-black text-xs">✓</span>}
                            </div>
                            <span className={`${purchasedItems.includes(item) ? 'line-through text-[var(--text-muted)]' : ''}`}>
                                {item}
                            </span>
                        </div>
                    ))}
                    {shoppingList.length === 0 && (
                        <div className="py-12 text-center text-[var(--text-muted)] italic">
                            You have everything! Lucky you.
                        </div>
                    )}
                </div>
            </main>
        );
    }

    // STEP 3: TENTATIVE PLAN UI
    if (step === 'draft' && draftPlan) {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

        return (
            <main className="container mx-auto max-w-4xl px-4 py-12">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Step 3 of 7</div>
                        <h1 className="text-3xl">Tentative Plan</h1>
                        <p className="text-[var(--text-muted)] mt-2">Here is a draft for the week. Take a look before we generate the shop list.</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setStep('suggestions')} className="btn-secondary">
                            ← Back
                        </button>
                        <button onClick={goToGroceries} className="btn-primary">
                            Continue to Groceries →
                        </button>
                    </div>
                </header>

                <div className="grid gap-6">
                    {days.map(day => {
                        const dinner = draftPlan.dinners?.find((d: any) => d.day === day);
                        const lunch = draftPlan.lunches?.[day];

                        return (
                            <div key={day} className="card grid md:grid-cols-2 gap-4 hover:shadow-md transition-shadow">
                                <div>
                                    <span className="text-xs font-mono uppercase text-[var(--accent-sage)]">{(dayNames as any)[day]} Dinner</span>
                                    <h3 className="text-xl font-bold">{dinner?.recipe_name || 'No dinner planned'}</h3>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {dinner?.vegetables?.map((v: string) => (
                                            <span key={v} className="text-[10px] bg-[var(--bg-secondary)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                                                {v}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs font-mono uppercase text-[var(--accent-gold)]">Lunch</span>
                                    <h3 className="text-lg">{lunch?.recipe_name || 'No lunch planned'}</h3>
                                    <p className="text-xs text-[var(--text-muted)] italic mt-1">{lunch?.kid_friendly ? '✓ Kids friendly' : 'Adults'}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        );
    }

    // STEP 2: WASTE NOT SUGGESTIONS
    if (step === 'suggestions') {
        return (
            <main className="container mx-auto max-w-4xl px-4 py-12">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Step 2 of 7</div>
                        <h1 className="text-3xl">Let's Use Up Leftovers</h1>
                        <p className="text-[var(--text-muted)] mt-2">Pick ideas for Monday & Tuesday based on your fridge.</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setStep('inventory')} className="btn-secondary">
                            ← Back
                        </button>
                        <button
                            onClick={handleConfirmSuggestions}
                            className="btn-primary"
                            disabled={submitting}
                        >
                            {submitting ? 'Generating...' : 'Continue to Draft →'}
                        </button>
                    </div>
                </header>

                {loadingSuggestions ? (
                    <Skeleton className="h-40 w-full mb-4" />
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {suggestions.map((s, idx) => (
                            <div
                                key={idx}
                                onClick={() => toggleSuggestion(s.recipe.id)}
                                className={`card cursor-pointer transition-all ${selectedSuggestions.includes(s.recipe.id) ? 'ring-2 ring-[var(--accent-sage)] bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold">{s.recipe.name}</h3>
                                    {selectedSuggestions.includes(s.recipe.id) && (
                                        <span className="text-[var(--accent-green)]">✓</span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {s.rationale.map((reason: string, i: number) => (
                                        <span key={i} className="inline-block text-xs bg-[var(--accent-gold)] text-black px-2 py-1 rounded mr-2">
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {suggestions.length === 0 && (
                            <div className="col-span-2 text-center text-[var(--text-muted)] italic py-12">
                                No specific leftover ideas found. We'll suggest fresh meals next!
                            </div>
                        )}
                    </div>
                )}
            </main>
        );
    }

    // STEP 1: INVENTORY UI
    if (step === 'inventory') {
        const categories = [
            { id: 'fridge', label: '🥦 Fridge', placeholder: 'Milk, spinach, eggs...' },
            { id: 'pantry', label: '🥫 Pantry', placeholder: 'Rice, pasta, beans...' },
            { id: 'spice_rack', label: '🧂 Spices', placeholder: 'Cumin, paprika...' },
        ];

        return (
            <main className="container mx-auto max-w-4xl px-4 py-12">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Step 1 of 7</div>
                        <h1 className="text-3xl">Update Inventory</h1>
                        <p className="text-[var(--text-muted)] mt-2">Quickly check off what you have before we plan.</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setStep('review')} className="btn-secondary">
                            ← Back
                        </button>
                        <button onClick={handleSaveInventory} disabled={submitting} className="btn-primary">
                            {submitting ? 'Saving...' : 'Save & Continue →'}
                        </button>
                    </div>
                </header>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map(cat => (
                        <div key={cat.id} className="card">
                            <h3 className="text-xl mb-4 border-b border-[var(--border-subtle)] pb-2">{cat.label}</h3>

                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newItemInputs[cat.id] || ''}
                                    onChange={e => setNewItemInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleAddItem(cat.id)}
                                    placeholder={cat.placeholder}
                                    className="flex-1 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                />
                                <button onClick={() => handleAddItem(cat.id)} className="btn-secondary px-3">+</button>
                            </div>

                            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {getDisplayList(cat.id).map((item, idx) => {
                                    const name = typeof item === 'string' ? item : item.item;
                                    const isNew = pendingChanges.some(c => c.category === cat.id && c.item === name && c.operation === 'add');

                                    return (
                                        <li key={`${name}-${idx}`} className={`flex justify-between items-center text-sm p-2 rounded ${isNew ? 'bg-[var(--bg-secondary)] border-l-2 border-[var(--accent-sage)]' : ''}`}>
                                            <span>{name}</span>
                                            <button
                                                onClick={() => handleRemoveItem(cat.id, name)}
                                                className="text-[var(--text-muted)] hover:text-[var(--accent-terracotta)]"
                                            >
                                                ×
                                            </button>
                                        </li>
                                    );
                                })}
                                {getDisplayList(cat.id).length === 0 && (
                                    <li className="text-[var(--text-muted)] italic text-sm">Empty...</li>
                                )}
                            </ul>
                        </div>
                    ))}
                </div>
            </main>
        );
    }

    // STEP 0: REVIEW UI
    return (
        <main className="container mx-auto max-w-2xl px-4 py-12">
            <header className="mb-8">
                <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    Step 0 of 7
                </div>
                <h1 className="text-3xl">Review Previous Week</h1>
                <p className="text-[var(--text-muted)] mt-2">
                    Confirm what you cooked last week ({week}) to update your history and identify leftovers.
                </p>
            </header>

            <div className="space-y-6 mb-8">
                {reviews.map((day) => (
                    <div key={day.day} className="card flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="font-mono text-xs uppercase text-[var(--accent-sage)]">{day.day}</span>
                                <h3 className="font-medium text-lg">
                                    {day.actual_meal || day.planned_recipe_name || 'No Meal Planned'}
                                </h3>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleUpdateReview(day.day, 'made')}
                                className={`px-3 py-1 rounded-full text-sm border transiton-colors ${day.review_status === 'made' ? 'bg-[var(--accent-green)] text-black border-[var(--accent-green)]' : 'border-[var(--border-subtle)] hover:border-[var(--text-default)]'}`}
                            >
                                ✓ Made
                            </button>
                            <button
                                onClick={() => handleUpdateReview(day.day, 'leftovers')}
                                className={`px-3 py-1 rounded-full text-sm border transiton-colors ${day.review_status === 'leftovers' ? 'bg-[var(--accent-gold)] text-black border-[var(--accent-gold)]' : 'border-[var(--border-subtle)] hover:border-[var(--text-default)]'}`}
                            >
                                ♻️ Leftovers
                            </button>
                            <button
                                onClick={() => handleUpdateReview(day.day, 'skipped')}
                                className={`px-3 py-1 rounded-full text-sm border transiton-colors ${day.review_status === 'skipped' ? 'bg-[var(--accent-terracotta)] text-white border-[var(--accent-terracotta)]' : 'border-[var(--border-subtle)] hover:border-[var(--text-default)]'}`}
                            >
                                ✗ Skipped
                            </button>
                        </div>

                        {day.review_status === 'leftovers' && (
                            <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                                <label className="text-xs text-[var(--text-muted)] block mb-1">What did you put in the fridge?</label>
                                <input
                                    type="text"
                                    value={day.leftovers_note}
                                    onChange={(e) => handleNoteChange(day.day, e.target.value)}
                                    className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                    placeholder="e.g. Leftover Lasagna (2 servings)"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-end sticky bottom-4">
                <button
                    onClick={handleSubmitReview}
                    disabled={submitting}
                    className="btn-primary shadow-lg"
                >
                    {submitting ? 'Updating...' : 'Confirm & Continue →'}
                </button>
            </div>
        </main>
    );
}
