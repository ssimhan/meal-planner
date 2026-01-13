'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* People Profiles - Placeholder for Phase 23 */}
          <section className="card">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <span>👥</span> People Profiles
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--accent-secondary)] rounded-full flex items-center justify-center text-white font-bold text-xs">S</div>
                  <div>
                    <div className="font-semibold text-sm">Sandhya</div>
                    <div className="text-xs text-[var(--text-muted)]">Vegetarian • Spicy</div>
                  </div>
                </div>
                <button className="text-[var(--text-muted)] hover:text-[var(--text-main)]" title="Edit">✎</button>
              </div>

              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--accent-primary)] rounded-full flex items-center justify-center text-white font-bold text-xs">P</div>
                  <div>
                    <div className="font-semibold text-sm">Partner</div>
                    <div className="text-xs text-[var(--text-muted)]">No Mushrooms</div>
                  </div>
                </div>
                <button className="text-[var(--text-muted)] hover:text-[var(--text-main)]" title="Edit">✎</button>
              </div>

              <div className="p-4 bg-[var(--bg-sidebar)] rounded border border-dashed border-[var(--border-color)] text-center">
                <p className="text-xs text-[var(--text-muted)] mb-2">Detailed personalization coming in Phase 23</p>
                <button className="btn-secondary text-xs w-full">+ Add Person</button>
              </div>
            </div>
          </section>

          {/* App Preferences */}
          <section className="card">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <span>⚙️</span> App Preferences
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <span className="font-medium">Theme</span>
                <div className="flex bg-[var(--bg-sidebar)] p-1 rounded-lg">
                  <button
                    onClick={() => setTheme('light')}
                    className={`text-xs py-1.5 px-4 rounded-md transition-all ${theme === 'light' ? 'bg-white shadow-sm text-black font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`text-xs py-1.5 px-4 rounded-md transition-all ${theme === 'dark' ? 'bg-[var(--bg-card)] shadow-sm text-[var(--text-main)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                  >
                    Dark
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <span className="font-medium">Start of Week</span>
                <span className="inline-block px-3 py-1 text-xs bg-[var(--bg-sidebar)] text-[var(--text-muted)] border border-[var(--border-color)] rounded-full">
                  Monday
                </span>
              </div>

              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] opacity-50 cursor-not-allowed" title="Coming in Phase 24">
                <span className="font-medium">Notifications</span>
                <span className="inline-block px-3 py-1 text-xs bg-[var(--bg-sidebar)] text-[var(--text-muted)] border border-[var(--border-color)] rounded-full">
                  Disabled
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
