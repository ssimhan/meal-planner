import React from 'react';

interface TimelineItemProps {
    time?: string;
    title: string;
    description: string;
    status?: 'done' | 'pending' | 'skipped';
    action?: React.ReactNode;
}

function TimelineItem({ time, title, description, status, action }: TimelineItemProps) {
    return (
        <div className="flex justify-between items-center py-4 border-b border-[var(--border-subtle)] last:border-0">
            <div>
                <div className="font-semibold text-sm">
                    {title} {time && <span className="text-[var(--text-muted)] font-normal text-xs ml-1">- {time}</span>}
                </div>
                <div className="text-sm text-[var(--text-muted)] mt-1">
                    {description}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {status === 'done' && (
                    <span className="text-[10px] uppercase font-bold px-2 py-1 bg-[var(--accent-sage)] text-white rounded-full">
                        Done
                    </span>
                )}
                {status === 'skipped' && (
                    <span className="text-[10px] uppercase font-bold px-2 py-1 bg-[var(--text-muted)] text-white rounded-full">
                        Skipped
                    </span>
                )}
                {action}
            </div>
        </div>
    );
}

interface TimelineViewProps {
    items: TimelineItemProps[];
}

export default function TimelineView({ items }: TimelineViewProps) {
    return (
        <div className="mt-8">
            <h3 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">Timeline</h3>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-6 py-2">
                {items.map((item, i) => (
                    <TimelineItem key={i} {...item} />
                ))}
            </div>
        </div>
    );
}
