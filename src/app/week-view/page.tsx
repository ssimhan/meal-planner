'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getStatus, WorkflowStatus } from '@/lib/api';

export default function WeekView() {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);

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
  const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Helper to get feedback status badge
  const getFeedbackBadge = (feedback?: string, made?: boolean) => {
    if (made === false) return <span className="text-xs text-red-600">✗ Skipped</span>;
    if (!feedback) return null;
    if (feedback.includes('❤️')) return <span className="text-xs">❤️</span>;
    if (feedback.includes('👍')) return <span className="text-xs">👍</span>;
    if (feedback.includes('😐')) return <span className="text-xs">😐</span>;
    if (feedback.includes('👎')) return <span className="text-xs">👎</span>;
    if (feedback.includes('❌')) return <span className="text-xs">❌</span>;
    return <span className="text-xs text-gray-500">✓</span>;
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
                  <div className="pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-[var(--text-muted)] uppercase">Dinner</span>
                      {getFeedbackBadge(dailyFeedback?.dinner_feedback || dinner?.kids_feedback, dinner?.made)}
                    </div>
                    <p className="text-[var(--text-primary)] font-medium mt-1">
                      {dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not planned'}
                    </p>
                    {dinner?.vegetables && dinner.vegetables.length > 0 && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        🥬 {dinner.vegetables.join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-[var(--text-muted)] uppercase">Kids Lunch</span>
                      {getFeedbackBadge(dailyFeedback?.kids_lunch, dailyFeedback?.kids_lunch_made)}
                    </div>
                    <p className="text-[var(--text-primary)] mt-1">
                      {lunch?.recipe_name || 'Leftovers'}
                    </p>
                    {lunch?.assembly_notes && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">{lunch.assembly_notes}</p>
                    )}
                  </div>

                  <div className="pb-2 border-b border-[var(--border-subtle)]">
                    <span className="font-mono text-xs text-[var(--text-muted)] uppercase">Adult Lunch</span>
                    <p className="text-[var(--text-primary)] mt-1">Leftovers</p>
                  </div>

                  <div className="pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-[var(--text-muted)] uppercase">School Snack</span>
                      {getFeedbackBadge(dailyFeedback?.school_snack, dailyFeedback?.school_snack_made)}
                    </div>
                    <p className="text-[var(--text-primary)] mt-1">
                      {snacks?.school || 'TBD'}
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-[var(--text-muted)] uppercase">Home Snack</span>
                      {getFeedbackBadge(dailyFeedback?.home_snack, dailyFeedback?.home_snack_made)}
                    </div>
                    <p className="text-[var(--text-primary)] mt-1">
                      {snacks?.home || 'TBD'}
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
                      className={`p-4 text-left font-mono text-xs uppercase border-b-2 ${
                        isToday
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
              {/* Dinner Row */}
              <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  🍽️ Dinner
                </td>
                {days.map((day, idx) => {
                  const dinner = weekData.dinners?.find((d: any) => d.day === day);
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const isToday = status?.current_day === day;
                  return (
                    <td
                      key={day}
                      className={`p-4 text-sm border-b border-[var(--border-subtle)] ${
                        isToday ? 'bg-green-50' : idx % 2 === 0 ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium">
                          {dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not planned'}
                        </span>
                        {getFeedbackBadge(dailyFeedback?.dinner_feedback || dinner?.kids_feedback, dinner?.made)}
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

              {/* Kids Lunch Row */}
              <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  🥪 Kids Lunch
                </td>
                {days.map((day, idx) => {
                  const lunch = weekData.lunches?.[day];
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const isToday = status?.current_day === day;
                  return (
                    <td
                      key={day}
                      className={`p-4 text-sm border-b border-[var(--border-subtle)] ${
                        isToday ? 'bg-green-50' : idx % 2 === 0 ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span>{lunch?.recipe_name || 'Leftovers'}</span>
                        {getFeedbackBadge(dailyFeedback?.kids_lunch, dailyFeedback?.kids_lunch_made)}
                      </div>
                      {lunch?.assembly_notes && (
                        <div className="text-xs text-[var(--text-muted)] mt-1">{lunch.assembly_notes}</div>
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
                  return (
                    <td
                      key={day}
                      className={`p-4 text-sm border-b border-[var(--border-subtle)] ${
                        isToday ? 'bg-green-50' : idx % 2 === 0 ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[var(--text-muted)]">Leftovers</span>
                        {getFeedbackBadge(dailyFeedback?.adult_lunch, dailyFeedback?.adult_lunch_made)}
                      </div>
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
                  const snacks = weekData.snacks?.[day];
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const isToday = status?.current_day === day;
                  return (
                    <td
                      key={day}
                      className={`p-4 text-sm border-b border-[var(--border-subtle)] ${
                        isToday ? 'bg-green-50' : idx % 2 === 0 ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span>{snacks?.school || 'TBD'}</span>
                        {getFeedbackBadge(dailyFeedback?.school_snack, dailyFeedback?.school_snack_made)}
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
                  const snacks = weekData.snacks?.[day];
                  const dailyFeedback = weekData.daily_feedback?.[day];
                  const isToday = status?.current_day === day;
                  return (
                    <td
                      key={day}
                      className={`p-4 text-sm border-b border-[var(--border-subtle)] ${
                        isToday ? 'bg-green-50' : idx % 2 === 0 ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span>{snacks?.home || 'TBD'}</span>
                        {getFeedbackBadge(dailyFeedback?.home_snack, dailyFeedback?.home_snack_made)}
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
              <h3 className="font-mono text-xs uppercase text-[var(--text-muted)] mb-2">Monday PM</h3>
              <p className="text-sm text-[var(--text-primary)]">Chop Mon/Tue/Wed vegetables, batch cook grains/beans</p>
            </div>
            <div className="card bg-[var(--accent-gold)] bg-opacity-10 border-l-4 border-[var(--accent-gold)]">
              <h3 className="font-mono text-xs uppercase text-[var(--text-muted)] mb-2">Tuesday AM + PM</h3>
              <p className="text-sm text-[var(--text-primary)]">
                <strong>AM:</strong> Portion lunch components
                <br />
                <strong>PM:</strong> Chop Thu/Fri vegetables
              </p>
            </div>
            <div className="card bg-[var(--accent-terracotta)] bg-opacity-10 border-l-4 border-[var(--accent-terracotta)]">
              <h3 className="font-mono text-xs uppercase text-[var(--text-muted)] mb-2">Wednesday PM</h3>
              <p className="text-sm text-[var(--text-primary)]">Finish ALL remaining prep for Thu/Fri</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <p className="text-sm text-yellow-900">
              <strong>Thu/Fri:</strong> ZERO cooking after Wednesday. Only reheating and simple assembly (5-9pm device-free time).
            </p>
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
