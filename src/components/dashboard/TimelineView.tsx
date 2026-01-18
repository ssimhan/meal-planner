import React, { useState } from 'react';
import FeedbackButtons from '../FeedbackButtons';
import MealLogFlow from '../MealLogFlow';
import { ChefHat } from 'lucide-react';

interface TimelineItemProps {
    type?: 'school_snack' | 'home_snack' | 'kids_lunch' | 'adult_lunch' | 'dinner';
    time?: string;
    title: string;
    description: string;
    status?: 'done' | 'pending' | 'skipped';
    icon?: string;
    action?: React.ReactNode;
    feedbackProps?: any; // To pass through to FeedbackButtons
    logFlowProps?: any; // To pass through to MealLogFlow
    onAction?: () => void;
    onFocus?: () => void;
}

function TimelineItem({ type, time, title, description, status, icon, action, feedbackProps, logFlowProps, onAction, onFocus }: TimelineItemProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`group flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 border-b border-[var(--border-color)] last:border-0 relative ${onAction ? 'cursor-pointer hover:bg-[var(--bg-secondary)]/50' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onAction?.()}
        >
            <div className="flex gap-4 items-start">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner ${status === 'done' ? 'bg-[var(--accent-primary)]/10' : 'bg-[var(--bg-sidebar)]'}`}>
                    {icon || '🍽️'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm uppercase tracking-tight text-[var(--text-muted)]">
                            {title}
                        </span>
                        {time && <span className="text-[var(--text-muted)] text-[10px] bg-[var(--bg-sidebar)] px-2 py-0.5 rounded-full">{time}</span>}
                    </div>
                    <div className="text-lg font-semibold text-[var(--text-main)] group-hover:text-[var(--accent-primary)] transition-colors flex items-center gap-2">
                        <span className="truncate">{description}</span>
                        {onFocus && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFocus();
                                }}
                                className="p-1.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-all scale-0 group-hover:scale-100"
                                title="Start Focus Mode"
                            >
                                <ChefHat size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 mt-4 sm:mt-0 self-end sm:self-auto min-h-[40px]">
                {/* Status Indicator */}
                {status === 'done' && !isHovered && (
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold px-3 py-1.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full border border-[var(--accent-primary)]/20">
                        <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-pulse"></span>
                        Done
                    </span>
                )}

                {/* Feedback Loop on Hover or if Pending */}
                {isHovered && feedbackProps && !logFlowProps && (
                    <div className="fade-in">
                        <FeedbackButtons {...feedbackProps} hideLabel={true} />
                    </div>
                )}

                {/* Meal Log Flow (Detailed) - Only render inline if not explicitly a modal type */}
                {logFlowProps && !logFlowProps.isModal && (
                    <div className="fade-in" onClick={e => e.stopPropagation()}>
                        <MealLogFlow {...logFlowProps} />
                    </div>
                )}

                {action && <div className="fade-in">{action}</div>}
            </div>
        </div>
    );
}

interface TimelineViewProps {
    items: TimelineItemProps[];
}

export default function TimelineView({ items }: TimelineViewProps) {
    return (
        <div className="mt-8 slide-up">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] mb-6 ml-1 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-[var(--border-color)]"></span>
                Timeline
            </h3>
            <div className="glass rounded-3xl px-8 py-2 overflow-hidden shadow-2xl shadow-[var(--shadow)]">
                {items.map((item, i) => (
                    <TimelineItem key={i} {...item} />
                ))}
            </div>
        </div>
    );
}
