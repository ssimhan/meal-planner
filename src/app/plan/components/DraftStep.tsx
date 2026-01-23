import React from 'react';
import { useWizardContext } from '../context/WizardContext';
import Skeleton from '@/components/Skeleton';
import ReplacementModal from '@/components/ReplacementModal';
import { WizardProgress } from './WizardProgress';

export const DraftStep: React.FC = () => {
    const {
        step,
        planningWeek,
        draftPlan,
        setDraftPlan,
        loading,
        setLoading,
        setStep,
        lockedDays,
        setLockedDays,
        isReplacing,
        setIsReplacing,
        handleReplacementConfirm,
        generateDraft,
        getShoppingList,
        setShoppingList,
        showToast,
        selections,
        leftoverAssignments,
        excludedDefaults,
        recipes,
        inventory
    } = useWizardContext();

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
                    onConfirm={(newMeal, req, status) => handleReplacementConfirm(newMeal, req || false, status)}
                    onCancel={() => setIsReplacing(null)}
                />
            )}
        </main>
    );
};
