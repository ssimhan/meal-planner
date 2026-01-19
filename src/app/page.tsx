'use client';

import Link from 'next/link';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getStatus, getInventory, generatePlan, createWeek, confirmVeg, logMeal, getRecipes, replan, WorkflowStatus, getRecipeContent } from '@/lib/api';
import { transformInventory } from '@/lib/inventoryManager';
import type { RecipeListItem, WorkflowStatus as WorkflowStatusType, InventoryResponse } from '@/types';
import AppLayout from '@/components/AppLayout';
import Skeleton from '@/components/Skeleton';
import Card from '@/components/Card';
import FeedbackButtons from '@/components/FeedbackButtons';
import PrepTaskList from '@/components/PrepTaskList';
import NightlyCheckinBanner from '@/components/NightlyCheckinBanner';
import ResumePlanningBanner from '@/components/ResumePlanningBanner';
import PendingRecipesIndicator from '@/components/PendingRecipesIndicator';
import PendingRecipesListModal from '@/components/PendingRecipesListModal';
import BrainDump from '@/components/dashboard/BrainDump';
import StatCard from '@/components/dashboard/StatCard';
import TimelineView from '@/components/dashboard/TimelineView';
import MealLogFlow from '@/components/MealLogFlow';
import { useToast } from '@/context/ToastContext';
import { logout } from './login/actions';
import StepByStepCooking from '@/components/StepByStepCooking';
import { ChefHat } from 'lucide-react';

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
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
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
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [loggingModalOpen, setLoggingModalOpen] = useState(false);
  const [loggingModalData, setLoggingModalData] = useState<any>(null);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [focusRecipe, setFocusRecipe] = useState<any>(null);

  // Synchronize state with URL param
  useEffect(() => {
    if (weekParam && weekParam !== selectedWeek) {
      setSelectedWeek(weekParam);
    }
  }, [weekParam]);

  // Dinner Logging State consolidated
  const [dinnerState, setDinnerState] = useState({
    showAlternatives: false,
    selectedAlternative: null as 'freezer' | 'outside' | 'other' | 'leftovers' | null,
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
      const [data, inventoryData] = await Promise.all([
        getStatus(week),
        getInventory()
      ]);
      setStatus(data);
      const processedInventory = transformInventory(inventoryData);
      setInventory(processedInventory);

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

  const handleOpenLoggingModal = (data: any) => {
    setLoggingModalData(data);
    setLoggingModalOpen(true);
  };

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
      setStatus(updatedStatus);
    } catch (err: any) {
      showToast(err.message || 'Failed to log feedback', 'error');
    } finally {
      setUi(prev => ({ ...prev, logLoading: false }));
    }
  }

  async function handleConfirmToday() {
    if (!status?.week_of || !status?.current_day) return;

    try {
      setUi(prev => ({ ...prev, logLoading: true }));
      const updatedStatus = await logMeal({
        week: status.week_of,
        day: status.current_day,
        confirm_day: true
      });
      showToast(`Confirmed all meals for today!`, 'success');
      setStatus(updatedStatus);
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm today', 'error');
    } finally {
      setUi(prev => ({ ...prev, logLoading: false }));
    }
  }

  const handleOpenFocusMode = async (recipeId: string, recipeName: string) => {
    try {
      setUi(prev => ({ ...prev, actionLoading: true }));
      const content = await getRecipeContent(recipeId);

      // Normalize instructions if they are a single string
      let instructions = content.instructions;
      if (typeof instructions === 'string') {
        instructions = instructions.split('\n').filter((l: string) => l.trim().length > 0);
      }

      setFocusRecipe({
        name: content.name || recipeName,
        ingredients: content.ingredients || [],
        prepSteps: [], // Could be extracted if available
        instructions: instructions || []
      });
      setFocusModeOpen(true);
    } catch (err) {
      showToast('Failed to load recipe details.', 'error');
      console.error(err);
    } finally {
      setUi(prev => ({ ...prev, actionLoading: false }));
    }
  };

  const getDisplayName = (planned: string, actual?: string) => {
    if (!actual) return planned;
    const isEmoji = ['❤️', '👍', '😐', '👎', '❌'].some(emoji => actual.includes(emoji));
    if (isEmoji || actual === 'Skipped') return planned;
    return actual;
  };

  if (loading && !status) {
    return (
      <AppLayout>
        <div className="container mx-auto max-w-4xl">
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
        </div>
      </AppLayout>
    );
  }

  // Construct Timeline Data
  const timelineItems: any[] = [];
  if (status?.today) {
    const commonLogSuccess = () => {
      fetchStatus(false, selectedWeek || undefined);
      setLoggingModalOpen(false);
    };

    const commonLogClose = () => setLoggingModalOpen(false);

    // Helper for generating logging props
    const getLogProps = (type: string, name: string, initial: any) => ({
      weekOf: status.week_of,
      day: status.current_day,
      mealName: name,
      logType: type,
      initialStatus: initial,
      freezerInventory: inventory?.meals?.filter((m: any) => m.location === 'freezer') || [],
      leftoverInventory: inventory?.meals?.filter((m: any) => m.location === 'fridge') || [],
      recipes: recipes,
      onSuccess: commonLogSuccess,
      onClose: commonLogClose,
      isModal: true
    });

    const isLoggingEnabled = status.state === 'active' || status.state === 'waiting_for_checkin';

    // School Snack
    const schoolSnackProps = getLogProps('school_snack', status.today_snacks?.school || "Fruit", status.today_snacks);
    timelineItems.push({
      title: "School Snack",
      icon: "🎒",
      description: getDisplayName(status.today_snacks?.school || "Fruit", status.today_snacks?.school_snack_feedback),
      status: status.today_snacks?.school_snack_made !== undefined ? (status.today_snacks?.school_snack_made ? 'done' : 'skipped') : undefined,
      logFlowProps: isLoggingEnabled ? schoolSnackProps : undefined,
      onAction: () => isLoggingEnabled && handleOpenLoggingModal(schoolSnackProps),
      feedbackProps: {
        feedbackType: "school_snack",
        currentFeedback: status.today_snacks?.school_snack_feedback,
        madeStatus: status.today_snacks?.school_snack_made,
        mealName: status.today_snacks?.school || "Fruit",
        logLoading: ui.logLoading,
        recipes: recipes,
        onLogFeedback: handleLogFeedback
      }
    });

    // Kids Lunch
    const kidsLunchProps = getLogProps('kids_lunch', status.today_lunch?.recipe_name || "Leftovers", status.today_lunch);
    timelineItems.push({
      title: "Kids Lunch",
      icon: "🥪",
      description: getDisplayName(status.today_lunch?.recipe_name || "Leftovers", status.today_lunch?.kids_lunch_feedback),
      status: status.today_lunch?.kids_lunch_made !== undefined ? (status.today_lunch?.kids_lunch_made ? 'done' : 'skipped') : undefined,
      logFlowProps: isLoggingEnabled ? kidsLunchProps : undefined,
      onAction: () => isLoggingEnabled && handleOpenLoggingModal(kidsLunchProps),
      onFocus: status.today_lunch?.recipe_id ? () => handleOpenFocusMode(status.today_lunch!.recipe_id!, status.today_lunch!.recipe_name || "Kids Lunch") : undefined,
      feedbackProps: {
        feedbackType: "kids_lunch",
        currentFeedback: status.today_lunch?.kids_lunch_feedback,
        madeStatus: status.today_lunch?.kids_lunch_made,
        mealName: status.today_lunch?.recipe_name || "Leftovers",
        logLoading: ui.logLoading,
        recipes: recipes,
        onLogFeedback: handleLogFeedback
      }
    });

    // Adult Lunch
    const adultLunchProps = getLogProps('adult_lunch', "Leftovers", status.today_lunch);
    timelineItems.push({
      title: "Adult Lunch",
      icon: "☕",
      description: getDisplayName("Leftovers", status.today_lunch?.adult_lunch_feedback),
      status: status.today_lunch?.adult_lunch_made !== undefined ? (status.today_lunch?.adult_lunch_made ? 'done' : 'skipped') : undefined,
      logFlowProps: isLoggingEnabled ? adultLunchProps : undefined,
      onAction: () => isLoggingEnabled && handleOpenLoggingModal(adultLunchProps),
      feedbackProps: {
        feedbackType: "adult_lunch",
        currentFeedback: status.today_lunch?.adult_lunch_feedback,
        madeStatus: status.today_lunch?.adult_lunch_made,
        mealName: "Leftovers",
        logLoading: ui.logLoading,
        recipes: recipes,
        onLogFeedback: handleLogFeedback
      }
    });

    // Home Snack
    const homeSnackProps = getLogProps('home_snack', status.today_snacks?.home || "Cucumber", status.today_snacks);
    timelineItems.push({
      title: "Home Snack",
      icon: "🏠",
      description: getDisplayName(status.today_snacks?.home || "Cucumber", status.today_snacks?.home_snack_feedback),
      status: status.today_snacks?.home_snack_made !== undefined ? (status.today_snacks?.home_snack_made ? 'done' : 'skipped') : undefined,
      logFlowProps: isLoggingEnabled ? homeSnackProps : undefined,
      onAction: () => isLoggingEnabled && handleOpenLoggingModal(homeSnackProps),
      feedbackProps: {
        feedbackType: "home_snack",
        currentFeedback: status.today_snacks?.home_snack_feedback,
        madeStatus: status.today_snacks?.home_snack_made,
        mealName: status.today_snacks?.home || "Cucumber",
        logLoading: ui.logLoading,
        recipes: recipes,
        onLogFeedback: handleLogFeedback
      }
    });

    // Dinner
    const dinnerName = getDisplayName(
      status.today_dinner?.recipe_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Nothing planned',
      status.today_dinner?.actual_meal
    );
    const dinnerProps = getLogProps('dinner', status.today_dinner?.recipe_id?.replace(/_/g, ' ') || 'Dinner', status.today_dinner);
    timelineItems.push({
      title: "Dinner",
      time: "6:30 PM",
      description: dinnerName,
      icon: "🍽️",
      status: status.today_dinner?.made !== undefined ? (status.today_dinner.made === true ? 'done' : 'skipped') : undefined,
      logFlowProps: isLoggingEnabled ? dinnerProps : undefined,
      onAction: () => isLoggingEnabled && handleOpenLoggingModal(dinnerProps),
      onFocus: status.today_dinner?.recipe_id ? () => handleOpenFocusMode(status.today_dinner!.recipe_id, status.today_dinner!.recipe_id.replace(/_/g, ' ')) : undefined
    });
  }

  return (

    <AppLayout>
      <div className="container mx-auto max-w-4xl px-4">
        <header className="mb-8 relative fade-in">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-5xl font-extrabold mb-2 tracking-tight">Kitchen Dashboard</h1>
              <p className="text-[var(--text-muted)] font-mono text-sm uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            {status?.pending_recipes && status.pending_recipes.length > 0 && (
              <PendingRecipesIndicator
                count={status.pending_recipes.length}
                onClick={() => setPendingModalOpen(true)}
              />
            )}
          </div>
          {status && <NightlyCheckinBanner status={status} />}
          {status && <ResumePlanningBanner status={status} />}


        </header>

        <div className="flex flex-col gap-8 slide-up">
          {/* Top Grid: Stat Cards and Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* 1. Dinner Card */}
            <StatCard label="Dinner Tonight" className="relative group transition-all duration-500 hover:ring-2 hover:ring-[var(--accent-primary)]/20">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xl font-bold text-[var(--text-primary)] line-clamp-2 pr-2">
                  {status?.today_dinner?.recipe_id ? getDisplayName(
                    status.today_dinner.recipe_id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                    status.today_dinner.actual_meal
                  ) : 'Nothing planned'}
                </div>
                {status?.today_dinner?.recipe_id && (
                  <button
                    onClick={() => status?.today_dinner?.recipe_id && handleOpenFocusMode(status.today_dinner.recipe_id, status.today_dinner.recipe_id.replace(/_/g, ' '))}
                    className="p-2 rounded-full bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20 hover:scale-110 active:scale-95 transition-all"
                    title="Start Focus Mode"
                  >
                    <ChefHat size={16} />
                  </button>
                )}
              </div>
              {status?.today_dinner && (
                <span className="inline-block text-[10px] px-2 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold">
                  {(status.today_dinner as any).tags?.[0] || 'MEAL'}
                </span>
              )}
            </StatCard>

            {/* 2. Prep Tasks */}
            <StatCard label="Prep Tasks">
              {(() => {
                const pendingTasks = (status?.today?.prep_tasks || []).filter((t: any) => t.status !== 'complete');
                return (
                  <>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-4xl font-black text-[var(--text-primary)]">
                        {pendingTasks.length}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-tighter">To-Do Today</span>
                    </div>
                    <ul className="text-xs text-[var(--text-muted)] space-y-1">
                      {pendingTasks.slice(0, 3).map((task: any, i: number) => (
                        <li key={i} className="truncate">• {task.task}</li>
                      ))}
                      {pendingTasks.length > 3 && <li>...</li>}
                    </ul>
                  </>
                );
              })()}
            </StatCard>

            {/* 3. System & Actions */}
            <StatCard label="System & Actions">
              <div className="mb-1">
                <select
                  value={status?.week_of}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] text-sm border border-[var(--border-color)] rounded-lg p-2 font-semibold shadow-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent outline-none"
                >
                  {status?.available_weeks?.map(w => (
                    <option key={w.week_of} value={w.week_of} disabled={!w.is_selectable}>
                      {w.week_of} {w.status === 'archived' ? '(Archived)' : w.status === 'planning' ? '(In Progress)' : w.status === 'active' ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </StatCard>
          </div>

          <BrainDump onAdd={(text) => {
            showToast(`Saved to brain dump: ${text}`, 'success');
            // Future: actually save this
          }} />

          {/* Timeline View (Primary Interaction Area) */}
          {(status?.state === 'active' || status?.state === 'waiting_for_checkin') && (
            <div id="today-schedule">
              <TimelineView items={timelineItems} />
            </div>
          )}

          {/* Persistent Prep Tasks */}
          {(status?.state === 'active' || status?.state === 'waiting_for_checkin') && (
            <div className="card glass border-none shadow-2xl">
              <header className="flex items-center gap-3 mb-6 border-b border-[var(--border-color)] pb-4">
                <span className="text-2xl">⏱️</span>
                <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Prep Workflow</h3>
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

        {/* Global Modals */}
        {status?.pending_recipes && (
          <PendingRecipesListModal
            isOpen={pendingModalOpen}
            onClose={() => setPendingModalOpen(false)}
            pendingRecipes={status.pending_recipes}
            onRefresh={() => fetchStatus(false, selectedWeek || undefined)}
          />
        )}

        {(loggingModalOpen && loggingModalData) && (
          <MealLogFlow
            {...loggingModalData}
            recipes={recipes}
          />
        )}

        {focusModeOpen && focusRecipe && (
          <StepByStepCooking
            recipe={focusRecipe}
            onClose={() => setFocusModeOpen(false)}
          />
        )}

      </div>
    </AppLayout>
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
