'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getStatus, generatePlan, WorkflowStatus } from '@/lib/api';

export default function Dashboard() {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState<{ message: string; url?: string } | null>(null);

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
            <button
              onClick={handleGeneratePlan}
              disabled={generating || status?.state !== 'ready_to_plan'}
              className="btn-primary w-full text-left flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{generating ? 'Generating...' : 'Generate Weekly Plan'}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </button>
            <Link href="/inventory" className="btn-secondary w-full text-left flex justify-between items-center group">
              <span>Update Inventory</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </Link>
          </div>
        </section>

        {/* Next Steps */}
        <section className="card md:col-span-2">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
            Next Steps
          </h2>
          <div className="p-4 bg-[var(--bg-secondary)] border-l-4 border-[var(--accent-terracotta)]">
            {status?.state === 'ready_to_plan' ? (
              <p>✓ Farmers market vegetables are confirmed. Click "Generate Weekly Plan" above!</p>
            ) : status?.state === 'awaiting_farmers_market' ? (
              <p>⏳ Awaiting vegetable confirmations from the farmers market.</p>
            ) : status?.state === 'week_complete' ? (
              <p>✓ This week's plan is complete. Start a new week when ready.</p>
            ) : (
              <p>Start a new week to begin the planning process.</p>
            )}
          </div>
        </section>
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
