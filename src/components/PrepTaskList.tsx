import React, { useState } from 'react';
import { PrepTask } from '@/types';
import { checkPrepTask } from '@/lib/api';

interface PrepTaskListProps {
    tasks: PrepTask[];
    weekOf: string;
    onUpdate: () => void;
}

export default function PrepTaskList({ tasks, weekOf, onUpdate }: PrepTaskListProps) {
    const [updating, setUpdating] = useState<string | null>(null);

    // Group by meal
    const grouped = tasks.reduce((acc, task) => {
        if (task.status === 'complete') return acc; // Only show pending
        const mealKey = task.meal_name || 'General Prep';
        if (!acc[mealKey]) acc[mealKey] = [];
        acc[mealKey].push(task);
        return acc;
    }, {} as Record<string, PrepTask[]>);

    const handleCheck = async (task: PrepTask) => {
        if (updating || !task.id) return;
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

    if (Object.keys(grouped).length === 0) {
        return (
            <div className="card text-center py-8">
                <p className="text-[var(--text-muted)] italic">✨ All prep tasks complete!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([meal, mealTasks]) => (
                <div key={meal} className="bg-white rounded-xl shadow-sm border border-[var(--border-subtle)] overflow-hidden">
                    <div className="bg-[var(--bg-secondary)] px-4 py-3 border-b border-[var(--border-subtle)] flex justify-between items-center">
                        <h3 className="font-bold text-[var(--text-primary)] text-sm uppercase tracking-wide">
                            {meal.replace(/^pipeline_/, 'Pipeline: ')}
                        </h3>
                        <span className="text-xs text-[var(--text-muted)] font-mono">{mealTasks.length} tasks</span>
                    </div>
                    <ul className="divide-y divide-[var(--border-subtle)]">
                        {mealTasks.map(task => (
                            <li key={task.id} className="group hover:bg-gray-50 transition-colors">
                                <label className="flex items-start gap-3 p-4 cursor-pointer">
                                    <div className="relative flex items-center mt-0.5">
                                        <input
                                            type="checkbox"
                                            className="peer h-5 w-5 rounded border-gray-300 text-[var(--accent-green)] focus:ring-[var(--accent-green)] transition-all"
                                            checked={task.status === 'complete'}
                                            onChange={() => handleCheck(task)}
                                            disabled={!!updating}
                                        />
                                        {updating === task.id && (
                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                <div className="w-3 h-3 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm text-gray-700 leading-relaxed ${task.status === 'complete' ? 'line-through text-gray-400' : ''}`}>
                                            {task.task.replace(/\(for .*?\)/, '')} { /* Clean up redundancy if present */}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-mono">
                                            {task.day && <span className="mr-2">📅 {task.day.toUpperCase()}</span>}
                                            {task.type && <span>🏷️ {task.type}</span>}
                                        </p>
                                    </div>
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
