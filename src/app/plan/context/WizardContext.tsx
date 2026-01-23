
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
import { useToast } from '@/context/ToastContext';
import { ReviewDay } from '@/types';

interface WizardContextType {
    // State
    loading: boolean;
    setLoading: (loading: boolean) => void;
    reviews: ReviewDay[];
    setReviews: React.Dispatch<React.SetStateAction<ReviewDay[]>>;
    reviewWeek: string | null;
    planningWeek: string | null;
    inventory: NormalizedInventory | null;
    pendingChanges: { category: string, item: string, quantity: number, type?: 'meal' | 'ingredient', operation: 'add' | 'remove' | 'update' }[];
    newItemInputs: Record<string, { name: string, qty: number, type?: 'meal' | 'ingredient' }>;
    setNewItemInputs: React.Dispatch<React.SetStateAction<Record<string, { name: string, qty: number, type?: 'meal' | 'ingredient' }>>>;
    submitting: boolean;
    setSubmitting: (submitting: boolean) => void;
    step: 'review_meals' | 'review_snacks' | 'inventory' | 'suggestions' | 'draft' | 'groceries';
    setStep: (step: 'review_meals' | 'review_snacks' | 'inventory' | 'suggestions' | 'draft' | 'groceries') => void;
    suggestionPhase: 'dinners' | 'lunches' | 'snacks';
    setSuggestionPhase: (phase: 'dinners' | 'lunches' | 'snacks') => void;
    error: string | null;
    suggestions: any[];
    selectedSuggestions: string[];
    draftPlan: any;
    setDraftPlan: (plan: any) => void;
    selections: { day: string, slot: string, recipe_id: string, recipe_name: string }[];
    setSelections: React.Dispatch<React.SetStateAction<{ day: string, slot: string, recipe_id: string, recipe_name: string }[]>>;
    suggestionOptions: {
        snacks: { id: string, name: string }[],
        lunch_recipes: { id: string, name: string }[],
        lunch_defaults: { kids: string[], adult: string[] }
    } | null;
    loadingSuggestions: boolean;
    leftoverAssignments: { day: string, slot: 'lunch' | 'dinner', item: string }[];
    lockedDays: string[];
    setLockedDays: React.Dispatch<React.SetStateAction<string[]>>;
    isReplacing: { day: string, slot: string, currentMeal: string } | null;
    setIsReplacing: (val: { day: string, slot: string, currentMeal: string } | null) => void;
    recipes: { id: string; name: string }[];
    wasteNotSuggestions: any[];
    confirmedSelections: Record<string, boolean>;
    setConfirmedSelections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    excludedDefaults: string[];
    shoppingList: { item: string; store: string }[];
    setShoppingList: React.Dispatch<React.SetStateAction<{ item: string; store: string }[]>>;
    purchasedItems: string[];
    setPurchasedItems: React.Dispatch<React.SetStateAction<string[]>>;
    customShoppingItems: string[];
    setCustomShoppingItems: React.Dispatch<React.SetStateAction<string[]>>;
    newShoppingItem: string;
    setNewShoppingItem: (val: string) => void;
    router: any;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;

    // Handlers
    handleAddItem: (category: string, subType?: 'meal' | 'ingredient') => void;
    handleRemoveItem: (category: string, item: string, type?: 'meal' | 'ingredient') => void;
    handleUpdateQuantity: (category: string, itemName: string, delta: number, type?: 'meal' | 'ingredient') => void;
    handleSaveInventory: () => Promise<void>;
    getDisplayList: (mode: string) => any[];
    handleUpdateDinner: (day: string, field: keyof ReviewDay['dinner'], value: any) => void;
    handleUpdateSnack: (day: string, field: keyof ReviewDay['snacks'], value: string) => void;
    handleSubmitReview: () => Promise<void>;
    loadSuggestions: () => Promise<void>;
    createWeek: (week: string) => Promise<any>;
    generateDraft: (week: string, selections: any[], locked: any[], leftovers: any[], excluded?: any[]) => Promise<any>;
    finalizePlan: (week: string) => Promise<any>;
    bulkUpdateInventory: (updates: any[]) => Promise<any>;
    getShoppingList: (week: string) => Promise<any>;
    handleReplacementConfirm: (newMeal: string, requestRecipe?: boolean, madeStatus?: boolean | string) => Promise<void>;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const WizardProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const loadedState = useRef(false);

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

