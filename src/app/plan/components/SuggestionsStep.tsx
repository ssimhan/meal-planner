import React from 'react';
import Skeleton from '@/components/Skeleton';
import ReplacementModal from '@/components/ReplacementModal';
import { WizardProgress } from './WizardProgress';

interface WeeklyMealGridProps {
    phase: 'dinners' | 'lunches' | 'snacks';
    leftoverAssignments: any[];
    selections: any[];
    confirmedSelections: Record<string, boolean>;
    setConfirmedSelections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setIsReplacing: (val: any) => void;
}

const WeeklyMealGrid: React.FC<WeeklyMealGridProps> = ({
    phase,
    leftoverAssignments,
    selections,
    confirmedSelections,
    setConfirmedSelections,
    setIsReplacing
}) => {
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

interface SuggestionsStepProps {
    step: string;
    suggestionPhase: 'dinners' | 'lunches' | 'snacks';
    setSuggestionPhase: (phase: 'dinners' | 'lunches' | 'snacks') => void;
    selections: any[];
    setSelections: React.Dispatch<React.SetStateAction<any[]>>;
    planningWeek: string | null;
    setStep: (step: any) => void;
    submitting: boolean;
    setSubmitting: (val: boolean) => void;
    createWeek: (week: string) => Promise<any>;
    generateDraft: (week: string, selections: any[], locked: any[], leftovers: any[], excluded: any[]) => Promise<any>;
    setDraftPlan: (plan: any) => void;
    showToast: (msg: string, type: 'success' | 'error') => void;
    loadingSuggestions: boolean;
    suggestionOptions: any;
    error: string | null;
    loadSuggestions: () => void;
    leftoverAssignments: any[];
    confirmedSelections: Record<string, boolean>;
    setConfirmedSelections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    isReplacing: { day: string, slot: string, currentMeal: string } | null;
    setIsReplacing: (val: any) => void;
    handleReplacementConfirm: (newMeal: string, req: boolean, status: any) => void;
    recipes: any[];
    inventory: any;
    excludedDefaults: any[];
}

export const SuggestionsStep: React.FC<SuggestionsStepProps> = ({
    step,
    suggestionPhase,
    setSuggestionPhase,
    selections,
    setSelections,
    planningWeek,
    setStep,
    submitting,
    setSubmitting,
    createWeek,
    generateDraft,
    setDraftPlan,
    showToast,
    loadingSuggestions,
    suggestionOptions,
    error,
    loadSuggestions,
    leftoverAssignments,
    confirmedSelections,
    setConfirmedSelections,
    isReplacing,
    setIsReplacing,
    handleReplacementConfirm,
    recipes,
    inventory,
    excludedDefaults
}) => {

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
                error ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-red-50 border border-red-200">
                        <p className="text-red-600 mb-4 font-bold">{error}</p>
                        <button
                            onClick={loadSuggestions}
                            className="px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-bold text-sm"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
                    </div>
                )
            ) : (
                <WeeklyMealGrid
                    phase={suggestionPhase}
                    leftoverAssignments={leftoverAssignments}
                    selections={selections}
                    confirmedSelections={confirmedSelections}
                    setConfirmedSelections={setConfirmedSelections}
                    setIsReplacing={setIsReplacing}
                />
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
}
