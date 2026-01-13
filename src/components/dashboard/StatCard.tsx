import React, { ReactNode } from 'react';

interface StatCardProps {
    label: string;
    value?: string | ReactNode;
    children?: ReactNode;
    className?: string;
}

export default function StatCard({ label, value, children, className = '' }: StatCardProps) {
    return (
        <div className={`bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${className}`}>
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] block mb-2">
                {label}
            </span>
            {value && (
                <div className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                    {value}
                </div>
            )}
            {children}
        </div>
    );
}
