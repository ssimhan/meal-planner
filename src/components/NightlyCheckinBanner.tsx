'use client';

import React from 'react';
import { WorkflowStatus } from '@/types';

interface NightlyCheckinBannerProps {
    status: WorkflowStatus;
}

export default function NightlyCheckinBanner({ status }: NightlyCheckinBannerProps) {
    if (status.state !== 'waiting_for_checkin') return null;

    const scrollToSchedule = () => {
        const section = document.getElementById('today-schedule');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="bg-[var(--accent-terracotta)] text-white p-4 rounded-lg mb-8 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg">
            <div className="flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                    <h3 className="font-bold text-lg">Nightly Review Needed</h3>
                    <p className="text-sm opacity-90">It's after 6 PM! Don't forget to log your meals for today ({status.current_day}).</p>
                </div>
            </div>
            <button
                onClick={scrollToSchedule}
                className="bg-white text-[var(--accent-terracotta)] px-6 py-2 rounded-full font-bold hover:bg-opacity-90 transition-all text-sm whitespace-nowrap"
            >
                Complete Log ↓
            </button>
        </div>
    );
}
