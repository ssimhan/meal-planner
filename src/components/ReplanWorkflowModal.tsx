'use client';

import { useState, useEffect } from 'react';
import { logMeal, addItemToInventory, replan, WorkflowStatus, getInventory } from '@/lib/api';
import MealCorrectionInput from './MealCorrectionInput';

interface ReplanWorkflowModalProps {
    status: WorkflowStatus;
    onComplete: () => void;
    onCancel: () => void;
    recipes: { id: string; name: string }[];
}

export default function ReplanWorkflowModal({
    status,
    onComplete,
    onCancel,
    recipes
}: ReplanWorkflowModalProps) {
    const [step, setStep] = useState<'confirm_meals' | 'inventory' | 'constraints' | 'replan'>('confirm_meals');
    const [notes, setNotes] = useState('');
    const [currentDayIndex, setCurrentDayIndex] = useState(0);
    const [loading, setLoading] = useState(false);

    // Inventory state
    const [inventory, setInventory] = useState<any>(null);
    const [newItem, setNewItem] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('fridge');

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const todayIndex = days.indexOf(status.current_day || 'mon');
    const pastDays = days.slice(0, todayIndex + 1);

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
    }, []); // Only on mount

    useEffect(() => {
        if (step === 'inventory') {
            loadInventory();
        }
    }, [step]);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const data = await getInventory();
            setInventory(data.inventory);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const currentDay = pastDays[currentDayIndex];
    const currentDinner = status.week_data?.dinners?.find((d: any) => d.day === currentDay);
    const dinnerName = currentDinner?.recipe_id?.replace(/_/g, ' ') || 'Unplanned';

    const handleMealConfirm = async (made: boolean | string, actual?: string) => {
        setLoading(true);
        try {
            await logMeal({
                week: status.week_of,
                day: currentDay,
                made: made,
                actual_meal: actual,
                dinner_needs_fix: false
            });

            if (currentDayIndex < pastDays.length - 1) {
                setCurrentDayIndex(prev => prev + 1);
            } else {
                setStep('inventory');
            }
        } catch (e) {
            alert('Failed to save meal status');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!newItem.trim()) return;
        setLoading(true);
        try {
            const res = await addItemToInventory(newItemCategory, newItem.trim());
            setInventory(res.inventory);
            setNewItem('');
        } catch (e) {
            alert('Failed to add item');
        } finally {
            setLoading(false);
        }
    };

    const handleReplan = async () => {
        setLoading(true);
        try {
            await replan(notes);
            onComplete(); // Parent should refresh status
        } catch (e) {
            alert('Replan failed');
        } finally {
            setLoading(false);
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold">
                        {step === 'confirm_meals' ? 'Confirm Past Meals' :
                            step === 'inventory' ? 'Update Inventory' :
                                step === 'constraints' ? 'Special Requests' : 'Replanning'}
                    </h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'confirm_meals' && (
                        <div className="space-y-6">
                            <p className="text-sm text-gray-500">
                                Before replanning, we need to know what you actually ate so we can track leftover ingredients.
                            </p>

                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-mono uppercase text-gray-400 mb-1">{currentDay?.toUpperCase()} DINNER</h3>
                                <p className="text-xl font-bold mb-4">{dinnerName}</p>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleMealConfirm(true)}
                                        disabled={loading}
                                        className="w-full py-3 bg-[var(--accent-sage)] text-white rounded hover:opacity-90 flex items-center justify-center gap-2"
                                    >
                                        <span>✓</span> Made as Planned
                                    </button>

                                    <button
                                        onClick={() => handleMealConfirm(false)}
                                        disabled={loading}
                                        className="w-full py-3 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                                    >
                                        ✗ Skipped / Did Not Make
                                    </button>

                                    <div className="pt-4 border-t border-gray-200">
                                        <p className="text-xs text-center text-gray-400 mb-2">- OR -</p>
                                        <MealCorrectionInput
                                            recipes={recipes}
                                            placeholder="I made something else..."
                                            onSave={(val) => handleMealConfirm(true, val)}
                                            onCancel={() => { }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center gap-1">
                                {pastDays.map((d, i) => (
                                    <div
                                        key={d}
                                        className={`h-1.5 w-6 rounded-full ${i === currentDayIndex ? 'bg-[var(--accent-sage)]' : i < currentDayIndex ? 'bg-green-200' : 'bg-gray-100'}`}
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

                            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1">
                                <h4 className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1">Current Fridge Inventory</h4>
                                {inventory?.fridge?.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center px-2 py-1 bg-gray-50 rounded text-sm">
                                        <span>{item.item}</span>
                                        {item.quantity > 1 && <span className="text-xs text-gray-400">x{item.quantity}</span>}
                                    </div>
                                ))}
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
                                Any specific requests for the remaining meals? (e.g. "No chicken", "I want soup", "Use up the broccoli")
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
                                placeholder='Try: "No chicken" or "I want soup"...'
                                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-sage)] focus:border-transparent text-sm"
                            />

                            <button
                                onClick={handleReplan}
                                className="w-full py-3 bg-[var(--accent-primary)] text-white font-bold rounded shadow-lg hover:shadow-xl transition-all"
                            >
                                Confirm & Replan Week →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
