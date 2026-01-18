'use client';

import React from 'react';

interface EffortIndicatorProps {
    level: string | undefined;
    size?: 'sm' | 'md' | 'lg';
}

export default function EffortIndicator({ level, size = 'md' }: EffortIndicatorProps) {
    const normalizedLevel = level?.toLowerCase() || 'unknown';

    // Determine number of segments and color based on level
    let filledSegments = 0;
    let colorClass = 'bg-gray-200';
    let label = 'Unknown';

    if (normalizedLevel === 'low') {
        filledSegments = 1;
        colorClass = 'bg-emerald-500';
        label = 'Low Effort';
    } else if (normalizedLevel === 'medium' || normalizedLevel === 'normal') {
        filledSegments = 2;
        colorClass = 'bg-amber-500';
        label = 'Medium Effort';
    } else if (normalizedLevel === 'high') {
        filledSegments = 3;
        colorClass = 'bg-rose-500';
        label = 'High Effort';
    }

    const segments = [3, 2, 1]; // Render top to bottom

    const sizeClasses = {
        sm: { container: 'w-2 h-6 gap-0.5', segment: 'w-2 h-1.5' },
        md: { container: 'w-3 h-10 gap-1', segment: 'w-3 h-2.5' },
        lg: { container: 'w-4 h-14 gap-1', segment: 'w-4 h-4' }
    };

    const currentSize = sizeClasses[size];

    return (
        <div className="flex flex-col items-center gap-1 group/effort" title={label}>
            <div className={`flex flex-col ${currentSize.container}`}>
                {segments.map((s) => (
                    <div
                        key={s}
                        className={`rounded-sm transition-all duration-300 ${currentSize.segment} ${s <= filledSegments ? colorClass : 'bg-gray-100'
                            } ${s <= filledSegments ? 'shadow-sm' : 'opacity-40'}`}
                    />
                ))}
            </div>
        </div>
    );
}
