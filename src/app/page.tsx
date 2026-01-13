'use client';

import Link from 'next/link';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getStatus, generatePlan, createWeek, confirmVeg, logMeal, getRecipes, WorkflowStatus } from '@/lib/api';
import type { RecipeListItem } from '@/types';
import Skeleton from '@/components/Skeleton';
import Card from '@/components/Card';
import FeedbackButtons from '@/components/FeedbackButtons';
import DinnerLogging from '@/components/DinnerLogging';
import PrepTaskList from '@/components/PrepTaskList';
import NightlyCheckinBanner from '@/components/NightlyCheckinBanner';
import RecipeCaptureBanner from '@/components/RecipeCaptureBanner';
import { useToast } from '@/context/ToastContext';
import { logout } from './login/actions';

function DraftPlanSummary({ wizardState }: { wizardState: any }) {
  if (!wizardState?.selections || wizardState.selections.length === 0) return null;

  return (
    <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
      <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">Draft Selections</h3>
      <div className="grid grid-cols-2 gap-2">
        {wizardState.selections.map((s: any, i: number) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-[var(--bg-primary)] rounded border border-[var(--border-subtle)]">
            <span className="text-xs font-bold uppercase text-[var(--text-muted)] w-8">{s.day}</span>
            <span className="text-sm truncate">{s.recipe_name || s.recipe_id?.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
      {wizardState.customShoppingItems?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-[var(--text-muted)] italic">+{wizardState.customShoppingItems.length} custom shopping items</p>
        </div>
      )}
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const weekParam = searchParams.get('week');

  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [ui, setUi] = useState({
    actionLoading: false,
    logLoading: false,
  });
  const { showToast } = useToast();
  const [vegInput, setVegInput] = useState('');
  const [completedPrep, setCompletedPrep] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(weekParam);

  // Synchronize state with URL param
  useEffect(() => {
    if (weekParam && weekParam !== selectedWeek) {
      setSelectedWeek(weekParam);
    }
  }, [weekParam]);

  // Dinner Logging State consolidated
  const [dinnerState, setDinnerState] = useState({
    showAlternatives: false,
    selectedAlternative: null as 'freezer' | 'outside' | 'other' | null,
    otherMealText: '',
    selectedFreezerMeal: '',
    isEditing: false,
    editInput: ''
  });

  useEffect(() => {
    fetchStatus(true, selectedWeek || undefined);
  }, [selectedWeek]);

  useEffect(() => {
    async function loadRecipes() {
      try {
        const data = await getRecipes();
        const recipeList = data.recipes.map((r: RecipeListItem) => ({
          id: r.id,
          name: r.name
        }));
        setRecipes(recipeList);
      } catch (err) {
        showToast('Failed to load recipes.', 'error');
        console.error('Failed to load recipes:', err);
      }
    }
    loadRecipes();
  }, []);

  async function fetchStatus(isInitial = false, week?: string) {
    try {
      if (isInitial) setLoading(true);
      const data = await getStatus(week);
      setStatus(data);
      // Initialize completed prep from backend
      if (data.today?.prep_completed) {
        setCompletedPrep(data.today.prep_completed);
      }
    } catch (err) {
      showToast('Failed to connect to the meal planner brain.', 'error');
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }

  async function handleCreateWeek() {
    try {
      setUi(prev => ({ ...prev, actionLoading: true }));
      await createWeek();
      showToast('New week initialized. Syncing dashboard...', 'info');
      await fetchStatus(false);
      showToast('New week ready!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create new week', 'error');
    } finally {
      setUi(prev => ({ ...prev, actionLoading: false }));
    }
  }

  async function handleConfirmVeg() {
    if (!vegInput.trim()) return;
    try {
      setUi(prev => ({ ...prev, actionLoading: true }));
      const vegList = vegInput.split(',').map(v => v.trim()).filter(v => v);
      const updatedStatus = await confirmVeg(vegList);

      showToast('Vegetables confirmed!', 'success');
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
      showToast(err.message || 'Failed to confirm vegetables', 'error');
    } finally {
      setUi(prev => ({ ...prev, actionLoading: false }));
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
          showToast('Failed to save prep completion.', 'error');
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
      setUi(prev => ({ ...prev, actionLoading: true }));
      await generatePlan(status.week_of);
      showToast(`Plan generated successfully for week of ${status.week_of}!`, 'success');
      await fetchStatus(false, selectedWeek || undefined);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate plan', 'error');
    } finally {
      setUi(prev => ({ ...prev, actionLoading: false }));
    }
  }

  async function handleReplan() {
    try {
      setUi(prev => ({ ...prev, actionLoading: true }));
      await replan();
      showToast('Plan adjusted for the rest of the week!', 'success');
      await fetchStatus(false, selectedWeek || undefined);
    } catch (err: any) {
      showToast(err.message || 'Failed to replan', 'error');
    } finally {
      setUi(prev => ({ ...prev, actionLoading: false }));
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
      setUi(prev => ({ ...prev, logLoading: true }));
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
      showToast(`Logged status for today (${status.current_day})!`, 'success');
      // Update status directly with the fresh data from the backend
      setStatus(updatedStatus);

      // RESET dinner states upon successful log
      setDinnerState({
        showAlternatives: false,
        selectedAlternative: null,
        otherMealText: '',
        selectedFreezerMeal: '',
        isEditing: false,
        editInput: ''
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to log meal', 'error');
    } finally {
      setUi(prev => ({ ...prev, logLoading: false }));
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
      setUi(prev => ({ ...prev, logLoading: true }));
      const feedbackValue = overrideText || (made ? emoji : 'Skipped');

      const updatedStatus = await logMeal({
        week: status.week_of,
        day: status.current_day,
        [`${feedbackType}_made`]: made,
        [`${feedbackType}_feedback`]: feedbackValue,
        [`${feedbackType}_needs_fix`]: needsFix,
        request_recipe: requestRecipe
      });

      showToast(`Logged ${feedbackType.replace(/_/g, ' ')} feedback!`, 'success');
      // Update status directly with the fresh data
      setStatus(updatedStatus);
    } catch (err: any) {
      showToast(err.message || 'Failed to log feedback', 'error');
    } finally {
      setUi(prev => ({ ...prev, logLoading: false }));
    }
  }

  const getDisplayName = (planned: string, actual?: string) => {
    if (!actual) return planned;
    const isEmoji = ['❤️', '👍', '😐', '👎', '❌'].some(emoji => actual.includes(emoji));
    if (isEmoji || actual === 'Skipped') return planned;
    return actual;
  };

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
        {status && <NightlyCheckinBanner status={status} />}
        {status && <RecipeCaptureBanner status={status} onRefresh={() => fetchStatus(false, selectedWeek || undefined)} />}
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Status Card */}
        <section className="card">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
            System Status
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-tighter text-[var(--text-muted)]">Current Week</p>
              <select
                value={status?.week_of}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-transparent text-xl font-bold border-none p-0 cursor-pointer focus:ring-1 focus:ring-[var(--accent-sage)] rounded hover:bg-[var(--bg-secondary)] pr-8"
              >
                {status?.available_weeks?.map(w => (
                  <option
                    key={w.week_of}
                    value={w.week_of}
                    disabled={!w.is_selectable}
                    className="bg-white text-black"
                  >
                    {w.week_of} {w.status === 'archived' ? ' (Archived)' : w.status === 'planning' ? ' (Planning)' : w.status === 'not_created' ? ' (Not Started)' : ''}
                    {!w.is_selectable && ' (Locked)'}
                  </option>
                ))}
              </select>
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
                href={selectedWeek ? `/week-view?week=${selectedWeek}` : "/week-view"}
                className="btn-primary w-full text-left flex justify-between items-center group"
              >
                <span>View Full Week Plan</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </Link>
            )}
            {/* Show "Planning Wizard" for any week not yet active/complete */}
            {(status?.state === 'new_week' || status?.state === 'archived' || status?.state === 'awaiting_farmers_market' || status?.state === 'ready_to_plan') && (
              <Link
                href={selectedWeek ? `/plan?week=${selectedWeek}` : "/plan"}
                className="btn-primary w-full text-left flex justify-between items-center group"
              >
                <span>{status?.state === 'new_week' || status?.state === 'archived' ? 'Start New Week' : 'Continue Planning Wizard'}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </Link>
            )}
            {/* Show "Generate Weekly Plan" only when ready to plan */}
            {status?.state === 'ready_to_plan' && (
              <button
                onClick={handleGeneratePlan}
                disabled={ui.actionLoading}
                className="btn-primary w-full text-left flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{ui.actionLoading ? 'Generating...' : 'Generate Weekly Plan'}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
            )}

            {(status?.state === 'active' || status?.state === 'waiting_for_checkin') && (
              <button
                onClick={handleReplan}
                disabled={ui.actionLoading}
                className="btn-primary w-full text-left flex justify-between items-center group disabled:opacity-50"
              >
                <span>{ui.actionLoading ? 'Replanning...' : 'Replan Rest of Week'}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">🔄</span>
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



        {/* Today's Schedule (Show when plan is active or waiting for check-in) */}
        {(status?.state === 'active' || status?.state === 'waiting_for_checkin') && (
          <section id="today-schedule" className="md:col-span-2 mt-8 p-6 rounded-lg">
            <header className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">
                Today's Schedule: {status?.current_day?.toUpperCase()}
              </h2>
              <div className="flex gap-2">
                <span className="text-xs font-mono px-2 py-1 bg-[var(--bg-secondary)] rounded border border-[var(--border-subtle)] text-[var(--accent-sage)] uppercase">
                  ACTIVE PLAN
                </span>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
                  logLoading={ui.logLoading}
                  recipes={recipes}
                  onLogFeedback={handleLogFeedback}
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
                  logLoading={ui.logLoading}
                  recipes={recipes}
                  onLogFeedback={handleLogFeedback}
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
                  logLoading={ui.logLoading}
                  recipes={recipes}
                  onLogFeedback={handleLogFeedback}
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
                  logLoading={ui.logLoading}
                  recipes={recipes}
                  onLogFeedback={handleLogFeedback}
                />}
              />

              {/* Dinner */}
              <Card
                title="Dinner"
                icon="🍽️"
                content={getDisplayName(status?.today_dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Nothing planned', status?.today_dinner?.actual_meal)}
                subtitle={status?.today_dinner?.vegetables ? `Veggies: ${status.today_dinner.vegetables.join(', ')}` : undefined}
                isConfirmed={status?.today_dinner?.made !== undefined}
                badge={status?.today_dinner?.made !== undefined ? (
                  status.today_dinner.made === true ? (status.today_dinner.actual_meal ? `✓ Made (${status.today_dinner.actual_meal})` : '✓ Made') :
                    status.today_dinner.made === 'freezer_backup' ? '🧊 Freezer' :
                      status.today_dinner.made === 'outside_meal' ? '🍽️ Restaurant' :
                        status.today_dinner.actual_meal ? `✗ ${status.today_dinner.actual_meal}` :
                          '✗ Skipped'
                ) : undefined}
                action={<DinnerLogging
                  status={status}
                  logLoading={ui.logLoading}
                  showAlternatives={dinnerState.showAlternatives}
                  setShowAlternatives={(val) => setDinnerState(prev => ({ ...prev, showAlternatives: val }))}
                  selectedAlternative={dinnerState.selectedAlternative}
                  setSelectedAlternative={(val) => setDinnerState(prev => ({ ...prev, selectedAlternative: val }))}
                  otherMealText={dinnerState.otherMealText}
                  setOtherMealText={(val) => setDinnerState(prev => ({ ...prev, otherMealText: val }))}
                  selectedFreezerMeal={dinnerState.selectedFreezerMeal}
                  setSelectedFreezerMeal={(val) => setDinnerState(prev => ({ ...prev, selectedFreezerMeal: val }))}
                  isDinnerEditing={dinnerState.isEditing}
                  setIsDinnerEditing={(val) => setDinnerState(prev => ({ ...prev, isEditing: val }))}
                  dinnerEditInput={dinnerState.editInput}
                  setDinnerEditInput={(val) => setDinnerState(prev => ({ ...prev, editInput: val }))}
                  recipes={recipes}
                  onLogDay={handleLogDay}
                />}
              />
            </div>

            {/* Persistent Prep Tasks */}
            <div className="card bg-[var(--bg-secondary)] border-none shadow-none">
              <header className="flex items-center gap-2 mb-4 border-b border-[var(--border-subtle)] pb-2">
                <span className="text-xl">⏱️</span>
                <h3 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">Prep Workflow</h3>
              </header>
              {status?.today?.prep_tasks ? (
                <PrepTaskList
                  tasks={status.today.prep_tasks}
                  weekOf={status.week_of}
                  onUpdate={fetchStatus}
                />
              ) : (
                <p className="text-sm text-[var(--text-muted)] italic">No prep tasks found for this week.</p>
              )}
            </div>
          </section>
        )}

        {/* Next Steps / Farmers Market Prompt */}
        {!(status?.state === 'active' || status?.state === 'waiting_for_checkin') && status?.state !== 'archived' && (
          <section className="card md:col-span-2">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] mb-4">
              {status?.state === 'awaiting_farmers_market' || status?.state === 'ready_to_plan' ? 'Action Required' : 'Next Steps'}
            </h2>
            <div className={`p-4 bg-[var(--bg-secondary)] border-l-4 ${status?.state === 'awaiting_farmers_market' || status?.state === 'ready_to_plan' ? 'border-[var(--accent-sage)]' : 'border-[var(--accent-terracotta)]'}`}>
              {status?.state === 'ready_to_plan' ? (
                <div>
                  <p>✓ Your planning steps are underway. <Link href={`/plan?week=${status.week_of}`} className="text-[var(--accent-sage)] underline font-bold">Return to the Wizard</Link> to generate your week plan!</p>
                  {status.week_data?.wizard_state && <DraftPlanSummary wizardState={status.week_data.wizard_state} />}
                </div>
              ) : status?.state === 'awaiting_farmers_market' ? (
                <div>
                  <p>Time to start your week! Use the <Link href={`/plan?week=${status.week_of}`} className="text-[var(--accent-sage)] underline font-bold">Planning Wizard</Link> to review history, check inventory, and log your market veggies.</p>
                  {status.week_data?.wizard_state && <DraftPlanSummary wizardState={status.week_data.wizard_state} />}
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
        <div className="flex gap-4 items-center">
          <Link href="#" className="hover:text-[var(--accent-green)] underline underline-offset-4">History</Link>
          <Link href="/recipes" className="hover:text-[var(--accent-green)] underline underline-offset-4">Recipes</Link>
          <form action={logout}>
            <button type="submit" className="hover:text-[var(--accent-terracotta)] underline underline-offset-4">
              Sign Out
            </button>
          </form>
        </div>
      </footer>
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="animate-pulse font-mono text-[var(--text-muted)]">LOADING DASHBOARD...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
