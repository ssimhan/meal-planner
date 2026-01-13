'use client';

import AppLayout from '@/components/AppLayout';
import React from 'react';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div>
        <h1 className="text-4xl font-bold mb-8">Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
          {/* People Profiles */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-6">People Profiles</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--accent-secondary)] rounded-full"></div>
                  <div>
                    <div className="font-semibold text-sm">Sandhya</div>
                    <div className="text-xs text-[var(--text-muted)]">Vegetarian, Loves Spicy</div>
                  </div>
                </div>
                <button className="text-[var(--text-muted)] hover:text-[var(--text-main)]">✎</button>
              </div>

              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--accent-primary)] rounded-full"></div>
                  <div>
                    <div className="font-semibold text-sm">Partner</div>
                    <div className="text-xs text-[var(--text-muted)]">No Mushrooms</div>
                  </div>
                </div>
                <button className="text-[var(--text-muted)] hover:text-[var(--text-main)]">✎</button>
              </div>
            </div>

            <button className="btn-secondary mt-4 w-full text-sm">+ Add Person</button>
          </div>

          {/* App Preferences */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-6">App Preferences</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <span className="font-medium">Theme</span>
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs py-2 px-4">Light</button>
                  <button className="btn-secondary text-xs py-2 px-4">Dark</button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <span className="font-medium">Start of Week</span>
                <span className="inline-block px-3 py-1 text-xs bg-[var(--bg-sidebar)] text-[var(--text-muted)] border border-[var(--border-color)] rounded-full">
                  Monday
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
