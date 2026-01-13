'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';
import { getSettings, saveSettings } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Skeleton from '@/components/Skeleton';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await getSettings();
      setConfig(data || {});
    } catch (err) {
      console.error(err);
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await saveSettings(config);
      showToast('Settings saved successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Generic handler for nested updates
  function updateConfig(path: string[], value: any) {
    setConfig((prev: any) => {
      const newConfig = { ...prev };
      let current = newConfig;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newConfig;
    });
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto max-w-4xl p-8">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl pb-24">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Settings</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </header>

        <div className="grid grid-cols-1 gap-8">

          {/* 1. App Preferences (Theme) */}
          <section className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🎨</span> Appearance
            </h3>
            <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg">
              <span className="font-medium">Theme Mode</span>
              <div className="flex bg-[var(--bg-primary)] p-1 rounded-lg border border-[var(--border-subtle)]">
                <button
                  onClick={() => setTheme('light')}
                  className={`text-xs py-1.5 px-4 rounded-md transition-all ${theme === 'light' ? 'bg-[var(--accent-sage)] text-white shadow-sm font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                  Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`text-xs py-1.5 px-4 rounded-md transition-all ${theme === 'dark' ? 'bg-[var(--accent-sage)] text-white shadow-sm font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                  Dark
                </button>
              </div>
            </div>
          </section>

          {/* 2. Kid Profiles */}
          <section className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>👥</span> Kid Profiles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(config.kid_profiles || {}).map(([name, profile]: [string, any]) => (
                <div key={name} className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-bold text-lg">{name}</div>
                    {/* Deleting profiles implies complex object manipulation, maybe next phase */}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Avoid Ingredients</label>
                      <textarea
                        className="input mt-1 w-full text-sm"
                        rows={2}
                        value={(profile.avoid_ingredients || []).join(', ')}
                        onChange={(e) => {
                          const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          updateConfig(['kid_profiles', name, 'avoid_ingredients'], val);
                        }}
                        placeholder="nuts, dairy, etc."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 text-center border border-dashed border-[var(--border-subtle)] rounded text-[var(--text-muted)] text-sm">
              Add Profile functionality coming soon.
            </div>
          </section>

          {/* 3. Global Preferences */}
          <section className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🥗</span> Dietary Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.preferences?.vegetarian || false}
                  onChange={(e) => updateConfig(['preferences', 'vegetarian'], e.target.checked)}
                  className="w-5 h-5 accent-[var(--accent-sage)]"
                />
                <span className="font-medium">Vegetarian Household</span>
              </div>

              <div>
                <label className="text-sm font-bold mb-1 block">Global Avoid List</label>
                <textarea
                  className="input w-full"
                  value={(config.preferences?.avoid_ingredients || []).join(', ')}
                  onChange={(e) => updateConfig(['preferences', 'avoid_ingredients'], e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                  placeholder="eggplant, mushrooms..."
                />
              </div>
            </div>
          </section>

          {/* 4. Schedule */}
          <section className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📅</span> Typical Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-bold mb-2 block">Office Days (In Person)</label>
                <div className="flex flex-wrap gap-2">
                  {['mon', 'tue', 'wed', 'thu', 'fri'].map(day => (
                    <button
                      key={`office-${day}`}
                      onClick={() => {
                        const current = config.schedule?.office_days || [];
                        const next = current.includes(day)
                          ? current.filter((d: string) => d !== day)
                          : [...current, day];
                        updateConfig(['schedule', 'office_days'], next);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${(config.schedule?.office_days || []).includes(day)
                          ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                        }`}
                    >
                      {day.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold mb-2 block">Busy Evenings (Quick Prep)</label>
                <div className="flex flex-wrap gap-2">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                    <button
                      key={`busy-${day}`}
                      onClick={() => {
                        const current = config.schedule?.busy_days || [];
                        const next = current.includes(day)
                          ? current.filter((d: string) => d !== day)
                          : [...current, day];
                        updateConfig(['schedule', 'busy_days'], next);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${(config.schedule?.busy_days || []).includes(day)
                          ? 'bg-[var(--accent-terracotta)] text-white border-[var(--accent-terracotta)]'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                        }`}
                    >
                      {day.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 5. Defaults (Lunch/Snacks) - Read Only for now as complex list */}
          <section className="card opacity-75">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🍱</span> Meal Defaults (Read Only)
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Edit `config.yml` directly to change these for now.</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[var(--bg-secondary)] rounded">
                <strong>Lunch Rotation</strong>
                <ul className="list-disc pl-4 mt-2 space-y-1 text-[var(--text-muted)]">
                  {(config.lunch_defaults?.kids || []).slice(0, 5).map((l: string, i: number) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded">
                <strong>Snack Rotation</strong>
                <ul className="list-disc pl-4 mt-2 space-y-1 text-[var(--text-muted)]">
                  {Object.entries(config.snack_defaults?.by_day || {}).map(([d, s]: [string, any]) => (
                    <li key={d}><span className="uppercase font-bold text-[10px] w-8 inline-block">{d}</span> {s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
