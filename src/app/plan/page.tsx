'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    getLastWeekReview,
    submitReview,
    getInventory,
    bulkUpdateInventory,
    getWasteNotSuggestions,
    generateDraft,
    getShoppingList,
    finalizePlan,
    createWeek
} from '@/lib/api';
import Skeleton from '@/components/Skeleton';
import { useToast } from '@/context/ToastContext';

type ReviewDay = {
    day: string;
    dinner: {
        planned_recipe_id: string | null;
        planned_recipe_name: string | null;
        made: boolean | null;
        actual_meal: string | null;
        leftovers: boolean | null;
        leftovers_note: string;
        instead_meal?: string;
    };
    snacks: {
        school_snack: string | null;
        home_snack: string | null;
        kids_lunch: string | null;
        adult_lunch: string | null;
    };
    planned_snacks: {
        school_snack: string | null;
        home_snack: string | null;
        kids_lunch: string | null;
    };
};

type InventoryState = {
    fridge: string[];
    pantry: string[];
    freezer_backup: any[];
    freezer_ingredient: any[];
    spice_rack: string[];
};

function PlanningWizardContent() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);

    // Step State
    const [reviews, setReviews] = useState<ReviewDay[]>([]);
    const [reviewWeek, setReviewWeek] = useState<string | null>(null);
    const [planningWeek, setPlanningWeek] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<'review' | 'inventory' | 'suggestions' | 'draft' | 'groceries'>('review');
    const [reviewSubStep, setReviewSubStep] = useState<'dinners' | 'snacks'>('dinners');

    // Inventory State
    const [inventory, setInventory] = useState<InventoryState | null>(null);
    const [pendingChanges, setPendingChanges] = useState<{ category: string, item: string, operation: 'add' | 'remove' }[]>([]);
    const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

    // Suggestions State
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // Draft State
    const [draftPlan, setDraftPlan] = useState<any>(null);

    // Shopping List State
    const [shoppingList, setShoppingList] = useState<string[]>([]);
    const [purchasedItems, setPurchasedItems] = useState<string[]>([]);

    // Helpers
    const getNextMonday = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() + (day === 0 ? 1 : 8 - day);
        const nextMonday = new Date(today.setDate(diff));
        return nextMonday.toISOString().split('T')[0];
    };

    const searchParams = useSearchParams();
    const weekParam = searchParams.get('week');

    useEffect(() => {
        async function load() {
            try {
                const targetWeek = weekParam || getNextMonday();
                setPlanningWeek(targetWeek);

                // If week was explicitly chosen from dashboard/dropdown, ensure it exists in DB
                if (weekParam) {
                    try { await createWeek(weekParam); } catch (e) { /* ignore if exists */ }
                }

                const data = await getLastWeekReview();
                if (data.days && data.days.length > 0) {
                    const uiReviews = data.days.map((d: any) => ({
                        day: d.day,
                        dinner: {
                            planned_recipe_id: d.dinner?.planned_recipe_id || null,
                            planned_recipe_name: d.dinner?.planned_recipe_name || null,
                            made: d.dinner?.made ?? null,
                            actual_meal: d.dinner?.actual_meal || null,
                            leftovers: d.dinner?.leftovers ?? null,
                            leftovers_note: d.dinner?.leftovers_note || d.dinner?.actual_meal || d.dinner?.planned_recipe_name || '',
                            instead_meal: d.dinner?.made === false ? (d.dinner?.actual_meal || '') : ''
                        },
                        snacks: d.snacks || { school_snack: null, home_snack: null, kids_lunch: null, adult_lunch: null },
                        planned_snacks: d.planned_snacks || { school_snack: null, home_snack: null, kids_lunch: null }
                    }));
                    setReviews(uiReviews);
                    setReviewWeek(data.week_of);
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
        if (!planningWeek) return;
        try {
            const res = await getShoppingList(planningWeek);
            setShoppingList(res.shopping_list);
            setPurchasedItems([]);
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
        if (!planningWeek) return;
        try {
            setSubmitting(true);
            const selections = selectedSuggestions.map((id, idx) => ({
                day: idx === 0 ? 'mon' : 'tue',
                recipe_id: id
            }));

            const res = await generateDraft(planningWeek, selections);
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
    const handleUpdateDinner = (day: string, field: string, value: any) => {
        setReviews(prev => prev.map(r => {
            if (r.day === day) {
                return {
                    ...r,
                    dinner: {
                        ...r.dinner,
                        [field]: value,
                        // Clear or update dependent fields
                        ...(field === 'made' && value === true ? { instead_meal: '' } : {}),
                        ...(field === 'instead_meal' ? { leftovers_note: value } : {}),
                        ...(field === 'made' && value === true ? { leftovers_note: r.dinner.planned_recipe_name || '' } : {})
                    }
                };
            }
            return r;
        }));
    };

    const handleUpdateSnack = (day: string, key: string, value: string) => {
        setReviews(prev => prev.map(r => r.day === day ? { ...r, snacks: { ...r.snacks, [key]: value } } : r));
    };

    const handleSubmitReview = async () => {
        if (!reviewWeek || !planningWeek) return;
        try {
            setSubmitting(true);
            const payload = reviews.map(r => ({
                day: r.day,
                dinner: {
                    made: r.dinner.made,
                    actual_meal: r.dinner.made === false ? r.dinner.instead_meal : (r.dinner.actual_meal || r.dinner.planned_recipe_name),
                    leftovers: r.dinner.leftovers,
                    leftovers_note: r.dinner.leftovers ? r.dinner.leftovers_note : undefined
                },
                snacks: r.snacks
            }));

            await submitReview(reviewWeek, payload);
            showToast('Review submitted! Initializing new week...', 'success');

            await createWeek(planningWeek);
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
            if (selectedSuggestions.length >= 2) return;
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
        if (!planningWeek) return;
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

            await finalizePlan(planningWeek);
            showToast('Plan finalized! Moving to Dashboard.', 'success');
            router.push(`/?week=${planningWeek}`);
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
                        <p className="text-[var(--text-muted)] mt-1">Planning for week of: <strong>{planningWeek}</strong></p>
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
                    {shoppingList.map((item, idx) => (
                        <div
                            key={`${item}-${idx}`}
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
                        <p className="text-[var(--text-muted)] mt-1">Planning for week of: <strong>{planningWeek}</strong></p>
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
                                        {dinner?.vegetables?.map((v: string, vIdx: number) => (
                                            <span key={`${v}-${vIdx}`} className="text-[10px] bg-[var(--bg-secondary)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                                                {v}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs font-mono uppercase text-[var(--accent-gold)]">Lunch</span>
                                    <h3 className="text-lg">{lunch?.recipe_name || 'No lunch planned'}</h3>
                                    <p className="text-xs text-[var(--text-muted)] italic mt-1">{lunch?.kid_friendly ? '✓ Kids friendly' : 'Adults'}</p>

                                    {(draftPlan as any).snacks?.[day] && (
                                        <div className="mt-4 pt-2 border-t border-[var(--border-subtle)]">
                                            <span className="text-xs font-mono uppercase text-[var(--accent-terracotta)]">Snacks</span>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <p className="text-xs">🏫 {(draftPlan as any).snacks[day].school_snack}</p>
                                                <p className="text-xs">🏠 {(draftPlan as any).snacks[day].home_snack}</p>
                                            </div>
                                        </div>
                                    )}
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
                        <p className="text-[var(--text-muted)] mt-1">Planning for week of: <strong>{planningWeek}</strong></p>
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
                        <p className="text-[var(--text-muted)] mt-1">Planning for week of: <strong>{planningWeek}</strong></p>
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
                                {getDisplayList(cat.id).map((item: any, idx: number) => {
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
    if (step === 'review') {
        const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

        return (
            <main className="container mx-auto max-w-3xl px-4 py-12">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Step 0 of 7</div>
                        <h1 className="text-3xl">Review Previous Week</h1>
                        <p className="text-[var(--text-muted)] mt-2">
                            Let's confirm what happened last week ({reviewWeek}).
                        </p>
                    </div>
                    <div className="flex gap-4">
                        {reviewSubStep === 'snacks' ? (
                            <>
                                <button onClick={() => setReviewSubStep('dinners')} className="btn-secondary">← Back to Dinners</button>
                                <button onClick={handleSubmitReview} disabled={submitting} className="btn-primary">
                                    {submitting ? 'Submitting...' : 'Confirm & Continue →'}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setReviewSubStep('snacks')} className="btn-primary">Next: Review Snacks →</button>
                        )}
                    </div>
                </header>

                {reviewSubStep === 'dinners' && (
                    <div className="space-y-8">
                        {reviews.map((day) => (
                            <div key={day.day} className="card relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-sage)] opacity-50" />
                                <div className="mb-4">
                                    <span className="font-mono text-xs uppercase text-[var(--accent-sage)] tracking-widest">{(dayNames as any)[day.day]}</span>
                                    <h3 className="text-2xl font-bold">{day.dinner.planned_recipe_name || 'No Meal Planned'}</h3>
                                </div>

                                <div className="space-y-6">
                                    {/* Question 1: Did you make it? */}
                                    <div>
                                        <p className="text-lg mb-3">Did you make this?</p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleUpdateDinner(day.day, 'made', true)}
                                                className={`px-6 py-2 rounded-full border transition-all ${day.dinner.made === true ? 'bg-[var(--accent-green)] text-black border-[var(--accent-green)]' : 'border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]'}`}
                                            >
                                                Yes
                                            </button>
                                            <button
                                                onClick={() => handleUpdateDinner(day.day, 'made', false)}
                                                className={`px-6 py-2 rounded-full border transition-all ${day.dinner.made === false ? 'bg-[var(--accent-terracotta)] text-white border-[var(--accent-terracotta)]' : 'border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]'}`}
                                            >
                                                No
                                            </button>
                                        </div>
                                    </div>

                                    {/* Conditional Follow-ups */}
                                    {day.dinner.made === true && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <p className="text-lg mb-3">Are there leftovers?</p>
                                            <div className="flex gap-3 mb-4">
                                                <button
                                                    onClick={() => handleUpdateDinner(day.day, 'leftovers', true)}
                                                    className={`px-6 py-2 rounded-full border transition-all ${day.dinner.leftovers === true ? 'bg-[var(--accent-gold)] text-black border-[var(--accent-gold)]' : 'border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]'}`}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateDinner(day.day, 'leftovers', false)}
                                                    className={`px-6 py-2 rounded-full border transition-all ${day.dinner.leftovers === false ? 'bg-[var(--bg-secondary)] border-[var(--border-subtle)]' : 'border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]'}`}
                                                >
                                                    No
                                                </button>
                                            </div>
                                            {day.dinner.leftovers && (
                                                <div className="animate-in fade-in zoom-in-95">
                                                    <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider block mb-1">Leftover Note</label>
                                                    <input
                                                        type="text"
                                                        value={day.dinner.leftovers_note}
                                                        onChange={(e) => handleUpdateDinner(day.day, 'leftovers_note', e.target.value)}
                                                        className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-lg"
                                                        placeholder="e.g. Leftover Curry"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {day.dinner.made === false && (
                                        <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                                            <div>
                                                <p className="text-lg mb-3">What did you make instead?</p>
                                                <input
                                                    type="text"
                                                    value={day.dinner.instead_meal}
                                                    onChange={(e) => handleUpdateDinner(day.day, 'instead_meal', e.target.value)}
                                                    className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-lg"
                                                    placeholder="e.g. Takeout Pizza"
                                                />
                                            </div>
                                            {day.dinner.instead_meal && (
                                                <div>
                                                    <p className="text-lg mb-3">Were there leftovers for this?</p>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => handleUpdateDinner(day.day, 'leftovers', true)}
                                                            className={`px-6 py-2 rounded-full border transition-all ${day.dinner.leftovers === true ? 'bg-[var(--accent-gold)] text-black border-[var(--accent-gold)]' : 'border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]'}`}
                                                        >
                                                            Yes
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateDinner(day.day, 'leftovers', false)}
                                                            className={`px-6 py-2 rounded-full border transition-all ${day.dinner.leftovers === false ? 'bg-[var(--bg-secondary)] border-[var(--border-subtle)]' : 'border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]'}`}
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {reviewSubStep === 'snacks' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] mb-8">
                            <p className="text-sm text-[var(--accent-sage)] font-mono uppercase tracking-widest">Tip</p>
                            <p className="text-[var(--text-muted)] italic">Review your snacks and lunches. If something was different from the plan, update it here!</p>
                        </div>

                        {reviews.map((day) => (
                            <div key={day.day} className="card">
                                <span className="font-mono text-xs uppercase text-[var(--accent-sage)] tracking-widest">{(dayNames as any)[day.day]}</span>
                                <div className="grid md:grid-cols-2 gap-6 mt-4">
                                    {[
                                        { key: 'school_snack', label: '🍎 School Snack', planned: day.planned_snacks.school_snack },
                                        { key: 'home_snack', label: '🥨 Home Snack', planned: day.planned_snacks.home_snack },
                                        { key: 'kids_lunch', label: '🍱 Kids Lunch', planned: day.planned_snacks.kids_lunch },
                                        { key: 'adult_lunch', label: '🥗 Adult Lunch', planned: 'Leftovers/Manual' },
                                    ].map((item) => (
                                        <div key={item.key}>
                                            <label className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-1">{item.label}</label>
                                            <input
                                                type="text"
                                                value={(day.snacks as any)[item.key] || ''}
                                                onChange={(e) => handleUpdateSnack(day.day, item.key, e.target.value)}
                                                placeholder={item.planned || 'Not logged'}
                                                className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end mt-12 mb-8 sticky bottom-4">
                    {reviewSubStep === 'dinners' ? (
                        <button onClick={() => setReviewSubStep('snacks')} className="btn-primary shadow-xl scale-110">
                            Next: Review Snacks →
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmitReview}
                            disabled={submitting}
                            className="btn-primary shadow-xl scale-110"
                        >
                            {submitting ? 'Updating...' : 'Confirm All & Continue →'}
                        </button>
                    )}
                </div>
            </main>
        );
    }

    // Initial Review UI (fallback) - shouldn't really be visible
    return null;
}

export default function PlanningWizard() {
    return (
        <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <PlanningWizardContent />
        </React.Suspense>
    );
}
