'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getStatus, getRecipes, WorkflowStatus, replan, swapMeals, logMeal, getInventory, getRecipeContent } from '@/lib/api';
import { transformInventory } from '@/lib/inventoryManager';
import { InventoryItem } from '@/types';
import AppLayout from '@/components/AppLayout';
import { useToast } from '@/context/ToastContext';
import MealCorrectionInput from '@/components/MealCorrectionInput';
import ReplacementModal from '@/components/ReplacementModal';
import SwapConfirmationModal from '@/components/SwapConfirmationModal';
import ReplanWorkflowModal from '@/components/ReplanWorkflowModal';
import StepByStepCooking from '@/components/StepByStepCooking';
import { ChefHat } from 'lucide-react';
import { MobileDayCard } from './components/MobileDayCard';
import { WeekViewTable } from './components/WeekViewTable';
import { SelectionCheckbox } from './components/SelectionCheckbox';
import { WeekNavigation } from './components/WeekNavigation';

function WeekViewContent() {
  const searchParams = useSearchParams();
  const weekParam = searchParams.get('week');

  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<{ id: string; name: string }[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ day: string; type: string; label: string; value: string }[]>([]);
  const [viewState, setViewState] = useState({
    editMode: false,
    isFixing: false,
    showReplanModal: false,
    isSwapMode: false,
    swapSelection: [] as string[],
    isSwapping: false,
    replacementModal: {
      isOpen: false,
      day: '',
      currentMeal: '',
      type: 'dinner'
    }
  });
  const [leftoverInventory, setLeftoverInventory] = useState<InventoryItem[]>([]);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [focusRecipe, setFocusRecipe] = useState<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchWeekData() {
      try {
        setLoading(true);
        const data = await getStatus(weekParam || undefined);
        setStatus(data);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to fetch week data', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchWeekData();
  }, [weekParam, showToast]);

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
        showToast(err instanceof Error ? err.message : 'Failed to load recipes', 'error');
      }
    }
    loadRecipes();
  }, [showToast]);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const data = await getInventory();
        const processedInventory = transformInventory(data);
        if (processedInventory.meals) {
          setLeftoverInventory(processedInventory.meals);
        }
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
      }
    }
    fetchInventory();
  }, []);

  const handleOpenFocusMode = async (recipeId: string, recipeName: string) => {
    try {
      showToast('Loading recipe details...', 'info');
      const content = await getRecipeContent(recipeId);

      // Normalize instructions
      let instructions = content.instructions;
      if (typeof instructions === 'string') {
        instructions = instructions.split('\n').filter((l: string) => l.trim().length > 0);
      }

      setFocusRecipe({
        name: content.name || recipeName,
        ingredients: content.ingredients || [],
        prepSteps: [],
        instructions: instructions || []
      });
      setFocusModeOpen(true);
    } catch (err) {
      showToast('Failed to load recipe details.', 'error');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--bg-primary)]">
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
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getSlot = (day: string, type: string) => {
    return status?.slots?.[`${day}_${type}`];
  };

  const getMealName = (slot: any, fallback: string = 'Not planned') => {
    if (!slot) return fallback;
    const resolved = slot.resolved;
    if (!resolved) return fallback;

    // Check for actual execution first
    if (resolved.actual_meal) return resolved.actual_meal;

    // Fallback to recipe ID/name
    const ids = resolved.recipe_ids || (resolved.recipe_id ? [resolved.recipe_id] : []);
    const name = resolved.name || resolved.recipe_name;

    if (ids.length > 0) {
      return ids.map((id: string) => id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())).join(' + ');
    }

    if (!name) return fallback;

    return name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  const getSlotStatus = (slot: any) => {
    if (!slot) return null;
    return {
      made: slot.actual?.made,
      needs_fix: slot.actual?.needs_fix,
      feedback: slot.actual?.kids_feedback || slot.actual?.school_snack || slot.actual?.home_snack || slot.actual?.kids_lunch || slot.actual?.adult_lunch
      // Note: feedback field name varies by type in 'actual' object from daily_feedback map
    };
  };

  const stats = Object.values(status?.slots || {}).reduce((acc, slot: any) => {
    const made = slot.actual?.made;
    if (made === true) acc.followed++;
    else if (made === 'outside_meal') acc.ateOut++;
    else if (made === false) acc.skipped++;
    else if (made === 'freezer_backup') acc.backup++;
    else if (made === 'leftovers') acc.leftovers++;
    return acc;
  }, { followed: 0, ateOut: 0, skipped: 0, backup: 0, leftovers: 0 });

  const getDisplayName = (planned: string, actual?: string) => {
    if (!actual) return planned;
    const isEmoji = ['❤️', '👍', '😐', '👎', '❌'].some(emoji => actual.includes(emoji));
    if (isEmoji || actual === 'Skipped') return planned;
    return actual;
  };

  const getFeedbackBadge = (feedback?: string, made?: boolean | string, needsFix?: boolean) => {
    if (needsFix) return <span className="text-xs text-red-600 font-bold px-2 py-0.5 bg-red-50 rounded border border-red-200">Needs Fix</span>;
    if (made === false) return null;

    const emojis = ['❤️', '👍', '😐', '👎', '❌'];
    const emojiMatch = feedback && emojis.find(e => feedback.includes(e));
    if (emojiMatch) return <span className="text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-200 shadow-sm">{emojiMatch}</span>;

    return null;
  };

  const toggleSelection = (day: string, type: string, label: string, value: string) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.day === day && i.type === type);
      if (exists) {
        return prev.filter(i => !(i.day === day && i.type === type));
      } else {
        return [...prev, { day, type, label, value }];
      }
    });
  };

  const handleCorrectionSave = async (day: string, type: string, value: string, requestRecipe: boolean = false) => {
    if (!status?.week_of) return;

    try {
      const data = await logMeal({
        week: status.week_of,
        day,
        request_recipe: requestRecipe,
        ...(type === 'dinner'
          ? { actual_meal: value, dinner_needs_fix: false }
          : { [`${type}_feedback`]: value, [`${type}_needs_fix`]: false })
      });

      if (data.week_of) {
        setStatus(data as WorkflowStatus);
      } else {
        const newData = await getStatus(status.week_of);
        setStatus(newData);
      }

      // Remove from selection if it was there
      setSelectedItems(prev => prev.filter(i => !(i.day === day && i.type === type)));
      showToast("Correction saved successfully", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save correction", "error");
    }
  };

  const handleReplan = async () => {
    setViewState(prev => ({ ...prev, showReplanModal: true }));
  };

  const handleDayClick = (day: string) => {
    if (!viewState.isSwapMode) return;

    if (viewState.swapSelection.includes(day)) {
      setViewState(prev => ({
        ...prev,
        swapSelection: prev.swapSelection.filter(d => d !== day)
      }));
    } else {
      if (viewState.swapSelection.length < 2) {
        setViewState(prev => ({
          ...prev,
          swapSelection: [...prev.swapSelection, day]
        }));
      }
    }
  };

  const handleSwapConfirm = async () => {
    if (viewState.swapSelection.length !== 2 || !status?.week_of) return;

    try {
      setViewState(prev => ({ ...prev, isSwapping: true }));
      await swapMeals(status.week_of, viewState.swapSelection[0], viewState.swapSelection[1]);
      const data = await getStatus();
      setStatus(data);
      setViewState(prev => ({ ...prev, swapSelection: [], isSwapMode: false }));
      showToast("Meals swapped successfully", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Swap failed", "error");
      setViewState(prev => ({ ...prev, swapSelection: [] }));
    } finally {
      setViewState(prev => ({ ...prev, isSwapping: false }));
    }
  };

  const handleReplacementConfirm = async (newMeal: string, requestRecipe: boolean = false, madeStatus: boolean | string = true) => {
    const { day, type } = viewState.replacementModal;
    console.log('[WeekView] handleReplacementConfirm triggered. Full State:', {
      modalState: viewState.replacementModal,
      weekStatus: status?.week_of
    });

    if (!day || !status?.week_of) {
      console.error('[WeekView] Missing data:', {
        day: String(day),
        week: String(status?.week_of),
        isOpen: viewState.replacementModal.isOpen
      });
      showToast("Error: Missing session data. Please refresh.", "error");
      return;
    }

    const payload: any = {
      week: status.week_of,
      day,
      request_recipe: requestRecipe
    };

    if (type === 'dinner') {
      payload.actual_meal = newMeal;
      payload.dinner_needs_fix = false;
      payload.made = madeStatus;
    } else {
      payload[`${type}_feedback`] = newMeal;
      payload[`${type}_needs_fix`] = false;
      payload[`${type}_made`] = madeStatus;
    }

    try {
      const data = await logMeal(payload);

      if (data.week_of) {
        setStatus(data as WorkflowStatus);
      } else {
        const newData = await getStatus(status.week_of);
        setStatus(newData);
      }

      setViewState(prev => ({ ...prev, replacementModal: { isOpen: false, day: '', currentMeal: '', type: 'dinner' } }));
      showToast("Meal replaced successfully", "success");
    } catch (e: any) {
      console.error('[WeekView Error] Replacement failed:', e);

      // Extract detailed error info if available
      const message = e.message || "Replacement failed";

      // Log full details for debugging
      if (e.code) console.error(`[Error Code] ${e.code}`);
      if (e.details) console.debug(`[Error Details]`, e.details);

      showToast(message, "error");
    }
  };

  if (viewState.isFixing) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8">
            <button
              onClick={() => setViewState(prev => ({ ...prev, isFixing: false }))}
              className="text-sm text-[var(--accent-sage)] hover:underline mb-4 flex items-center gap-1"
            >
              ← Back to Week View
            </button>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Editing {selectedItems.length} Meals</h1>
            <p className="text-[var(--text-muted)]">Update the details below to correct the meal logs.</p>
          </header>

          <div className="space-y-8">
            {selectedItems.map((item, idx) => (
              <div key={`${item.day}-${item.type}`} className="card bg-white shadow-sm border border-[var(--border-subtle)] overflow-hidden">
                <div className="bg-[var(--bg-secondary)] px-4 py-2 border-b border-[var(--border-subtle)] flex justify-between items-center">
                  <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    {dayNames[days.indexOf(item.day)]} • {item.label}
                  </span>
                  <button
                    onClick={() => setSelectedItems(prev => prev.filter(i => !(i.day === item.day && i.type === item.type)))}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove from queue
                  </button>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    <span className="text-xs text-[var(--text-muted)] block mb-1">Current logged value:</span>
                    <span className="text-sm font-medium">{item.value || 'None'}</span>
                  </div>
                  <MealCorrectionInput
                    recipes={recipes}
                    onSave={(val, req) => handleCorrectionSave(item.day, item.type, val, req)}
                    onCancel={() => { }}
                    placeholder={`What was actually for ${item.label.toLowerCase()}?`}
                    existingValue={item.value}
                  />
                </div>
              </div>
            ))}

            {selectedItems.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-[var(--text-muted)]">All items fixed! Returning to week view...</p>
                <button
                  onClick={async () => {
                    const data = await getStatus();
                    setStatus(data);
                    setViewState(prev => ({ ...prev, isFixing: false }));
                  }}
                  className="mt-4 btn-secondary"
                >
                  Return Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8 pb-32">
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
              {(status.week_of || weekData.week_of) && (
                <p className="text-[var(--text-muted)] font-mono text-sm uppercase">
                  WEEK OF {(status.week_of || weekData.week_of || '').toUpperCase()}
                </p>
              )}
              <WeekNavigation
                currentWeek={status.week_of || weekData.week_of || ''}
                availableWeeks={status.available_weeks || []}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReplan}
                className="btn-primary flex items-center gap-2"
                title="Reorganize remaining meals based on current inventory"
              >
                <>
                  <span>📦</span>
                  <span className="hidden sm:inline">Replan with Inventory</span>
                </>
              </button>
              <button
                onClick={() => {
                  setViewState(prev => ({
                    ...prev,
                    isSwapMode: !prev.isSwapMode,
                    swapSelection: prev.isSwapMode ? [] : prev.swapSelection,
                    editMode: false // Exclusive modes
                  }));
                }}
                className={`btn-secondary flex items-center gap-2 ${viewState.isSwapMode ? 'bg-[var(--accent-sage)] text-white border-[var(--accent-sage)]' : ''}`}
              >
                {viewState.isSwapMode ? (
                  <>
                    <span>✕</span>
                    <span className="hidden sm:inline">Cancel Swap</span>
                  </>
                ) : (
                  <>
                    <span>⇄</span>
                    <span className="hidden sm:inline">Swap Meals</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  // BUG-007 FIX: Clear selected items when EXITING edit mode.
                  // We must check prev.editMode (the value BEFORE toggle) to know if we're exiting.
                  setViewState(prev => {
                    if (prev.editMode) {
                      // We're exiting edit mode - clear selections
                      setSelectedItems([]);
                    }
                    return {
                      ...prev,
                      editMode: !prev.editMode,
                      isSwapMode: false // Exclusive modes
                    };
                  });
                }}
                className={`btn-secondary flex items-center gap-2 ${viewState.editMode ? 'bg-amber-50 border-amber-200 text-amber-900' : ''}`}
              >
                {viewState.editMode ? (
                  <>
                    <span>✓</span>
                    <span className="hidden sm:inline">Done</span>
                  </>
                ) : (
                  <>
                    <span>✎</span>
                    <span className="hidden sm:inline">Edit</span>
                  </>
                )}
              </button>
              {weekData.plan_url && (
                <a
                  href={weekData.plan_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary hidden md:inline-flex items-center gap-2"
                >
                  <span>View Full Plan</span>
                  <span>↗</span>
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Floating Action Bar for Selections */}
        {
          selectedItems.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
              <div className="bg-gray-900 text-white rounded-full shadow-2xl p-2 pl-6 flex items-center justify-between animate-in slide-in-from-bottom-4 fade-in">
                <span className="font-medium text-sm">
                  {selectedItems.length} meal{selectedItems.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setViewState(prev => ({ ...prev, isFixing: true }))}
                  className="bg-[var(--accent-sage)] text-white px-6 py-2 rounded-full text-sm font-bold hover:scale-105 transition-transform"
                >
                  Edit Now
                </button>
              </div>
            </div>
          )
        }

        {/* Swap Modal */}
        {
          viewState.swapSelection.length === 2 && (
            <SwapConfirmationModal
              day1={viewState.swapSelection[0]}
              day2={viewState.swapSelection[1]}
              onConfirm={handleSwapConfirm}
              onCancel={() => setViewState(prev => ({ ...prev, swapSelection: [] }))}
              isLoading={viewState.isSwapping}
            />
          )
        }

        {/* Replacement Modal */}
        {
          viewState.replacementModal.isOpen && (
            <ReplacementModal
              day={viewState.replacementModal.day}
              currentMeal={viewState.replacementModal.currentMeal}
              recipes={recipes}
              leftoverInventory={leftoverInventory}
              onConfirm={handleReplacementConfirm}
              onCancel={() => setViewState(prev => ({ ...prev, replacementModal: { isOpen: false, day: '', currentMeal: '', type: 'dinner' } }))}
            />
          )
        }

        {/* Replan Workflow Modal */}
        {viewState.showReplanModal && status && (
          <ReplanWorkflowModal
            status={status}
            recipes={recipes}
            onComplete={async () => {
              setViewState(prev => ({ ...prev, showReplanModal: false }));
              const data = await getStatus();
              setStatus(data);
            }}
            onCancel={() => setViewState(prev => ({ ...prev, showReplanModal: false }))}
          />
        )}

        {focusModeOpen && focusRecipe && (
          <StepByStepCooking
            recipe={focusRecipe}
            onClose={() => setFocusModeOpen(false)}
          />
        )}

        {/* Mobile: Card view */}
        <div className="md:hidden space-y-4">
          {days.map((day, idx) => (
            <MobileDayCard
              key={day}
              day={day}
              dayName={dayNames[idx]}
              isToday={status?.current_day === day}
              status={status}
              viewState={viewState}
              setViewState={setViewState}
              selectedItems={selectedItems}
              toggleSelection={toggleSelection}
              getSlot={getSlot}
              handleDayClick={handleDayClick}
              getMealName={getMealName}
              getFeedbackBadge={getFeedbackBadge}
              handleOpenFocusMode={handleOpenFocusMode}
            />
          ))}
        </div>

        {/* Desktop: Table view */}
        <WeekViewTable
          days={days}
          dayNames={dayNames}
          status={status}
          viewState={viewState}
          setViewState={setViewState}
          selectedItems={selectedItems}
          toggleSelection={toggleSelection}
          getSlot={getSlot}
          handleDayClick={handleDayClick}
          getMealName={getMealName}
          getFeedbackBadge={getFeedbackBadge}
          handleOpenFocusMode={handleOpenFocusMode}
        />

        {/* Weekly Stats Summary */}
        <section className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <div className="card p-4 bg-[var(--status-followed)] border-[var(--status-followed-text)]/20 flex flex-col items-center text-center shadow-md">
            <span className="text-2xl mb-1">✅</span>
            <span className="text-2xl font-black text-[var(--status-followed-text)]">{stats.followed}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--status-followed-text)] opacity-70">Followed Plan</span>
          </div>
          <div className="card p-4 bg-[var(--status-ate-out)] border-[var(--status-ate-out-text)]/20 flex flex-col items-center text-center shadow-md">
            <span className="text-2xl mb-1">🍽️</span>
            <span className="text-2xl font-black text-[var(--status-ate-out-text)]">{stats.ateOut}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--status-ate-out-text)] opacity-70">Ate Out</span>
          </div>
          <div className="card p-4 bg-[var(--status-skipped)] border-[var(--status-skipped-text)]/20 flex flex-col items-center text-center shadow-md">
            <span className="text-2xl mb-1">🏃‍♂️</span>
            <span className="text-2xl font-black text-[var(--status-skipped-text)]">{stats.skipped}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--status-skipped-text)] opacity-70">Skipped</span>
          </div>
          <div className="card p-4 bg-[var(--status-backup)] border-[var(--status-backup-text)]/20 flex flex-col items-center text-center shadow-md">
            <span className="text-2xl mb-1">🧊</span>
            <span className="text-2xl font-black text-[var(--status-backup-text)]">{stats.backup}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--status-backup-text)] opacity-70">Backup Used</span>
          </div>
          <div className="card p-4 bg-[var(--status-leftovers)] border-[var(--status-leftovers-text)]/20 flex flex-col items-center text-center shadow-md">
            <span className="text-2xl mb-1">🥗</span>
            <span className="text-2xl font-black text-[var(--status-leftovers-text)]">{stats.leftovers}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--status-leftovers-text)] opacity-70">Leftovers</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function WeekView() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <p className="text-[var(--text-muted)] font-mono animate-pulse">LOADING WEEK VIEW...</p>
        </div>
      }>
        <WeekViewContent />
      </Suspense>
    </AppLayout>
  );
}
