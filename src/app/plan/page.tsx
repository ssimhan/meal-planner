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
    createWeek,
    getRecipes,
    saveWizardState,
    getWizardState,
    getStatus
} from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import Skeleton from '@/components/Skeleton';
import ReplacementModal from '@/components/ReplacementModal';
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
        leftovers_qty: number;
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
    fridge: ({ item: string; quantity: number; unit: string; type?: 'meal' | 'ingredient' } | string)[];
    pantry: ({ item: string; quantity: number; unit: string } | string)[];
    freezer: {
        backups: { meal: string; servings: number }[];
        ingredients: { item: string; quantity: number; unit: string }[];
    };
    spice_rack: ({ item: string; quantity: number; unit: string } | string)[];
};

function PlanningWizardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const loadedState = React.useRef(false);

    // Initial check for active plan
    useEffect(() => {
        const checkStatus = async () => {
            try {
                // If a specific week is requested via param, we respect that and don't redirect
                // unless we want to enforce view-only mode for active weeks?
                // For now, let's assume if there's no specific week param, we check current.
                // Or if the requested week IS the active week.
                const weekParam = searchParams.get('week');
                const status = await getStatus(weekParam || undefined);

                if (status.state === 'active' || status.state === 'plan_complete') {
                    // Redirect to week view if plan is active
                    console.log("Plan is active, redirecting to week view");
                    router.push(`/week-view?week=${status.week_of}`);
                }
            } catch (e) {
                console.error("Failed to check status", e);
            }
        };
        checkStatus();
    }, [searchParams, router]);

    const toTitleCase = (str: string) => {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    };

    // Step State
    const [reviews, setReviews] = useState<ReviewDay[]>([]);
    const [reviewWeek, setReviewWeek] = useState<string | null>(null);
    const [planningWeek, setPlanningWeek] = useState<string | null>(null);
    const [inventory, setInventory] = useState<InventoryState | null>(null);
    const [pendingChanges, setPendingChanges] = useState<{ category: string, item: string, quantity: number, type?: 'meal' | 'ingredient', operation: 'add' | 'remove' }[]>([]);
    const [newItemInputs, setNewItemInputs] = useState<Record<string, { name: string, qty: number, type?: 'meal' | 'ingredient' }>>({});
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<'review_dinners' | 'review_snacks' | 'inventory' | 'suggestions' | 'draft' | 'groceries'>('review_dinners');

    // Suggestions State
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // Draft State
    const [draftPlan, setDraftPlan] = useState<any>(null);
    const [selections, setSelections] = useState<{ day: string, recipe_id: string }[]>([]);
    const [lockedDays, setLockedDays] = useState<string[]>([]);
    const [isReplacing, setIsReplacing] = useState<string | null>(null);
    const [recipes, setRecipes] = useState<{ id: string; name: string }[]>([]);

    // Shopping List State
    const [shoppingList, setShoppingList] = useState<{ item: string; store: string }[]>([]);
    const [purchasedItems, setPurchasedItems] = useState<string[]>([]);
    const [customShoppingItems, setCustomShoppingItems] = useState<string[]>([]);
    const [newShoppingItem, setNewShoppingItem] = useState('');

    // Inventory Handlers
    const handleAddItem = (category: string, subType?: 'meal' | 'ingredient') => {
        const input = newItemInputs[category];
        const val = input?.name?.trim();
        if (!val) return;

        setPendingChanges(prev => [...prev, {
            category,
            item: val,
            quantity: input.qty || 1,
            type: subType, // Only relevant for fridge
            operation: 'add'
        }]);
        setNewItemInputs(prev => ({ ...prev, [category]: { name: '', qty: 1, type: subType } }));
    };

    const handleRemoveItem = (category: string, item: string) => {
        // Find if we are removing a pending add first
        const pendingAddIdx = pendingChanges.findIndex(c => c.category === category && c.item === item && c.operation === 'add');
        if (pendingAddIdx !== -1) {
            setPendingChanges(prev => prev.filter((_, i) => i !== pendingAddIdx));
        } else {
            setPendingChanges(prev => [...prev, { category, item, quantity: 0, operation: 'remove' }]);
        }
    };

    // Handle Step Transitions
    const goToReviewDinners = async () => {
        // Prepare data if needed
        setStep('review_dinners');
    };

    const goToReviewSnacks = async () => {
        setStep('review_snacks');
    };

    const goToInventory = async () => {
        if (inventory) {
            setStep('inventory');
        } else {
            await loadInventory();
            setStep('inventory');
        }
    };

    // ... (rest of transitions) ...

    const loadInventory = async () => {
        try {
            const data = await getInventory();
            // Ensure all items have quantity and type for fridge
            const processedInventory: InventoryState = {
                fridge: (data.fridge || []).map((item: any) => ({
                    item: typeof item === 'string' ? item : item.item,
                    quantity: typeof item === 'object' && item.quantity ? item.quantity : 1,
                    unit: typeof item === 'object' && item.unit ? item.unit : 'unit',
                    type: typeof item === 'object' && item.type ? item.type : (typeof item === 'string' && item.toLowerCase().includes('meal') ? 'meal' : 'ingredient')
                })),
                pantry: (data.pantry || []).map((item: any) => ({
                    item: typeof item === 'string' ? item : item.item,
                    quantity: typeof item === 'object' && item.quantity ? item.quantity : 1,
                    unit: typeof item === 'object' && item.unit ? item.unit : 'unit'
                })),
                freezer: {
                    backups: (data.freezer?.backups || []).map((b: any) => ({
                        meal: b.meal,
                        servings: b.servings || 1,
                        frozen_date: b.frozen_date
                    })),
                    ingredients: (data.freezer?.ingredients || []).map((i: any) => ({
                        item: i.item,
                        quantity: i.quantity || 1,
                        unit: i.unit || 'unit'
                    }))
                },
                spice_rack: (data.spice_rack || []).map((item: any) => ({
                    item: typeof item === 'string' ? item : item.item,
                    quantity: typeof item === 'object' && item.quantity ? item.quantity : 1,
                    unit: typeof item === 'object' && item.unit ? item.unit : 'unit'
                }))
            };
            setInventory(processedInventory);
            setNewItemInputs({
                fridge: { name: '', qty: 1, type: 'meal' },
                pantry: { name: '', qty: 1 },
                spice_rack: { name: '', qty: 1 }
            });
        } catch (error) {
            showToast('Failed to load inventory.', 'error');
            console.error('Failed to load inventory:', error);
        }
    };

    const handleSaveInventory = async () => {
        setSubmitting(true);
        try {
            const updates = pendingChanges.map(change => {
                if (change.operation === 'add') {
                    return {
                        category: change.category,
                        item: change.item,
                        quantity: change.quantity,
                        unit: 'unit', // Default unit for now
                        type: change.type, // For fridge
                        operation: 'add' as const
                    };
                } else {
                    return {
                        category: change.category,
                        item: change.item,
                        operation: 'remove' as const
                    };
                }
            });

            if (updates.length > 0) {
                await bulkUpdateInventory(updates);
                showToast('Inventory updated successfully!', 'success');
                setPendingChanges([]); // Clear pending changes after successful update
                await loadInventory(); // Reload inventory to reflect changes
            }
            // Always proceed to next step
            setStep('suggestions');
        } catch (error) {
            showToast('Failed to update inventory.', 'error');
            console.error('Failed to update inventory:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const getDisplayList = (category: string) => {
        const currentItems = inventory ? (inventory as any)[category] : [];
        const addedItems = pendingChanges.filter(c => c.category === category && c.operation === 'add');
        const removedItems = pendingChanges.filter(c => c.category === category && c.operation === 'remove').map(c => c.item);

        let list = currentItems.filter((item: any) => !removedItems.includes(typeof item === 'string' ? item : item.item));

        addedItems.forEach(added => {
            const existingIdx = list.findIndex((item: any) => (typeof item === 'string' ? item : item.item) === added.item);
            if (existingIdx === -1) {
                list.push({ item: added.item, quantity: added.quantity, unit: 'unit', type: added.type });
            } else {
                // If an item was added that already exists, update its quantity
                list[existingIdx].quantity += added.quantity;
            }
        });

        return list;
    };

    const handleUpdateDinner = (day: string, field: keyof ReviewDay['dinner'], value: any) => {
        setReviews(prevReviews =>
            prevReviews.map(reviewDay => {
                if (reviewDay.day !== day) return reviewDay;

                const updatedDinner = { ...reviewDay.dinner, [field]: value };

                // Auto-fill leftover note if turning on leftovers and note is empty
                if (field === 'leftovers' && value === true && !updatedDinner.leftovers_note) {
                    const mealName = updatedDinner.planned_recipe_name || updatedDinner.actual_meal || 'Meal';
                    updatedDinner.leftovers_note = `Leftover ${mealName}`;
                    // Default qty is already handled by default state or UI default, but we can ensure it
                    if (!updatedDinner.leftovers_qty) updatedDinner.leftovers_qty = 1;
                }

                return { ...reviewDay, dinner: updatedDinner };
            })
        );
    };

    const handleUpdateSnack = (day: string, field: keyof ReviewDay['snacks'], value: string) => {
        setReviews(prevReviews =>
            prevReviews.map(reviewDay =>
                reviewDay.day === day
                    ? { ...reviewDay, snacks: { ...reviewDay.snacks, [field]: value } }
                    : reviewDay
            )
        );
    };

    const handleSubmitReview = async () => {
        if (!reviewWeek) return;
        setSubmitting(true);
        try {
            const reviewData = reviews.map(r => ({
                day: r.day,
                dinner: {
                    planned_recipe_id: r.dinner.planned_recipe_id,
                    planned_recipe_name: r.dinner.planned_recipe_name,
                    made: r.dinner.made,
                    actual_meal: r.dinner.made === false ? (r.dinner.instead_meal || r.dinner.actual_meal) : r.dinner.actual_meal,
                    leftovers: r.dinner.leftovers,
                    leftovers_note: r.dinner.leftovers ? r.dinner.leftovers_note : undefined,
                    leftovers_qty: r.dinner.leftovers ? (r.dinner.leftovers_qty || 1) : 1
                },
                snacks: r.snacks
            }));
            await submitReview(reviewWeek, reviewData);
            showToast('Review submitted successfully!', 'success');
            await loadInventory();
            setStep('inventory');
        } catch (error) {
            showToast('Failed to submit review.', 'error');
            console.error('Failed to submit review:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // ... (inside useEffect load) ...
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const weekParam = searchParams.get('week');

            try {
                // Try to check if there is a reviewable week available
                const data = await getLastWeekReview();

                if (data && (data.days || data.reviews)) {
                    // Found a review!
                    const daysData = data.reviews || data.days || [];
                    const uiReviews: ReviewDay[] = daysData.map((d: any) => ({
                        day: d.day,
                        dinner: {
                            planned_recipe_id: d.dinner?.planned_recipe_id,
                            planned_recipe_name: d.dinner?.planned_recipe_name,
                            made: d.dinner?.made,
                            actual_meal: d.dinner?.actual_meal,
                            leftovers: d.dinner?.leftovers,
                            leftovers_note: d.dinner?.leftovers_note || '',
                            leftovers_qty: d.dinner?.leftovers_qty || d.dinner?.servings || 1, // Default to 1 if not present
                            instead_meal: d.dinner?.made === false ? (d.dinner?.actual_meal || '') : '',
                        },
                        snacks: {
                            school_snack: d.snacks?.school_snack || '',
                            home_snack: d.snacks?.home_snack || '',
                            kids_lunch: d.snacks?.kids_lunch || '',
                            adult_lunch: d.snacks?.adult_lunch || '',
                        },
                        planned_snacks: {
                            school_snack: d.planned_snacks?.school_snack || '',
                            home_snack: d.planned_snacks?.home_snack || '',
                            kids_lunch: d.planned_snacks?.kids_lunch || '',
                        }
                    }));
                    setReviews(uiReviews);
                    setReviewWeek(data.week_of);
                    setPlanningWeek(weekParam || data.next_week_of);
                    setStep('review_dinners');
                } else {
                    // No review returned (e.g. no existing week), proceed to inventory
                    await loadInventory();
                    setStep('inventory');
                    if (weekParam) setPlanningWeek(weekParam);
                    else if (data && data.next_week_of) setPlanningWeek(data.next_week_of);
                }
            } catch (error) {
                console.error('No reviewable week found, starting new plan.', error);
                // Fallback to inventory
                await loadInventory();
                setStep('inventory');
                if (weekParam) setPlanningWeek(weekParam);
            }
            setLoading(false);
        };
        load();
    }, []);
    // ...

    // Auto-load draft if missing when on Step 4
    useEffect(() => {
        if (step === 'draft' && !draftPlan && planningWeek) {
            const fetchDraft = async () => {
                setLoading(true);
                try {
                    const res = await generateDraft(planningWeek, selections);
                    setDraftPlan(res.plan_data);
                } catch (e) {
                    console.error(e);
                    showToast('Failed to load draft plan', 'error');
                } finally {
                    setLoading(false);
                }
            };
            fetchDraft();
        }
    }, [step, draftPlan, planningWeek, selections]);

    // Save state on step change or major data update
    useEffect(() => {
        if (!planningWeek) return;

        // Simple debounce for auto-saving
        const timer = setTimeout(() => {
            saveWizardState(planningWeek, {
                step,
                reviews,
                // We don't save full inventory as it's large and re-fetchable, 
                // but we SHOULD save inputs/pending changes if we want true fidelity.
                // For now, simpler is better.
                pendingChanges,
                selections,
                // Do NOT save draftPlan (too big). We re-fetch it if needed.
                // We save 'selections' which allows regenerating the draft.
                shoppingList,
                purchasedItems,
                customShoppingItems,
                lockedDays
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [step, reviews, pendingChanges, selections, shoppingList, planningWeek]);

    // Restore state
    useEffect(() => {
        if (!planningWeek || loadedState.current) return;

        const restoreState = async () => {
            try {
                const res = await getWizardState(planningWeek);
                if (res.state) {
                    console.log("Restoring wizard state:", res.state);
                    if (res.state.step) setStep(res.state.step);
                    if (res.state.reviews) setReviews(res.state.reviews);
                    if (res.state.pendingChanges) setPendingChanges(res.state.pendingChanges);
                    if (res.state.selections) setSelections(res.state.selections);
                    if (res.state.shoppingList) setShoppingList(res.state.shoppingList);
                    if (res.state.purchasedItems) setPurchasedItems(res.state.purchasedItems);
                    if (res.state.shoppingList) setShoppingList(res.state.shoppingList);
                    if (res.state.purchasedItems) setPurchasedItems(res.state.purchasedItems);
                    if (res.state.customShoppingItems) setCustomShoppingItems(res.state.customShoppingItems);
                    if (res.state.lockedDays) setLockedDays(res.state.lockedDays);
                }
            } catch (e) {
                console.error("Failed to restore state", e);
            } finally {
                loadedState.current = true;
            }
        };
        restoreState();
    }, [planningWeek]);


    // Load recipes on mount
    useEffect(() => {
        async function loadRecipes() {
            try {
                const data = await getRecipes();
                setRecipes(data.recipes.map((r: any) => ({ id: r.id, name: r.name })));
            } catch (e) {
                console.error("Failed to load recipes", e);
            }
        }
        loadRecipes();
    }, []);

    const handleReplacementConfirm = async (newMeal: string) => {
        if (!isReplacing || !planningWeek) return;

        // Find recipe ID if possible, otherwise use name as ID (or handle manual entry)
        // ideally we map name back to ID. 
        const recipe = recipes.find(r => r.name === newMeal);
        const recipeId = recipe ? recipe.id : newMeal;

        const newSelections = [
            ...selections.filter(s => s.day !== isReplacing),
            { day: isReplacing, recipe_id: recipeId }
        ];

        setSelections(newSelections);
        setIsReplacing(null);
        setLoading(true); // Show skeleton while regenerating

        try {
            const res = await generateDraft(planningWeek, newSelections);
            setDraftPlan(res.plan_data);
            showToast('Plan updated!', 'success');
        } catch (e) {
            showToast('Failed to update plan', 'error');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // ... (UI Sections) ...

    // STEP 5: SMART GROCERY LIST UI
    if (step === 'groceries') {
        const stepNum = '5 of 6';
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
            <main className="container mx-auto max-w-3xl px-4 py-12 text-black">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Step {stepNum}</div>
                        <h1 className="text-3xl">Shopping List</h1>
                        <p className="text-[var(--text-muted)] mt-2">
                            Check items as you shop. We'll add them to your inventory.
                        </p>
                    </div>
                    <div>
                        <button onClick={() => setStep('draft')} className="btn-secondary">← Back</button>
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

                <div className="flex justify-end sticky bottom-4">
                    <button
                        onClick={async () => {
                            setSubmitting(true);
                            try {
                                // 1. Sync purchased items to inventory (Best guess category: fridge or pantry)
                                // We'll just put them in fridge for now as that's most common for weekly shopping
                                if (purchasedItems.length > 0) {
                                    const changes = purchasedItems.map(item => ({
                                        category: 'fridge',
                                        item,
                                        operation: 'add' as const
                                    }));
                                    await bulkUpdateInventory(changes);
                                }

                                // 2. Finalize
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
                        className="btn-primary shadow-xl scale-110"
                    >
                        {submitting ? 'Finalizing...' : 'Finalize Plan 🎉'}
                    </button>
                </div>
            </main>
        );
    }

    // STEP 4: TENTATIVE PLAN UI
    if (step === 'draft') {
        const stepNum = '4 of 6';

        return (
            <main className="container mx-auto max-w-5xl px-4 py-12">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Step {stepNum}</div>
                        <h1 className="text-3xl">Tentative Plan</h1>
                        <p className="text-[var(--text-muted)] mt-2">
                            Review the proposed meal plan for {planningWeek}.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setStep('suggestions')} className="btn-secondary">← Back</button>
                        <button
                            onClick={async () => {
                                setStep('groceries');
                                // Pre-fetch shopping list
                                try {
                                    const res = await getShoppingList(planningWeek!);
                                    setShoppingList(res.shopping_list);
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            className="btn-primary"
                        >
                            Looks Good →
                        </button>
                    </div>
                </header>

                {loading || !draftPlan ? (
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-4">
                            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
                                const dinner = draftPlan.dinners?.find((d: any) => d.day === day);
                                const isSelected = selections.some(s => s.day === day);
                                const isLocked = lockedDays.includes(day);

                                return (
                                    <div key={day} className={`card flex items-center justify-between ${isSelected ? 'border-[var(--accent-sage)] bg-green-50' : ''} ${isLocked ? 'border-l-4 border-l-[var(--accent-sage)]' : ''}`}>
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono uppercase text-[var(--accent-sage)] w-12">{day}</span>
                                            <div>
                                                <span className="text-lg font-bold block">{dinner?.recipe_id?.replace(/_/g, ' ') || 'No Meal'}</span>
                                                {isSelected && <span className="text-xs text-[var(--accent-sage)] font-bold uppercase tracking-wider mr-2">Manual Selection</span>}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setLockedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                                                className={`p-2 rounded-full ${isLocked ? 'text-[var(--accent-sage)] bg-[var(--bg-secondary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'}`}
                                                title={isLocked ? "Unlock Day" : "Lock Day (Keep when regenerating)"}
                                            >
                                                {isLocked ? '🔒' : '🔓'}
                                            </button>
                                            <button
                                                onClick={() => setIsReplacing(day)}
                                                className="text-[var(--text-muted)] hover:text-[var(--accent-sage)] p-2 rounded-full hover:bg-[var(--bg-secondary)]"
                                                title="Edit Meal"
                                            >
                                                ✏️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-center mt-6">
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        // Pass lockedDays to regenerate everything else
                                        const res = await generateDraft(planningWeek!, selections, lockedDays);
                                        setDraftPlan(res.plan_data);
                                        showToast('Plan regenerated!', 'success');
                                    } catch (e) {
                                        console.error(e);
                                        showToast('Failed to regenerate plan', 'error');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] underline"
                            >
                                🔄 Regenerate Unlocked Days
                            </button>
                        </div>
                    </div>
                )}

                {isReplacing && (
                    <ReplacementModal
                        day={isReplacing}
                        currentMeal={draftPlan?.dinners?.find((d: any) => d.day === isReplacing)?.recipe_id || ''}
                        recipes={recipes}
                        onConfirm={(newMeal) => handleReplacementConfirm(newMeal)}
                        onCancel={() => setIsReplacing(null)}
                    />
                )}
            </main>
        );
    }

    // STEP 3: WASTE NOT SUGGESTIONS
    if (step === 'suggestions') {
        const stepNum = '3 of 6';

        return (
            <main className="container mx-auto max-w-3xl px-4 py-12">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Step {stepNum}</div>
                        <h1 className="text-3xl">Meal Suggestions</h1>
                        <p className="text-[var(--text-muted)] mt-2">
                            Let's generate a plan based on your inventory.
                        </p>
                    </div>
                    <div>
                        <button onClick={() => setStep('inventory')} className="btn-secondary">← Back</button>
                    </div>
                </header>

                <div className="card text-center py-12">
                    <div className="mb-6 text-6xl">🧑‍🍳</div>
                    <h3 className="text-2xl font-bold mb-4">Ready to build your plan?</h3>
                    <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto">
                        We'll use your inventory and history to suggest a balanced meal plan for the week of {planningWeek}.
                    </p>
                    <button
                        onClick={async () => {
                            setSubmitting(true);
                            try {
                                // Initialize the week
                                await createWeek(planningWeek!);
                                // Fetch the draft
                                const res = await generateDraft(planningWeek!, selections);
                                setDraftPlan(res.plan_data);
                                setStep('draft');
                            } catch (e) {
                                console.error(e);
                                showToast('Failed to generate plan', 'error');
                            } finally {
                                setSubmitting(false);
                            }
                        }}
                        disabled={submitting}
                        className="btn-primary text-lg px-8 py-4 shadow-lg hover:scale-105 transition-transform"
                    >
                        {submitting ? 'Chef is thinking...' : 'Generate Plan ✨'}
                    </button>
                </div>
            </main>
        );
    }

    // STEP 2: INVENTORY UI
    if (step === 'inventory') {
        const stepNum = '2 of 6';
        return (
            <main className="container mx-auto max-w-5xl px-4 py-12">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Step {stepNum}</div>
                        <h1 className="text-3xl">Update Inventory</h1>
                        <p className="text-[var(--text-muted)] mt-1">Planning for week of: <strong>{planningWeek}</strong></p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setStep('review_snacks')} className="btn-secondary">
                            ← Back
                        </button>
                        <button onClick={handleSaveInventory} disabled={submitting} className="btn-primary">
                            {submitting ? 'Saving...' : 'Save & Continue →'}
                        </button>
                    </div>
                </header>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Fridge Section - Split into Meals vs Ingredients */}
                    <div className="card lg:col-span-2">
                        <h3 className="text-xl mb-4 border-b border-[var(--border-subtle)] pb-2">🥦 Fridge</h3>
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Leftover Meals */}
                            <div>
                                <h4 className="text-sm font-bold uppercase text-[var(--accent-sage)] mb-2">Leftover Meals</h4>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        placeholder="Meal name..."
                                        value={newItemInputs['fridge']?.type === 'meal' ? newItemInputs['fridge']?.name : ''}
                                        onChange={e => setNewItemInputs(prev => ({ ...prev, 'fridge': { ...prev['fridge'], name: e.target.value, type: 'meal' } }))}
                                        onKeyDown={e => e.key === 'Enter' && handleAddItem('fridge', 'meal')}
                                        className="flex-1 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="#"
                                        min="1"
                                        className="w-16 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                        value={newItemInputs['fridge']?.type === 'meal' ? (newItemInputs['fridge']?.qty || 1) : 1}
                                        onChange={e => setNewItemInputs(prev => ({ ...prev, 'fridge': { ...prev['fridge'], qty: parseInt(e.target.value) || 1, type: 'meal' } }))}
                                    />
                                    <button onClick={() => handleAddItem('fridge', 'meal')} className="btn-secondary px-3">+</button>
                                </div>
                                <ul className="space-y-2">
                                    {getDisplayList('fridge').filter((i: any) => i.type === 'meal' || (typeof i === 'string' && i.toLowerCase().includes('meal'))).map((item: any, idx: number) => {
                                        const name = typeof item === 'string' ? item : item.item;
                                        const qty = typeof item === 'object' ? item.quantity : 1;
                                        const isNew = pendingChanges.some(c => c.category === 'fridge' && c.item === name && c.operation === 'add');
                                        return (
                                            <li key={`meal-${name}-${idx}`} className={`flex justify-between items-center text-sm p-2 rounded ${isNew ? 'bg-[var(--bg-secondary)] border-l-2 border-[var(--accent-sage)]' : ''}`}>
                                                <span>{name} <span className="text-xs text-[var(--text-muted)]">({qty})</span></span>
                                                <button onClick={() => handleRemoveItem('fridge', name)} className="text-[var(--text-muted)] hover:text-[var(--accent-terracotta)]">×</button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            {/* Ingredients */}
                            <div>
                                <h4 className="text-sm font-bold uppercase text-[var(--accent-gold)] mb-2">Ingredients / Produce</h4>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        placeholder="Ingredient..."
                                        value={newItemInputs['fridge']?.type === 'ingredient' ? newItemInputs['fridge']?.name : ''}
                                        onChange={e => setNewItemInputs(prev => ({ ...prev, 'fridge': { ...prev['fridge'], name: e.target.value, type: 'ingredient' } }))}
                                        onKeyDown={e => e.key === 'Enter' && handleAddItem('fridge', 'ingredient')}
                                        className="flex-1 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="#"
                                        min="1"
                                        className="w-16 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                        value={newItemInputs['fridge']?.type === 'ingredient' ? (newItemInputs['fridge']?.qty || 1) : 1}
                                        onChange={e => setNewItemInputs(prev => ({ ...prev, 'fridge': { ...prev['fridge'], qty: parseInt(e.target.value) || 1, type: 'ingredient' } }))}
                                    />
                                    <button onClick={() => handleAddItem('fridge', 'ingredient')} className="btn-secondary px-3">+</button>
                                </div>
                                <ul className="space-y-2">
                                    {getDisplayList('fridge').filter((i: any) => i.type !== 'meal' && !(typeof i === 'string' && i.toLowerCase().includes('meal'))).map((item: any, idx: number) => {
                                        const name = typeof item === 'string' ? item : item.item;
                                        const qty = typeof item === 'object' ? item.quantity : 1;
                                        const isNew = pendingChanges.some(c => c.category === 'fridge' && c.item === name && c.operation === 'add');
                                        return (
                                            <li key={`ing-${name}-${idx}`} className={`flex justify-between items-center text-sm p-2 rounded ${isNew ? 'bg-[var(--bg-secondary)] border-l-2 border-[var(--accent-sage)]' : ''}`}>
                                                <span>{name} <span className="text-xs text-[var(--text-muted)]">({qty})</span></span>
                                                <button onClick={() => handleRemoveItem('fridge', name)} className="text-[var(--text-muted)] hover:text-[var(--accent-terracotta)]">×</button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Pantry & Spices handled simpler for now (Chunk 2 focusing on fridge split) */}
                    {['pantry', 'spice_rack'].map(catId => (
                        <div key={catId} className="card">
                            <h3 className="text-xl mb-4 border-b border-[var(--border-subtle)] pb-2">{catId === 'pantry' ? '🥫 Pantry' : '🧂 Spices'}</h3>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="Item..."
                                    value={newItemInputs[catId]?.name || ''}
                                    onChange={e => setNewItemInputs(prev => ({ ...prev, [catId]: { ...prev[catId], name: e.target.value, type: undefined } }))}
                                    onKeyDown={e => e.key === 'Enter' && handleAddItem(catId)}
                                    className="flex-1 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                />
                                {catId === 'pantry' && (
                                    <input
                                        type="number"
                                        placeholder="#"
                                        min="1"
                                        className="w-16 p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                        value={newItemInputs[catId]?.qty || 1}
                                        onChange={e => setNewItemInputs(prev => ({ ...prev, [catId]: { ...prev[catId], qty: parseInt(e.target.value) || 1 } }))}
                                    />
                                )}
                                <button onClick={() => handleAddItem(catId)} className="btn-secondary px-3">+</button>
                            </div>
                            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {getDisplayList(catId).map((item: any, idx: number) => {
                                    const name = typeof item === 'string' ? item : item.item;
                                    const qty = typeof item === 'object' ? item.quantity : 1;
                                    const isNew = pendingChanges.some(c => c.category === catId && c.item === name && c.operation === 'add');
                                    return (
                                        <li key={`${catId}-${name}-${idx}`} className={`flex justify-between items-center text-sm p-2 rounded ${isNew ? 'bg-[var(--bg-secondary)] border-l-2 border-[var(--accent-sage)]' : ''}`}>
                                            <span>{name} {catId === 'pantry' && <span className="text-xs text-[var(--text-muted)]">({qty})</span>}</span>
                                            <button onClick={() => handleRemoveItem(catId, name)} className="text-[var(--text-muted)] hover:text-[var(--accent-terracotta)]">×</button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </main>
        );
    }

    // STEP 1: REVIEW SNACKS UI
    if (step === 'review_snacks') {
        const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

        return (
            <main className="container mx-auto max-w-3xl px-4 py-12">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Step 1 of 6</div>
                        <h1 className="text-3xl">Review Snacks & Lunches</h1>
                        <p className="text-[var(--text-muted)] mt-2">
                            Log what was actually eaten for snacks and lunches.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setStep('review_dinners')} className="btn-secondary">← Back to Dinners</button>
                        <button onClick={handleSubmitReview} disabled={submitting} className="btn-primary">
                            {submitting ? 'Submitting...' : 'Confirm & Continue →'}
                        </button>
                    </div>
                </header>

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
                                            onChange={(e) => handleUpdateSnack(day.day, item.key as any, e.target.value)}
                                            placeholder={item.planned || 'Not logged'}
                                            className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end mt-12 mb-8 sticky bottom-4">
                    <button
                        onClick={handleSubmitReview}
                        disabled={submitting}
                        className="btn-primary shadow-xl scale-110"
                    >
                        {submitting ? 'Updating...' : 'Confirm & Continue →'}
                    </button>
                </div>
            </main>
        );
    }

    // STEP 0: REVIEW DINNERS UI
    if (step === 'review_dinners') {
        const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

        return (
            <main className="container mx-auto max-w-3xl px-4 py-12">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Step 0 of 6</div>
                        <h1 className="text-3xl">Review Dinners</h1>
                        <p className="text-[var(--text-muted)] mt-2">
                            Let's confirm what happened last week ({reviewWeek}).
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setStep('review_snacks')} className="btn-primary">Next: Review Snacks →</button>
                    </div>
                </header>

                <div className="space-y-8">
                    {reviews.map((day) => (
                        <div key={day.day} className="card relative overflow-hidden">
                            {/* ... (Existing Dinner Card Content) ... */}
                            {/* Copy existing inner content for dinner logging */}
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
                                            <div className="animate-in fade-in zoom-in-95 space-y-4">
                                                <div>
                                                    <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider block mb-1">Leftover Note</label>
                                                    <input
                                                        type="text"
                                                        value={day.dinner.leftovers_note}
                                                        onChange={(e) => handleUpdateDinner(day.day, 'leftovers_note', e.target.value)}
                                                        className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-lg"
                                                        placeholder="e.g. Leftover Curry"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider block mb-1">Quantity (servings)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={day.dinner.leftovers_qty || 1}
                                                        onChange={(e) => handleUpdateDinner(day.day, 'leftovers_qty', parseInt(e.target.value) || 1)}
                                                        className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-lg"
                                                    />
                                                </div>
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

                <div className="flex justify-end mt-12 mb-8 sticky bottom-4">
                    <button onClick={() => setStep('review_snacks')} className="btn-primary shadow-xl scale-110">
                        Next: Review Snacks →
                    </button>
                </div>
            </main>
        );
    }

    // Initial Review UI (fallback) - shouldn't really be visible
    return null;
}

export default function PlanningWizard() {
    return (
        <AppLayout>
            <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <PlanningWizardContent />
            </React.Suspense>
        </AppLayout>
    );
}
