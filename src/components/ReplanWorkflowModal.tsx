'use client';

import { useState, useEffect, useMemo } from 'react';
import { logMeal, addItemToInventory, replan, WorkflowStatus, getInventory, deleteItemFromInventory } from '@/lib/api';
import { transformInventory } from '@/lib/inventoryManager';
import MealLogFlow from './MealLogFlow';
import { FreezerMeal, InventoryItem } from '@/types';
import { useToast } from '@/context/ToastContext';
import ReviewGroceriesModal from './ReviewGroceriesModal';

interface ReplanWorkflowModalProps {
    status: WorkflowStatus;
    onComplete: () => void;
    onCancel: () => void;
    recipes: { id: string; name: string }[];
}

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function ReplanWorkflowModal({
    status,
    onComplete,
    onCancel,
    recipes
}: ReplanWorkflowModalProps) {
    const [step, setStep] = useState<'confirm_meals' | 'inventory' | 'strategy' | 'configure' | 'constraints' | 'replan' | 'groceries'>('confirm_meals');
    const [notes, setNotes] = useState('');
    const [currentDayIndex, setCurrentDayIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    // Inventory state
    const [inventory, setInventory] = useState<any>(null);
    const [freezerMeals, setFreezerMeals] = useState<FreezerMeal[]>([]);
    const [leftoverItems, setLeftoverItems] = useState<InventoryItem[]>([]);
    const [newItem, setNewItem] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('fridge');
    const [deleting, setDeleting] = useState<string | null>(null);

    // Advanced Replan State
    const [strategy, setStrategy] = useState<'shuffle' | 'fresh'>('shuffle');
    const [keepDays, setKeepDays] = useState<string[]>([]);
    const [prepDays, setPrepDays] = useState<string[]>([]);


    // Memoize pastDays to stabilize dependency
    const pastDays = useMemo(() => {
        const todayIndex = days.indexOf(status.current_day || 'mon');
        return days.slice(0, todayIndex + 1);
    }, [status.current_day]);

    // Skip days that are already confirmed/made
    useEffect(() => {
        // Find first unconfirmed day
        let firstUnconfirmed = 0;
        for (let i = 0; i < pastDays.length; i++) {
            const day = pastDays[i];
            // Check if dinner is confirmed (made is set)
            const dinner = status.week_data?.dinners?.find((d: any) => d.day === day);
            // Also check daily feedback for completeness? 
            // For Replan, we mostly care about Dinner usage for leftovers/prep logic
            if (dinner?.made === undefined) {
                firstUnconfirmed = i;
                break;
            } else if (i === pastDays.length - 1) {
                // All confirmed?
                if (dinner?.made !== undefined) {
                    firstUnconfirmed = -1; // All done
                }
            }
        }

        if (firstUnconfirmed === -1) {
            setStep('inventory');
        } else {
            setCurrentDayIndex(firstUnconfirmed);
        }
    }, [pastDays, status.week_data]); // Run when structure or content might change

    useEffect(() => {
        // We always need inventory for MealLogFlow "Something Else" options
        loadInventory();
    }, []);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const data = await getInventory();
            const processed = transformInventory(data);
            setInventory(processed);

            // Extract typed versions for MealLogFlow
            setFreezerMeals(processed.meals.filter(m => m.location === 'freezer'));
            setLeftoverItems(processed.meals.filter(m => m.location === 'fridge'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const currentDay = pastDays[currentDayIndex];
    const currentDinner = status.week_data?.dinners?.find((d: any) => d.day === currentDay);
    const dinnerName = currentDinner?.recipe_id?.replace(/_/g, ' ') || 'Unplanned';



    const handleAddItem = async () => {
        if (!newItem.trim()) return;
        setLoading(true);
        try {
            const res = await addItemToInventory(newItemCategory, newItem.trim());
            const processed = transformInventory(res.inventory || res);
            setInventory(processed);
            setNewItem('');
        } catch (e) {
            showToast('Failed to add item', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteItem = async (category: string, item: string) => {
        setDeleting(item);
        try {
            const res = await deleteItemFromInventory(category, item);
            const processed = transformInventory(res.inventory || res);
            setInventory(processed);
        } catch (e) {
            showToast('Failed to delete item', 'error');
        } finally {
            setDeleting(null);
        }
    };

    const handleReplan = async () => {
        setStep('replan');
        setLoading(true);
        try {
            await replan(notes, strategy, keepDays, prepDays);
            setLoading(false);
            setStep('groceries'); // Move to review step instead of closing
        } catch (e: any) {
            setLoading(false);
            showToast(`Replan failed: ${e.message || 'Unknown error'}`, 'error');
            setStep('constraints'); // Go back on error
        }
    };

    if (loading && step === 'replan') {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-xl text-center">
                    <div className="animate-spin text-4xl mb-4">⟳</div>
                    <h2 className="text-xl font-bold">Replanning Week...</h2>
                    <p className="text-gray-500">Optimizing based on your inventory usage.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {step === 'groceries' && status.week_of ? (
                <ReviewGroceriesModal
                    weekOf={status.week_of}
                    onClose={onComplete} // Finally complete workflow
                />
            ) : (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold">
                                {step === 'confirm_meals' ? 'Confirm Past Meals' :
                                    step === 'inventory' ? 'Update Inventory' :
                                        step === 'strategy' ? 'Choose Strategy' :
                                            step === 'configure' ? 'Configure Plan' :
                                                step === 'constraints' ? 'Special Requests' : 'Replanning'}
                            </h2>
                            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {step === 'confirm_meals' && (
                                <div className="space-y-6">
                                    <p className="text-sm text-gray-500 font-medium">
                                        Before replanning, we need to know what you actually ate so we can track leftover ingredients.
                                    </p>

                                    <div className="p-1 bg-gray-50 rounded-[24px] border border-gray-100 shadow-inner">
                                        <div className="p-4 flex justify-between items-center border-b border-gray-100">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-sage)]">{currentDay?.toUpperCase()} DINNER</h3>
                                        </div>
                                        <MealLogFlow
                                            weekOf={status.week_of}
                                            day={currentDay}
                                            mealName={dinnerName}
                                            initialStatus={currentDinner}
                                            freezerInventory={freezerMeals}
                                            leftoverInventory={leftoverItems}
                                            onSuccess={() => {
                                                if (currentDayIndex < pastDays.length - 1) {
                                                    setCurrentDayIndex(prev => prev + 1);
                                                } else {
                                                    setStep('inventory');
                                                }
                                            }}
                                            isModal={false}
                                            compact={false}
                                            logType="dinner"
                                            recipes={recipes}
                                        />
                                    </div>

                                    <div className="flex justify-center gap-1.5 pt-2">
                                        {pastDays.map((d, i) => (
                                            <div
                                                key={d}
                                                className={`h-1.5 w-6 rounded-full transition-all duration-500 ${i === currentDayIndex ? 'bg-[var(--accent-sage)] scale-x-125 shadow-sm' : i < currentDayIndex ? 'bg-[var(--accent-sage)]/30' : 'bg-gray-100'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 'inventory' && (
                                <div className="space-y-6">
                                    <p className="text-sm text-gray-500">
                                        Add any ingredients you have on hand that aren't listed below. The meal planner will prioritize these.
                                    </p>

                                    <div className="bg-[var(--bg-secondary)] p-4 rounded-lg space-y-3">
                                        <div className="flex gap-2">
                                            <select
                                                value={newItemCategory}
                                                onChange={(e) => setNewItemCategory(e.target.value)}
                                                className="text-sm border border-gray-300 rounded px-2"
                                            >
                                                <option value="fridge">Fridge</option>
                                                <option value="pantry">Pantry</option>
                                                <option value="meals">Freezer Meal</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={newItem}
                                                onChange={(e) => setNewItem(e.target.value)}
                                                placeholder="Add item (e.g. Spinach)"
                                                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                            />
                                            <button
                                                onClick={handleAddItem}
                                                disabled={loading || !newItem.trim()}
                                                className="bg-[var(--accent-sage)] text-white px-3 py-1 rounded"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                                        {/* Meals & Leftovers */}
                                        {(inventory?.meals?.length > 0) && (
                                            <div className="border border-gray-100 rounded-lg p-2 space-y-1">
                                                <h4 className="text-xs font-bold text-orange-400 uppercase ml-2 mb-1">Meals & Leftovers</h4>
                                                {inventory.meals.map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center px-2 py-1 bg-orange-50/50 rounded text-sm group">
                                                        <span>{item.item}</span>
                                                        <div className="flex items-center gap-2">
                                                            {(item.quantity > 1 || item.servings > 1) && (
                                                                <span className="text-xs text-gray-400">x{item.quantity || item.servings}</span>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteItem(item.location === 'freezer' ? 'meals' : 'leftovers', item.item)}
                                                                disabled={deleting === item.item}
                                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-bold px-1"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Fridge */}
                                        <div className="border border-gray-100 rounded-lg p-2 space-y-1">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1">Fridge Ingredients</h4>
                                            {(inventory?.ingredients?.fridge || []).length === 0 && <p className="text-xs text-gray-300 ml-2 italic">Empty</p>}
                                            {(inventory?.ingredients?.fridge || []).map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center px-2 py-1 bg-gray-50 rounded text-sm group">
                                                    <span>{item.item}</span>
                                                    <div className="flex items-center gap-2">
                                                        {item.quantity > 1 && <span className="text-xs text-gray-400">x{item.quantity}</span>}
                                                        <button
                                                            onClick={() => handleDeleteItem('fridge', item.item)}
                                                            disabled={deleting === item.item}
                                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-bold px-1"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Freezer Ingredients */}
                                        {(inventory?.ingredients?.freezer?.length > 0) && (
                                            <div className="border border-gray-100 rounded-lg p-2 space-y-1">
                                                <h4 className="text-xs font-bold text-blue-300 uppercase ml-2 mb-1">Freezer Ingredients</h4>
                                                {inventory.ingredients.freezer.map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center px-2 py-1 bg-blue-50/30 rounded text-sm group">
                                                        <span>{item.item}</span>
                                                        <div className="flex items-center gap-2">
                                                            {item.quantity > 1 && <span className="text-xs text-gray-400">x{item.quantity}</span>}
                                                            <button
                                                                onClick={() => handleDeleteItem('frozen_ingredient', item.item)}
                                                                disabled={deleting === item.item}
                                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-bold px-1"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Pantry */}
                                        <div className="border border-gray-100 rounded-lg p-2 space-y-1">
                                            <h4 className="text-xs font-bold text-amber-600/50 uppercase ml-2 mb-1">Pantry</h4>
                                            {(inventory?.ingredients?.pantry || []).length === 0 && <p className="text-xs text-gray-300 ml-2 italic">Empty</p>}
                                            {(inventory?.ingredients?.pantry || []).map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center px-2 py-1 bg-amber-50/30 rounded text-sm group">
                                                    <span>{item.item}</span>
                                                    <div className="flex items-center gap-2">
                                                        {item.quantity > 1 && <span className="text-xs text-gray-400">x{item.quantity}</span>}
                                                        <button
                                                            onClick={() => handleDeleteItem('pantry', item.item)}
                                                            disabled={deleting === item.item}
                                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-bold px-1"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setStep('strategy')}
                                        className="w-full py-3 bg-[var(--accent-primary)] text-white font-bold rounded shadow-lg hover:shadow-xl transition-all"
                                    >
                                        Next: Choose Strategy →
                                    </button>
                                </div>
                            )}

                            {step === 'strategy' && (
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-gray-700">How should we rebuild your week?</h3>

                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setStrategy('shuffle')}
                                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${strategy === 'shuffle' ? 'border-[var(--accent-sage)] bg-[var(--accent-sage)]/10 ring-1 ring-[var(--accent-sage)]' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <div className="font-bold text-gray-900">Shuffle Remaining Mechanics</div>
                                            <div className="text-xs text-gray-500 mt-1">Keep existing meals but fill gaps and optimize order. Best for minor tweaks.</div>
                                        </button>

                                        <button
                                            onClick={() => setStrategy('fresh')}
                                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${strategy === 'fresh' ? 'border-[var(--accent-sage)] bg-[var(--accent-sage)]/10 ring-1 ring-[var(--accent-sage)]' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <div className="font-bold text-gray-900">Fresh Plan</div>
                                            <div className="text-xs text-gray-500 mt-1">Generate completely new suggestions for the rest of the week. You can choose to keep specific meals.</div>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setStep(strategy === 'fresh' ? 'configure' : 'constraints')}
                                        className="w-full py-3 bg-[var(--accent-primary)] text-white font-bold rounded shadow-lg hover:shadow-xl transition-all"
                                    >
                                        Next: {strategy === 'fresh' ? 'Configure Plan' : 'Special Requests'} →
                                    </button>
                                </div>
                            )}

                            {step === 'configure' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 mb-2">1. Which meals do you want to KEEP?</h3>
                                        <p className="text-xs text-gray-400 mb-3">Unchecked meals will be replaced with new suggestions.</p>
                                        <div className="space-y-2">
                                            {pastDays.length < days.length && days.slice(pastDays.length).map(day => {
                                                const dinner = status.week_data?.dinners?.find((d: any) => d.day === day);
                                                const mealName = dinner?.recipe_id?.replace(/_/g, ' ') || 'Unplanned';
                                                return (
                                                    <label key={day} className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={keepDays.includes(day)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setKeepDays([...keepDays, day]);
                                                                else setKeepDays(keepDays.filter(d => d !== day));
                                                            }}
                                                            className="rounded border-gray-300 text-[var(--accent-sage)] focus:ring-[var(--accent-sage)]"
                                                        />
                                                        <div className="ml-3">
                                                            <span className="text-xs font-bold uppercase text-gray-400 block">{day}</span>
                                                            <span className="text-sm font-medium text-gray-700">{mealName}</span>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 mb-2">2. Can you prep on these days?</h3>
                                        <p className="text-xs text-gray-400 mb-3">If unchecked, we'll suggest Quick/No-Chop meals.</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {days.slice(pastDays.length).filter(d => !keepDays.includes(d)).map(day => (
                                                <label key={day} className={`px-3 py-2 rounded border cursor-pointer text-sm transition-all ${prepDays.includes(day) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={prepDays.includes(day)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setPrepDays([...prepDays, day]);
                                                            else setPrepDays(prepDays.filter(d => d !== day));
                                                        }}
                                                    />
                                                    {day.toUpperCase()} {prepDays.includes(day) ? '✓' : ''}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setStep('constraints')}
                                        className="w-full py-3 bg-[var(--accent-primary)] text-white font-bold rounded shadow-lg hover:shadow-xl transition-all"
                                    >
                                        Next: Special Requests →
                                    </button>
                                </div>
                            )}

                            {step === 'constraints' && (
                                <div className="space-y-6">
                                    <p className="text-sm text-gray-500">
                                        Filter or re-prioritize your remaining meals. Use this to drop ingredients (e.g., 'No chicken') or move existing meals to sooner days.
                                    </p>

                                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                                        <p className="text-xs text-blue-700 font-bold mb-1">PRO TIP: Try these requests</p>
                                        <ul className="text-[10px] text-blue-600 space-y-1 list-disc ml-4">
                                            <li>"No chicken for the rest of the week"</li>
                                            <li>"I want more vegetarian options"</li>
                                            <li>"Priority: Use up the spinach and broccoli"</li>
                                            <li>"Make Wednesday a quick &lt; 20 min meal"</li>
                                        </ul>
                                    </div>

                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder='Try: "No chicken", "I want the soup sooner", "Prioritize broccoli"...'
                                        className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-sage)] focus:border-transparent text-sm"
                                    />

                                    <button
                                        onClick={handleReplan}
                                        disabled={loading}
                                        className="w-full py-3 bg-[var(--accent-primary)] text-white font-bold rounded shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Replanning...' : 'Confirm & Replan Week →'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
