
'use client';

import React, { useState } from 'react';
import { WorkflowStatus } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { swapMeals } from '@/lib/api';

interface DinnerOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentDay: string;
    currentMealName: string;
    weekOf: string;
    days: string[]; // ['mon', 'tue', ...]
    onSuccess: () => void;
}

export default function DinnerOptionsModal({ isOpen, onClose, currentDay, currentMealName, weekOf, days, onSuccess }: DinnerOptionsModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleMoveTo = async (targetDay: string) => {
        if (!confirm(`Move "${currentMealName}" to ${targetDay.toUpperCase()}? This will swap meals if one exists.`)) return;

        setLoading(true);
        try {
            await swapMeals(weekOf, currentDay.toLowerCase(), targetDay.toLowerCase());
            showToast(`Moved meal to ${targetDay}`, 'success');
            onSuccess();
            onClose();
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filter out today
    const availableDays = days.filter(d => d.toLowerCase() !== currentDay.toLowerCase());

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--bg-card)] w-full max-w-sm rounded-lg shadow-xl overflow-hidden border border-[var(--border-subtle)] p-6">
                <h3 className="text-lg font-serif font-bold text-[var(--accent-gold)] mb-1">
                    Change Plan
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                    What would you like to do with <strong>{currentMealName}</strong>?
                </p>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Move to another day</p>
                        <div className="grid grid-cols-3 gap-2">
                            {availableDays.map(day => (
                                <button
                                    key={day}
                                    onClick={() => handleMoveTo(day)}
                                    disabled={loading}
                                    className="px-2 py-2 text-xs font-bold uppercase bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded transition-colors"
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
