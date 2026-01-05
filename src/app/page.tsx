'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getStatus, generatePlan, createWeek, confirmVeg, logMeal, WorkflowStatus } from '@/lib/api';

export default function Dashboard() {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState<{ message: string; url?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [vegInput, setVegInput] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      setLoading(true);
      const data = await getStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError('Failed to connect to the meal planner brain.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWeek() {
    try {
      setActionLoading(true);
      await createWeek();
      setSuccess({ message: 'New week initialization started!' });
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to create new week');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmVeg() {
    if (!vegInput.trim()) return;
    try {
      setActionLoading(true);
      const vegList = vegInput.split(',').map(v => v.trim()).filter(v => v);
      await confirmVeg(vegList);
      setSuccess({ message: 'Vegetables confirmed! You can now generate the plan.' });
      setVegInput('');
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm vegetables');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGeneratePlan() {
    if (!status?.week_of) return;

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);

      const result = await generatePlan(status.week_of);
      setSuccess({
        message: `Plan generated successfully for week of ${status.week_of}!`,
        url: result.plan_url
      });

      // Refresh status
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  }

  async function handleLogDay(made: boolean | string, feedback?: string) {
    if (!status?.week_of || !status?.current_day) return;

    try {
      setLogLoading(true);
      await logMeal({
        week: status.week_of,
        day: status.current_day,
        made: made,
        kids_feedback: feedback
      });
      setSuccess({ message: `Logged status for today (${status.current_day})!` });
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to log meal');
    } finally {
      setLogLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-[var(--accent-green)] font-mono animate-pulse">
          CONNECTING TO BRAIN...
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      <header className="mb-12">
        <h1 className="text-5xl mb-4">Meal Planner</h1>
        <p className="text-[var(--text-muted)] font-medium">
          Hybrid Serverless Engine • Option 2
        </p>
      </header>

      {/* Success Message */}
      {success && (
        <div className="card border-green-200 bg-green-50 text-green-700 p-6 mb-8">
          <p className="font-bold mb-2">✓ Success</p>
          <p className="mb-4">{success.message}</p>
          {success.url && (
            <a
              href={success.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-block text-center"
            >
              View Generated Plan
            </a>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="card border-red-200 bg-red-50 text-red-700 p-6 mb-8">
          <p className="font-bold mb-2">Error</p>
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* Status Card */}
        <section className="card">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
            System Status
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-tighter text-[var(--text-muted)]">Current Week</p>
              <p className="text-xl font-bold">{status?.week_of || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-tighter text-[var(--text-muted)]">Workflow State</p>
              <p className="text-lg capitalize inline-block px-3 py-1 bg-[var(--bg-secondary)] rounded-sm border border-[var(--border-subtle)]">
                {status?.state?.replace(/_/g, ' ') || 'New Week'}
              </p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="card">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-col gap-4">
            {status?.state === 'new_week' ? (
              <button
                onClick={handleCreateWeek}
                disabled={actionLoading}
                className="btn-primary w-full text-left flex justify-between items-center group"
              >
                <span>{actionLoading ? 'Initializing...' : 'Start New Week'}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
            ) : (
              <button
                onClick={handleGeneratePlan}
                disabled={generating || status?.state !== 'ready_to_plan'}
                className="btn-primary w-full text-left flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{generating ? 'Generating...' : 'Generate Weekly Plan'}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
            )}

            <Link href="/inventory" className="btn-secondary w-full text-left flex justify-between items-center group">
              <span>Update Inventory</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </Link>
          </div>
        </section>

        {/* Daily Check-in (Show when plan is complete) */}
        {status?.state === 'week_complete' && (
          <section className="card md:col-span-2 border-l-4 border-[var(--accent-green)]">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
              Daily Check-in: {status?.current_day?.toUpperCase()}
            </h2>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-tighter text-[var(--text-muted)] mb-1">Tonight's Dinner</p>
                <p className="text-2xl font-bold mb-2">
                  {status?.today_dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Nothing planned'}
                </p>
                {status?.today_dinner?.vegetables && (
                  <p className="text-sm text-[var(--text-muted)]">
                    Veggies: {status.today_dinner.vegetables.join(', ')}
                  </p>
                )}

                {status?.today_dinner?.made !== undefined && (
                  <div className="mt-4 inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    Status: {status.today_dinner.made === true ? 'Completed ✓' : status.today_dinner.made === 'freezer_backup' ? 'Freezer Backup Used' : 'Skipped'}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {!status?.today_dinner?.made ? (
                  <>
                    <button
                      onClick={() => handleLogDay(true)}
                      disabled={logLoading}
                      className="px-4 py-2 bg-[var(--accent-green)] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      Made it!
                    </button>
                    <button
                      onClick={() => handleLogDay('freezer_backup')}
                      disabled={logLoading}
                      className="px-4 py-2 bg-[var(--accent-terracotta)] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      Used Freezer
                    </button>
                    <button
                      onClick={() => handleLogDay(false)}
                      disabled={logLoading}
                      className="px-4 py-2 border border-[var(--border-subtle)] rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Skipped
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Kids' Feedback:</p>
                    <div className="flex gap-4 text-2xl">
                      <button
                        onClick={() => handleLogDay(true, 'Loved it ❤️')}
                        className={`hover:scale-125 transition-transform ${status?.today_dinner?.kids_feedback === 'Loved it ❤️' ? 'grayscale-0' : 'grayscale opacity-50'}`}
                        title="Loved it ❤️"
                      >
                        ❤️
                      </button>
                      <button
                        onClick={() => handleLogDay(true, 'Liked it 👍')}
                        className={`hover:scale-125 transition-transform ${status?.today_dinner?.kids_feedback === 'Liked it 👍' ? 'grayscale-0' : 'grayscale opacity-50'}`}
                        title="Liked it 👍"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleLogDay(true, 'Neutral 😐')}
                        className={`hover:scale-125 transition-transform ${status?.today_dinner?.kids_feedback === 'Neutral 😐' ? 'grayscale-0' : 'grayscale opacity-50'}`}
                        title="Neutral 😐"
                      >
                        😐
                      </button>
                      <button
                        onClick={() => handleLogDay(true, "Didn't like 👎")}
                        className={`hover:scale-125 transition-transform ${status?.today_dinner?.kids_feedback === "Didn't like 👎" ? 'grayscale-0' : 'grayscale opacity-50'}`}
                        title="Didn't like 👎"
                      >
                        👎
                      </button>
                      <button
                        onClick={() => handleLogDay(true, 'Refused ❌')}
                        className={`hover:scale-125 transition-transform ${status?.today_dinner?.kids_feedback === 'Refused ❌' ? 'grayscale-0' : 'grayscale opacity-50'}`}
                        title="Refused ❌"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Next Steps / Farmers Market */}
        {status?.state !== 'week_complete' && (
          <section className="card md:col-span-2">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
              {status?.state === 'awaiting_farmers_market' ? 'Confirm Vegetables' : 'Next Steps'}
            </h2>
            <div className="p-4 bg-[var(--bg-secondary)] border-l-4 border-[var(--accent-terracotta)]">
              {status?.state === 'ready_to_plan' ? (
                <p>✓ Farmers market vegetables are confirmed. Click "Generate Weekly Plan" above!</p>
              ) : status?.state === 'awaiting_farmers_market' ? (
                <div className="space-y-4">
                  <p>What did you buy? Enter comma-separated list:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vegInput}
                      onChange={(e) => setVegInput(e.target.value)}
                      placeholder="broccoli, sweet potato, spinach..."
                      className="flex-1 p-2 border border-[var(--border-subtle)] rounded-sm bg-white"
                    />
                    <button
                      onClick={handleConfirmVeg}
                      disabled={actionLoading}
                      className="btn-primary"
                    >
                      {actionLoading ? 'Confirming...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              ) : (
                <p>Start a new week to begin the planning process.</p>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-[var(--border-subtle)] flex justify-between items-center text-sm text-[var(--text-muted)]">
        <p>© 2026 Meal Planner System</p>
        <div className="flex gap-4">
          <Link href="#" className="hover:text-[var(--accent-green)] underline underline-offset-4">History</Link>
          <Link href="/recipes" className="hover:text-[var(--accent-green)] underline underline-offset-4">Recipes</Link>
        </div>
      </footer>
    </main>
  );
}
