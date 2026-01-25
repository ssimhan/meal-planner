'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AvailableWeek } from '@/types';
import { ChevronDown } from 'lucide-react';

interface WeekNavigationProps {
    currentWeek: string;
    availableWeeks: AvailableWeek[];
}

export const WeekNavigation = ({ currentWeek, availableWeeks }: WeekNavigationProps) => {
    const router = useRouter();

    if (!availableWeeks || availableWeeks.length <= 1) return null;

    // Filter out weeks that don't exist in the database if necessary.
    // Rely on API order to avoid sorting issues with non-ISO date strings (e.g. "jan-22").
    const validWeeks = availableWeeks.filter(w => w.exists);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const week = e.target.value;
        router.push(`/week-view?week=${week}`);
    };

    return (
        <div className="flex items-center gap-2 mt-2">
            <div className="relative inline-block text-left">
                <select
                    value={currentWeek}
                    onChange={handleChange}
                    className="appearance-none bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent-sage)] text-[var(--text-primary)] text-sm rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent-sage)] transition-colors cursor-pointer font-mono"
                >
                    {validWeeks.map((week) => (
                        <option key={week.week_of} value={week.week_of}>
                            {week.week_of} {week.week_of === currentWeek ? '(Current)' : ''}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-muted)]">
                    <ChevronDown size={14} />
                </div>
            </div>

            {/* Quick Navigation Arrows could go here if we find the index */}
        </div>
    );
};
