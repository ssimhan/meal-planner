'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { getStatus, generatePlan, createWeek, confirmVeg, logMeal, getRecipes, getAnalytics, WorkflowStatus } from '@/lib/api';
import MealCorrectionInput from '@/components/MealCorrectionInput';

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
  const [recipes, setRecipes] = useState<{ id: string; name: string }[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Dinner Logging State (Lifted from inner component to prevent state loss on re-render)
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState<'freezer' | 'outside' | 'other' | null>(null);
  const [otherMealText, setOtherMealText] = useState('');
  const [selectedFreezerMeal, setSelectedFreezerMeal] = useState('');
  const [isDinnerEditing, setIsDinnerEditing] = useState(false);
  const [dinnerEditInput, setDinnerEditInput] = useState('');

  useEffect(() => {
    fetchStatus(true);
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
    async function loadStats() {
      try {
        const stats = await getAnalytics();
        setAnalytics(stats);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      }
    }
    loadRecipes();
    loadStats();
  }, []);

  async function fetchStatus(isInitial = false) {
    try {
      if (isInitial) setLoading(true);
      const data = await getStatus();
      setStatus(data);
      // Initialize completed prep from backend
      if (data.completed_prep) {
        setCompletedPrep(data.completed_prep);
      }
      setError(null);
    } catch (err) {
      setError('Failed to connect to the meal planner brain.');
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }

  async function handleCreateWeek() {
    try {
      setActionLoading(true);
      setSuccess(null);
      await createWeek();
      setSuccess({ message: 'New week initialized on GitHub. Syncing dashboard...' });
      await fetchStatus(false);
      setSuccess({ message: 'New week ready!' });
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
      setSuccess(null);
      const vegList = vegInput.split(',').map(v => v.trim()).filter(v => v);
      const updatedStatus = await confirmVeg(vegList);

      setSuccess({ message: 'Vegetables confirmed!' });
      setVegInput('');

      // Update status directly from the response
      setStatus(prev => ({
        ...prev,
        ...updatedStatus,
        state: updatedStatus.state,
        week_of: updatedStatus.week_of,
        has_data: updatedStatus.has_data
      } as WorkflowStatus));

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

  async function handleLogDay(
    made: boolean | string,
    feedback?: string,
    freezerMeal?: string,
    actualMeal?: string,
    needsFix?: boolean,
    requestRecipe?: boolean
  ) {
    if (!status?.week_of || !status?.current_day) return;

    try {
      setLogLoading(true);
      const updatedStatus = await logMeal({
        week: status.week_of,
        day: status.current_day,
        made: made,
        kids_feedback: feedback,
        freezer_meal: freezerMeal,
        actual_meal: actualMeal,
        dinner_needs_fix: needsFix,
        request_recipe: requestRecipe
      });
      setSuccess({ message: `Logged status for today (${status.current_day})!` });
      // Update status directly with the fresh data from the backend
      setStatus(updatedStatus);

      // RESET dinner states upon successful log
      setShowAlternatives(false);
      setSelectedAlternative(null);
      setOtherMealText('');
      setSelectedFreezerMeal('');
      setIsDinnerEditing(false);
      setDinnerEditInput('');
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
    overrideText?: string,
    needsFix?: boolean,
    requestRecipe?: boolean
  ) {
    if (!status?.week_of || !status?.current_day) return;

    try {
      setLogLoading(true);
      const feedbackValue = overrideText || (made ? emoji : 'Skipped');

      const updatedStatus = await logMeal({
        week: status.week_of,
        day: status.current_day,
        [`${feedbackType}_made`]: made,
        [`${feedbackType}_feedback`]: feedbackValue,
        [`${feedbackType}_needs_fix`]: needsFix,
        request_recipe: requestRecipe
      });

      setSuccess({ message: `Logged ${feedbackType.replace(/_/g, ' ')} feedback!` });
      // Update status directly with the fresh data
      setStatus(updatedStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to log feedback');
    } finally {
      setLogLoading(false);
    }
  }

  const getDisplayName = (planned: string, actual?: string) => {
    if (!actual) return planned;
    const isEmoji = ['❤️', '👍', '😐', '👎', '❌'].some(emoji => actual.includes(emoji));
    if (isEmoji || actual === 'Skipped') return planned;
    return actual;
  };

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
  );

  if (loading && !status) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <header className="mb-12">
          <Skeleton className="h-12 w-3/4 mb-4" />
        </header>
        <div className="grid gap-8 md:grid-cols-2">
          <section className="card">
            <Skeleton className="h-4 w-1/4 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
            </div>
          </section>
          <section className="card">
            <Skeleton className="h-4 w-1/4 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </section>
          <section className="card md:col-span-2">
            <Skeleton className="h-4 w-1/4 mb-4" />
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      <header className="mb-12">
        <h1 className="text-5xl mb-4">Sandhya's Meal Planner</h1>
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
            {/* Show "Start New Week" for new_week and archived states */}
            {(status?.state === 'new_week' || status?.state === 'archived') && (
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

            <Link href="/analytics" className="btn-secondary w-full text-left flex justify-between items-center group">
              <span>Family Analytics & Insights</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </Link>
          </div>
        </section>

        {/* Family Favorites Widget */}
        {analytics?.popularity && (
          <section className="card md:col-span-2">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
              Top Family Favorites
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {analytics.popularity.slice(0, 5).map((recipe: any) => (
                <Link
                  key={recipe.id}
                  href="/analytics"
                  className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded hover:border-[var(--accent-sage)] transition-colors group"
                >
                  <p className="text-xs font-bold truncate group-hover:text-[var(--accent-sage)]">{recipe.name}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{recipe.count}x</span>
                    <span className="text-xs">{recipe.last_feedback || '👍'}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

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
                const Card = ({ title, icon, subtitle, content, badge, action, isConfirmed }: any) => (
                  <div className={`card flex flex-col h-full border-t-2 border-t-[var(--accent-sage)] shadow-sm hover:shadow-md transition-all ${isConfirmed ? 'opacity-50 grayscale bg-gray-50' : ''}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono uppercase text-[var(--text-muted)]">{title}</span>
                      <span className="text-xl">{icon}</span>
                    </div>
                    <div className="mt-2 flex-grow">
                      <p className={`text-lg font-bold leading-tight ${isConfirmed ? 'text-[var(--text-muted)]' : ''}`}>{content}</p>
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
                  const [isEditing, setIsEditing] = React.useState(false);
                  const [editInput, setEditInput] = React.useState('');

                  const handleEditSubmit = (mealName: string, requestRecipe: boolean) => {
                    handleLogFeedback(feedbackType, '', true, mealName, false, requestRecipe);
                    setIsEditing(false);
                  };

                  // Step 2b: If Made, show preference emojis + Fix button
                  if (madeStatus === true && !isEditing) {
                    return (
                      <div className="flex flex-col gap-2">
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
                        <button
                          onClick={() => { setIsEditing(true); setEditInput(currentFeedback || ''); }}
                          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-sage)] underline decoration-dotted text-center"
                        >
                          🔧 Fix / Edit Details
                        </button>
                      </div>
                    );
                  }

                  // Step 2c: Edit Mode
                  if (madeStatus === true && isEditing) {
                    return (
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-[var(--text-muted)]">Correction / Actual details:</span>
                        <MealCorrectionInput
                          recipes={recipes}
                          onSave={handleEditSubmit}
                          onCancel={() => setIsEditing(false)}
                          placeholder="e.g., Had apple instead"
                          existingValue={currentFeedback || ''}
                        />
                      </div>
                    );
                  }

                  // Step 3: Show status badge if already logged (skipped)
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
                      content={getDisplayName(status?.today_snacks?.school || "Fruit", status?.today_snacks?.school_snack_feedback)}
                      isConfirmed={status?.today_snacks?.school_snack_made !== undefined}
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
                      content={getDisplayName(status?.today_lunch?.recipe_name || "Leftovers", status?.today_lunch?.kids_lunch_feedback)}
                      subtitle={status?.today_lunch?.assembly_notes}
                      isConfirmed={status?.today_lunch?.kids_lunch_made !== undefined}
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
                      content={getDisplayName("Leftovers", status?.today_lunch?.adult_lunch_feedback)}
                      subtitle="Grain bowl + dinner components"
                      isConfirmed={status?.today_lunch?.adult_lunch_made !== undefined}
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
                      content={getDisplayName(status?.today_snacks?.home || "Cucumber", status?.today_snacks?.home_snack_feedback)}
                      isConfirmed={status?.today_snacks?.home_snack_made !== undefined}
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
                        // These state variables are now managed by the parent Dashboard component
                        // and passed down as props, or derived from the global status object.
                        // For this snippet, we assume they are available in the scope of DinnerLogging.
                        // For example, `showAlternatives`, `selectedAlternative`, `otherMealText`,
                        // `selectedFreezerMeal`, `isDinnerEditing`, `dinnerEditInput` would be props
                        // or derived from `status` and `dashboardState` variables.

                        const freezerInventory = status?.week_data?.freezer_inventory || [];

                        const handleMadeAsPlanned = () => {
                          handleLogDay(true);
                        };

                        const handleNotMade = () => {
                          // This action would trigger a state change in the parent Dashboard component
                          // to show alternatives.
                          // For example: setDashboardState(prev => ({ ...prev, showDinnerAlternatives: true }));
                          // For this snippet, we assume `setShowAlternatives` is a prop.
                          setShowAlternatives(true);
                        };

                        const handleAlternativeSelect = (alt: 'freezer' | 'outside' | 'other') => {
                          // This action would trigger a state change in the parent Dashboard component
                          // to set the selected alternative.
                          // For example: setDashboardState(prev => ({ ...prev, selectedDinnerAlternative: alt }));
                          // For this snippet, we assume `setSelectedAlternative` is a prop.
                          setSelectedAlternative(alt);
                        };

                        const handleSubmitAlternative = async () => {
                          if (selectedAlternative === 'freezer' && selectedFreezerMeal) {
                            await handleLogDay('freezer_backup', '', selectedFreezerMeal);
                          } else if (selectedAlternative === 'outside') {
                            await handleLogDay('outside_meal');
                          } else if (selectedAlternative === 'other' && otherMealText.trim()) {
                            await handleLogDay(false, '', '', otherMealText);
                          }
                        };

                        const handleDinnerEditSubmitLocal = async (mealName: string, requestRecipe: boolean) => {
                          const currentMade = status?.today_dinner?.made;
                          let freezerMealArg = '';
                          if (currentMade === 'freezer_backup' && status?.today_dinner?.freezer_used?.meal) {
                            freezerMealArg = status.today_dinner.freezer_used.meal;
                          }

                          await handleLogDay(
                            currentMade!,
                            status?.today_dinner?.kids_feedback || '',
                            freezerMealArg,
                            mealName,
                            false,
                            requestRecipe
                          );
                          setIsDinnerEditing(false);
                        };

                        // Already logged - show feedback emojis
                        if (status?.today_dinner?.made && !isDinnerEditing) {
                          return (
                            <div className="flex flex-col gap-2">
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
                              <button
                                onClick={() => { setIsDinnerEditing(true); setDinnerEditInput(status?.today_dinner?.actual_meal || ''); }}
                                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-sage)] underline decoration-dotted text-center"
                              >
                                🔧 Fix / Edit Actual Meal
                              </button>
                            </div>
                          );
                        }

                        if (status?.today_dinner?.made && isDinnerEditing) {
                          return (
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] text-[var(--text-muted)]">Correction / Actual meal:</span>
                              <MealCorrectionInput
                                recipes={recipes}
                                onSave={handleDinnerEditSubmitLocal}
                                onCancel={() => setIsDinnerEditing(false)}
                                placeholder="e.g., Actually had Pizza"
                                existingValue={status?.today_dinner?.actual_meal || ''}
                              />
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
                                ✓ Made
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
                                onClick={() => { setSelectedAlternative(null); setSelectedFreezerMeal(''); }}
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
                                onClick={() => { setSelectedAlternative(null); setOtherMealText(''); }}
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
                          content={getDisplayName(status?.today_dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Nothing planned', status?.today_dinner?.actual_meal)}
                          subtitle={status?.today_dinner?.vegetables ? `Veggies: ${status.today_dinner.vegetables.join(', ')}` : null}
                          isConfirmed={status?.today_dinner?.made !== undefined}
                          badge={status?.today_dinner?.made !== undefined ? (
                            status.today_dinner.made === true ? (status.today_dinner.actual_meal ? `✓ Made (${status.today_dinner.actual_meal})` : '✓ Made') :
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
