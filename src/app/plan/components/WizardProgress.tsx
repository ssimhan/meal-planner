import React from 'react';

// Wizard Phases for top navigation
const PHASES = [
    { id: 'review', label: 'Review', icon: '📝', steps: ['review_meals', 'review_snacks'] },
    { id: 'inventory', label: 'Inventory', icon: '🥦', steps: ['inventory'] },
    { id: 'plan', label: 'Plan', icon: '🍳', steps: ['suggestions', 'draft', 'groceries'] }
];

export const WizardProgress = ({ currentStep }: { currentStep: string }) => {
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
