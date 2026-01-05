'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getStatus } from '@/lib/api';

export default function WeekView() {
  const [weekData, setWeekData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeekData() {
      try {
        const status = await getStatus();
        setWeekData(status.week_data);
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
        <p className="text-[var(--text-muted)]">Loading week view...</p>
      </div>
    );
  }

  if (!weekData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-[var(--text-muted)]">No active week plan found</p>
        <Link href="/" className="text-[var(--accent-sage)] hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <Link href="/" className="text-sm text-[var(--accent-sage)] hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Week at a Glance
          </h1>
          <p className="text-[var(--text-muted)]">
            Week of {weekData.week_of}
          </p>
        </header>

        {/* Mobile: Card view */}
        <div className="md:hidden space-y-6">
          {days.map((day, idx) => {
            const dinner = weekData.dinners?.find((d: any) => d.day === day);
            const lunch = weekData.lunches?.[day];
            const snacks = weekData.snacks?.[day];

            return (
              <div key={day} className="card">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                  {dayNames[idx]}
                </h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-mono text-xs text-[var(--text-muted)] uppercase">Dinner</span>
                    <p className="text-[var(--text-primary)]">
                      {dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not planned'}
                    </p>
                  </div>

                  <div>
                    <span className="font-mono text-xs text-[var(--text-muted)] uppercase">Kids Lunch</span>
                    <p className="text-[var(--text-primary)]">
                      {lunch?.recipe_name || 'Leftovers'}
                    </p>
                  </div>

                  <div>
                    <span className="font-mono text-xs text-[var(--text-muted)] uppercase">Snacks</span>
                    <p className="text-[var(--text-primary)]">
                      {snacks?.school || 'TBD'} / {snacks?.home || 'TBD'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Table view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)]">
                <th className="p-3 text-left font-mono text-xs uppercase text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  Meal
                </th>
                {dayNames.map(day => (
                  <th key={day} className="p-3 text-left font-mono text-xs uppercase text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Dinner Row */}
              <tr className="hover:bg-[var(--bg-secondary)]">
                <td className="p-3 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  Dinner
                </td>
                {days.map(day => {
                  const dinner = weekData.dinners?.find((d: any) => d.day === day);
                  return (
                    <td key={day} className="p-3 text-sm border-b border-[var(--border-subtle)]">
                      {dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not planned'}
                    </td>
                  );
                })}
              </tr>

              {/* Kids Lunch Row */}
              <tr className="hover:bg-[var(--bg-secondary)]">
                <td className="p-3 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  Kids Lunch
                </td>
                {days.map(day => {
                  const lunch = weekData.lunches?.[day];
                  return (
                    <td key={day} className="p-3 text-sm border-b border-[var(--border-subtle)]">
                      {lunch?.recipe_name || 'Leftovers'}
                    </td>
                  );
                })}
              </tr>

              {/* Adult Lunch Row */}
              <tr className="hover:bg-[var(--bg-secondary)]">
                <td className="p-3 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  Adult Lunch
                </td>
                {days.map(() => (
                  <td key={Math.random()} className="p-3 text-sm text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    Leftovers
                  </td>
                ))}
              </tr>

              {/* School Snack Row */}
              <tr className="hover:bg-[var(--bg-secondary)]">
                <td className="p-3 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  School Snack
                </td>
                {days.map(day => {
                  const snacks = weekData.snacks?.[day];
                  return (
                    <td key={day} className="p-3 text-sm border-b border-[var(--border-subtle)]">
                      {snacks?.school || 'TBD'}
                    </td>
                  );
                })}
              </tr>

              {/* Home Snack Row */}
              <tr className="hover:bg-[var(--bg-secondary)]">
                <td className="p-3 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  Home Snack
                </td>
                {days.map(day => {
                  const snacks = weekData.snacks?.[day];
                  return (
                    <td key={day} className="p-3 text-sm border-b border-[var(--border-subtle)]">
                      {snacks?.home || 'TBD'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Prep Summary */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="card">
            <h3 className="font-mono text-xs uppercase text-[var(--text-muted)] mb-2">Monday Prep</h3>
            <p className="text-sm">Chop Mon/Tue/Wed veg, batch cook</p>
          </div>
          <div className="card">
            <h3 className="font-mono text-xs uppercase text-[var(--text-muted)] mb-2">Tuesday Prep</h3>
            <p className="text-sm">AM: Lunch components<br/>PM: Chop Thu/Fri veg</p>
          </div>
          <div className="card">
            <h3 className="font-mono text-xs uppercase text-[var(--text-muted)] mb-2">Wednesday Prep</h3>
            <p className="text-sm">Finish ALL remaining prep</p>
          </div>
        </div>
      </div>
    </div>
  );
}
