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
    getStatus,
    getSuggestOptions
} from '@/lib/api';
import { transformInventory, NormalizedInventory } from '@/lib/inventoryManager';
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
    meals: any[];  // Consolidated: Fridge leftovers + Freezer backups
    ingredients: {
        fridge: any[];
        freezer: any[];
        pantry: any[];
        spice_rack: any[];
    };
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

    // Wizard Phases for top navigation
    const PHASES = [
        { id: 'review', label: 'Review', icon: '📝', steps: ['review_meals', 'review_snacks'] },
        { id: 'inventory', label: 'Inventory', icon: '🥦', steps: ['inventory'] },
        { id: 'plan', label: 'Plan', icon: '🍳', steps: ['suggestions', 'draft', 'groceries'] }
    ];

    // Progress Breadcrumb Component
    const WizardProgress = ({ currentStep }: { currentStep: string }) => {
        const currentPhaseIndex = PHASES.findIndex(p => p.steps.includes(currentStep));

        return (
            <div className="flex items-center justify-center gap-4 mb-12">
                {PHASES.map((p, idx) => {
                    const isActive = idx === currentPhaseIndex;
                    const isCompleted = idx < currentPhaseIndex;

                    return (
                        <div key={p.id} className="flex items-center gap-4">
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${isActive
                                    ? 'bg-[var(--accent-sage)] text-white shadow-lg scale-110'
                                    : isCompleted
                                        ? 'bg-[var(--accent-sage)] bg-opacity-20 text-[var(--accent-sage)]'
                                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] opacity-50'
                                    }`}>
                                    {isCompleted ? '✓' : p.icon}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[var(--accent-sage)]' : 'text-[var(--text-muted)]'
                                    }`}>
                                    {p.label}
                                </span>
                            </div>
                            {idx < PHASES.length - 1 && (
                                <div className={`h-[2px] w-12 rounded-full ${isCompleted ? 'bg-[var(--accent-sage)] bg-opacity-30' : 'bg-[var(--bg-secondary)]'
                                    }`} />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // Step State
    const [reviews, setReviews] = useState<ReviewDay[]>([]);
    const [reviewWeek, setReviewWeek] = useState<string | null>(null);
    const [planningWeek, setPlanningWeek] = useState<string | null>(null);
    const [inventory, setInventory] = useState<NormalizedInventory | null>(null);
    const [pendingChanges, setPendingChanges] = useState<{ category: string, item: string, quantity: number, type?: 'meal' | 'ingredient', operation: 'add' | 'remove' | 'update' }[]>([]);
    const [newItemInputs, setNewItemInputs] = useState<Record<string, { name: string, qty: number, type?: 'meal' | 'ingredient' }>>({});
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<'review_meals' | 'review_snacks' | 'inventory' | 'suggestions' | 'draft' | 'groceries'>('review_meals');
    const [suggestionPhase, setSuggestionPhase] = useState<'dinners' | 'lunches' | 'snacks'>('dinners');

    // Suggestions State
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);

    // Draft State
    const [draftPlan, setDraftPlan] = useState<any>(null);
    const [selections, setSelections] = useState<{ day: string, slot: string, recipe_id: string, recipe_name: string }[]>([]);
    const [suggestionOptions, setSuggestionOptions] = useState<{
        snacks: { id: string, name: string }[],
        lunch_recipes: { id: string, name: string }[],
        lunch_defaults: { kids: string[], adult: string[] }
    } | null>(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [leftoverAssignments, setLeftoverAssignments] = useState<{ day: string, slot: 'lunch' | 'dinner', item: string }[]>([]);
    const [lockedDays, setLockedDays] = useState<string[]>([]);
    const [isReplacing, setIsReplacing] = useState<{ day: string, slot: string, currentMeal: string } | null>(null);
    const [recipes, setRecipes] = useState<{ id: string; name: string }[]>([]);
    const [wasteNotSuggestions, setWasteNotSuggestions] = useState<any[]>([]);
    const [confirmedSelections, setConfirmedSelections] = useState<Record<string, boolean>>({}); // Key: day-slot
    const [excludedDefaults, setExcludedDefaults] = useState<string[]>([]);

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

    const handleRemoveItem = (category: string, item: string, type: 'meal' | 'ingredient' = 'ingredient') => {
        // Find if we are removing a pending add first
        const pendingAddIdx = pendingChanges.findIndex(c => c.category === category && c.item === item && c.operation === 'add');
        if (pendingAddIdx !== -1) {
            setPendingChanges(prev => prev.filter((_, i) => i !== pendingAddIdx));
        } else {
            setPendingChanges(prev => [...prev, { category, item, quantity: 0, operation: 'remove', type }]);
        }
    };

    // Handle Step Transitions
    const goToReviewMeals = async () => {
        // Prepare data if needed
        setStep('review_meals');
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

    // ... (rest of transitions)
    const loadInventory = React.useCallback(async () => {
        try {
            const response = await getInventory();
            const processedInventory = transformInventory(response);
            setInventory(processedInventory);
            setNewItemInputs({});
        } catch (e) {
            showToast('Failed to load inventory', 'error');
        }
    }, [showToast]);

    const autoDraftSelections = (phase: 'dinners' | 'lunches' | 'snacks', options: any, currentInventory: any) => {
        const newSelections = [...selections];
        const newLeftovers = [...leftoverAssignments];
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const workDays = ['mon', 'tue', 'wed', 'thu', 'fri'];

        if (phase === 'dinners') {
            const availableMeals = (currentInventory?.meals || []).filter((m: any) => m.quantity > 0 && m.location === 'fridge');
            const wasteNot = wasteNotSuggestions.length > 0 ? wasteNotSuggestions : options.wasteNot || [];
            const commonDinners = options.dinner_recipes || [];

            days.forEach((day, idx) => {
                const existingLeftover = newLeftovers.find(l => l.day === day && l.slot === 'dinner');
                const existingRecipe = newSelections.find(s => s.day === day && (s as any).slot === 'dinner');

                if (!existingLeftover && !existingRecipe) {
                    // 1. Try to assign a leftover first (FRIDGE ONLY)
                    const mealWithQty = availableMeals.find((m: any) => {
                        const assigned = newLeftovers.filter(l => l.item === m.item).length;
                        return m.quantity - assigned > 0;
                    });

                    if (mealWithQty) {
                        newLeftovers.push({ day, slot: 'dinner', item: mealWithQty.item });
                    } else if (wasteNot[idx]) {
                        // 2. Use waste-not suggestion
                        newSelections.push({
                            day,
                            slot: 'dinner',
                            recipe_id: wasteNot[idx].recipe_id || wasteNot[idx].id,
                            recipe_name: wasteNot[idx].recipe_name || wasteNot[idx].name
                        });
                    } else if (commonDinners[idx % commonDinners.length]) {
                        // 3. Fallback to common recipes
                        const recipe = commonDinners[idx % commonDinners.length];
                        newSelections.push({
                            day,
                            slot: 'dinner',
                            recipe_id: recipe.id,
                            recipe_name: recipe.name
                        });
                    }
                }
            });
        }
        else if (phase === 'lunches') {
            const availableMeals = (currentInventory?.meals || []).filter((m: any) => m.quantity > 0);
            const lunchRecipes = options.lunch_recipes || [];

            workDays.forEach(day => {
                const existingLeftover = newLeftovers.find(l => l.day === day && l.slot === 'lunch');
                const existingRecipe = newSelections.find(s => s.day === day && (s as any).slot === 'lunch');

                if (!existingLeftover && !existingRecipe) {
                    // Try to assign a leftover first
                    const mealWithQty = availableMeals.find((m: any) => {
                        const assigned = newLeftovers.filter(l => l.item === m.item).length;
                        return m.quantity - assigned > 0;
                    });

                    if (mealWithQty) {
                        newLeftovers.push({ day, slot: 'lunch', item: mealWithQty.item });
                    } else if (lunchRecipes[0]) {
                        // fallback to top suggestion
                        newSelections.push({
                            day,
                            slot: 'lunch',
                            recipe_id: lunchRecipes[0].id,
                            recipe_name: lunchRecipes[0].name
                        });
                    }
                }
            });
        } else if (phase === 'snacks') {
            const snackRecipes = options.snacks || [];
            if (snackRecipes.length >= 2) {
                // School snack (Mon-Fri)
                const existingSchool = newSelections.find(s => (s as any).slot === 'school_snack');
                if (!existingSchool) {
                    workDays.forEach(day => {
                        newSelections.push({ day, slot: 'school_snack', recipe_id: snackRecipes[0].id, recipe_name: snackRecipes[0].name });
                    });
                }
                // Home snack (Mon-Fri)
                const existingHome = newSelections.find(s => (s as any).slot === 'home_snack');
                if (!existingHome) {
                    workDays.forEach(day => {
                        newSelections.push({ day, slot: 'home_snack', recipe_id: snackRecipes[1].id, recipe_name: snackRecipes[1].name });
                    });
                }
            }
        }

        setSelections(newSelections);
        setLeftoverAssignments(newLeftovers);
    };

    const loadSuggestions = React.useCallback(async () => {
        setLoadingSuggestions(true);
        try {
            let wasteData: any = { suggestions: [] };
            // If in dinner phase, fetch waste-not recommendations
            if (suggestionPhase === 'dinners') {
                wasteData = await getWasteNotSuggestions();
                setWasteNotSuggestions(wasteData.suggestions || []);
            }

            const data = await getSuggestOptions(selections, leftoverAssignments);
            setSuggestionOptions(data);

            // Auto-draft if we just entered the phase and nothing is selected for it
            autoDraftSelections(suggestionPhase, { ...data, wasteNot: wasteData.suggestions }, inventory);
        } catch (e) {
            console.error(e);
            showToast('Failed to load suggestions', 'error');
        } finally {
            setLoadingSuggestions(false);
        }
    }, [suggestionPhase, selections, leftoverAssignments, inventory, showToast]);

    useEffect(() => {
        if (step === 'suggestions') {
            loadSuggestions();
        }
    }, [step, loadSuggestions]);

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
                } else if (change.operation === 'update') {
                    return {
                        category: change.category,
                        item: change.item,
                        quantity: change.quantity,
                        operation: 'add' as const // Backend 'add' with existing name increments/updates
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
                setPendingChanges([]); // Clear pending changes after successful update
                setLoading(true); // Ensure loading state is active while we refresh
                await loadInventory(); // Reload inventory to reflect changes
            }
            showToast('Inventory updated!', 'success');
            setSuggestionPhase('dinners');
            setStep('suggestions');
        } catch (error) {
            showToast('Failed to update inventory.', 'error');
            console.error('Failed to update inventory:', error);
        } finally {
            setSubmitting(false);
            setLoading(false);
        }
    };

    const handleUpdateQuantity = (category: string, itemName: string, delta: number, type: 'meal' | 'ingredient' = 'ingredient') => {
        const displayList = getDisplayList(type === 'meal' ? 'meals' : category);
        const item = displayList.find(i => {
            const iName = typeof i === 'string' ? i : (i.item || i.meal);
            return iName?.toLowerCase() === itemName.toLowerCase();
        });
        if (!item) return;

        const currentQty = (typeof item === 'object' ? item.quantity || item.servings : 1) || 1;
        const newQty = Math.max(0, currentQty + delta);

        if (newQty === 0) {
            handleRemoveItem(category, itemName);
        } else {
            setPendingChanges(prev => {
                // Remove existing changes for this item
                const otherChanges = prev.filter(c => !(c.category === category && c.item === itemName));
                return [...otherChanges, {
                    category,
                    item: itemName,
                    quantity: newQty,
                    type,
                    operation: 'update'
                }];
            });
        }
    };

    const getDisplayList = (mode: string) => {
        let currentItems: any[] = [];
        if (!inventory) return [];

        if (mode === 'meals') {
            currentItems = [...inventory.meals];
        } else if (mode === 'fridge') {
            currentItems = [...inventory.ingredients.fridge];
        } else if (mode === 'frozen_ingredient') {
            currentItems = [...inventory.ingredients.freezer];
        } else if (mode === 'pantry' || mode === 'spice_rack') {
            currentItems = [...inventory.ingredients.pantry];
        }

        const list = [...currentItems];

        pendingChanges.forEach(change => {
            let applies = false;
            if (mode === 'meals') {
                applies = change.type === 'meal';
            } else if (mode === 'fridge') {
                applies = (change.category === 'fridge' || change.category === 'grocery') && change.type === 'ingredient';
            } else if (mode === 'frozen_ingredient') {
                applies = change.category === 'frozen_ingredient';
            } else if (mode === 'pantry' || mode === 'spice_rack') {
                applies = change.category === 'pantry' || change.category === 'spice_rack';
            }

            if (!applies) return;

            const name = change.item;
            const existingIdx = list.findIndex(i => {
                const iName = typeof i === 'string' ? i : (i.item || i.meal);
                return iName?.toLowerCase() === name.toLowerCase();
            });

            if (change.operation === 'remove') {
                if (existingIdx !== -1) list.splice(existingIdx, 1);
            } else if (change.operation === 'add') {
                if (existingIdx === -1) {
                    list.push({
                        item: name,
                        quantity: change.quantity,
                        unit: 'unit',
                        type: change.type,
                        location: mode === 'meals' ? (change.category === 'meals' || change.category === 'freezer' ? 'freezer' : 'fridge') : undefined,
                        is_new: true
                    });
                } else {
                    const existing = list[existingIdx];
                    if (typeof existing === 'object') {
                        existing.quantity = (existing.quantity || 0) + change.quantity;
                    }
                }
            } else if (change.operation === 'update') {
                if (existingIdx !== -1) {
                    const existing = list[existingIdx];
                    if (typeof existing === 'object') {
                        existing.quantity = change.quantity;
                    }
                }
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
                    setStep('review_meals');
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
    }, [searchParams, loadInventory]);
    // ...

    // Auto-load draft if missing when on Step 4
    useEffect(() => {
        if (step === 'draft' && !draftPlan && planningWeek) {
            const fetchDraft = async () => {
                setLoading(true);
                try {
                    const res = await generateDraft(planningWeek, selections, [], leftoverAssignments);
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
    }, [step, draftPlan, planningWeek, selections, leftoverAssignments, showToast]);

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
                lockedDays,
                leftoverAssignments
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [step, reviews, pendingChanges, selections, shoppingList, planningWeek, leftoverAssignments, purchasedItems, customShoppingItems, lockedDays]);

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
                    if (res.state.leftoverAssignments) setLeftoverAssignments(res.state.leftoverAssignments);
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

    const handleReplacementConfirm = async (newMeal: string, requestRecipe: boolean = false, madeStatus: boolean | string = true) => {
        if (!isReplacing) return;

        const { day, slot } = isReplacing;

        // 1. Handle Leftover assignment vs Recipe selection
        if (madeStatus === 'leftovers') {
            const newLeftovers = [
                ...leftoverAssignments.filter(l => !(l.day === day && l.slot === slot)),
                { day, slot: slot as 'lunch' | 'dinner', item: newMeal }
            ];
            setLeftoverAssignments(newLeftovers);
            // Remove any recipe selection for this slot
            setSelections(prev => prev.filter(s => !(s.day === day && (s as any).slot === slot)));
        } else {
            const recipe = recipes.find(r => r.name === newMeal);
            const recipeId = recipe ? recipe.id : newMeal;
            const recipeName = newMeal;

            let newSelections;
            if (slot === 'school_snack' || slot === 'home_snack') {
                // Apply to all work days
                const workDays = ['mon', 'tue', 'wed', 'thu', 'fri'];
                newSelections = [
                    ...selections.filter(s => (s as any).slot !== slot),
                    ...workDays.map(d => ({ day: d, slot, recipe_id: recipeId, recipe_name: recipeName }))
                ];
            } else {
                newSelections = [
                    ...selections.filter(s => !(s.day === day && (s as any).slot === slot)),
                    { day, slot, recipe_id: recipeId, recipe_name: recipeName }
                ];
            }
            setSelections(newSelections);
            // Remove any leftover assignment for this slot
            setLeftoverAssignments(prev => prev.filter(l => !(l.day === day && l.slot === slot)));
        }

        // Auto-confirm the swapped meal
        setConfirmedSelections(prev => ({ ...prev, [`${day}-${slot}`]: true }));

        setIsReplacing(null);

        // 2. Only generate draft if we're actually in the draft step
        if (step === 'draft' && planningWeek) {
            setLoading(true);
            try {
                // We need the latest state, but setSelections is async. 
                // For 'draft' step, it's safer to use the derived newLists
                // but handleReplacementConfirm is simpler here if it just triggers a refresh.
                // However, generateDraft takes the full state, so we might need a more robust way.
                // For now, let's keep it simple as the draft step is less used in the wizard.
                const res = await generateDraft(planningWeek, selections, lockedDays, leftoverAssignments, excludedDefaults);
                setDraftPlan(res.plan_data);
                showToast('Plan updated!', 'success');
            } catch (e) {
                showToast('Failed to update plan', 'error');
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
    };

    // ... (UI Sections) ...

    // STEP 6: SMART GROCERY LIST UI
    if (step === 'groceries') {
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
    }

    // STEP 5: TENTATIVE PLAN UI
    if (step === 'draft') {
        const dayNames: any = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
        return (
            <main className="container mx-auto max-w-5xl px-4 py-12">
                <WizardProgress currentStep={step} />

                <header className="mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold">Review Your Plan</h1>
                            <p className="text-[var(--text-muted)] mt-2">
                                Here's the proposed meal plan for {planningWeek}. Lock days you like, edit any you don't.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <button
                                onClick={async () => {
                                    setStep('groceries');
                                    try {
                                        const res = await getShoppingList(planningWeek!);
                                        setShoppingList(res.shopping_list);
                                    } catch (e) {
                                        console.error(e);
                                    }
                                }}
                                className="btn-premium px-8 py-4 shadow-xl flex items-center gap-2 text-sm"
                            >
                                Next: Shopping List →
                            </button>
                            <button onClick={() => setStep('suggestions')} className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-sage)] transition-colors">
                                ← Back to Planning
                            </button>
                        </div>
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
                        <div className="grid gap-6">
                            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
                                const dinner = draftPlan.dinners?.find((d: any) => d.day === day);
                                const lunch = draftPlan.lunches?.[day];
                                const snacks = draftPlan.snacks?.[day] || {};
                                const isLocked = lockedDays.includes(day);

                                return (
                                    <div key={day} className={`card overflow-visible transition-all ${isLocked ? 'border-l-4 border-l-[var(--accent-sage)] bg-green-50/10' : ''}`}>
                                        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2 mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-sm uppercase text-[var(--accent-sage)] tracking-widest font-black">{dayNames[day]}</span>
                                                {isLocked && <span className="text-[10px] bg-[var(--accent-sage)] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Locked</span>}
                                            </div>
                                            <button
                                                onClick={() => setLockedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                                                className={`p-2 rounded-full transition-all ${isLocked ? 'text-[var(--accent-sage)] bg-white shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'}`}
                                                title={isLocked ? "Unlock Day" : "Lock Day (Keep when regenerating)"}
                                            >
                                                {isLocked ? '🔒' : '🔓'}
                                            </button>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-4">
                                            {/* Dinner Slot */}
                                            <div className="flex flex-col p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--accent-sage)] transition-colors group">
                                                <div className="flex justify-between items-start mb-1">
                                                    <label className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Dinner</label>
                                                    <button
                                                        onClick={() => setIsReplacing({ day, slot: 'dinner', currentMeal: dinner?.recipe_id || '' })}
                                                        className="opacity-0 group-hover:opacity-100 text-[var(--accent-sage)] text-xs font-bold"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                                <p className="font-bold text-sm line-clamp-2">
                                                    {dinner?.recipe_name || dinner?.recipe_id?.replace(/_/g, ' ') || 'Not Planned'}
                                                </p>
                                                {dinner?.vegetables && dinner.vegetables.length > 0 && (
                                                    <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">🥬 {dinner.vegetables.join(', ')}</p>
                                                )}
                                            </div>

                                            {/* Lunch Slot */}
                                            <div className="flex flex-col p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] hover:border-blue-200 transition-colors group">
                                                <div className="flex justify-between items-start mb-1">
                                                    <label className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Lunch</label>
                                                    <button
                                                        onClick={() => setIsReplacing({ day, slot: 'lunch', currentMeal: lunch?.recipe_name || '' })}
                                                        className="opacity-0 group-hover:opacity-100 text-blue-500 text-xs font-bold"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                                <p className="font-bold text-sm line-clamp-2">
                                                    {lunch?.recipe_name || 'Not Planned'}
                                                </p>
                                                {lunch?.prep_style && (
                                                    <p className="text-[10px] text-blue-500 mt-1 font-black uppercase tracking-widest">{lunch.prep_style.replace('_', ' ')}</p>
                                                )}
                                            </div>

                                            {/* Snacks Slot */}
                                            <div className="flex flex-col p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] hover:border-amber-200 transition-colors group">
                                                <div className="flex justify-between items-start mb-1">
                                                    <label className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Snacks</label>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100">
                                                        <button
                                                            onClick={() => setIsReplacing({ day, slot: 'school_snack', currentMeal: snacks.school_snack || '' })}
                                                            className="text-amber-500 text-[10px] font-bold"
                                                        >
                                                            Edit School
                                                        </button>
                                                        <button
                                                            onClick={() => setIsReplacing({ day, slot: 'home_snack', currentMeal: snacks.home_snack || '' })}
                                                            className="text-amber-500 text-[10px] font-bold"
                                                        >
                                                            Edit Home
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs">
                                                        <span className="text-[var(--text-muted)] font-medium">🏫</span> {snacks.school_snack || 'None'}
                                                    </p>
                                                    <p className="text-xs">
                                                        <span className="text-[var(--text-muted)] font-medium">🏠</span> {snacks.home_snack || 'None'}
                                                    </p>
                                                </div>
                                            </div>
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
                                        const res = await generateDraft(planningWeek!, selections, lockedDays, leftoverAssignments, excludedDefaults);
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
                                className="text-sm font-black uppercase tracking-widest text-[var(--accent-sage)] hover:text-[var(--foreground)] flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-sm border border-[var(--border-subtle)] hover:shadow-md transition-all"
                            >
                                🔄 Regenerate Unlocked Days
                            </button>
                        </div>
                    </div>
                )}

                {isReplacing && (
                    <ReplacementModal
                        day={isReplacing.day}
                        currentMeal={isReplacing.currentMeal}
                        recipes={recipes}
                        leftoverInventory={inventory?.meals || []}
                        onConfirm={(newMeal, req, status) => handleReplacementConfirm(newMeal, req, status)}
                        onCancel={() => setIsReplacing(null)}
                    />
                )}
            </main>
        );
    }

    const WeeklyMealGrid = ({ phase }: { phase: 'dinners' | 'lunches' | 'snacks' }) => {
        const days = phase === 'snacks' ? ['mon', 'tue', 'wed', 'thu', 'fri'] : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const displayDays = phase === 'lunches' ? ['mon', 'tue', 'wed', 'thu', 'fri'] : days;

        const getSlotContent = (day: string, slot: string) => {
            const leftover = leftoverAssignments.find(l => l.day === day && l.slot === slot);
            if (leftover) return { type: 'Leftover', name: leftover.item, color: 'purple' };

            const selection = selections.find(s => s.day === day && (s as any).slot === slot);
            if (selection) return { type: 'Recipe', name: selection.recipe_name, color: slot === 'dinner' ? 'sage' : 'blue' };

            return null;
        };

        const slots = phase === 'dinners' ? ['dinner'] :
            phase === 'lunches' ? ['lunch'] :
                ['school_snack', 'home_snack'];

        return (
            <div className={`grid grid-cols-1 ${displayDays.length > 1 ? 'md:grid-cols-7' : 'md:grid-cols-2'} gap-4 mb-12`}>
                {displayDays.map(day => (
                    <div key={day} className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">{day}</h3>
                        {slots.map(slot => {
                            const content = getSlotContent(day, slot);
                            const isConfirmed = confirmedSelections[`${day}-${slot}`];

                            return (
                                <div key={slot} className={`card p-4 min-h-[140px] flex flex-col justify-between transition-all ${isConfirmed ? 'border-[var(--accent-sage)] bg-green-50/30' : 'border-dashed border-gray-200 bg-white'}`}>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[8px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded leading-none ${slot === 'school_snack' ? 'bg-amber-100 text-amber-700' :
                                                slot === 'home_snack' ? 'bg-orange-100 text-orange-700' :
                                                    content?.type === 'Leftover' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                {slot === 'school_snack' ? 'School' : slot === 'home_snack' ? 'Home' : content?.type || slot}
                                            </span>
                                            {isConfirmed && <span className="text-[var(--accent-sage)] text-xs">✓</span>}
                                        </div>
                                        <p className="text-sm font-bold leading-tight mt-2 line-clamp-3 h-[3.5em]">
                                            {content?.name || 'Empty'}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2 mt-4">
                                        {!isConfirmed ? (
                                            <button
                                                onClick={() => setConfirmedSelections(prev => ({ ...prev, [`${day}-${slot}`]: true }))}
                                                className="w-full py-2 bg-[var(--accent-sage)] text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:opacity-90 transition-all"
                                            >
                                                Confirm
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmedSelections(prev => ({ ...prev, [`${day}-${slot}`]: false }))}
                                                className="w-full py-2 bg-white border border-[var(--accent-sage)] text-[var(--accent-sage)] text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:bg-green-50 transition-all"
                                            >
                                                Confirmed
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsReplacing({ day, slot, currentMeal: content?.name || '' })}
                                            className="w-full py-2 bg-gray-50 text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-100 transition-all"
                                        >
                                            Swap
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    // STEP 2: SUGGESTIONS (Dinners, Lunches, Snacks)
    if (step === 'suggestions') {
        const toggleSelection = (recipe: { id: string, name: string }, slot: string) => {
            const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
            const alreadySelected = selections.find(s => (s as any).slot === slot && s.recipe_id === recipe.id);

            if (alreadySelected) {
                setSelections(prev => prev.filter(s => !((s as any).slot === slot && s.recipe_id === recipe.id)));
            } else {
                // Remove existing for this slot across all days
                const baseSelections = selections.filter(s => (s as any).slot !== slot);
                const newSelections = days.map(day => ({
                    day,
                    slot,
                    recipe_id: recipe.id,
                    recipe_name: recipe.name
                }));
                setSelections([...baseSelections, ...newSelections]);
            }
        };

        const toggleDaySelection = (recipe: { id: string, name: string }, slot: string, day: string) => {
            const alreadySelected = selections.find(s => s.day === day && (s as any).slot === slot && s.recipe_id === recipe.id);

            if (alreadySelected) {
                setSelections(prev => prev.filter(s => !(s.day === day && (s as any).slot === slot)));
            } else {
                const baseSelections = selections.filter(s => !(s.day === day && (s as any).slot === slot));
                setSelections([...baseSelections, {
                    day,
                    slot,
                    recipe_id: recipe.id,
                    recipe_name: recipe.name
                }]);
            }
        };

        const isSlotSelected = (recipeId: string, slot: string, day?: string) => {
            if (day) {
                return selections.some(s => s.day === day && (s as any).slot === slot && s.recipe_id === recipeId);
            }
            return selections.some(s => (s as any).slot === slot && s.recipe_id === recipeId);
        };

        return (
            <main className="container mx-auto max-w-5xl px-4 py-12">
                <WizardProgress currentStep={step} />

                <header className="mb-12">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{suggestionPhase === 'dinners' ? '🍳' : suggestionPhase === 'lunches' ? '🍱' : '🍿'}</span>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    {suggestionPhase === 'dinners' ? 'Confirm Dinners' :
                                        suggestionPhase === 'lunches' ? 'Confirm Lunches' : 'Confirm Snacks'}
                                </h1>
                            </div>
                            <p className="text-[var(--text-muted)] max-w-xl">
                                {suggestionPhase === 'dinners'
                                    ? 'We’ve auto-filled your week with Waste-Not suggestions. Confirm or swap as needed.' :
                                    suggestionPhase === 'lunches'
                                        ? 'Lunches pre-filled using fridge leftovers first, then context-aware recipes.'
                                        : 'Snacks confirmed for school and home. Adjust if the kids need something else!'
                                }
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <button
                                onClick={async () => {
                                    if (suggestionPhase === 'dinners') {
                                        setSuggestionPhase('lunches');
                                        window.scrollTo(0, 0);
                                    } else if (suggestionPhase === 'lunches') {
                                        setSuggestionPhase('snacks');
                                        window.scrollTo(0, 0);
                                    } else {
                                        setSubmitting(true);
                                        try {
                                            await createWeek(planningWeek!);
                                            const res = await generateDraft(planningWeek!, selections, [], leftoverAssignments, excludedDefaults);
                                            setDraftPlan(res.plan_data);
                                            setStep('draft');
                                        } catch (e) {
                                            console.error(e);
                                            showToast('Failed to generate plan', 'error');
                                        } finally {
                                            setSubmitting(false);
                                        }
                                    }
                                }}
                                disabled={submitting}
                                className="btn-premium px-8 py-4 shadow-xl flex items-center gap-2 text-sm"
                            >
                                {submitting ? '...' : (suggestionPhase === 'lunches' ? 'Next: Plan Snacks →' : suggestionPhase === 'dinners' ? 'Next: Plan Lunches →' : 'Review Draft ✨')}
                            </button>
                            <button onClick={() => setStep('inventory')} className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-sage)] transition-colors">
                                ← Back to Inventory
                            </button>
                        </div>
                    </div>
                </header>

                {loadingSuggestions || !suggestionOptions ? (
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
                    </div>
                ) : (
                    <WeeklyMealGrid phase={suggestionPhase} />
                )}
                {isReplacing && (
                    <ReplacementModal
                        day={isReplacing.day}
                        currentMeal={isReplacing.currentMeal}
                        recipes={recipes}
                        leftoverInventory={inventory?.meals || []}
                        onConfirm={(newMeal, req, status) => handleReplacementConfirm(newMeal, req, status)}
                        onCancel={() => setIsReplacing(null)}
                    />
                )}
            </main>
        );
    }

    // STEP 3: INVENTORY UI
    if (step === 'inventory') {
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
                        onConfirm={(newMeal, req, status) => handleReplacementConfirm(newMeal, req, status)}
                        onCancel={() => setIsReplacing(null)}
                    />
                )}
            </main>
        );
    }

    // STEP 2: REVIEW SNACKS UI
    if (step === 'review_snacks') {
        const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

        return (
            <main className="container mx-auto max-w-3xl px-4 py-12">
                <WizardProgress currentStep={step} />

                <header className="mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold">Review Snacks</h1>
                            <p className="text-[var(--text-muted)] mt-2">
                                Log what snacks were actually eaten last week.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <button onClick={handleSubmitReview} disabled={submitting} className="btn-premium px-8 py-4 shadow-xl flex items-center gap-2 text-sm">
                                {submitting ? '...' : 'Next: Update Inventory →'}
                            </button>
                            <button onClick={() => setStep('review_meals')} className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-sage)] transition-colors">
                                ← Back to Meals
                            </button>
                        </div>
                    </div>
                </header>

                <div className="space-y-6">
                    {reviews.map((day) => (
                        <div key={day.day} className="card">
                            <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2 mb-4">
                                <span className="font-mono text-sm uppercase text-[var(--accent-sage)] tracking-widest">{(dayNames as any)[day.day]}</span>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-1">🏫 School Snack</label>
                                    <input
                                        type="text"
                                        value={day.snacks.school_snack || ''}
                                        onChange={(e) => handleUpdateSnack(day.day, 'school_snack', e.target.value)}
                                        placeholder={day.planned_snacks.school_snack || 'Not logged'}
                                        className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-1">🏠 Home Snack</label>
                                    <input
                                        type="text"
                                        value={day.snacks.home_snack || ''}
                                        onChange={(e) => handleUpdateSnack(day.day, 'home_snack', e.target.value)}
                                        placeholder={day.planned_snacks.home_snack || 'Not logged'}
                                        className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center mt-12 mb-8 items-center px-4 py-6">
                    <p className="text-sm text-[var(--text-muted)] italic">Ready to move on?</p>
                </div>
            </main>
        );
    }

    // STEP 1: REVIEW DINNERS UI
    // STEP 1: REVIEW MEALS UI
    if (step === 'review_meals') {
        const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

        return (
            <main className="container mx-auto max-w-3xl px-4 py-12">
                <WizardProgress currentStep={step} />

                <header className="mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold">Review Last Week's Meals</h1>
                            <p className="text-[var(--text-muted)] mt-2">
                                Confirm what you actually ate for dinners and lunches.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <button onClick={() => setStep('review_snacks')} className="btn-premium px-8 py-4 shadow-xl flex items-center gap-2 text-sm">
                                Next: Review Snacks →
                            </button>
                        </div>
                    </div>
                </header>

                <div className="space-y-6">
                    {reviews.map((day) => (
                        <div key={day.day} className="card overflow-visible">
                            <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2 mb-4">
                                <span className="font-mono text-sm uppercase text-[var(--accent-sage)] tracking-widest">{(dayNames as any)[day.day]}</span>
                            </div>

                            <div className="space-y-6">
                                {/* Dinner Review */}
                                <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <label className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-1">Dinner</label>
                                            <h3 className="text-lg font-bold">{day.dinner.planned_recipe_name || 'No dinner planned'}</h3>
                                        </div>
                                        <div className="flex bg-[var(--bg-primary)] rounded p-1 border border-[var(--border-subtle)]">
                                            <button
                                                onClick={() => handleUpdateDinner(day.day, 'made', true)}
                                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${day.dinner.made === true ? 'bg-[var(--accent-sage)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'}`}
                                            >
                                                Made It
                                            </button>
                                            <button
                                                onClick={() => handleUpdateDinner(day.day, 'made', false)}
                                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${day.dinner.made === false ? 'bg-[var(--accent-terracotta)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'}`}
                                            >
                                                Skipped
                                            </button>
                                        </div>
                                    </div>

                                    {day.dinner.made === false && (
                                        <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-1">What did you eat instead?</label>
                                            <input
                                                type="text"
                                                value={day.dinner.instead_meal || day.dinner.actual_meal || ''}
                                                onChange={(e) => handleUpdateDinner(day.day, 'instead_meal', e.target.value)}
                                                placeholder="e.g. Takeout, Leftovers..."
                                                className="w-full p-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-sm focus:ring-1 focus:ring-[var(--accent-terracotta)]"
                                            />
                                        </div>
                                    )}

                                    {/* Leftovers Input - Now always visible if made */}
                                    {day.dinner.made !== null && (
                                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-4">
                                            <div className="flex-shrink-0">
                                                <label className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-1">Leftover Servings</label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleUpdateDinner(day.day, 'leftovers_qty', Math.max(0, (day.dinner.leftovers_qty || 0) - 1))}
                                                        className="w-8 h-8 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center hover:bg-[var(--bg-secondary)]"
                                                    >-</button>
                                                    <input
                                                        type="number"
                                                        value={day.dinner.leftovers_qty || 0}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            handleUpdateDinner(day.day, 'leftovers_qty', val);
                                                            handleUpdateDinner(day.day, 'leftovers', val > 0);
                                                        }}
                                                        className="w-12 text-center bg-transparent font-bold"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newVal = (day.dinner.leftovers_qty || 0) + 1;
                                                            handleUpdateDinner(day.day, 'leftovers_qty', newVal);
                                                            handleUpdateDinner(day.day, 'leftovers', true);
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center hover:bg-[var(--bg-secondary)]"
                                                    >+</button>
                                                </div>
                                            </div>

                                            {(day.dinner.leftovers_qty || 0) > 0 && (
                                                <div className="flex-grow animate-in fade-in slide-in-from-left-2">
                                                    <label className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-1">Leftover Label</label>
                                                    <input
                                                        type="text"
                                                        value={day.dinner.leftovers_note || ''}
                                                        onChange={(e) => handleUpdateDinner(day.day, 'leftovers_note', e.target.value)}
                                                        placeholder="e.g. Chicken Tikka"
                                                        className="w-full p-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Lunch Reviews */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-3 bg-[var(--bg-secondary)] bg-opacity-50 rounded-lg border border-[var(--border-subtle)]">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent-terracotta)] block mb-1">🍱 Kids Lunch</label>
                                        <input
                                            type="text"
                                            value={day.snacks.kids_lunch || ''}
                                            onChange={(e) => handleUpdateSnack(day.day, 'kids_lunch', e.target.value)}
                                            placeholder={day.planned_snacks.kids_lunch || 'Planned Lunch'}
                                            className="w-full p-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-xs"
                                        />
                                    </div>
                                    <div className="p-3 bg-[var(--bg-secondary)] bg-opacity-50 rounded-lg border border-[var(--border-subtle)]">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent-terracotta)] block mb-1">🥗 Adult Lunch</label>
                                        <input
                                            type="text"
                                            value={day.snacks.adult_lunch || ''}
                                            onChange={(e) => handleUpdateSnack(day.day, 'adult_lunch', e.target.value)}
                                            placeholder="Leftovers/Manual"
                                            className="w-full p-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between mt-12 mb-8 items-center px-4 py-6 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <p className="text-sm text-[var(--text-muted)] italic">Great! Reviewing meals helps us track your fridge inventory.</p>
                    <button onClick={() => setStep('review_snacks')} className="btn-primary shadow-lg scale-110 px-8">
                        Next: Snacks →
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
