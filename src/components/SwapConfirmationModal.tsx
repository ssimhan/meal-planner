import React from 'react';

interface SwapConfirmationModalProps {
    day1: string;
    day2: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const dayNames: { [key: string]: string } = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
};

export default function SwapConfirmationModal({ day1, day2, onConfirm, onCancel, isLoading }: SwapConfirmationModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 transform transition-all animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 text-center">Swap Meals?</h3>

                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-2 text-xl font-bold text-[var(--accent-sage)]">
                            {dayNames[day1].substring(0, 3)}
                        </div>
                        <span className="text-sm font-medium">{dayNames[day1]}</span>
                    </div>

                    <div className="text-[var(--text-muted)] text-xl">⇄</div>

                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-2 text-xl font-bold text-[var(--accent-sage)]">
                            {dayNames[day2].substring(0, 3)}
                        </div>
                        <span className="text-sm font-medium">{dayNames[day2]}</span>
                    </div>
                </div>

                <div className="text-sm text-[var(--text-muted)] text-center mb-6">
                    <p className="mb-2">
                        This will swap the dinners and automatically regenerate your prep instructions.
                    </p>
                    {isLoading && (
                        <p className="text-[var(--accent-sage)] font-medium animate-pulse">
                            Swapping meals and updating prep tasks. This may take a few seconds...
                        </p>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-sage)] text-white font-medium hover:brightness-95 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Swapping...' : 'Confirm Swap'}
                    </button>
                </div>
            </div>
        </div>
    );
}
