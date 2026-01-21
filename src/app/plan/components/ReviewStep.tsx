import React from 'react';
import { ReviewDay } from '@/types';
import { WizardProgress } from './WizardProgress';

interface ReviewStepProps {
    step: 'review_meals' | 'review_snacks';
    reviews: ReviewDay[];
    submitting: boolean;
    setStep: (step: any) => void;
    handleUpdateDinner: (day: string, field: any, value: any) => void;
    handleUpdateSnack: (day: string, field: any, value: any) => void;
    handleSubmitReview: () => void;
    dayNames: Record<string, string>;

}

export const ReviewStep: React.FC<ReviewStepProps> = ({
    step,
    reviews,
    submitting,
    setStep,
    handleUpdateDinner,
    handleUpdateSnack,
    handleSubmitReview,
    dayNames
}) => {
    // REVIEW MEALS UI
    if (step === 'review_meals') {
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
                                <span className="font-mono text-sm uppercase text-[var(--accent-sage)] tracking-widest">{dayNames[day.day]}</span>
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

    // REVIEW SNACKS UI
    if (step === 'review_snacks') {
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
                                <span className="font-mono text-sm uppercase text-[var(--accent-sage)] tracking-widest">{dayNames[day.day]}</span>
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

    return null;
};
