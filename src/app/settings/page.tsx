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

  function deleteProfile(type: 'adult_profiles' | 'kid_profiles', name: string) {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    setConfig((prev: any) => {
      const newConfig = { ...prev };
      if (newConfig[type]) {
        const updated = { ...newConfig[type] };
        delete updated[name];
        newConfig[type] = updated;
      }
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
                      <button
                        onClick={() => deleteProfile('adult_profiles', name)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold uppercase tracking-wider"
                      >
                        Remove
                      </button>
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
                {/* Dynamic Add Adult */}
                <button
                  onClick={() => {
                    const split = Object.keys(config.adult_profiles || {}).length + 1;
                    const newKey = `Person ${split}`;
                    updateConfig(['adult_profiles', newKey], { office_days: [] });
                  }}
                  className="mt-2 text-xs font-bold text-[var(--accent-sage)] hover:underline flex items-center gap-1"
                >
                  <span>+</span> Add Person
                </button>
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

            <div className="space-y-6">
              {[
                { key: 'dinner', label: 'Dinner' },
                { key: 'kids_lunch', label: 'Kids Lunch' },
                { key: 'adult_lunch', label: 'Adult Lunch' },
                { key: 'school_snack', label: 'School Snack' },
                { key: 'home_snack', label: 'Home Snack' },
              ].map(({ key, label }) => (
                <div key={key} className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold">{label} - Active Days</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
                      const current = Array.isArray(config.meals_covered?.[key])
                        ? config.meals_covered[key]
                        : (config.meals_covered?.[key] === false ? [] : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']); // Default all if boolean true/undefined

                      return (
                        <button
                          key={`${key}-${day}`}
                          onClick={() => {
                            const next = current.includes(day)
                              ? current.filter((d: string) => d !== day)
                              : [...current, day];
                            updateConfig(['meals_covered', key], next);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${current.includes(day)
                            ? 'bg-[var(--accent-sage)] text-white border-[var(--accent-sage)]'
                            : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                            }`}
                        >
                          {day.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Global Preferences & Prep */}
          <section className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>⚙️</span> Preferences & Prep
            </h3>

            <div className="space-y-6">
              {/* Prep Time Grid */}
              <div className="overflow-x-auto">
                <label className="text-sm font-bold mb-4 block">Prep Time Schedule</label>
                <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr] gap-2 min-w-[500px]">
                  <div className="font-mono text-xs text-[var(--text-muted)] pt-2">DAY</div>
                  <div className="font-mono text-xs text-center text-[var(--text-muted)]">MORNING</div>
                  <div className="font-mono text-xs text-center text-[var(--text-muted)]">AFTERNOON</div>
                  <div className="font-mono text-xs text-center text-[var(--text-muted)]">BEFORE DINNER</div>
                  <div className="font-mono text-xs text-center text-[var(--text-muted)]">AFTER DINNER</div>

                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                    <React.Fragment key={`prep-${day}`}>
                      <div className="font-bold text-xs uppercase pt-3 text-[var(--text-muted)] self-center">{day}</div>
                      {['morning', 'afternoon', 'pre_dinner', 'post_dinner'].map(slot => {
                        // Current structure might be simple: prep_preferences: { days: { mon: 'evening' } }
                        // Or default fallback. Let's assume structure: config.prep_preferences.schedule[day] = slot
                        const currentSchedule = config.prep_preferences?.schedule || {};
                        const currentSlot = currentSchedule[day] || config.prep_preferences?.default_time_slot || 'afternoon';

                        // Map 'evening' -> 'pre_dinner' for legacy compat if needed, or just standard
                        const isSelected = currentSlot === slot;

                        return (
                          <button
                            key={`${day}-${slot}`}
                            onClick={() => updateConfig(['prep_preferences', 'schedule', day], slot)}
                            className={`py-2 rounded-md text-xs font-bold border transition-colors ${isSelected
                              ? 'bg-[var(--accent-sage)] text-white border-[var(--accent-sage)]'
                              : 'hover:bg-gray-50 border-[var(--border-subtle)] text-gray-400'
                              }`}
                          >
                            {(slot === 'pre_dinner' ? 'Before' : slot === 'post_dinner' ? 'After' : '✓')}
                          </button>
                        );
                      })}
                    </React.Fragment>
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

          {/* 5. Defaults (Lunch/Snacks) */}
          <section className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🍱</span> Meal Defaults
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Edit your default rotations for lunches and snacks.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                <strong className="block mb-2 text-[var(--accent-sage)]">Lunch Defaults/Rotation</strong>
                <p className="text-xs text-[var(--text-muted)] mb-3">Comma separated list of lunch ideas to rotate through.</p>
                <textarea
                  className="input w-full font-mono text-xs"
                  rows={6}
                  value={(config.lunch_defaults?.kids || []).join(', ')}
                  onChange={(e) => updateConfig(['lunch_defaults', 'kids'], e.target.value.replace(/\n/g, ',').split(',').map((s: string) => s.trim()).filter(Boolean))}
                  placeholder="Sandwich, Pasta, Wrap..."
                />
              </div>
              <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                <strong className="block mb-2 text-[var(--accent-sage)]">Snack Defaults</strong>
                <p className="text-xs text-[var(--text-muted)] mb-3">Format: "mon: Apple, tue: Yogurt" (one per line or comma)</p>
                <div className="space-y-2">
                  {['mon', 'tue', 'wed', 'thu', 'fri'].map(day => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="w-8 font-bold uppercase text-xs text-[var(--text-muted)]">{day}</span>
                      <input
                        type="text"
                        className="input flex-1 py-1 text-xs"
                        value={config.snack_defaults?.by_day?.[day] || ''}
                        onChange={(e) => updateConfig(['snack_defaults', 'by_day', day], e.target.value)}
                      />
                    </div>
                  ))}
                </div>
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
