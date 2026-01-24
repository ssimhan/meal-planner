'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import Skeleton from '@/components/Skeleton';
// import { usePlanningWizard } from '@/hooks/usePlanningWizard'; // Deprecated/Removed
import { WizardProvider, useWizardContext } from './context/WizardContext';

import { ReviewStep } from './components/ReviewStep';
import { InventoryStep } from './components/InventoryStep';
import { DraftStep } from './components/DraftStep';
import { SuggestionsStep } from './components/SuggestionsStep';
import { GroceryStep } from './components/GroceryStep';

function PlanningWizardContent() {
    const {
        loading,
        step,
        draftPlan,
        inventory
    } = useWizardContext();

    if (loading && !draftPlan && !inventory) {
        return (
            <AppLayout>
                <div className="max-w-4xl mx-auto p-6 space-y-8">
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>
            </AppLayout>
        );
    }

    // STEP 6: SMART GROCERY LIST UI
    if (step === 'groceries') {
        return <GroceryStep />;
    }

    // STEP 5: TENTATIVE PLAN UI
    if (step === 'draft') {
        return <DraftStep />;
    }

    // STEP 3-4: SUGGESTIONS (Dinners, Lunches, Snacks)
    if (step === 'suggestions') {
        return <SuggestionsStep />;
    }

    // STEP 2: INVENTORY
    if (step === 'inventory') {
        return <InventoryStep />;
    }

    // STEP 1: REVIEW (Meals or Snacks)
    return <ReviewStep />;
}

export default function PlanningWizard() {
    return (
        <React.Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <WizardProvider>
                <PlanningWizardContent />
            </WizardProvider>
        </React.Suspense>
    );
}
