'use client';

import React from 'react';

interface PendingRecipesIndicatorProps {
    count: number;
    onClick: () => void;
}

export default function PendingRecipesIndicator({ count, onClick }: PendingRecipesIndicatorProps) {
    if (count === 0) return null;

    return (
        <button
            onClick={onClick}
            className="group relative p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
            title={`${count} new recipes detected`}
        >
            <div className="relative">
                <span className="text-2xl filter grayscale group-hover:grayscale-0 transition-all duration-300 transform group-hover:scale-110 block">
                    🌱
                </span>
                <span className="absolute -top-1 -right-2 bg-[var(--accent-terracotta)] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-sm border-2 border-[var(--bg-primary)] animate-in zoom-in duration-300">
                    {count}
                </span>
            </div>
        </button>
    );
}
