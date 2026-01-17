import React, { useState, useEffect } from 'react';
import { logMeal, swapMeals } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { FreezerMeal, InventoryItem } from '@/types';

interface MealLogFlowProps {
    weekOf: string;
    day: string;
    mealName: string;
    initialStatus?: any;
    freezerInventory?: FreezerMeal[];
    leftoverInventory?: InventoryItem[];
    onSuccess: () => void;
    onClose?: () => void;
    isModal?: boolean;
    compact?: boolean;
    logType?: 'dinner' | 'kids_lunch' | 'adult_lunch' | 'school_snack' | 'home_snack';
    recipes?: any[];
}

type Step = 'initial' | 'feedback' | 'alternatives' | 'freezer_select' | 'leftover_select' | 'ate_out_details' | 'reschedule' | 'other_details';

export default function MealLogFlow({
    weekOf,
    day,
    mealName,
    initialStatus,
    freezerInventory = [],
    leftoverInventory = [],
    onSuccess,
    onClose,
    isModal = false,
    compact = false,
    logType = 'dinner',
    recipes = []
}: MealLogFlowProps) {
    const [step, setStep] = useState<Step>('initial');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    // Data for logging
    const getInitialFeedback = () => {
        if (!initialStatus) return '👍';
        if (logType === 'dinner') return initialStatus.kids_feedback || '👍';
        return initialStatus[`${logType}_feedback`] || (typeof initialStatus === 'string' ? initialStatus : '👍');
    };

    const [feedback, setFeedback] = useState(getInitialFeedback());
    const [leftoverServings, setLeftoverServings] = useState('None');
    const [selectedFreezerMeal, setSelectedFreezerMeal] = useState('');
    const [selectedLeftover, setSelectedLeftover] = useState('');
    const [ateOutNotes, setAteOutNotes] = useState('');
    const [hasAteOutLeftovers, setHasAteOutLeftovers] = useState(false);
    const [otherMealNotes, setOtherMealNotes] = useState('');
    const [showRecipeDropdown, setShowRecipeDropdown] = useState(false);
    const [filteredRecipes, setFilteredRecipes] = useState<any[]>([]);

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    // Handle recipe filter
    useEffect(() => {
        if (otherMealNotes.trim().length > 1 && showRecipeDropdown) {
            const filtered = recipes.filter(r =>
                r.name.toLowerCase().includes(otherMealNotes.toLowerCase())
            ).slice(0, 5);
            setFilteredRecipes(filtered);
        } else {
            setFilteredRecipes([]);
        }
    }, [otherMealNotes, recipes, showRecipeDropdown]);

    const handleLog = async (data: any) => {
        setLoading(true);
        try {
            const payload: any = {
                week: weekOf,
                day,
            };

            if (logType === 'dinner') {
                Object.assign(payload, data);
            } else {
                // Map generic data to specific fields for snacks/lunch
                if (data.made !== undefined) {
                    payload[`${logType}_made`] = data.made === true;
                }
                if (data.kids_feedback) {
                    payload[`${logType}_feedback`] = data.kids_feedback;
                }
                if (data.actual_meal) {
                    // Overwrite feedback with actual meal name for alternatives
                    payload[`${logType}_feedback`] = data.actual_meal;
                }
            }

            await logMeal(payload);
            showToast('Activity logged!', 'success');
            onSuccess();
            setStep('initial');
        } catch (error: any) {
            showToast(error.message || 'Failed to log', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleMadeAsPlanned = () => {
        setStep('feedback');
    };

    const handleNotMade = () => {
        setStep('alternatives');
    };

    const submitMade = () => {
        handleLog({
            made: true,
            kids_feedback: feedback,
            leftovers_created: leftoverServings !== 'None' ? leftoverServings : undefined
        });
    };

    const submitFreezer = () => {
        handleLog({
            made: 'freezer_backup',
            freezer_meal: selectedFreezerMeal
        });
    };

    const submitLeftovers = () => {
        handleLog({
            made: 'leftovers',
            actual_meal: `Leftovers: ${selectedLeftover}`
        });
    };

    const submitAteOut = () => {
        handleLog({
            made: 'outside_meal',
            actual_meal: ateOutNotes || 'Ate Out',
            outside_leftover_name: hasAteOutLeftovers ? (ateOutNotes || 'Ate Out') : undefined,
            outside_leftover_qty: hasAteOutLeftovers ? 1 : undefined
        });
    };

    const submitOther = () => {
        handleLog({
            made: false,
            actual_meal: otherMealNotes
        });
    };

    const handleReschedule = async (targetDay: string) => {
        setLoading(true);
        try {
            await swapMeals(weekOf, day.toLowerCase(), targetDay.toLowerCase());
            showToast(`Moved meal to ${targetDay}`, 'success');
            onSuccess();
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isModal) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose?.();
        };

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.recipe-autocomplete-container')) {
                setShowRecipeDropdown(false);
            }
        };

        window.addEventListener('keydown', handleEsc);
        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleEsc);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isModal, onClose]);

    const wrapModal = (children: React.ReactNode) => {
        if (!isModal) return children;
        return (
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            >
                <div
                    className="glass w-full max-w-sm rounded-[32px] overflow-hidden p-8 relative shadow-2xl shadow-black/20"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gold)]" />
                    {children}
                    <button
                        onClick={onClose}
                        className="w-full mt-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-red-500 transition-colors opacity-40 hover:opacity-100"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        );
    };

    if (step === 'initial') {
        const getIsDone = () => {
            if (!initialStatus) return false;
            if (logType === 'dinner') {
                return initialStatus.made === true || initialStatus.made === 'freezer_backup' || initialStatus.made === 'outside_meal' || initialStatus.made === 'leftovers';
            }
            return initialStatus[`${logType}_made`] === true;
        };

        const isDone = getIsDone();

        return wrapModal(
            <div className={`flex flex-col gap-4 ${isModal ? 'w-full' : ''}`}>
                {isModal && (
                    <div className="mb-2">
                        <h3 className="text-xl font-bold text-[var(--text-main)] mb-1 tracking-tight">
                            {isDone ? 'Update Activity' : 'Did you make it?'}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)]">
                            Plan: <span className="italic text-[var(--accent-gold)] font-medium">"{mealName}"</span>
                        </p>
                    </div>
                )}
                <div className={`flex ${isModal ? 'flex-col' : 'flex-wrap'} gap-2 items-center ${!isModal ? 'justify-end' : ''}`}>
                    {isDone ? (
                        <button
                            onClick={() => setStep('feedback')}
                            className={`${isModal ? 'w-full py-4 bg-[var(--accent-primary)] text-white shadow-lg' : 'text-[10px] items-center px-3 py-1.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20'} uppercase font-bold rounded-2xl hover:brightness-110 transition-all active:scale-[0.98]`}
                        >
                            {isModal ? (
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-xl">✏️</span>
                                    Edit Details
                                </div>
                            ) : `${feedback} Edit`}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleMadeAsPlanned}
                                disabled={loading}
                                className={`${isModal ? 'w-full py-4 text-base' : 'px-4 py-2 text-[10px]'} bg-[var(--accent-primary)] text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-[var(--accent-primary)]/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 active:scale-[0.98]`}
                            >
                                {isModal && <span className="text-xl">✅</span>}
                                ✓ Made it
                            </button>
                            <button
                                onClick={handleNotMade}
                                disabled={loading}
                                className={`${isModal ? 'w-full py-4 text-base' : 'px-4 py-2 text-[10px]'} bg-white/50 border border-[var(--border-subtle)] text-[var(--text-main)] font-black uppercase tracking-widest rounded-2xl hover:bg-white transition-all flex items-center justify-center gap-3 active:scale-[0.98]`}
                            >
                                {isModal && <span className="text-xl">🔄</span>}
                                Something Else
                            </button>
                            {isModal && (
                                <button
                                    onClick={() => handleLog({ made: false })}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-3 py-4 bg-red-50 text-red-700 border border-red-100 rounded-2xl font-black uppercase tracking-widest hover:bg-red-100 transition-all active:scale-[0.98]"
                                >
                                    <span className="text-xl">❌</span>
                                    Skipped entirely
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (step === 'feedback') {
        return wrapModal(
            <div className={`p-4 rounded-2xl flex flex-col gap-3 min-w-[240px] animate-in slide-in-from-right-2 duration-300 ${!isModal ? 'glass' : ''}`}>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">How was it?</h3>
                    {!isModal && (
                        <button onClick={() => setStep('initial')} className="text-[10px] text-[var(--text-muted)] hover:text-black">Cancel</button>
                    )}
                </div>

                <div className="flex justify-between gap-2 px-1 my-2">
                    {['🤩', '👍', '😐', '👎', '❌'].map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => setFeedback(emoji)}
                            className={`text-2xl transition-all ${feedback === emoji ? 'grayscale-0 scale-125' : 'grayscale opacity-40 hover:grayscale-0 hover:opacity-100 hover:scale-110'}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-2 mt-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] ml-1">Leftovers Created?</label>
                    <div className="grid grid-cols-4 gap-2">
                        {['None', '1 Serving', '2 Servings', 'Batch'].map(qty => (
                            <button
                                key={qty}
                                onClick={() => setLeftoverServings(qty)}
                                className={`py-3 text-[10px] font-bold rounded-xl transition-all ${leftoverServings === qty ? 'bg-[var(--accent-primary)] text-white' : 'bg-black/5 text-[var(--text-muted)] hover:bg-white'}`}
                            >
                                {qty.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={submitMade}
                    disabled={loading}
                    className="w-full py-4 mt-4 btn-primary rounded-2xl shadow-lg"
                >
                    {loading ? 'Saving...' : 'Save & Finish'}
                </button>
                <button onClick={() => setStep('initial')} className="w-full text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-black transition-colors">← Back</button>
            </div>
        );
    }

    if (step === 'alternatives') {
        return wrapModal(
            <div className={`p-4 rounded-2xl flex flex-col gap-2 min-w-[240px] animate-in slide-in-from-left-2 ${!isModal ? 'glass' : ''}`}>
                <div className="mb-4">
                    <h3 className="text-lg font-bold">What's the plan?</h3>
                    <p className="text-sm text-[var(--text-muted)]">We'll update your inventory for you.</p>
                </div>

                <div className={`grid ${logType === 'dinner' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    {logType === 'dinner' && (
                        <>
                            <button onClick={() => setStep('freezer_select')} className="p-4 bg-white/50 border border-[var(--border-subtle)] rounded-2xl hover:bg-white transition-all flex flex-col items-center gap-2 group active:scale-95">
                                <span className="text-2xl group-hover:scale-110 transition-transform">🧊</span>
                                <span className="text-[10px] font-black uppercase tracking-tighter">Freezer Meal</span>
                            </button>
                            <button onClick={() => setStep('leftover_select')} className="p-4 bg-white/50 border border-[var(--border-subtle)] rounded-2xl hover:bg-white transition-all flex flex-col items-center gap-2 group active:scale-95">
                                <span className="text-2xl group-hover:scale-110 transition-transform">🍱</span>
                                <span className="text-[10px] font-black uppercase tracking-tighter">Leftovers</span>
                            </button>
                        </>
                    )}
                    <button onClick={() => setStep('ate_out_details')} className="p-4 bg-white/50 border border-[var(--border-subtle)] rounded-2xl hover:bg-white transition-all flex flex-col items-center gap-2 group active:scale-95">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🍽️</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter">Ate Out</span>
                    </button>
                    <button onClick={() => setStep('other_details')} className="p-4 bg-white/50 border border-[var(--border-subtle)] rounded-2xl hover:bg-white transition-all flex flex-col items-center gap-2 group active:scale-95">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🍳</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter">Other Meal</span>
                    </button>
                </div>

                <div className="h-4" />

                {logType === 'dinner' && (
                    <button
                        onClick={() => setStep('reschedule')}
                        className="w-full py-4 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/20 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--accent-gold)]/20 transition-all flex items-center justify-center gap-3"
                    >
                        🗓️ Reschedule Meal
                    </button>
                )}
                <button onClick={() => setStep('initial')} className="w-full mt-4 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-black transition-colors">← Back</button>
            </div>
        );
    }

    if (step === 'freezer_select') {
        return wrapModal(
            <div className={`p-4 rounded-2xl flex flex-col gap-3 min-w-[240px] animate-in slide-in-from-right-2 ${!isModal ? 'glass' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold">Freezer Item</h3>
                    <button onClick={() => setStep('alternatives')} className="text-[10px] text-[var(--text-muted)] uppercase font-black">Back</button>
                </div>

                <div className="max-h-52 overflow-y-auto pr-1 flex flex-col gap-2">
                    {freezerInventory.length > 0 ? (
                        freezerInventory.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedFreezerMeal(item.meal)}
                                className={`w-full p-4 text-left text-sm rounded-2xl transition-all border ${selectedFreezerMeal === item.meal ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-md' : 'bg-white/50 border-transparent hover:bg-white hover:border-[var(--border-subtle)]'}`}
                            >
                                <div className="font-bold">{item.meal}</div>
                                <div className={`text-[10px] uppercase tracking-tighter ${selectedFreezerMeal === item.meal ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>{item.quantity} {item.unit || 'portions'}</div>
                            </button>
                        ))
                    ) : (
                        <p className="text-[10px] text-[var(--text-muted)] font-bold italic p-6 text-center bg-black/5 rounded-2xl">No freezer meals found</p>
                    )}
                </div>

                <button
                    onClick={submitFreezer}
                    disabled={loading || !selectedFreezerMeal}
                    className="w-full py-4 mt-2 btn-primary rounded-2xl shadow-lg disabled:opacity-50 disabled:translate-y-0"
                >
                    Update Plan
                </button>
            </div>
        );
    }

    if (step === 'leftover_select') {
        const leftovers = leftoverInventory.filter(item => item.type === 'meal');
        return wrapModal(
            <div className={`p-4 rounded-2xl flex flex-col gap-3 min-w-[240px] animate-in slide-in-from-right-2 ${!isModal ? 'glass' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold">Fridge Selection</h3>
                    <button onClick={() => setStep('alternatives')} className="text-[10px] text-[var(--text-muted)] uppercase font-black">Back</button>
                </div>

                <div className="max-h-52 overflow-y-auto pr-1 flex flex-col gap-2">
                    {leftovers.length > 0 ? (
                        leftovers.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedLeftover(item.item)}
                                className={`w-full p-4 text-left text-sm rounded-2xl transition-all border ${selectedLeftover === item.item ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-md' : 'bg-white/50 border-transparent hover:bg-white hover:border-[var(--border-subtle)]'}`}
                            >
                                <div className="font-bold">{item.item}</div>
                                <div className={`text-[10px] uppercase tracking-tighter ${selectedLeftover === item.item ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>{item.quantity} portions</div>
                            </button>
                        ))
                    ) : (
                        <p className="text-[10px] text-[var(--text-muted)] font-bold italic p-6 text-center bg-black/5 rounded-2xl">No leftovers found in fridge</p>
                    )}
                </div>

                <button
                    onClick={submitLeftovers}
                    disabled={loading || !selectedLeftover}
                    className="w-full py-4 mt-2 btn-primary rounded-2xl shadow-lg disabled:opacity-50 disabled:translate-y-0"
                >
                    Update Plan
                </button>
            </div>
        );
    }

    if (step === 'ate_out_details') {
        return wrapModal(
            <div className={`p-4 rounded-2xl flex flex-col gap-4 min-w-[240px] animate-in slide-in-from-right-2 ${!isModal ? 'glass' : ''}`}>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[var(--accent-gold)]">Eating Out</h3>
                    <button onClick={() => setStep('alternatives')} className="text-[10px] text-[var(--text-muted)] uppercase font-black">Back</button>
                </div>

                <input
                    type="text"
                    placeholder="Where/What did you eat?"
                    value={ateOutNotes}
                    onChange={(e) => setAteOutNotes(e.target.value)}
                    className="w-full p-4 bg-white/50 border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 ring-[var(--accent-gold)] transition-all"
                />

                <label className="flex items-center gap-3 p-4 bg-white/30 border border-[var(--border-subtle)] rounded-2xl cursor-pointer hover:bg-white transition-all">
                    <input
                        type="checkbox"
                        checked={hasAteOutLeftovers}
                        onChange={(e) => setHasAteOutLeftovers(e.target.checked)}
                        className="w-5 h-5 rounded-md border-none bg-white text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                    />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold">Brought leftovers home?</span>
                        <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-tighter">Will add to fridge inventory</span>
                    </div>
                </label>

                <button
                    onClick={submitAteOut}
                    disabled={loading}
                    className="w-full py-4 mt-2 bg-[var(--accent-gold)] text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-[var(--accent-gold)]/20 active:scale-[0.98] transition-all"
                >
                    {loading ? 'Processing...' : 'Log Event'}
                </button>
            </div>
        );
    }

    if (step === 'other_details') {
        return wrapModal(
            <div className={`p-4 rounded-2xl flex flex-col gap-4 min-w-[240px] animate-in slide-in-from-right-2 ${!isModal ? 'glass' : ''}`}>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">Other Meal</h3>
                    <button onClick={() => setStep('alternatives')} className="text-[10px] text-[var(--text-muted)] uppercase font-black">Back</button>
                </div>

                <div className="relative recipe-autocomplete-container">
                    <input
                        type="text"
                        placeholder="What did you whip up instead?"
                        value={otherMealNotes}
                        onChange={(e) => {
                            setOtherMealNotes(e.target.value);
                            setShowRecipeDropdown(true);
                        }}
                        onFocus={() => setShowRecipeDropdown(true)}
                        className="w-full p-4 bg-white/50 border border-[var(--border-subtle)] rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 ring-[var(--accent-primary)] transition-all"
                    />

                    {showRecipeDropdown && filteredRecipes.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-2 glass rounded-2xl overflow-hidden shadow-xl z-10 border border-[var(--border-subtle)]">
                            {filteredRecipes.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => {
                                        setOtherMealNotes(r.name);
                                        setShowRecipeDropdown(false);
                                    }}
                                    className="w-full p-3 text-left text-sm hover:bg-[var(--accent-primary)] hover:text-white transition-colors border-b border-[var(--border-subtle)] last:border-0"
                                >
                                    <div className="font-bold">{r.name}</div>
                                    <div className="text-[10px] uppercase opacity-70">{r.cuisine || 'Various'}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={submitOther}
                    disabled={loading || !otherMealNotes}
                    className="w-full py-4 mt-2 btn-primary rounded-2xl shadow-lg disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                    {loading ? 'Saving...' : 'Save Activity'}
                </button>
            </div>
        );
    }

    if (step === 'reschedule') {
        return wrapModal(
            <div className={`p-4 rounded-2xl flex flex-col gap-4 min-w-[240px] animate-in slide-in-from-right-2 ${!isModal ? 'glass' : ''}`}>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">Move Meal</h3>
                    <button onClick={() => setStep('alternatives')} className="text-[10px] text-[var(--text-muted)] uppercase font-black">Back</button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    {days.filter(d => d !== day.toLowerCase()).map(d => (
                        <button
                            key={d}
                            onClick={() => handleReschedule(d)}
                            className="px-2 py-4 bg-white/50 border border-[var(--border-subtle)] rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-[var(--accent-primary)] hover:text-white hover:border-[var(--accent-primary)] transition-all active:scale-95 shadow-sm"
                        >
                            {d}
                        </button>
                    ))}
                </div>

                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tight text-center bg-black/5 p-4 rounded-2xl border border-black/5">
                    Swaps <span className="text-[var(--accent-gold)]">"{mealName}"</span> with the selected day's meal
                </p>
            </div>
        );
    }

    return null;
}
