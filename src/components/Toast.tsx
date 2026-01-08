'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function ToastContainer() {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onRemove }: { toast: any, onRemove: () => void }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Small delay to trigger entry animation
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            className={`
        pointer-events-auto
        flex items-start gap-3 p-4 rounded-2xl shadow-lg border w-80
        transition-all duration-300 transform
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
        ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                    toast.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' :
                        'bg-slate-50 border-slate-100 text-slate-800'}
      `}
        >
            <div className="mt-0.5 shrink-0">
                {toast.type === 'success' && <CheckCircle size={20} className="text-emerald-500" />}
                {toast.type === 'error' && <AlertCircle size={20} className="text-rose-500" />}
                {toast.type === 'info' && <Info size={20} className="text-slate-500" />}
            </div>

            <div className="flex-1 text-sm font-medium">
                {toast.message}
            </div>

            <button
                onClick={onRemove}
                className="mt-0.5 opacity-50 hover:opacity-100 transition-opacity shrink-0"
            >
                <X size={16} />
            </button>
        </div>
    );
}
