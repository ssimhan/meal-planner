'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
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
  const [completedPrep, setCompletedPrep] = useState<string[]>([]);

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
      const updatedStatus = await confirmVeg(vegList);

      // Use the status returned by the API to update UI immediately
      if (updatedStatus && updatedStatus.state) {
        setStatus(prev => ({ ...prev, ...updatedStatus }));
      }

      setSuccess({ message: 'Vegetables confirmed! You can now generate the plan.' });
      setVegInput('');

      // Still fetch status as a background sync but the UI is already updated
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm vegetables');
    } finally {
      setActionLoading(false);
    }
  }

  async function togglePrepTask(task: string) {
    const isCompleted = completedPrep.includes(task);

    if (isCompleted) {
      // Remove from completed list
      setCompletedPrep(completedPrep.filter(t => t !== task));
    } else {
      // Add to completed list and save to backend
      const newCompleted = [...completedPrep, task];
      setCompletedPrep(newCompleted);

      // Send to backend immediately
      if (status?.week_of && status?.current_day) {
        try {
          await logMeal({
            week: status.week_of,
            day: status.current_day,
            prep_completed: [task] // Send only the newly completed task
          });
        } catch (err) {
          console.error('Failed to log prep completion:', err);
          // Revert on error
          setCompletedPrep(completedPrep);
        }
      }
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

  async function handleLogDay(made: boolean | string, feedback?: string, freezerMeal?: string, actualMeal?: string) {
    if (!status?.week_of || !status?.current_day) return;

    try {
      setLogLoading(true);
      await logMeal({
        week: status.week_of,
        day: status.current_day,
        made: made,
        kids_feedback: feedback,
        freezer_meal: freezerMeal,
        actual_meal: actualMeal
      });
      setSuccess({ message: `Logged status for today (${status.current_day})!` });
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to log meal');
    } finally {
      setLogLoading(false);
    }
  }

  async function handleLogFeedback(
    feedbackType: 'school_snack' | 'home_snack' | 'kids_lunch' | 'adult_lunch',
    emoji: string,
    made: boolean,
    overrideText?: string
  ) {
    if (!status?.week_of || !status?.current_day) return;

    try {
      setLogLoading(true);
      const feedbackData: any = {
        week: status.week_of,
        day: status.current_day,
        made: true // Keep this for backend compatibility
      };

      // Build the feedback string: if not made, include override text
      const feedbackValue = made ? emoji : (overrideText || 'Skipped');

      // Map feedback type to the correct field
      if (feedbackType === 'school_snack') {
        feedbackData.school_snack_feedback = feedbackValue;
        feedbackData.school_snack_made = made;
      } else if (feedbackType === 'home_snack') {
        feedbackData.home_snack_feedback = feedbackValue;
        feedbackData.home_snack_made = made;
      } else if (feedbackType === 'kids_lunch') {
        feedbackData.kids_lunch_feedback = feedbackValue;
        feedbackData.kids_lunch_made = made;
      } else if (feedbackType === 'adult_lunch') {
        feedbackData.adult_lunch_feedback = feedbackValue;
        feedbackData.adult_lunch_made = made;
      }

      await logMeal(feedbackData);
      setSuccess({ message: `Logged ${feedbackType.replace(/_/g, ' ')} feedback!` });
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to log feedback');
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
            {/* Show "View Full Week" if plan is complete or active */}
            {(status?.state === 'active' || status?.state === 'plan_complete' || status?.state === 'waiting_for_checkin') && (
              <Link
                href="/week-view"
                className="btn-primary w-full text-left flex justify-between items-center group"
              >
                <span>View Full Week Plan</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </Link>
            )}
            {/* Show "Start New Week" for new_week state */}
            {status?.state === 'new_week' && (
              <button
                onClick={handleCreateWeek}
                disabled={actionLoading}
                className="btn-primary w-full text-left flex justify-between items-center group"
              >
                <span>{actionLoading ? 'Initializing...' : 'Start New Week'}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
            )}
            {/* Show "Generate Weekly Plan" only when ready to plan */}
            {status?.state === 'ready_to_plan' && (
              <button
                onClick={handleGeneratePlan}
                disabled={generating}
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

                const FeedbackButtons = ({
                  feedbackType,
                  currentFeedback,
                  madeStatus,
                  mealName
                }: {
                  feedbackType: 'school_snack' | 'home_snack' | 'kids_lunch' | 'adult_lunch',
                  currentFeedback?: string,
                  madeStatus?: boolean,
                  mealName: string
                }) => {
                  const [showOverride, setShowOverride] = React.useState(false);
                  const [overrideText, setOverrideText] = React.useState('');

                  const handleMadeClick = (made: boolean) => {
                    if (!made) {
                      setShowOverride(true);
                    } else {
                      handleLogFeedback(feedbackType, '', made);
                    }
                  };

                  const handleOverrideSubmit = () => {
                    if (overrideText.trim()) {
                      handleLogFeedback(feedbackType, '', false, overrideText);
                      setShowOverride(false);
                      setOverrideText('');
                    }
                  };

                  // Step 1: Made or Not Made
                  if (madeStatus === undefined) {
                    return (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMadeClick(true)}
                          disabled={logLoading}
                          className="flex-1 py-1 px-2 bg-[var(--accent-green)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
                        >
                          ✓ Made
                        </button>
                        <button
                          onClick={() => handleMadeClick(false)}
                          disabled={logLoading}
                          className="flex-1 py-1 px-2 border border-[var(--border-subtle)] text-xs rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          ✗ Skip
                        </button>
                      </div>
                    );
                  }

                  // Step 2a: If Not Made, show override input
                  if (madeStatus === false && showOverride) {
                    return (
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-[var(--text-muted)]">What did you eat instead?</span>
                        <input
                          type="text"
                          value={overrideText}
                          onChange={(e) => setOverrideText(e.target.value)}
                          placeholder="e.g., Restaurant pizza"
                          className="w-full px-2 py-1 text-xs border border-[var(--border-subtle)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-sage)]"
                          disabled={logLoading}
                        />
                        <button
                          onClick={handleOverrideSubmit}
                          disabled={logLoading || !overrideText.trim()}
                          className="w-full py-1 bg-[var(--accent-sage)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    );
                  }

                  // Step 2b: If Made, show preference emojis
                  if (madeStatus === true) {
                    return (
                      <div className="flex justify-around items-center bg-gray-50 p-1 rounded">
                        {['❤️', '👍', '😐', '👎', '❌'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleLogFeedback(feedbackType, emoji, true)}
                            disabled={logLoading}
                            className={`p-1 hover:scale-110 transition-transform ${currentFeedback?.includes(emoji) ? 'opacity-100' : 'opacity-40 grayscale'}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    );
                  }

                  // Step 3: Show status badge if already logged
                  return (
                    <div className="text-xs text-[var(--text-muted)] text-center">
                      {madeStatus === false ? `✗ Skipped: ${currentFeedback || 'No details'}` : `✓ Made ${currentFeedback || ''}`}
                    </div>
                  );
                };

                return (
                  <>
                    {/* School Snack */}
                    <Card
                      title="School Snack"
                      icon="🎒"
                      content={status?.today_snacks?.school || "Fruit"}
                      action={<FeedbackButtons
                        feedbackType="school_snack"
                        currentFeedback={status?.today_snacks?.school_snack_feedback}
                        madeStatus={status?.today_snacks?.school_snack_made}
                        mealName={status?.today_snacks?.school || "Fruit"}
                      />}
                    />

                    {/* Kids Lunch */}
                    <Card
                      title="Kids Lunch"
                      icon="🥪"
                      content={status?.today_lunch?.recipe_name || "Leftovers"}
                      subtitle={status?.today_lunch?.assembly_notes}
                      action={<FeedbackButtons
                        feedbackType="kids_lunch"
                        currentFeedback={status?.today_lunch?.kids_lunch_feedback}
                        madeStatus={status?.today_lunch?.kids_lunch_made}
                        mealName={status?.today_lunch?.recipe_name || "Leftovers"}
                      />}
                    />

                    {/* Adult Lunch */}
                    <Card
                      title="Adult Lunch"
                      icon="☕"
                      content="Leftovers"
                      subtitle="Grain bowl + dinner components"
                      action={<FeedbackButtons
                        feedbackType="adult_lunch"
                        currentFeedback={status?.today_lunch?.adult_lunch_feedback}
                        madeStatus={status?.today_lunch?.adult_lunch_made}
                        mealName="Leftovers"
                      />}
                    />

                    {/* Home Snack */}
                    <Card
                      title="Home Snack"
                      icon="🏠"
                      content={status?.today_snacks?.home || "Cucumber"}
                      action={<FeedbackButtons
                        feedbackType="home_snack"
                        currentFeedback={status?.today_snacks?.home_snack_feedback}
                        madeStatus={status?.today_snacks?.home_snack_made}
                        mealName={status?.today_snacks?.home || "Cucumber"}
                      />}
                    />

                    {/* Dinner */}
                    {(() => {
                      const DinnerLogging = () => {
                        const [showAlternatives, setShowAlternatives] = React.useState(false);
                        const [selectedAlternative, setSelectedAlternative] = React.useState<'freezer' | 'outside' | 'other' | null>(null);
                        const [otherMealText, setOtherMealText] = React.useState('');
                        const [selectedFreezerMeal, setSelectedFreezerMeal] = React.useState('');

                        const freezerInventory = status?.week_data?.freezer_inventory || [];

                        const handleMadeAsPlanned = () => {
                          handleLogDay(true);
                        };

                        const handleNotMade = () => {
                          setShowAlternatives(true);
                        };

                        const handleAlternativeSelect = (alt: 'freezer' | 'outside' | 'other') => {
                          setSelectedAlternative(alt);
                        };

                        const handleSubmitAlternative = async () => {
                          if (selectedAlternative === 'freezer' && selectedFreezerMeal) {
                            await handleLogDay('freezer_backup', '', selectedFreezerMeal);
                            setShowAlternatives(false);
                            setSelectedAlternative(null);
                          } else if (selectedAlternative === 'outside') {
                            await handleLogDay('outside_meal');
                            setShowAlternatives(false);
                            setSelectedAlternative(null);
                          } else if (selectedAlternative === 'other' && otherMealText.trim()) {
                            await handleLogDay(false, '', '', otherMealText);
                            setShowAlternatives(false);
                            setSelectedAlternative(null);
                            setOtherMealText('');
                          }
                        };

                        // Already logged - show feedback emojis
                        if (status?.today_dinner?.made) {
                          return (
                            <div className="flex justify-between items-center bg-gray-50 p-1 rounded">
                              {['❤️', '👍', '😐', '👎', '❌'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleLogDay(true, emoji)}
                                  disabled={logLoading}
                                  className={`p-1 hover:scale-110 transition-transform ${status?.today_dinner?.kids_feedback?.includes(emoji) ? 'opacity-100' : 'opacity-40 grayscale'}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          );
                        }

                        // Step 1: Made as planned or not?
                        if (!showAlternatives) {
                          return (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={handleMadeAsPlanned}
                                disabled={logLoading}
                                className="w-full py-2 bg-[var(--accent-green)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
                              >
                                ✓ Made as Planned
                              </button>
                              <button
                                onClick={handleNotMade}
                                disabled={logLoading}
                                className="w-full py-1 border border-[var(--border-subtle)] text-xs rounded hover:bg-gray-50 disabled:opacity-50"
                              >
                                ✗ Did Not Make
                              </button>
                            </div>
                          );
                        }

                        // Step 2: What did you eat instead?
                        if (!selectedAlternative) {
                          return (
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] text-[var(--text-muted)] mb-1">What did you eat instead?</span>
                              <button
                                onClick={() => handleAlternativeSelect('freezer')}
                                className="w-full py-2 bg-[var(--accent-terracotta)] text-white text-xs rounded hover:opacity-90"
                              >
                                🧊 Freezer Meal
                              </button>
                              <button
                                onClick={() => handleAlternativeSelect('outside')}
                                className="w-full py-2 bg-[var(--accent-gold)] text-white text-xs rounded hover:opacity-90"
                              >
                                🍽️ Ate Out / Restaurant
                              </button>
                              <button
                                onClick={() => handleAlternativeSelect('other')}
                                className="w-full py-2 border border-[var(--border-subtle)] text-xs rounded hover:bg-gray-50"
                              >
                                📝 Something Else
                              </button>
                            </div>
                          );
                        }

                        // Step 3a: Select freezer meal
                        if (selectedAlternative === 'freezer') {
                          return (
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] text-[var(--text-muted)]">Select freezer meal used:</span>
                              {freezerInventory.length > 0 ? (
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                  {freezerInventory.map((item: any, idx: number) => (
                                    <label key={idx} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                      <input
                                        type="radio"
                                        name="freezer-meal"
                                        value={item.meal}
                                        checked={selectedFreezerMeal === item.meal}
                                        onChange={(e) => setSelectedFreezerMeal(e.target.value)}
                                        className="w-4 h-4"
                                      />
                                      <span className="text-xs">{item.meal}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-[var(--text-muted)] italic">No freezer inventory available</p>
                              )}
                              <button
                                onClick={handleSubmitAlternative}
                                disabled={logLoading || !selectedFreezerMeal}
                                className="w-full py-2 bg-[var(--accent-sage)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {setSelectedAlternative(null); setSelectedFreezerMeal('');}}
                                className="w-full py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                              >
                                ← Back
                              </button>
                            </div>
                          );
                        }

                        // Step 3b: Ate out confirmation
                        if (selectedAlternative === 'outside') {
                          return (
                            <div className="flex flex-col gap-2">
                              <span className="text-xs text-[var(--text-muted)]">Confirm: Ate at restaurant or ordered out</span>
                              <button
                                onClick={handleSubmitAlternative}
                                disabled={logLoading}
                                className="w-full py-2 bg-[var(--accent-sage)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setSelectedAlternative(null)}
                                className="w-full py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                              >
                                ← Back
                              </button>
                            </div>
                          );
                        }

                        // Step 3c: Something else - text input
                        if (selectedAlternative === 'other') {
                          return (
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] text-[var(--text-muted)]">What did you eat?</span>
                              <input
                                type="text"
                                value={otherMealText}
                                onChange={(e) => setOtherMealText(e.target.value)}
                                placeholder="e.g., Leftovers, Sandwiches, Cereal"
                                className="w-full px-2 py-1 text-xs border border-[var(--border-subtle)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-sage)]"
                                disabled={logLoading}
                              />
                              <button
                                onClick={handleSubmitAlternative}
                                disabled={logLoading || !otherMealText.trim()}
                                className="w-full py-2 bg-[var(--accent-sage)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {setSelectedAlternative(null); setOtherMealText('');}}
                                className="w-full py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                              >
                                ← Back
                              </button>
                            </div>
                          );
                        }

                        return null;
                      };

                      return (
                        <Card
                          title="Dinner"
                          icon="🍽️"
                          content={status?.today_dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Nothing planned'}
                          subtitle={status?.today_dinner?.vegetables ? `Veggies: ${status.today_dinner.vegetables.join(', ')}` : null}
                          badge={status?.today_dinner?.made !== undefined ? (
                            status.today_dinner.made === true ? '✓ Made' :
                            status.today_dinner.made === 'freezer_backup' ? '🧊 Freezer' :
                            status.today_dinner.made === 'outside_meal' ? '🍽️ Restaurant' :
                            status.today_dinner.actual_meal ? `✗ ${status.today_dinner.actual_meal}` :
                            '✗ Skipped'
                          ) : null}
                          action={<DinnerLogging />}
                        />
                      );
                    })()}
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
                  status.prep_tasks.map((task, idx) => {
                    const taskStr = typeof task === 'string' ? task : task.task;
                    const taskTime = typeof task === 'object' && task.time ? task.time : null;
                    const isCompleted = completedPrep.includes(taskStr);

                    return (
                      <div key={idx} className="flex gap-3 items-start">
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => togglePrepTask(taskStr)}
                          className="w-4 h-4 rounded border-2 border-[var(--accent-sage)] text-[var(--accent-sage)] focus:ring-[var(--accent-sage)] cursor-pointer mt-0.5 flex-shrink-0"
                        />
                        <label
                          className={`text-sm cursor-pointer flex-1 ${isCompleted ? 'line-through text-[var(--text-muted)]' : ''}`}
                          onClick={() => togglePrepTask(taskStr)}
                        >
                          {taskTime && <span className="font-mono text-xs mr-2 text-[var(--accent-gold)]">{taskTime.toUpperCase()}</span>}
                          {taskStr}
                        </label>
                      </div>
                    );
                  })
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
