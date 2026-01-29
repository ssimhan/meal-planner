'use client';

import React, { useState } from 'react';
import { WorkflowStatus, logMeal, swapMeals } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

interface DinnerOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentDay: string;
    currentMealName: string;
    weekOf: string;
    days: string[];
    onSuccess: () => void;
    status: WorkflowStatus;
}

type Step = 'initial' | 'feedback' | 'alternatives' | 'details';
type Tab = 'log' | 'reschedule';
type Alternative = 'leftovers' | 'freezer' | 'eatout' | 'other';

export default function DinnerOptionsModal({
    isOpen,
    onClose,
    currentDay,
    currentMealName,
    weekOf,
    days,
    onSuccess,
    status
}: DinnerOptionsModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('log');
    const [step, setStep] = useState<Step>('initial');
    const [selectedAlt, setSelectedAlt] = useState<Alternative | null>(null);

    // Form state
    const [feedback, setFeedback] = useState<string>('👍');
    const [leftoverServings, setLeftoverServings] = useState<string>('None');
    const [selectedLeftover, setSelectedLeftover] = useState<string>('');
    const [selectedFreezer, setSelectedFreezer] = useState<string>('');
    const [outsideNotes, setOutsideNotes] = useState<string>('');
    const [hasOutsideLeftovers, setHasOutsideLeftovers] = useState<boolean>(false);
    const [outsideLeftoverName, setOutsideLeftoverName] = useState<string>('');

    if (!isOpen) return null;

    const reset = () => {
        setStep('initial');
        setSelectedAlt(null);
        setActiveTab('log');
        setFeedback('👍');
        setLeftoverServings('None');
        setSelectedLeftover('');
        setSelectedFreezer('');
        setOutsideNotes('');
        setHasOutsideLeftovers(false);
        setOutsideLeftoverName('');
    };

    const handleLog = async (logData: any) => {
        setLoading(true);
        try {
            await logMeal({
                week: weekOf,
                day: currentDay,
                ...logData
            });
            showToast('Plan updated!', 'success');
            onSuccess();
            onClose();
            reset();
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleMoveTo = async (targetDay: string) => {
        if (!confirm(`Move "${currentMealName}" to ${targetDay.toUpperCase()}? This will swap meals if one exists.`)) return;

        setLoading(true);
        try {
            await swapMeals(weekOf, currentDay.toLowerCase(), targetDay.toLowerCase());
            showToast(`Moved meal to ${targetDay}`, 'success');
            onSuccess();
            onClose();
            reset();
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = () => {
        if (step === 'feedback') {
            handleLog({
                made: true,
                kids_feedback: feedback,
                actual_meal: currentMealName,
                leftovers_created: leftoverServings !== 'None' ? leftoverServings : undefined,
            });
        } else if (step === 'details') {
            if (selectedAlt === 'leftovers') {
                handleLog({ made: 'leftovers', actual_meal: `Leftovers: ${selectedLeftover}` });
            } else if (selectedAlt === 'freezer') {
                handleLog({ made: 'freezer_backup', freezer_meal: selectedFreezer });
            } else if (selectedAlt === 'eatout') {
                handleLog({
                    made: 'outside_meal',
                    actual_meal: `Ate Out: ${outsideNotes}`,
                    outside_leftover_name: hasOutsideLeftovers ? outsideLeftoverName : undefined,
                    outside_leftover_qty: hasOutsideLeftovers ? 1 : undefined
                });
            } else if (selectedAlt === 'other') {
                handleLog({ made: false, actual_meal: outsideNotes });
            }
        }
    };

    const availableDays = days.filter(d => d.toLowerCase() !== currentDay.toLowerCase());
    const freezerMeals = status?.week_data?.freezer_inventory || [];

    // Potential leftovers are meals from prior days that were marked as "done"
    // Or we just let them type it in for now if our data model is simple.
    // For this prototype, let's look at dinners from previous days in week_data
    const pastDinners = status?.week_data?.dinners?.filter(d => d.day !== currentDay && d.made === true) || [];

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

                <div className="flex gap-2 mb-6 bg-black/5 p-1 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('log')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'log' ? 'bg-white shadow-sm text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:bg-white/50'}`}
                    >
                        Log Status
                    </button>
                    <button
                        onClick={() => setActiveTab('reschedule')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'reschedule' ? 'bg-white shadow-sm text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:bg-white/50'}`}
                    >
                        Reschedule
                    </button>
                </div>

                {activeTab === 'reschedule' ? (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-1 tracking-tight">
                            Move Meal
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6">
                            Where should we move <span className="italic text-[var(--accent-gold)] font-medium">"{currentMealName}"</span>?
                        </p>
                        <div className="grid grid-cols-4 gap-2 mb-8">
                            {availableDays.map(day => (
                                <button
                                    key={day}
                                    onClick={() => handleMoveTo(day)}
                                    disabled={loading}
                                    className="px-2 py-3 text-[10px] font-black uppercase bg-white/40 hover:bg-white hover:text-[var(--accent-primary)] border border-white/50 rounded-xl transition-all active:scale-95 shadow-sm"
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-left-4 duration-300">
                        {step === 'initial' && (
                            <>
                                <h3 className="text-lg font-bold text-[var(--text-main)] mb-1 tracking-tight">
                                    Did you make it?
                                </h3>
                                <p className="text-sm text-[var(--text-muted)] mb-8">
                                    Let's update your plan for <span className="italic text-[var(--accent-gold)] font-medium">"{currentMealName}"</span>.
                                </p>
                                <div className="space-y-3">
                                    <button onClick={() => setStep('feedback')} className="w-full flex items-center gap-3 p-4 bg-[var(--accent-primary)] text-white rounded-2xl font-bold hover:brightness-110 transition-all active:scale-[0.98]">
                                        <span className="text-xl">✅</span>
                                        Yes, it was great!
                                    </button>
                                    <button onClick={() => setStep('alternatives')} className="w-full flex items-center gap-3 p-4 bg-white/50 border border-[var(--border-subtle)] rounded-2xl font-bold hover:bg-white transition-all active:scale-[0.98]">
                                        <span className="text-xl">🔄</span>
                                        No, changed plans
                                    </button>
                                    <button onClick={() => handleLog({ made: false })} disabled={loading} className="w-full flex items-center gap-3 p-4 bg-red-50 text-red-700 border border-red-100 rounded-2xl font-bold hover:bg-red-100 transition-all active:scale-[0.98]">
                                        <span className="text-xl">❌</span>
                                        Skipped it entirely
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 'feedback' && (
                            <>
                                <h3 className="text-lg font-bold text-[var(--text-main)] mb-1 tracking-tight">
                                    How was it?
                                </h3>
                                <p className="text-sm text-[var(--text-muted)] mb-6">
                                    Quick feedback helps us improve.
                                </p>
                                <div className="flex justify-between mb-8 px-2">
                                    {['❤️', '👍', '😐', '👎', '❌'].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => setFeedback(emoji)}
                                            className={`text-3xl transition-all hover:scale-125 ${feedback === emoji ? 'grayscale-0 scale-125' : 'grayscale opacity-40'}`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-4 mb-8">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2 block ml-1">Leftovers Created?</label>
                                        <select
                                            value={leftoverServings}
                                            onChange={(e) => setLeftoverServings(e.target.value)}
                                            className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-white/50 focus:bg-white transition-all outline-none text-sm"
                                        >
                                            <option>None</option>
                                            <option>1 Serving</option>
                                            <option>2 Servings</option>
                                            <option>Batch (4+)</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleFinish} disabled={loading} className="btn-primary w-full py-4 rounded-2xl shadow-lg">
                                    {loading ? 'Saving...' : 'Save & Finish'}
                                </button>
                                <button onClick={() => setStep('initial')} className="w-full mt-4 text-xs font-bold uppercase text-[var(--text-muted)] tracking-widest">← Back</button>
                            </>
                        )}

                        {step === 'alternatives' && (
                            <>
                                <h3 className="text-lg font-bold text-[var(--text-main)] mb-1 tracking-tight">
                                    What happened?
                                </h3>
                                <p className="text-sm text-[var(--text-muted)] mb-8">
                                    We'll update your inventory for you.
                                </p>
                                <div className="space-y-3">
                                    <button onClick={() => { setSelectedAlt('leftovers'); setStep('details'); }} className="w-full flex items-center gap-3 p-4 bg-white/50 border border-[var(--border-subtle)] rounded-2xl font-bold hover:bg-white transition-all active:scale-[0.98]">
                                        <span className="text-xl">🍱</span>
                                        Used Leftovers
                                    </button>
                                    <button onClick={() => { setSelectedAlt('freezer'); setStep('details'); }} className="w-full flex items-center gap-3 p-4 bg-white/50 border border-[var(--border-subtle)] rounded-2xl font-bold hover:bg-white transition-all active:scale-[0.98]">
                                        <span className="text-xl">🧊</span>
                                        Freezer Meal
                                    </button>
                                    <button onClick={() => { setSelectedAlt('eatout'); setStep('details'); }} className="w-full flex items-center gap-3 p-4 bg-white/50 border border-[var(--border-subtle)] rounded-2xl font-bold hover:bg-white transition-all active:scale-[0.98]">
                                        <span className="text-xl">🍽️</span>
                                        Ate Out
                                    </button>
                                    <button onClick={() => { setSelectedAlt('other'); setStep('details'); }} className="w-full flex items-center gap-3 p-4 bg-white/50 border border-[var(--border-subtle)] rounded-2xl font-bold hover:bg-white transition-all active:scale-[0.98]">
                                        <span className="text-xl">🍳</span>
                                        Made Something Else
                                    </button>
                                </div>
                                <button onClick={() => setStep('initial')} className="w-full mt-4 text-xs font-bold uppercase text-[var(--text-muted)] tracking-widest">← Back</button>
                            </>
                        )}

                        {step === 'details' && (
                            <>
                                <h3 className="text-xl font-bold text-[var(--text-main)] mb-1 tracking-tight">
                                    {selectedAlt === 'leftovers' ? 'Leftovers Used' :
                                        selectedAlt === 'freezer' ? 'Freezer Meal' :
                                            selectedAlt === 'eatout' ? 'Eating Out' : 'Other Meal'}
                                </h3>
                                <p className="text-sm text-[var(--text-muted)] mb-8 leading-relaxed">
                                    {selectedAlt === 'leftovers' ? 'Which leftovers did you finish up?' :
                                        selectedAlt === 'freezer' ? 'Which one did you pull out?' :
                                            selectedAlt === 'eatout' ? 'Hope it was good! Any leftovers to save?' : 'What did you whip up instead?'}
                                </p>

                                <div className="space-y-4 mb-8">
                                    {selectedAlt === 'leftovers' && (
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2 block ml-1">Selection</label>
                                            <select
                                                value={selectedLeftover}
                                                onChange={(e) => setSelectedLeftover(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-white/50 focus:bg-white transition-all outline-none text-sm"
                                            >
                                                <option value="">Select...</option>
                                                {pastDinners.map(d => (
                                                    <option key={d.day} value={d.recipe_ids?.[0]}>{d.recipe_ids?.[0]?.replace(/_/g, ' ')} ({d.day.toUpperCase()})</option>
                                                ))}
                                                <option value="untracked">Untracked Leftovers</option>
                                            </select>
                                        </div>
                                    )}

                                    {selectedAlt === 'freezer' && (
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2 block ml-1">Freezer Item</label>
                                            <select
                                                value={selectedFreezer}
                                                onChange={(e) => setSelectedFreezer(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-white/50 focus:bg-white transition-all outline-none text-sm"
                                            >
                                                <option value="">Select...</option>
                                                {freezerMeals.map(m => (
                                                    <option key={m.meal} value={m.meal}>{m.meal}</option>
                                                ))}
                                                <option value="other">Other Freezer Item</option>
                                            </select>
                                        </div>
                                    )}

                                    {selectedAlt === 'eatout' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2 block ml-1">Establishment / Notes</label>
                                                <input
                                                    type="text"
                                                    value={outsideNotes}
                                                    onChange={(e) => setOutsideNotes(e.target.value)}
                                                    placeholder="e.g. Thai place, Pizza..."
                                                    className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-white/50 focus:bg-white transition-all outline-none text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white/30 rounded-xl border border-[var(--border-subtle)]">
                                                <input
                                                    type="checkbox"
                                                    id="extra-leftovers"
                                                    checked={hasOutsideLeftovers}
                                                    onChange={(e) => setHasOutsideLeftovers(e.target.checked)}
                                                    className="w-5 h-5 accent-[var(--accent-primary)]"
                                                />
                                                <label htmlFor="extra-leftovers" className="text-sm font-medium">Capture leftovers to fridge?</label>
                                            </div>
                                            {hasOutsideLeftovers && (
                                                <div className="animate-in slide-in-from-top-2">
                                                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2 block ml-1">Leftover Name</label>
                                                    <input
                                                        type="text"
                                                        value={outsideLeftoverName}
                                                        onChange={(e) => setOutsideLeftoverName(e.target.value)}
                                                        placeholder="e.g. Pad Thai"
                                                        className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-white/50 focus:bg-white transition-all outline-none text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedAlt === 'other' && (
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2 block ml-1">What was it?</label>
                                            <input
                                                type="text"
                                                value={outsideNotes}
                                                onChange={(e) => setOutsideNotes(e.target.value)}
                                                placeholder="e.g. Scrambled eggs, Sandwiches..."
                                                className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-white/50 focus:bg-white transition-all outline-none text-sm"
                                            />
                                        </div>
                                    )}
                                </div>

                                <button onClick={handleFinish} disabled={loading} className="btn-primary w-full py-4 rounded-2xl shadow-lg">
                                    {loading ? 'Processing...' : 'Update Plan'}
                                </button>
                                <button onClick={() => setStep('alternatives')} className="w-full mt-4 text-xs font-bold uppercase text-[var(--text-muted)] tracking-widest">← Back</button>
                            </>
                        )}
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full mt-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-red-500 transition-colors opacity-40 hover:opacity-100"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
