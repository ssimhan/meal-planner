import React, { useState } from 'react';
import { PrepTask } from '@/types';
import { checkPrepTask, bulkCheckPrepTasks } from '@/lib/api';

interface PrepTaskListProps {
    tasks: PrepTask[];
    weekOf: string;
    onUpdate: () => void;
}

export default function PrepTaskList({ tasks, weekOf, onUpdate }: PrepTaskListProps) {
    const [updating, setUpdating] = useState<string | null>(null);
    const [bulkUpdating, setBulkUpdating] = useState<string | null>(null);
    // Track collapsed state by meal name. Default to empty (all expanded)
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());


    // Group by meal
    const grouped = tasks.reduce((acc, task) => {
        if (task.status === 'complete') return acc; // Only show pending
        const mealKey = task.meal_name || 'General Prep';
        if (!acc[mealKey]) acc[mealKey] = [];
        acc[mealKey].push(task);
        return acc;
    }, {} as Record<string, PrepTask[]>);


    const handleCheck = async (task: PrepTask) => {
        if (updating || bulkUpdating || !task.id) return;
        setUpdating(task.id);
        try {
            await checkPrepTask(weekOf, task.id, 'complete');
            onUpdate(); // Trigger refresh
        } catch (e) {
            console.error(e);
            alert("Failed to check off task");
        } finally {
            setUpdating(null);
        }
    };

    const handleBulkCheck = async (meal: string, taskIds: string[]) => {
        if (updating || bulkUpdating) return;
        setBulkUpdating(meal);
        try {
            await bulkCheckPrepTasks(weekOf, taskIds, 'complete');
            onUpdate();
        } catch (e) {
            console.error(e);
            alert("Failed to check off tasks");
        } finally {
            setBulkUpdating(null);
        }
    };

    const toggleCollapse = (meal: string) => {
        setCollapsed(prev => {
            const next = new Set(prev);
            if (next.has(meal)) {
                next.delete(meal);
            } else {
                next.add(meal);
            }
            return next;
        });
    };

    if (Object.keys(grouped).length === 0) {
        return (
            <div className="card text-center py-8">
                <p className="text-[var(--text-muted)] italic">✨ All prep tasks complete!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {Object.entries(grouped).map(([meal, mealTasks]) => {
                const isCollapsed = collapsed.has(meal);
                const taskIds = mealTasks.map(t => t.id!).filter(Boolean);
                const isUpdatingThisMeal = bulkUpdating === meal;

                return (
                    <div key={meal} className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-subtle)] overflow-hidden">
                        <div className="flex items-center group/header">
                            <button
                                onClick={() => toggleCollapse(meal)}
                                className="flex-1 bg-[var(--bg-secondary)] px-4 py-3 border-b border-[var(--border-subtle)] flex justify-between items-center hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`transform transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                                        ▼
                                    </span>
                                    <h3 className="font-bold text-[var(--text-primary)] text-sm uppercase tracking-wide">
                                        {meal.replace(/^pipeline_/, 'Pipeline: ')}
                                    </h3>
                                </div>
                                <span className="text-xs text-[var(--text-muted)] font-mono">{mealTasks.length} tasks</span>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleBulkCheck(meal, taskIds);
                                }}
                                disabled={isUpdatingThisMeal}
                                className="bg-[var(--bg-secondary)] px-4 py-3 border-b border-l border-[var(--border-subtle)] hover:bg-[var(--accent-sage)]/10 text-[var(--accent-sage)] transition-all flex items-center gap-2 group/btn disabled:opacity-50"
                                title="Check all for this dish"
                            >
                                {isUpdatingThisMeal ? (
                                    <div className="w-4 h-4 border-2 border-[var(--accent-sage)] border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <span className="text-lg group-hover/btn:scale-125 transition-transform">✅</span>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-0 group-hover/header:opacity-100 transition-opacity whitespace-nowrap">Done with Dish</span>
                            </button>
                        </div>

                        {!isCollapsed && (
                            <ul className="divide-y divide-[var(--border-subtle)]">
                                {mealTasks.map(task => (
                                    <li key={task.id} className="group hover:bg-[var(--bg-secondary)] transition-colors">
                                        <label className="flex items-start gap-3 p-4 cursor-pointer">
                                            <div className="relative flex items-center mt-0.5">
                                                <input
                                                    type="checkbox"
                                                    className="peer h-5 w-5 rounded border-gray-300 text-[var(--accent-sage)] focus:ring-[var(--accent-sage)] transition-all"
                                                    checked={task.status === 'complete'}
                                                    onChange={() => handleCheck(task)}
                                                    disabled={!!updating || !!bulkUpdating}
                                                />
                                                {(updating === task.id || isUpdatingThisMeal) && (
                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                        <div className="w-3 h-3 border-2 border-[var(--accent-sage)] border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm text-[var(--text-primary)] leading-relaxed ${task.status === 'complete' || isUpdatingThisMeal ? 'line-through text-[var(--text-muted)]' : ''}`}>
                                                    {task.task.replace(/\(for .*?\)/, '')} { /* Clean up redundancy if present */}
                                                </p>
                                                {task.day && (
                                                    <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase font-mono">
                                                        📅 {task.day.toUpperCase()}
                                                    </p>
                                                )}
                                            </div>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
