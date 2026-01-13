import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';

interface BrainDumpProps {
    onAdd: (text: string) => void;
}

export default function BrainDump({ onAdd }: BrainDumpProps) {
    const [input, setInput] = useState('');
    const { showToast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // In a real implementation, this would likely parse the input or send it to an API.
        // For now, we'll just pass it up.
        onAdd(input);
        setInput('');
        showToast('Added to Brain Dump!', 'success');
    };

    return (
        <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-subtle)] mt-8">
            <h3 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">
                Brain Dump
            </h3>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Add ingredients, meal ideas, or notes..."
                    className="flex-1 p-3 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-sage)]"
                />
                <button
                    type="submit"
                    disabled={!input.trim()}
                    className="px-4 py-2 bg-[var(--accent-sage)] text-white rounded-lg hover:bg-[var(--accent-sage-dark)] disabled:opacity-50 transition-colors font-bold text-xl"
                >
                    +
                </button>
            </form>
        </div>
    );
}
