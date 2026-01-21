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

import { useToast } from '@/context/ToastContext';
import { ReviewStep } from './components/ReviewStep';
import { InventoryStep } from './components/InventoryStep';
import { DraftStep } from './components/DraftStep';
import { SuggestionsStep } from './components/SuggestionsStep';
import { GroceryStep } from './components/GroceryStep';
import { WizardProgress } from './components/WizardProgress';

import { ReviewDay, InventoryState } from '@/types';



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
    const [error, setError] = useState<string | null>(null);

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

    const autoDraftSelections = React.useCallback((phase: 'dinners' | 'lunches' | 'snacks', options: any, currentInventory: any) => {
        const newSelections = [...selections];
        const newLeftovers = [...leftoverAssignments];
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const workDays = ['mon', 'tue', 'wed', 'thu', 'fri'];

        if (phase === 'dinners') {
            const availableMeals = (currentInventory?.meals || []).filter((m: any) => m.quantity > 0 && m.location === 'fridge');
            const wasteNot = options.wasteNot || [];
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

        if (JSON.stringify(newSelections) !== JSON.stringify(selections)) {
            setSelections(newSelections);
        }
        if (JSON.stringify(newLeftovers) !== JSON.stringify(leftoverAssignments)) {
            setLeftoverAssignments(newLeftovers);
        }
    }, [selections, leftoverAssignments]);

    const loadSuggestions = React.useCallback(async () => {
        setLoadingSuggestions(true);
        setError(null);
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
            setError('Failed to load suggestions. Please check your connection.');
            showToast('Failed to load suggestions', 'error');
        } finally {
            setLoadingSuggestions(false);
        }
    }, [suggestionPhase, selections, leftoverAssignments, inventory, showToast, autoDraftSelections]);

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
        return (
            <GroceryStep
                step={step}
                planningWeek={planningWeek}
                shoppingList={shoppingList}
                customShoppingItems={customShoppingItems}
                setCustomShoppingItems={setCustomShoppingItems}
                purchasedItems={purchasedItems}
                setPurchasedItems={setPurchasedItems}
                submitting={submitting}
                setSubmitting={setSubmitting}
                setStep={setStep}
                bulkUpdateInventory={bulkUpdateInventory}
                finalizePlan={finalizePlan}
                showToast={showToast}
                router={router}
                loading={loading}
            />
        );
    }

    // STEP 5: TENTATIVE PLAN UI
    if (step === 'draft') {
        return (
            <DraftStep
                step={step}
                planningWeek={planningWeek}
                draftPlan={draftPlan}
                setDraftPlan={setDraftPlan}
                loading={loading}
                setLoading={setLoading}
                setStep={setStep}
                lockedDays={lockedDays}
                setLockedDays={setLockedDays}
                isReplacing={isReplacing}
                setIsReplacing={setIsReplacing}
                handleReplacementConfirm={handleReplacementConfirm}
                generateDraft={generateDraft}
                getShoppingList={getShoppingList}
                setShoppingList={setShoppingList}
                showToast={showToast}
                selections={selections}
                leftoverAssignments={leftoverAssignments}
                excludedDefaults={excludedDefaults}
                recipes={recipes}
                inventory={inventory}
            />
        );
    }



    // STEP 2: SUGGESTIONS (Dinners, Lunches, Snacks)
    if (step === 'suggestions') {
        return (
            <SuggestionsStep
                step={step}
                suggestionPhase={suggestionPhase}
                setSuggestionPhase={setSuggestionPhase}
                selections={selections}
                setSelections={setSelections}
                planningWeek={planningWeek}
                setStep={setStep}
                submitting={submitting}
                setSubmitting={setSubmitting}
                createWeek={createWeek}
                generateDraft={generateDraft}
                setDraftPlan={setDraftPlan}
                showToast={showToast}
                loadingSuggestions={loadingSuggestions}
                suggestionOptions={suggestionOptions}
                error={error}
                loadSuggestions={loadSuggestions}
                leftoverAssignments={leftoverAssignments}
                confirmedSelections={confirmedSelections}
                setConfirmedSelections={setConfirmedSelections}
                isReplacing={isReplacing}
                setIsReplacing={setIsReplacing}
                handleReplacementConfirm={handleReplacementConfirm}
                recipes={recipes}
                inventory={inventory}
                excludedDefaults={excludedDefaults}
            />
        );
    }

    // STEP 3: INVENTORY UI
    if (step === 'inventory') {
        return (
            <InventoryStep
                step="inventory"
                planningWeek={planningWeek}
                submitting={submitting}
                setStep={setStep}
                handleSaveInventory={handleSaveInventory}
                newItemInputs={newItemInputs}
                setNewItemInputs={setNewItemInputs}
                handleAddItem={handleAddItem}
                handleRemoveItem={handleRemoveItem}
                handleUpdateQuantity={handleUpdateQuantity}
                getDisplayList={getDisplayList}
                pendingChanges={pendingChanges}
                isReplacing={isReplacing}
                setIsReplacing={setIsReplacing}
                handleReplacementConfirm={handleReplacementConfirm}
                recipes={recipes}
                inventory={inventory}

            />
        );
    }

    // STEP 2: REVIEW SNACKS UI
    if (step === 'review_snacks') {
        const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
        return (
            <ReviewStep
                step="review_snacks"
                reviews={reviews}
                submitting={submitting}
                setStep={setStep}
                handleUpdateDinner={handleUpdateDinner}
                handleUpdateSnack={handleUpdateSnack}
                handleSubmitReview={handleSubmitReview}
                dayNames={dayNames}

            />
        );
    }

    // STEP 1: REVIEW DINNERS UI
    // STEP 1: REVIEW MEALS UI
    if (step === 'review_meals') {
        const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
        return (
            <ReviewStep
                step="review_meals"
                reviews={reviews}
                submitting={submitting}
                setStep={setStep}
                handleUpdateDinner={handleUpdateDinner}
                handleUpdateSnack={handleUpdateSnack}
                handleSubmitReview={handleSubmitReview}
                dayNames={dayNames}

            />
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
