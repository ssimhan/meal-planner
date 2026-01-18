'use client';

import React from 'react';
import Link from 'next/link';
import { WorkflowStatus } from '@/types';

interface ResumePlanningBannerProps {
    status: WorkflowStatus;
}

export default function ResumePlanningBanner({ status }: ResumePlanningBannerProps) {
    const isPlanning = status.state === 'ready_to_plan' || status.state === 'awaiting_farmers_market' || status.state === 'planning';

    if (!isPlanning) return null;

    const stepMapping: Record<string, string> = {
        'review_meals': 'Review Meals',
        'review_snacks': 'Review Snacks',
        'inventory': 'Update Inventory',
        'leftovers': 'Assign Leftovers',
        'suggestions': 'Generate Plan',
        'draft': 'Review Draft',
        'groceries': 'Shopping List'
    };

    const wizardStep = status.week_data?.wizard_state?.step;
    const stepName = wizardStep ? stepMapping[wizardStep] : 'Start';

    return (
        <div className="bg-[var(--accent-sage)] text-white p-4 rounded-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg border-b-4 border-black/10">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
                    📝
                </div>
                <div>
                    <h3 className="font-bold text-lg">Planning in Progress</h3>
                    <p className="text-sm opacity-90">
                        You're currently in the middle of planning for <strong>{status.week_of}</strong>.
                        {wizardStep && (
                            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-[10px] uppercase font-bold tracking-tight">
                                Current Step: {stepName}
                            </span>
                        )}
                    </p>
                </div>
            </div>
            <Link
                href={`/plan?week=${status.week_of}`}
                className="bg-white text-[var(--accent-sage)] px-6 py-2.5 rounded-full font-bold hover:bg-opacity-90 active:scale-95 transition-all text-sm whitespace-nowrap shadow-md"
            >
                Resume Planning →
            </Link>
        </div>
    );
}
