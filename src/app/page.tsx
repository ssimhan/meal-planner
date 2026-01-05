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

        {/* Today's Schedule (Show when plan is active or waiting for check-in) */}
        {(status?.state === 'active' || status?.state === 'waiting_for_checkin') && (
          <section className={`md:col-span-2 mt-8 p-6 rounded-lg ${status?.state === 'waiting_for_checkin' ? 'bg-red-50 border-2 border-[var(--accent-terracotta)] animate-pulse' : ''}`}>
            <header className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">
                Today's Schedule: {status?.current_day?.toUpperCase()}
              </h2>
              <div className="flex gap-2">
                {status?.state === 'waiting_for_checkin' && (
                  <span className="text-xs font-bold text-[var(--accent-terracotta)] uppercase tracking-widest px-2 py-1 bg-white rounded border border-[var(--accent-terracotta)]">
                    ⚠️ Action Required: Logging Pending
                  </span>
                )}
                <span className="text-xs font-mono px-2 py-1 bg-[var(--bg-secondary)] rounded border border-[var(--border-subtle)] text-[var(--accent-sage)] uppercase">
                  ACTIVE PLAN
                </span>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {/* Card Title Helper */}
              {(() => {
                const Card = ({ title, icon, subtitle, content, badge, action }: any) => (
                  <div className="card flex flex-col h-full border-t-2 border-t-[var(--accent-sage)] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono uppercase text-[var(--text-muted)]">{title}</span>
                      <span className="text-xl">{icon}</span>
                    </div>
                    <div className="mt-2 flex-grow">
                      <p className="text-lg font-bold leading-tight">{content}</p>
                      {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
                      {badge && (
                        <span className="mt-2 inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-bold uppercase">
                          {badge}
                        </span>
                      )}
                    </div>
                    {action && <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">{action}</div>}
                  </div>
                );

                return (
                  <>
                    {/* School Snack */}
                    <Card
                      title="School Snack"
                      icon="🎒"
                      content={status?.today_snacks?.school || "Fruit"}
                    />

                    {/* Kids Lunch */}
                    <Card
                      title="Kids Lunch"
                      icon="🥪"
                      content={status?.today_lunch?.recipe_name || "Leftovers"}
                      subtitle={status?.today_lunch?.assembly_notes}
                    />

                    {/* Adult Lunch */}
                    <Card
                      title="Adult Lunch"
                      icon="☕"
                      content="Leftovers"
                      subtitle="Grain bowl + dinner components"
                    />

                    {/* Home Snack */}
                    <Card
                      title="Home Snack"
                      icon="🏠"
                      content={status?.today_snacks?.home || "Cucumber"}
                    />

                    {/* Dinner */}
                    <Card
                      title="Dinner"
                      icon="🍽️"
                      content={status?.today_dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Nothing planned'}
                      subtitle={status?.today_dinner?.vegetables ? `Veggies: ${status.today_dinner.vegetables.join(', ')}` : null}
                      badge={status?.today_dinner?.made !== undefined ? (status.today_dinner.made === true ? '✓ Made' : status.today_dinner.made === 'freezer_backup' ? '🧊 Freezer' : '× Skipped') : null}
                      action={
                        !status?.today_dinner?.made ? (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleLogDay(true)}
                              disabled={logLoading}
                              className="w-full py-2 bg-[var(--accent-green)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
                            >
                              Made it!
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleLogDay('freezer_backup')}
                                disabled={logLoading}
                                className="flex-1 py-1 px-1 bg-[var(--accent-terracotta)] text-white text-[10px] rounded hover:opacity-90 disabled:opacity-50"
                              >
                                Freezer
                              </button>
                              <button
                                onClick={() => handleLogDay(false)}
                                disabled={logLoading}
                                className="flex-1 py-1 px-1 border border-[var(--border-subtle)] text-[10px] rounded hover:bg-gray-50 disabled:opacity-50"
                              >
                                Skip
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center bg-gray-50 p-1 rounded">
                            {['❤️', '👍', '😐', '👎', '❌'].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleLogDay(true, emoji)}
                                className={`p-1 hover:scale-110 transition-transform ${status?.today_dinner?.kids_feedback?.includes(emoji) ? 'opacity-100' : 'opacity-40 grayscale'}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )
                      }
                    />
                  </>
                );
              })()}
            </div>

            {/* Prep Timeline */}
            <div className="card bg-[var(--bg-secondary)] border-none shadow-none">
              <header className="flex items-center gap-2 mb-4 border-b border-[var(--border-subtle)] pb-2">
                <span className="text-xl">⏱️</span>
                <h3 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">Prep Interface</h3>
              </header>
              <div className="space-y-3">
                {status?.prep_tasks && status.prep_tasks.length > 0 ? (
                  status.prep_tasks.map((task, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="w-4 h-4 rounded-full bg-[var(--accent-sage)] flex-shrink-0 mt-0.5 opacity-40"></span>
                      <p className="text-sm">{task}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)] italic">No specific prep tasks for today.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Next Steps / Farmers Market */}
        {!(status?.state === 'active' || status?.state === 'waiting_for_checkin') && status?.state !== 'archived' && (
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

        {/* Archived Message */}
        {status?.state === 'archived' && (
          <section className="card md:col-span-2 opacity-75">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
              Week Archived
            </h2>
            <div className="p-4 bg-[var(--bg-secondary)] border-l-4 border-gray-400">
              <p>✓ This week's plan has been archived. Unused items have been rolled over. Start a new week to begin planning next week!</p>
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