    // Initial check for active plan
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const weekParam = searchParams.get('week');
                const status = await getStatus(weekParam || undefined);

                if (status.state === 'active' || status.state === 'plan_complete') {
                    console.log("Plan is active, redirecting to week view");
                    router.push(`/week-view?week=${status.week_of}`);
                }
            } catch (e) {
                console.error("Failed to check status", e);
            }
        };
        checkStatus();
    }, [searchParams, router]);

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
        const pendingAddIdx = pendingChanges.findIndex(c => c.category === category && c.item === item && c.operation === 'add');
        if (pendingAddIdx !== -1) {
            setPendingChanges(prev => prev.filter((_, i) => i !== pendingAddIdx));
        } else {
            setPendingChanges(prev => [...prev, { category, item, quantity: 0, operation: 'remove', type }]);
        }
    };

    const loadInventory = useCallback(async () => {
        try {
            const response = await getInventory();
            const processedInventory = transformInventory(response);
            setInventory(processedInventory);
            setNewItemInputs({});
        } catch (e) {
            showToast('Failed to load inventory', 'error');
        }
    }, [showToast]);

    const autoDraftSelections = useCallback((phase: 'dinners' | 'lunches' | 'snacks', options: any, currentInventory: any) => {
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
                    const mealWithQty = availableMeals.find((m: any) => {
                        const assigned = newLeftovers.filter(l => l.item === m.item).length;
                        return m.quantity - assigned > 0;
                    });

                    if (mealWithQty) {
                        newLeftovers.push({ day, slot: 'dinner', item: mealWithQty.item });
                    } else if (wasteNot[idx]) {
                        newSelections.push({
                            day,
                            slot: 'dinner',
                            recipe_id: wasteNot[idx].recipe_id || wasteNot[idx].id,
                            recipe_name: wasteNot[idx].recipe_name || wasteNot[idx].name
                        });
                    } else if (commonDinners[idx % commonDinners.length]) {
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
                    const mealWithQty = availableMeals.find((m: any) => {
                        const assigned = newLeftovers.filter(l => l.item === m.item).length;
                        return m.quantity - assigned > 0;
                    });

                    if (mealWithQty) {
                        newLeftovers.push({ day, slot: 'lunch', item: mealWithQty.item });
                    } else if (lunchRecipes[0]) {
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
                const existingSchool = newSelections.find(s => (s as any).slot === 'school_snack');
                if (!existingSchool) {
                    workDays.forEach(day => {
                        newSelections.push({ day, slot: 'school_snack', recipe_id: snackRecipes[0].id, recipe_name: snackRecipes[0].name });
                    });
                }
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

    const loadSuggestions = useCallback(async () => {
        setLoadingSuggestions(true);
        setError(null);
        try {
            let wasteData: any = { suggestions: [] };
            if (suggestionPhase === 'dinners') {
                wasteData = await getWasteNotSuggestions();
                setWasteNotSuggestions(wasteData.suggestions || []);
            }

            const data = await getSuggestOptions(selections, leftoverAssignments);
            setSuggestionOptions(data);

            autoDraftSelections(suggestionPhase, { ...data, wasteNot: wasteData.suggestions }, inventory);
        } catch (e) {
            console.error(e);
            setError('Failed to load suggestions. Please check your connection.');
            showToast('Failed to load suggestions', 'error');
        } finally {
            setLoadingSuggestions(false);
        }
    }, [suggestionPhase, selections, leftoverAssignments, inventory, showToast, autoDraftSelections]);

    // Initial load effects
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
                        unit: 'unit',
                        type: change.type,
                        operation: 'add' as const
                    };
                } else if (change.operation === 'update') {
                    return {
                        category: change.category,
                        item: change.item,
                        quantity: change.quantity,
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
                setPendingChanges([]);
                setLoading(true);
                await loadInventory();
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
                const otherChanges = prev.filter(c => !(c.category === category && c.item === itemName));
                const change = {
                    category,
                    item: itemName,
                    quantity: newQty,
                    type,
                    operation: 'update' as const
                };
                return [...otherChanges, change];
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

                if (field === 'leftovers' && value === true && !updatedDinner.leftovers_note) {
                    const mealName = updatedDinner.planned_recipe_name || updatedDinner.actual_meal || 'Meal';
                    updatedDinner.leftovers_note = `Leftover ${mealName}`;
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

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const weekParam = searchParams.get('week');

            try {
                const data = await getLastWeekReview();

                if (data && (data.days || data.reviews)) {
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
                            leftovers_qty: d.dinner?.leftovers_qty || d.dinner?.servings || 1,
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
                    await loadInventory();
                    setStep('inventory');
                    if (weekParam) setPlanningWeek(weekParam);
                    else if (data && data.next_week_of) setPlanningWeek(data.next_week_of);
                }
            } catch (error) {
                console.error('No reviewable week found, starting new plan.', error);
                await loadInventory();
                setStep('inventory');
                if (weekParam) setPlanningWeek(weekParam);
            }
            setLoading(false);
        };
        load();
    }, [searchParams, loadInventory]);

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

    useEffect(() => {
        if (!planningWeek) return;

        const timer = setTimeout(() => {
            saveWizardState(planningWeek, {
                step,
                reviews,
                pendingChanges,
                selections,
                shoppingList,
                purchasedItems,
                customShoppingItems,
                lockedDays,
                leftoverAssignments
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [step, reviews, pendingChanges, selections, shoppingList, planningWeek, leftoverAssignments, purchasedItems, customShoppingItems, lockedDays]);

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

        if (madeStatus === 'leftovers') {
            const newLeftovers = [
                ...leftoverAssignments.filter(l => !(l.day === day && l.slot === slot)),
                { day, slot: slot as 'lunch' | 'dinner', item: newMeal }
            ];
            setLeftoverAssignments(newLeftovers);
            setSelections(prev => prev.filter(s => !(s.day === day && (s as any).slot === slot)));
        } else {
            const recipe = recipes.find(r => r.name === newMeal);
            const recipeId = recipe ? recipe.id : newMeal;
            const recipeName = newMeal;

            let newSelections;
            if (slot === 'school_snack' || slot === 'home_snack') {
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
            setLeftoverAssignments(prev => prev.filter(l => !(l.day === day && l.slot === slot)));
        }

        setConfirmedSelections(prev => ({ ...prev, [`${day}-${slot}`]: true }));
        setIsReplacing(null);

        if (step === 'draft' && planningWeek) {
            setLoading(true);
            try {
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

    const value: WizardContextType = {
        loading, setLoading,
        reviews, setReviews,
        reviewWeek, planningWeek,
        inventory, pendingChanges,
        newItemInputs, setNewItemInputs,
        submitting, setSubmitting,
        step, setStep,
        suggestionPhase, setSuggestionPhase,
        error, suggestions, selectedSuggestions,
        draftPlan, setDraftPlan,
        selections, setSelections,
        suggestionOptions, loadingSuggestions,
        leftoverAssignments, lockedDays, setLockedDays,
        isReplacing, setIsReplacing,
        recipes, wasteNotSuggestions,
        confirmedSelections, setConfirmedSelections,
        excludedDefaults,
        shoppingList, setShoppingList,
        purchasedItems, setPurchasedItems,
        customShoppingItems, setCustomShoppingItems,
        newShoppingItem, setNewShoppingItem,
        router, showToast,
        handleAddItem, handleRemoveItem, handleUpdateQuantity,
        handleSaveInventory, getDisplayList,
        handleUpdateDinner, handleUpdateSnack, handleSubmitReview,
        loadSuggestions, createWeek, generateDraft, finalizePlan,
        bulkUpdateInventory, getShoppingList, handleReplacementConfirm
    };

    return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
};

export const useWizardContext = () => {
    const context = useContext(WizardContext);
    if (!context) {
        throw new Error('useWizardContext must be used within a WizardProvider');
    }
    return context;
};
