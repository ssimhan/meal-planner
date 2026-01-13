'use client';

import AppLayout from '@/components/AppLayout';
import React from 'react';

export default function ShopPage() {
  return (
    <AppLayout>
      <div>
        <h1 className="text-4xl font-bold mb-2">Shopping List</h1>
        <p className="text-[var(--text-muted)] mb-8">Manage your weekly shopping list</p>

        <div className="card max-w-2xl">
          <h3 className="text-lg font-semibold mb-4">Whole Foods</h3>

          <div className="space-y-4">
            <label className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-sidebar)] rounded transition-all">
              <input type="checkbox" className="w-4 h-4" />
              <span>Almond Milk</span>
            </label>
            <label className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-sidebar)] rounded transition-all">
              <input type="checkbox" className="w-4 h-4" />
              <span>Sourdough Bread</span>
            </label>
            <label className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-sidebar)] rounded transition-all">
              <input type="checkbox" className="w-4 h-4" />
              <span>Avocados (4)</span>
            </label>
          </div>

          <button className="btn-primary mt-6 w-full">Add Items</button>
        </div>
      </div>
    </AppLayout>
  );
}
