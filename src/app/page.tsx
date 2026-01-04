'use client';

import { useState, useEffect } from 'react';
import { getStatus, WorkflowStatus } from '@/lib/api';

export default function Dashboard() {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const data = await getStatus();
        setStatus(data);
      } catch (err) {
        setError('Failed to connect to the meal planner brain.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

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

      {error ? (
        <div className="card border-red-200 bg-red-50 text-red-700 p-6 mb-8">
          <p className="font-bold mb-2">Error</p>
          <p>{error}</p>
        </div>
      ) : (
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
              <button className="btn-primary w-full text-left flex justify-between items-center group">
                <span>Generate Weekly Plan</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
              <button className="btn-secondary w-full text-left flex justify-between items-center group">
                <span>Update Inventory</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
            </div>
          </section>

          {/* Recent Activity / Next Steps */}
          <section className="card md:col-span-2">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
              Next Steps
            </h2>
            <div className="p-4 bg-[var(--bg-secondary)] border-l-4 border-[var(--accent-terracotta)]">
              {status?.state === 'ready_to_plan' ? (
                <p>Farmers market vegetables are confirmed. You are ready to generate this week's plan!</p>
              ) : status?.state === 'awaiting_farmers_market' ? (
                <p>Awaiting vegetable confirmations from the farmers market.</p>
              ) : (
                <p>Start a new week to begin the planning process.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Footer / Links */}
      <footer className="mt-16 pt-8 border-t border-[var(--border-subtle)] flex justify-between items-center text-sm text-[var(--text-muted)]">
        <p>© 2026 Meal Planner System</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-[var(--accent-green)] underline underline-offset-4">History</a>
          <a href="#" className="hover:text-[var(--accent-green)] underline underline-offset-4">Recipes</a>
        </div>
      </footer>
    </main>
  );
}
