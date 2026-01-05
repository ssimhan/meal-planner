'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getStatus, WorkflowStatus } from '@/lib/api';

export default function WeekView() {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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

  // Helper to get feedback status badge
  const getFeedbackBadge = (feedback?: string, made?: boolean, needsFix?: boolean) => {
    if (needsFix) return <span className="text-xs text-red-600 font-bold">Needs Fix</span>;
    if (made === false) return <span className="text-xs text-red-600">✗ Skipped</span>;
    if (!feedback) return null;
    if (feedback.includes('❤️')) return <span className="text-xs">❤️</span>;
    if (feedback.includes('👍')) return <span className="text-xs">👍</span>;
    if (feedback.includes('😐')) return <span className="text-xs">😐</span>;
    if (feedback.includes('👎')) return <span className="text-xs">👎</span>;
    if (feedback.includes('❌')) return <span className="text-xs">❌</span>;
    return <span className="text-xs text-gray-500">✓</span>;
  };

  const toggleFix = async (day: string, type: string, currentStatus: boolean) => {
    if (!status?.week_data?.week_of) return;

    const newStatus = !currentStatus;

    // Optimistic update
    setStatus(prev => {
      if (!prev || !prev.week_data) return prev;
      const next = { ...prev };
      const weekData = { ...next.week_data };

      if (type === 'dinner') {
        if (weekData.dinners) {
          weekData.dinners = weekData.dinners.map((d: any) =>
            d.day === day ? { ...d, needs_fix: newStatus } : d
          );
        }
      } else {
        const dailyFeedback = { ...(weekData.daily_feedback || {}) };
        const dayFeedback = { ...(dailyFeedback[day] || {}) };
        dayFeedback[`${type}_needs_fix`] = newStatus;
        dailyFeedback[day] = dayFeedback;
        weekData.daily_feedback = dailyFeedback;
      }

      next.week_data = weekData;
      return next;
    });

    try {
      await fetch('/api/log-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: status.week_data.week_of,
          day,
          [`${type}_needs_fix`]: newStatus
        })
      });
    } catch (e) {
      console.error("Failed to toggle fix", e);
      alert("Failed to save change");
      // Optional: re-fetch to sync if failed
      const data = await getStatus();
      setStatus(data);
    }
  };

  const FixCheckbox = ({ day, type, current }: { day: string, type: string, current: boolean }) => {
    if (!editMode) return null;
    return (
      <input
        type="checkbox"
        checked={current}
        onChange={() => toggleFix(day, type, current)}
        className="mr-2 h-4 w-4 text-[var(--accent-sage)] rounded border-gray-300 focus:ring-[var(--accent-sage)]"
      />
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
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
              <p className="text-[var(--text-muted)]">
                Week of {weekData.week_of}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`btn-secondary ${editMode ? 'bg-yellow-100 border-yellow-400' : ''}`}
              >
                {editMode ? 'Done Editing' : 'Mark for Fix'}
              </button>
              {weekData.plan_url && (
                <a
                  href={weekData.plan_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <span>View Full Plan</span>
                  <span>→</span>
                </a>
              )}
            </div>
          </div>
        </header>

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
                className={`card ${isToday ? 'border-2 border-[var(--accent-green)]' : ''}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {dayNames[idx]}
                  </h3>
                  {isToday && (
                    <span className="text-xs font-mono px-2 py-1 bg-[var(--accent-green)] text-white rounded">
                      TODAY
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div className={`pb-2 border-b border-[var(--border-subtle)] ${dinner?.made !== undefined ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-[var(--text-muted)] uppercase">Dinner</span>
                      {getFeedbackBadge(dailyFeedback?.dinner_feedback || dinner?.kids_feedback, dinner?.made, dinner?.needs_fix)}
                    </div>
                    <p className={`font-medium mt-1 ${dinner?.made !== undefined ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                      {dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not planned'}
                    </p>
                    {dinner?.vegetables && dinner.vegetables.length > 0 && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        🥬 {dinner.vegetables.join(', ')}
                      </p>
                    )}
                  </div>

                  <div className={`pb-2 border-b border-[var(--border-subtle)] ${dailyFeedback?.kids_lunch_made !== undefined ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-[var(--text-muted)] uppercase">Kids Lunch</span>
                      {getFeedbackBadge(dailyFeedback?.kids_lunch, dailyFeedback?.kids_lunch_made, dailyFeedback?.kids_lunch_needs_fix)}
                    </div>
                    <p className={`mt-1 ${dailyFeedback?.kids_lunch_made !== undefined ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'}`}>
                      {lunch?.recipe_name || 'Leftovers'}
                    </p>
                    {lunch?.assembly_notes && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">{lunch.assembly_notes}</p>
                    )}
                  </div>

                  <div className={`pb-2 border-b border-[var(--border-subtle)] ${dailyFeedback?.adult_lunch_made !== undefined ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <span className="font-mono text-xs text-[var(--text-muted)] uppercase">Adult Lunch</span>
                    <p className={`mt-1 ${dailyFeedback?.adult_lunch_made !== undefined ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'}`}>Leftovers</p>
                  </div>

                  <div className={`pb-2 border-b border-[var(--border-subtle)] ${dailyFeedback?.school_snack_made !== undefined ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-[var(--text-muted)] uppercase">School Snack</span>
                      {getFeedbackBadge(dailyFeedback?.school_snack, dailyFeedback?.school_snack_made, dailyFeedback?.school_snack_needs_fix)}
                    </div>
                    <p className={`mt-1 ${dailyFeedback?.school_snack_made !== undefined ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'}`}>
                      {snacks?.school || 'TBD'}
                    </p>
                  </div>

                  <div className={`${dailyFeedback?.home_snack_made !== undefined ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-[var(--text-muted)] uppercase">Home Snack</span>
                      {getFeedbackBadge(dailyFeedback?.home_snack, dailyFeedback?.home_snack_made, dailyFeedback?.home_snack_needs_fix)}
                    </div>
                    <p className={`mt-1 ${dailyFeedback?.home_snack_made !== undefined ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'}`}>
                      {!(day === 'sat' || day === 'sun') ? (snacks?.home || 'TBD') : '-'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Table view */}
        <div className="hidden md:block overflow-x-auto card">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)]">
                <th className="p-4 text-left font-mono text-xs uppercase text-[var(--text-muted)] border-b-2 border-[var(--border-subtle)]">
                  Meal Type
                </th>
                {dayNames.map((dayName, idx) => {
                  const day = days[idx];
                  const isToday = status?.current_day === day;
                  return (
                    <th
                      key={day}
                      className={`p-4 text-left font-mono text-xs uppercase border-b-2 ${isToday
                        ? 'bg-[var(--accent-green)] text-white border-[var(--accent-green)]'
                        : 'text-[var(--text-muted)] border-[var(--border-subtle)]'
                        }`}
                    >
                      {dayName}
                      {isToday && <div className="text-[10px] mt-1">TODAY</div>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Kids Lunch Row */}
              <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  🥪 Kids Lunch
                </td>
                {days.map((day, idx) => {
                  const lunch = weekData.lunches?.[day];
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const isToday = status?.current_day === day;
                  const needsFix = dailyFeedback?.kids_lunch_needs_fix;
                  const isConfirmed = dailyFeedback?.kids_lunch_made !== undefined;
                  return (
                    <td
                      key={day}
                      className={`p-4 text-sm border-b border-[var(--border-subtle)] ${isToday ? 'bg-green-50' : idx % 2 === 0 ? 'bg-gray-50' : ''} ${isConfirmed ? 'opacity-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`flex items-start ${isConfirmed ? 'text-[var(--text-muted)] italic' : ''}`}>
                          <FixCheckbox day={day} type="kids_lunch" current={needsFix} />
                          <span>{lunch?.recipe_name || 'Leftovers'}</span>
                        </div>
                        {getFeedbackBadge(dailyFeedback?.kids_lunch, dailyFeedback?.kids_lunch_made, needsFix)}
                      </div>
                      {lunch?.assembly_notes && (
                        <div className="text-xs text-[var(--text-muted)] mt-1">{lunch.assembly_notes}</div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* School Snack Row */}
              <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  🎒 School Snack
                </td>
                {days.map((day, idx) => {
                  if (day === 'sat' || day === 'sun') {
                    return <td key={day} className="p-4 text-sm border-b border-[var(--border-subtle)] bg-gray-50 text-center text-[var(--text-muted)]">-</td>;
                  }
                  const snacks = weekData.snacks?.[day];
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const isToday = status?.current_day === day;
                  const needsFix = dailyFeedback?.school_snack_needs_fix;
                  const isConfirmed = dailyFeedback?.school_snack_made !== undefined;
                  return (
                    <td
                      key={day}
                      className={`p-4 text-sm border-b border-[var(--border-subtle)] ${isToday ? 'bg-green-50' : idx % 2 === 0 ? 'bg-gray-50' : ''} ${isConfirmed ? 'opacity-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`flex items-start ${isConfirmed ? 'text-[var(--text-muted)] italic' : ''}`}>
                          <FixCheckbox day={day} type="school_snack" current={needsFix} />
                          <span>{snacks?.school || 'TBD'}</span>
                        </div>
                        {getFeedbackBadge(dailyFeedback?.school_snack, dailyFeedback?.school_snack_made, needsFix)}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Home Snack Row */}
              <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  🏠 Home Snack
                </td>
                {days.map((day, idx) => {
                  if (day === 'sat' || day === 'sun') {
                    return <td key={day} className="p-4 text-sm border-b border-[var(--border-subtle)] bg-gray-50 text-center text-[var(--text-muted)]">-</td>;
                  }
                  const snacks = weekData.snacks?.[day];
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const isToday = status?.current_day === day;
                  const needsFix = dailyFeedback?.home_snack_needs_fix;
                  const isConfirmed = dailyFeedback?.home_snack_made !== undefined;
                  return (
                    <td
                      key={day}
                      className={`p-4 text-sm border-b border-[var(--border-subtle)] ${isToday ? 'bg-green-50' : idx % 2 === 0 ? 'bg-gray-50' : ''} ${isConfirmed ? 'opacity-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`flex items-start ${isConfirmed ? 'text-[var(--text-muted)] italic' : ''}`}>
                          <FixCheckbox day={day} type="home_snack" current={needsFix} />
                          <span>{snacks?.home || 'TBD'}</span>
                        </div>
                        {getFeedbackBadge(dailyFeedback?.home_snack, dailyFeedback?.home_snack_made, needsFix)}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Dinner Row */}
              <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  🍽️ Dinner
                </td>
                {days.map((day, idx) => {
                  const dinner = weekData.dinners?.find((d: any) => d.day === day);
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const isToday = status?.current_day === day;
                  const needsFix = dinner?.needs_fix;
                  const isConfirmed = dinner?.made !== undefined;

                  // Construct recipe link
                  const dinnerName = dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not planned';
                  const recipeLink = dinner?.recipe_id ? `/recipes/${dinner.recipe_id}` : null;

                  return (
                    <td
                      key={day}
                      className={`p-4 text-sm border-b border-[var(--border-subtle)] ${isToday ? 'bg-green-50' : idx % 2 === 0 ? 'bg-gray-50' : ''} ${isConfirmed ? 'opacity-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`flex items-start ${isConfirmed ? 'text-[var(--text-muted)] italic' : ''}`}>
                          <FixCheckbox day={day} type="dinner" current={needsFix} />
                          <span className="font-medium">
                            {dinner?.recipe_id ? (
                              <Link href={`/recipes/${dinner.recipe_id}`} className={`hover:underline ${isConfirmed ? 'text-[var(--text-muted)]' : 'text-blue-800'}`}>
                                {dinnerName}
                              </Link>
                            ) : (
                              dinnerName
                            )}
                          </span>
                        </div>
                        {getFeedbackBadge(dailyFeedback?.dinner_feedback || dinner?.kids_feedback, dinner?.made, needsFix)}
                      </div>
                      {dinner?.vegetables && dinner.vegetables.length > 0 && (
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          🥬 {dinner.vegetables.join(', ')}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Adult Lunch Row */}
              <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  ☕ Adult Lunch
                </td>
                {days.map((day, idx) => {
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const isToday = status?.current_day === day;
                  const needsFix = dailyFeedback?.adult_lunch_needs_fix;
                  const isConfirmed = dailyFeedback?.adult_lunch_made !== undefined;
                  return (
                    <td
                      key={day}
                      className={`p-4 text-sm border-b border-[var(--border-subtle)] ${isToday ? 'bg-green-50' : idx % 2 === 0 ? 'bg-gray-50' : ''} ${isConfirmed ? 'opacity-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`flex items-start ${isConfirmed ? 'text-[var(--text-muted)] italic' : ''}`}>
                          <FixCheckbox day={day} type="adult_lunch" current={needsFix} />
                          <span className="text-[var(--text-muted)]">Leftovers</span>
                        </div>
                        {getFeedbackBadge(dailyFeedback?.adult_lunch, dailyFeedback?.adult_lunch_made, needsFix)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Energy-Based Prep Schedule */}
        <div className="mt-8">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
            Energy-Based Prep Schedule
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card bg-[var(--accent-sage)] bg-opacity-10 border-l-4 border-[var(--accent-sage)]">
              <h3 className="font-mono text-xs uppercase text-black mb-2">Monday PM</h3>
              <ul className="text-sm text-[var(--text-primary)] list-disc pl-4 space-y-1">
                <li>Chop Mon/Tue/Wed vegetables</li>
                <li>Batch cook grains/beans</li>
              </ul>
            </div>
            <div className="card bg-[var(--accent-gold)] bg-opacity-10 border-l-4 border-[var(--accent-gold)]">
              <h3 className="font-mono text-xs uppercase text-black mb-2">Tuesday AM + PM</h3>
              <div className="text-sm text-[var(--text-primary)]">
                <p><strong>AM:</strong> Portion lunch components</p>
                <p className="mt-2"><strong>PM:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Portion Wed kids lunch</li>
                  <li>Chop Thu/Fri vegetables</li>
                </ul>
              </div>
            </div>
            <div className="card bg-[var(--accent-terracotta)] bg-opacity-10 border-l-4 border-[var(--accent-terracotta)]">
              <h3 className="font-mono text-xs uppercase text-black mb-2">Wednesday PM</h3>
              <ul className="text-sm text-[var(--text-primary)] list-disc pl-4 space-y-1">
                <li>Finish ALL remaining prep for Thu/Fri</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Week Summary Stats */}
        {weekData.freezer_inventory && weekData.freezer_inventory.length > 0 && (
          <div className="mt-8 card bg-blue-50 border-blue-200">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
              🧊 Freezer Backup Meals
            </h2>
            <div className="grid md:grid-cols-3 gap-2">
              {weekData.freezer_inventory.map((item: any, idx: number) => (
                <div key={idx} className="p-2 bg-white rounded border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">{item.meal}</p>
                  <p className="text-xs text-blue-600">Frozen: {item.frozen_date}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
