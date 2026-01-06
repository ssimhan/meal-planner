'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getStatus, getRecipes, WorkflowStatus, replan } from '@/lib/api';
import MealCorrectionInput from '@/components/MealCorrectionInput';

export default function WeekView() {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [recipes, setRecipes] = useState<{ id: string; name: string }[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ day: string; type: string; label: string; value: string }[]>([]);
  const [isFixing, setIsFixing] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);

  useEffect(() => {
    async function fetchWeekData() {
      try {
        const data = await getStatus();
        setStatus(data);
      } catch (err) {
        console.error('Failed to fetch week data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchWeekData();
  }, []);

  useEffect(() => {
    async function loadRecipes() {
      try {
        const data = await getRecipes();
        const recipeList = data.recipes.map((r: any) => ({
          id: r.id,
          name: r.name
        }));
        setRecipes(recipeList);
      } catch (err) {
        console.error('Failed to load recipes:', err);
      }
    }
    loadRecipes();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--bg-primary)]">
        <p className="text-[var(--text-muted)] font-mono animate-pulse">LOADING WEEK VIEW...</p>
      </div>
    );
  }

  if (!status?.week_data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-[var(--text-muted)]">No active week plan found</p>
        <Link href="/" className="btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const weekData = status.week_data;
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getDisplayName = (planned: string, actual?: string) => {
    if (!actual) return planned;
    const isEmoji = ['❤️', '👍', '😐', '👎', '❌'].some(emoji => actual.includes(emoji));
    if (isEmoji || actual === 'Skipped') return planned;
    return actual;
  };

  const getFeedbackBadge = (feedback?: string, made?: boolean, needsFix?: boolean) => {
    if (needsFix) return <span className="text-xs text-red-600 font-bold px-2 py-0.5 bg-red-50 rounded">Needs Fix</span>;
    if (made === false) return <span className="text-xs text-red-600">✗ Skipped</span>;
    if (!feedback) return null;
    const emojis = ['❤️', '👍', '😐', '👎', '❌'];
    const emojiMatch = emojis.find(e => feedback.includes(e));
    if (emojiMatch) return <span className="text-xs bg-gray-50 px-2 py-0.5 rounded">{emojiMatch}</span>;
    return <span className="text-xs text-gray-500">✓</span>;
  };

  const toggleSelection = (day: string, type: string, label: string, value: string) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.day === day && i.type === type);
      if (exists) {
        return prev.filter(i => !(i.day === day && i.type === type));
      } else {
        return [...prev, { day, type, label, value }];
      }
    });
  };

  const handleCorrectionSave = async (day: string, type: string, value: string, requestRecipe: boolean = false) => {
    if (!status?.week_data?.week_of) return;

    try {
      await fetch('/api/log-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: status.week_data.week_of,
          day,
          request_recipe: requestRecipe,
          ...(type === 'dinner'
            ? { actual_meal: value, dinner_needs_fix: false }
            : { [`${type}_feedback`]: value, [`${type}_needs_fix`]: false })
        })
      });

      // Remove from selection if it was there
      setSelectedItems(prev => prev.filter(i => !(i.day === day && i.type === type)));

      // If all selected items are saved, we can return to main view
      // But we should refresh data first
      const data = await getStatus();
      setStatus(data);
    } catch (e) {
      console.error("Failed to save correction", e);
      alert("Failed to save correction");
    }
  };

  const handleReplan = async () => {
    if (!confirm('Replan the remaining days of the week based on current inventory?\n\nThis will reorganize your meal plan to prioritize recipes that use ingredients you have on hand.')) {
      return;
    }

    setIsReplanning(true);
    try {
      const result = await replan();
      alert('✓ Week replanned successfully!\n\n' + (result.message || 'Meals reorganized based on inventory.'));

      // Refresh the status to show updated plan
      const data = await getStatus();
      setStatus(data);
    } catch (e: any) {
      console.error("Replan failed:", e);
      alert('Failed to replan week: ' + (e.message || 'Unknown error'));
    } finally {
      setIsReplanning(false);
    }
  };

  const SelectionCheckbox = ({ day, type, label, value }: { day: string, type: string, label: string, value: string }) => {
    if (!editMode) return null;
    const isSelected = !!selectedItems.find(i => i.day === day && i.type === type);
    return (
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => toggleSelection(day, type, label, value)}
        className="mr-3 h-5 w-5 text-[var(--accent-sage)] rounded border-gray-300 focus:ring-[var(--accent-sage)] cursor-pointer"
      />
    );
  };

  if (isFixing) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8">
            <button
              onClick={() => setIsFixing(false)}
              className="text-sm text-[var(--accent-sage)] hover:underline mb-4 flex items-center gap-1"
            >
              ← Back to Week View
            </button>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Fixing {selectedItems.length} Meals</h1>
            <p className="text-[var(--text-muted)]">Update the details below to correct the meal logs.</p>
          </header>

          <div className="space-y-8">
            {selectedItems.map((item, idx) => (
              <div key={`${item.day}-${item.type}`} className="card bg-white shadow-sm border border-[var(--border-subtle)] overflow-hidden">
                <div className="bg-[var(--bg-secondary)] px-4 py-2 border-b border-[var(--border-subtle)] flex justify-between items-center">
                  <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    {dayNames[days.indexOf(item.day)]} • {item.label}
                  </span>
                  <button
                    onClick={() => setSelectedItems(prev => prev.filter(i => !(i.day === item.day && i.type === item.type)))}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove from queue
                  </button>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    <span className="text-xs text-[var(--text-muted)] block mb-1">Current logged value:</span>
                    <span className="text-sm font-medium">{item.value || 'None'}</span>
                  </div>
                  <MealCorrectionInput
                    recipes={recipes}
                    onSave={(val, req) => handleCorrectionSave(item.day, item.type, val, req)}
                    onCancel={() => { }}
                    placeholder={`What was actually for ${item.label.toLowerCase()}?`}
                    existingValue={item.value}
                  />
                </div>
              </div>
            ))}

            {selectedItems.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-[var(--text-muted)]">All items fixed! Returning to week view...</p>
                <button
                  onClick={() => setIsFixing(false)}
                  className="mt-4 btn-secondary"
                >
                  Return Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8 pb-32">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <Link href="/" className="text-sm text-[var(--accent-sage)] hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
                Week at a Glance
              </h1>
              <p className="text-[var(--text-muted)] font-mono text-sm">
                WEEK OF {weekData.week_of.toUpperCase()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReplan}
                disabled={isReplanning}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reorganize remaining meals based on current inventory"
              >
                {isReplanning ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    <span className="hidden sm:inline">Replanning...</span>
                  </>
                ) : (
                  <>
                    <span>📦</span>
                    <span className="hidden sm:inline">Replan with Inventory</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setEditMode(!editMode);
                  if (editMode) setSelectedItems([]);
                }}
                className={`btn-secondary flex items-center gap-2 ${editMode ? 'bg-amber-50 border-amber-200 text-amber-900' : ''}`}
              >
                {editMode ? (
                  <>
                    <span>✕</span>
                    <span className="hidden sm:inline">Cancel</span>
                  </>
                ) : (
                  <>
                    <span>✎</span>
                    <span className="hidden sm:inline">Mark for Fix</span>
                  </>
                )}
              </button>
              {weekData.plan_url && (
                <a
                  href={weekData.plan_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary hidden md:inline-flex items-center gap-2"
                >
                  <span>View Full Plan</span>
                  <span>↗</span>
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Floating Action Bar for Selections */}
        {selectedItems.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
            <div className="bg-gray-900 text-white rounded-full shadow-2xl p-2 pl-6 flex items-center justify-between animate-in slide-in-from-bottom-4 fade-in">
              <span className="font-medium text-sm">
                {selectedItems.length} meal{selectedItems.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setIsFixing(true)}
                className="bg-[var(--accent-sage)] text-white px-6 py-2 rounded-full text-sm font-bold hover:scale-105 transition-transform"
              >
                Fix Now
              </button>
            </div>
          </div>
        )}

        {/* Mobile: Card view */}
        <div className="md:hidden space-y-4">
          {days.map((day, idx) => {
            const dinner = weekData.dinners?.find((d: any) => d.day === day);
            const lunch = weekData.lunches?.[day];
            const snacks = weekData.snacks?.[day];
            const dailyFeedback = weekData.daily_feedback?.[day];
            const isToday = status?.current_day === day;

            return (
              <div
                key={day}
                className={`card ${isToday ? 'border-2 border-[var(--accent-sage)]' : ''} ${editMode ? 'ring-2 ring-amber-100' : ''}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {dayNames[idx]}
                  </h3>
                  {isToday && (
                    <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 bg-[var(--accent-sage)] text-white rounded">
                      TODAY
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Dinner */}
                  <div className="flex items-start">
                    <SelectionCheckbox
                      day={day}
                      type="dinner"
                      label="Dinner"
                      value={dinner?.actual_meal || ''}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Dinner</span>
                        {getFeedbackBadge(dailyFeedback?.dinner_feedback || dinner?.kids_feedback, dinner?.made, dinner?.needs_fix)}
                      </div>
                      <p className="font-medium text-[var(--text-primary)] leading-tight mt-0.5">
                        {getDisplayName(dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not planned', dinner?.actual_meal)}
                      </p>
                      {dinner?.vegetables && dinner.vegetables.length > 0 && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">
                          🥬 {dinner.vegetables.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Kids Lunch */}
                  <div className="flex items-start">
                    <SelectionCheckbox
                      day={day}
                      type="kids_lunch"
                      label="Kids Lunch"
                      value={dailyFeedback?.kids_lunch || ''}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Kids Lunch</span>
                        {getFeedbackBadge(dailyFeedback?.kids_lunch, dailyFeedback?.kids_lunch_made, dailyFeedback?.kids_lunch_needs_fix)}
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                        {getDisplayName(lunch?.recipe_name || 'Leftovers', dailyFeedback?.kids_lunch)}
                      </p>
                    </div>
                  </div>

                  {/* School Snack */}
                  <div className="flex items-start">
                    <SelectionCheckbox
                      day={day}
                      type="school_snack"
                      label="School Snack"
                      value={dailyFeedback?.school_snack || ''}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">School Snack</span>
                        {getFeedbackBadge(dailyFeedback?.school_snack, dailyFeedback?.school_snack_made, dailyFeedback?.school_snack_needs_fix)}
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                        {getDisplayName(snacks?.school || 'TBD', dailyFeedback?.school_snack)}
                      </p>
                    </div>
                  </div>

                  {/* Home Snack */}
                  <div className="flex items-start">
                    <SelectionCheckbox
                      day={day}
                      type="home_snack"
                      label="Home Snack"
                      value={dailyFeedback?.home_snack || ''}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Home Snack</span>
                        {getFeedbackBadge(dailyFeedback?.home_snack, dailyFeedback?.home_snack_made, dailyFeedback?.home_snack_needs_fix)}
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                        {getDisplayName(snacks?.home || 'TBD', dailyFeedback?.home_snack)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Table view */}
        <div className="hidden md:block overflow-x-auto card p-0 overflow-hidden shadow-lg border-none">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] bg-white w-40">
                  Meal Type
                </th>
                {dayNames.map((dayName, idx) => {
                  const day = days[idx];
                  const isToday = status?.current_day === day;
                  return (
                    <th
                      key={day}
                      className={`p-4 text-left font-mono text-[10px] uppercase tracking-widest border-l border-[var(--border-subtle)] ${isToday
                        ? 'bg-[var(--accent-sage)] text-white'
                        : 'text-[var(--text-muted)]'
                        }`}
                    >
                      {dayName}
                      {isToday && <div className="text-[9px] mt-1 font-bold">TODAY</div>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Dinner Row */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] flex items-center gap-2">
                  <span className="text-lg">🍽️</span>
                  <span>Dinner</span>
                </td>
                {days.map((day) => {
                  const dinner = weekData.dinners?.find((d: any) => d.day === day);
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const dinnerName = dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not planned';
                  const needsFix = dinner?.needs_fix;

                  return (
                    <td key={day} className={`p-4 text-sm border-b border-l border-[var(--border-subtle)]`}>
                      <div className="flex items-start gap-2">
                        <SelectionCheckbox
                          day={day}
                          type="dinner"
                          label="Dinner"
                          value={dinner?.actual_meal || ''}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-medium leading-tight">
                              {dinner?.recipe_id ? (
                                <Link href={`/recipes/${dinner.recipe_id}`} className="hover:text-[var(--accent-sage)] hover:underline">
                                  {getDisplayName(dinnerName, dinner?.actual_meal)}
                                </Link>
                              ) : (
                                getDisplayName(dinnerName, dinner?.actual_meal)
                              )}
                            </span>
                            {getFeedbackBadge(dailyFeedback?.dinner_feedback || dinner?.kids_feedback, dinner?.made, needsFix)}
                          </div>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Kids Lunch Row */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  <span className="mr-2">🥪</span>
                  <span>Kids Lunch</span>
                </td>
                {days.map((day) => {
                  const lunch = weekData.lunches?.[day];
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  return (
                    <td key={day} className="p-4 text-sm border-b border-l border-[var(--border-subtle)]">
                      <div className="flex items-start gap-2">
                        <SelectionCheckbox
                          day={day}
                          type="kids_lunch"
                          label="Kids Lunch"
                          value={dailyFeedback?.kids_lunch || ''}
                        />
                        <div className="flex-1 flex justify-between items-start gap-2">
                          <span className="text-gray-600 italic">
                            {getDisplayName(lunch?.recipe_name || 'Leftovers', dailyFeedback?.kids_lunch)}
                          </span>
                          {getFeedbackBadge(dailyFeedback?.kids_lunch, dailyFeedback?.kids_lunch_made, dailyFeedback?.kids_lunch_needs_fix)}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* School Snack Row */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  <span className="mr-2">🎒</span>
                  <span>School Snack</span>
                </td>
                {days.map((day) => {
                  const snacks = weekData.snacks?.[day];
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const isWeekend = day === 'sat' || day === 'sun';
                  return (
                    <td key={day} className="p-4 text-sm border-b border-l border-[var(--border-subtle)]">
                      {!isWeekend ? (
                        <div className="flex items-start gap-2">
                          <SelectionCheckbox
                            day={day}
                            type="school_snack"
                            label="School Snack"
                            value={dailyFeedback?.school_snack || ''}
                          />
                          <div className="flex-1 flex justify-between items-start gap-2">
                            <span className="text-gray-600 font-mono text-xs">
                              {getDisplayName(snacks?.school || 'TBD', dailyFeedback?.school_snack)}
                            </span>
                            {getFeedbackBadge(dailyFeedback?.school_snack, dailyFeedback?.school_snack_made, dailyFeedback?.school_snack_needs_fix)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Home Snack Row */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  <span className="mr-2">🏠</span>
                  <span>Home Snack</span>
                </td>
                {days.map((day) => {
                  const snacks = weekData.snacks?.[day];
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const isWeekend = day === 'sat' || day === 'sun';
                  return (
                    <td key={day} className="p-4 text-sm border-b border-l border-[var(--border-subtle)]">
                      {!isWeekend ? (
                        <div className="flex items-start gap-2">
                          <SelectionCheckbox
                            day={day}
                            type="home_snack"
                            label="Home Snack"
                            value={dailyFeedback?.home_snack || ''}
                          />
                          <div className="flex-1 flex justify-between items-start gap-2">
                            <span className="text-gray-600 font-mono text-xs">
                              {getDisplayName(snacks?.home || 'TBD', dailyFeedback?.home_snack)}
                            </span>
                            {getFeedbackBadge(dailyFeedback?.home_snack, dailyFeedback?.home_snack_made, dailyFeedback?.home_snack_needs_fix)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Adult Lunch Row */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  <span className="mr-2">☕</span>
                  <span>Adult Lunch</span>
                </td>
                {days.map((day) => {
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  return (
                    <td key={day} className="p-4 text-sm border-b border-l border-[var(--border-subtle)]">
                      <div className="flex items-start gap-2">
                        <SelectionCheckbox
                          day={day}
                          type="adult_lunch"
                          label="Adult Lunch"
                          value={dailyFeedback?.adult_lunch || ''}
                        />
                        <div className="flex-1 flex justify-between items-start gap-2">
                          <span className="text-gray-500 italic text-xs">
                            {getDisplayName('Leftovers', dailyFeedback?.adult_lunch)}
                          </span>
                          {getFeedbackBadge(dailyFeedback?.adult_lunch, dailyFeedback?.adult_lunch_made, dailyFeedback?.adult_lunch_needs_fix)}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Energy-Based Prep Schedule */}
        <div className="mt-12">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 flex items-center gap-3">
            <span className="h-px bg-[var(--border-subtle)] flex-1"></span>
            <span>Prep Schedule</span>
            <span className="h-px bg-[var(--border-subtle)] flex-1"></span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card border-t-4 border-t-[var(--accent-sage)]">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--accent-sage)] mb-4">Monday PM</h3>
              <ul className="text-sm text-[var(--text-primary)] list-disc pl-4 space-y-2">
                <li>Chop Mon/Tue/Wed vegetables</li>
                <li>Batch cook grains/beans</li>
              </ul>
            </div>
            <div className="card border-t-4 border-t-[var(--accent-gold)]">
              <h3 className="font-mono text-xs uppercase tracking-wider text-amber-600 mb-4">Tuesday AM + PM</h3>
              <div className="text-sm text-[var(--text-primary)]">
                <p className="font-medium text-xs text-[var(--text-muted)] uppercase mb-2">AM</p>
                <p>Portion lunch components</p>
                <p className="font-medium text-xs text-[var(--text-muted)] uppercase mt-4 mb-2">PM</p>
                <ul className="list-disc pl-4 space-y-2">
                  <li>Portion Wed kids lunch</li>
                  <li>Chop Thu/Fri vegetables</li>
                </ul>
              </div>
            </div>
            <div className="card border-t-4 border-t-[var(--accent-terracotta)]">
              <h3 className="font-mono text-xs uppercase tracking-wider text-orange-600 mb-4">Wednesday PM</h3>
              <ul className="text-sm text-[var(--text-primary)] list-disc pl-4 space-y-2">
                <li>Finish ALL remaining prep for Thu/Fri</li>
              </ul>
            </div>
          </div>
        </div>
        {/* Week Summary Stats */}
        {weekData.freezer_inventory && weekData.freezer_inventory.length > 0 && (
          <div className="mt-12 card bg-blue-50 border-blue-200 shadow-sm">
            <h2 className="text-sm font-mono uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2">
              <span>🧊</span>
              <span>Freezer Backup Meals</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-3">
              {weekData.freezer_inventory.map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
                  <p className="text-sm font-semibold text-blue-900 leading-tight">{item.meal}</p>
                  <p className="text-[10px] text-blue-400 font-mono mt-1 uppercase">Frozen: {item.frozen_date}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
