'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';
import { getSettings, saveSettings, deleteWeek, getStatus } from '@/lib/api';
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

          {/* 2. People & Schedules */}
          <section className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>👥</span> People & Schedules
            </h3>

            {/* Adults */}
            <div className="mb-8">
              <h4 className="text-sm font-bold uppercase text-[var(--text-muted)] tracking-wider mb-3">Adults</h4>
              <div className="space-y-4">
                {Object.entries(config.adult_profiles || { "Adult 1": {} }).map(([name, profile]: [string, any]) => (
                  <div key={name} className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-bold text-lg">{name}</div>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-[var(--text-muted)] mb-2 block">Office Days (In Person)</label>
                      <div className="flex flex-wrap gap-2">
                        {['mon', 'tue', 'wed', 'thu', 'fri'].map(day => (
                          <button
                            key={`${name}-office-${day}`}
                            onClick={() => {
                              const current = profile.office_days || [];
                              const next = current.includes(day)
                                ? current.filter((d: string) => d !== day)
                                : [...current, day];
                              updateConfig(['adult_profiles', name, 'office_days'], next);
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${(profile.office_days || []).includes(day)
                              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                              : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                              }`}
                          >
                            {day.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {/* Simple Add Adult Logic could go here later */}
              </div>
            </div>

            {/* Kids */}
            <div>
              <h4 className="text-sm font-bold uppercase text-[var(--text-muted)] tracking-wider mb-3">Kids</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(config.kid_profiles || {}).map(([name, profile]: [string, any]) => (
                  <div key={name} className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                    <div className="font-bold text-lg mb-2">{name}</div>
                    <div>
                      <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Avoid Ingredients</label>
                      <textarea
                        className="input mt-1 w-full text-sm"
                        rows={2}
                        value={(profile.avoid_ingredients || []).join(', ')}
                        onChange={(e) => {
                          const val = e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean);
                          updateConfig(['kid_profiles', name, 'avoid_ingredients'], val);
                        }}
                        placeholder="nuts, dairy, etc."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 3. Planning Scope */}
          <section className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🎯</span> Planning Scope
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Select which meals you want to track and plan for.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Dinner */}
              <label className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--accent-sage)] transition-colors">
                <input
                  type="checkbox"
                  checked={config.meals_covered?.dinner ?? true} // Default true
                  onChange={(e) => updateConfig(['meals_covered', 'dinner'], e.target.checked)}
                  className="w-5 h-5 accent-[var(--accent-sage)]"
                />
                <span className="font-bold">Dinner</span>
              </label>

              {/* Kids Lunch */}
              <label className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--accent-sage)] transition-colors">
                <input
                  type="checkbox"
                  checked={config.meals_covered?.kids_lunch ?? true}
                  onChange={(e) => updateConfig(['meals_covered', 'kids_lunch'], e.target.checked)}
                  className="w-5 h-5 accent-[var(--accent-sage)]"
                />
                <span className="font-bold">Kids Lunch</span>
              </label>

              {/* Adult Lunch */}
              <label className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--accent-sage)] transition-colors">
                <input
                  type="checkbox"
                  checked={config.meals_covered?.adult_lunch ?? true}
                  onChange={(e) => updateConfig(['meals_covered', 'adult_lunch'], e.target.checked)}
                  className="w-5 h-5 accent-[var(--accent-sage)]"
                />
                <span className="font-bold">Adult Lunch</span>
              </label>

              {/* School Snack */}
              <label className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--accent-sage)] transition-colors">
                <input
                  type="checkbox"
                  checked={config.meals_covered?.school_snack ?? true}
                  onChange={(e) => updateConfig(['meals_covered', 'school_snack'], e.target.checked)}
                  className="w-5 h-5 accent-[var(--accent-sage)]"
                />
                <span className="font-bold">School Snack</span>
              </label>

              {/* Home Snack */}
              <label className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--accent-sage)] transition-colors">
                <input
                  type="checkbox"
                  checked={config.meals_covered?.home_snack ?? true}
                  onChange={(e) => updateConfig(['meals_covered', 'home_snack'], e.target.checked)}
                  className="w-5 h-5 accent-[var(--accent-sage)]"
                />
                <span className="font-bold">Home Snack</span>
              </label>
            </div>
          </section>

          {/* 4. Global Preferences & Prep */}
          <section className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>⚙️</span> Preferences & Prep
            </h3>

            <div className="space-y-6">
              {/* Prep Time */}
              <div>
                <label className="text-sm font-bold mb-2 block">Preferred Prep Time</label>
                <div className="flex bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)] inline-flex">
                  {['morning', 'afternoon', 'evening'].map(slot => (
                    <button
                      key={slot}
                      onClick={() => updateConfig(['prep_preferences', 'default_time_slot'], slot)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${(config.prep_preferences?.default_time_slot || 'morning') === slot
                          ? 'bg-[var(--accent-sage)] text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                    >
                      {slot.charAt(0).toUpperCase() + slot.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Busy Days */}
              <div>
                <label className="text-sm font-bold mb-2 block">Busy Evenings (Quick Prep Optimized)</label>
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

              {/* Dietary */}
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-3 mb-4">
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

          {/* 6. Developer Tools (Testing) */}
          <section className="card border-red-100 bg-red-50/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-700">
              <span>🛠️</span> Developer Tools
            </h3>
            <p className="text-sm text-red-600 mb-6">
              Use these tools to reset data for testing. <strong>Warning: This cannot be undone.</strong>
            </p>

            <div className="p-4 bg-white border border-red-100 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-sm">Reset Current Week</h4>
                  <p className="text-xs text-[var(--text-muted)]">Deletes the active meal plan so you can restart the Planning Wizard.</p>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete the current week\'s plan? This will let you restart the planning wizard.')) {
                      try {
                        const status = await getStatus();
                        if (status.week_of) {
                          await deleteWeek(status.week_of);
                          showToast('Week deleted. Redirecting to home...', 'success');
                          setTimeout(() => window.location.href = '/', 1500);
                        }
                      } catch (err) {
                        showToast('Failed to reset week', 'error');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Clear Current Plan
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
