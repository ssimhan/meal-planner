'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getStatus, getRecipes, WorkflowStatus, replan, swapMeals, logMeal } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { useToast } from '@/context/ToastContext';
import MealCorrectionInput from '@/components/MealCorrectionInput';
import SwapConfirmationModal from '@/components/SwapConfirmationModal';
import ReplacementModal from '@/components/ReplacementModal';
import ReplanWorkflowModal from '@/components/ReplanWorkflowModal';

interface SelectionCheckboxProps {
  day: string;
  type: string;
  label: string;
  value: string;
  editMode: boolean;
  selectedItems: { day: string; type: string; label: string; value: string }[];
  toggleSelection: (day: string, type: string, label: string, value: string) => void;
}

const SelectionCheckbox = ({ day, type, label, value, editMode, selectedItems, toggleSelection }: SelectionCheckboxProps) => {
  if (!editMode) return null;
  const isSelected = !!selectedItems.find(i => i.day === day && i.type === type);
  return (
    <input
      type="checkbox"
      checked={isSelected}
      onChange={() => toggleSelection(day, type, label, value)}
      className="mr-3 h-5 w-5 text-[var(--accent-sage)] rounded border-gray-300 focus:ring-[var(--accent-sage)] cursor-pointer"
    />
  );
};

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
  }, [weekParam]);

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
  }, []);

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
    const name = resolved.recipe_id || resolved.name || resolved.recipe_name;
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
    if (!status?.week_data?.week_of) return;

    try {
      const data = await logMeal({
        week: status.week_data.week_of,
        day,
        request_recipe: requestRecipe,
        ...(type === 'dinner'
          ? { actual_meal: value, dinner_needs_fix: false }
          : { [`${type}_feedback`]: value, [`${type}_needs_fix`]: false })
      });

      if (data.week_of) {
        setStatus(data as WorkflowStatus);
      } else {
        const newData = await getStatus(status.week_data.week_of);
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
    if (viewState.swapSelection.length !== 2 || !status?.week_data?.week_of) return;

    try {
      setViewState(prev => ({ ...prev, isSwapping: true }));
      await swapMeals(status.week_data.week_of, viewState.swapSelection[0], viewState.swapSelection[1]);
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

  const handleReplacementConfirm = async (newMeal: string, requestRecipe: boolean = false) => {
    const { day, type } = viewState.replacementModal;
    if (!day || !status?.week_data?.week_of) return;

    const payload: any = {
      week: status.week_data.week_of,
      day,
      request_recipe: requestRecipe
    };

    if (type === 'dinner') {
      payload.actual_meal = newMeal;
      payload.dinner_needs_fix = false;
      payload.made = true; // Keep 'made' for dinner for backward compatibility
    } else {
      payload[`${type}_feedback`] = newMeal;
      payload[`${type}_needs_fix`] = false;
      payload[`${type}_made`] = true;
    }

    try {
      const data = await logMeal(payload);

      if (data.week_of) {
        setStatus(data as WorkflowStatus);
      } else {
        const newData = await getStatus(status.week_data.week_of);
        setStatus(newData);
      }

      setViewState(prev => ({ ...prev, replacementModal: { isOpen: false, day: '', currentMeal: '', type: 'dinner' } }));
      showToast("Meal replaced successfully", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Replacement failed", "error");
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
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Fixing {selectedItems.length} Meals</h1>
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
              {weekData.week_of && (
                <p className="text-[var(--text-muted)] font-mono text-sm uppercase">
                  WEEK OF {weekData.week_of.toUpperCase()}
                </p>
              )}
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
                  setViewState(prev => ({
                    ...prev,
                    editMode: !prev.editMode,
                    isSwapMode: false // Exclusive modes
                  }));
                  if (viewState.editMode) setSelectedItems([]);
                }}
                className={`btn-secondary flex items-center gap-2 ${viewState.editMode ? 'bg-amber-50 border-amber-200 text-amber-900' : ''}`}
              >
                {viewState.editMode ? (
                  <>
                    <span>✕</span>
                    <span className="hidden sm:inline">Cancel</span>
                  </>
                ) : (
                  <>
                    <span>✎</span>
                    <span className="hidden sm:inline">Mark for Fix</span>
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
                  Fix Now
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

        {/* Mobile: Card view */}
        <div className="md:hidden space-y-4">
          {days.map((day, idx) => {
            const dinnerSlot = getSlot(day, 'dinner');
            const kidsLunchSlot = getSlot(day, 'kids_lunch');
            const schoolSnackSlot = getSlot(day, 'school_snack');
            const homeSnackSlot = getSlot(day, 'home_snack');
            const adultLunchSlot = getSlot(day, 'adult_lunch');

            const isToday = status?.current_day === day;
            const todayIndex = days.indexOf(status?.current_day || '');
            const dayIndex = days.indexOf(day);
            const isPast = dayIndex < todayIndex;

            const getSlotBg = (slot: any) => {
              const made = slot?.actual?.made;
              if (made === true) return 'bg-green-50 border-green-100 shadow-sm';
              if (made === 'outside_meal') return 'bg-amber-50 border-amber-100 shadow-sm';
              if (made === 'freezer_backup') return 'bg-blue-50 border-blue-100 shadow-sm';
              if (made === 'leftovers') return 'bg-purple-50 border-purple-100 shadow-sm';
              if (made === false || (isPast && made === undefined)) return 'bg-red-50 border-red-100 shadow-sm';
              return 'bg-white border-transparent';
            };

            return (
              <div
                key={day}
                className={`card ${isToday ? 'border-2 border-[var(--accent-sage)] shadow-lg' : ''} ${viewState.editMode ? 'ring-2 ring-amber-100' : ''}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {dayNames[idx]}
                  </h3>
                  {isToday && (
                    <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 bg-[var(--accent-sage)] text-white rounded shadow-sm">
                      TODAY
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Dinner */}
                  <div className={`flex items-start p-2 rounded-lg border transition-all ${getSlotBg(dinnerSlot)}`}>
                    <SelectionCheckbox
                      day={day}
                      type="dinner"
                      label="Dinner"
                      value={dinnerSlot?.resolved?.actual_meal || ''}
                      editMode={viewState.editMode}
                      selectedItems={selectedItems}
                      toggleSelection={toggleSelection}
                    />
                    <div
                      className={`flex-1 ${viewState.isSwapMode ? 'cursor-pointer p-2 rounded border-2 transition-all user-select-none' : ''} ${viewState.swapSelection.includes(day)
                        ? 'border-[var(--accent-sage)] bg-green-50 shadow-md transform scale-[1.02]'
                        : viewState.isSwapMode
                          ? 'border-dashed border-gray-300 hover:border-[var(--accent-sage)] hover:bg-gray-50'
                          : 'border-transparent'
                        }`}
                      onClick={() => handleDayClick(day)}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Dinner</span>
                        {getFeedbackBadge(dinnerSlot?.actual?.kids_feedback || dinnerSlot?.actual?.feedback, dinnerSlot?.actual?.made, dinnerSlot?.actual?.needs_fix)}
                      </div>
                      <p className="font-medium text-[var(--text-primary)] leading-tight mt-0.5">
                        {getMealName(dinnerSlot)}
                      </p>
                      {dinnerSlot?.resolved?.vegetables && dinnerSlot.resolved.vegetables.length > 0 && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">
                          🥬 {dinnerSlot.resolved.vegetables.join(', ')}
                        </p>
                      )}
                      {!viewState.isSwapMode && viewState.editMode && (
                        <button
                          className="text-[10px] text-gray-400 hover:text-[var(--accent-sage)] mt-2 flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewState(prev => ({
                              ...prev, replacementModal: {
                                isOpen: true,
                                day: day,
                                currentMeal: dinnerSlot?.resolved?.actual_meal || dinnerSlot?.resolved?.recipe_id || '',
                                type: 'dinner'
                              }
                            }));
                          }}
                        >
                          <span>🔄</span> Replace
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Kids Lunch */}
                  <div className={`flex items-start p-1.5 rounded-lg border transition-all ${getSlotBg(kidsLunchSlot)}`}>
                    <SelectionCheckbox
                      day={day}
                      type="kids_lunch"
                      label="Kids Lunch"
                      value={kidsLunchSlot?.actual?.actual_meal || ''}
                      editMode={viewState.editMode}
                      selectedItems={selectedItems}
                      toggleSelection={toggleSelection}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Kids Lunch</span>
                        {getFeedbackBadge(kidsLunchSlot?.actual?.actual_meal, kidsLunchSlot?.actual?.made, kidsLunchSlot?.actual?.needs_fix)}
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                        {getMealName(kidsLunchSlot, 'Leftovers')}
                      </p>
                      {!viewState.isSwapMode && viewState.editMode && (
                        <button
                          className="text-[10px] text-gray-400 hover:text-[var(--accent-sage)] mt-1 flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (viewState.editMode) {
                              setViewState(prev => ({
                                ...prev, replacementModal: {
                                  isOpen: true,
                                  day: day,
                                  currentMeal: kidsLunchSlot?.actual?.actual_meal || '',
                                  type: 'kids_lunch'
                                }
                              }));
                            }
                          }}
                        >
                          <span>🔄</span> Replace
                        </button>
                      )}
                    </div>
                  </div>

                  {/* School Snack */}
                  <div className={`flex items-start p-1.5 rounded-lg border transition-all ${getSlotBg(schoolSnackSlot)}`}>
                    <SelectionCheckbox
                      day={day}
                      type="school_snack"
                      label="School Snack"
                      value={schoolSnackSlot?.actual?.actual_meal || ''}
                      editMode={viewState.editMode}
                      selectedItems={selectedItems}
                      toggleSelection={toggleSelection}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">School Snack</span>
                        {getFeedbackBadge(schoolSnackSlot?.actual?.actual_meal, schoolSnackSlot?.actual?.made, schoolSnackSlot?.actual?.needs_fix)}
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                        {getMealName(schoolSnackSlot, 'TBD')}
                      </p>
                      {!viewState.isSwapMode && viewState.editMode && (
                        <button
                          className="text-[10px] text-gray-400 hover:text-[var(--accent-sage)] mt-1 flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewState(prev => ({
                              ...prev, replacementModal: {
                                isOpen: true,
                                day: day,
                                currentMeal: schoolSnackSlot?.actual?.actual_meal || '',
                                type: 'school_snack'
                              }
                            }));
                          }}
                        >
                          <span>🔄</span> Replace
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Home Snack */}
                  <div className={`flex items-start p-1.5 rounded-lg border transition-all ${getSlotBg(homeSnackSlot)}`}>
                    <SelectionCheckbox
                      day={day}
                      type="home_snack"
                      label="Home Snack"
                      value={homeSnackSlot?.actual?.actual_meal || ''}
                      editMode={viewState.editMode}
                      selectedItems={selectedItems}
                      toggleSelection={toggleSelection}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Home Snack</span>
                        {getFeedbackBadge(homeSnackSlot?.actual?.actual_meal, homeSnackSlot?.actual?.made, homeSnackSlot?.actual?.needs_fix)}
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                        {getMealName(homeSnackSlot, 'TBD')}
                      </p>
                      {!viewState.isSwapMode && viewState.editMode && (
                        <button
                          className="text-[10px] text-gray-400 hover:text-[var(--accent-sage)] mt-1 flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewState(prev => ({
                              ...prev, replacementModal: {
                                isOpen: true,
                                day: day,
                                currentMeal: homeSnackSlot?.actual?.actual_meal || '',
                                type: 'home_snack'
                              }
                            }));
                          }}
                        >
                          <span>🔄</span> Replace
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Adult Lunch */}
                  <div className={`flex items-start p-1.5 rounded-lg border transition-all ${getSlotBg(adultLunchSlot)}`}>
                    <SelectionCheckbox
                      day={day}
                      type="adult_lunch"
                      label="Adult Lunch"
                      value={adultLunchSlot?.actual?.actual_meal || ''}
                      editMode={viewState.editMode}
                      selectedItems={selectedItems}
                      toggleSelection={toggleSelection}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Adult Lunch</span>
                        {getFeedbackBadge(adultLunchSlot?.actual?.actual_meal, adultLunchSlot?.actual?.made, adultLunchSlot?.actual?.needs_fix)}
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                        {getMealName(adultLunchSlot, 'Leftovers')}
                      </p>
                      {!viewState.isSwapMode && viewState.editMode && (
                        <button
                          className="text-[10px] text-gray-400 hover:text-[var(--accent-sage)] mt-1 flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewState(prev => ({
                              ...prev, replacementModal: {
                                isOpen: true,
                                day: day,
                                currentMeal: adultLunchSlot?.actual?.actual_meal || '',
                                type: 'adult_lunch'
                              }
                            }));
                          }}
                        >
                          <span>🔄</span> Replace
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Table view */}
        <div className="hidden md:block overflow-x-auto card p-0 overflow-hidden shadow-lg border-none">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] bg-white w-40">
                  Meal Type
                </th>
                {dayNames.map((dayName, idx) => {
                  const day = days[idx];
                  const isToday = status?.current_day === day;
                  return (
                    <th
                      key={day}
                      className={`p-4 text-left font-mono text-[10px] uppercase tracking-widest border-l border-[var(--border-subtle)] ${isToday
                        ? 'bg-[var(--accent-sage)] text-white'
                        : 'text-[var(--text-muted)]'
                        }`}
                    >
                      {dayName}
                      {isToday && <div className="text-[9px] mt-1 font-bold">TODAY</div>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Dinner Row */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] flex items-center gap-2">
                  <span className="text-lg">🍽️</span>
                  <span>Dinner</span>
                </td>
                {days.map((day) => {
                  const todayIndex = days.indexOf(status?.current_day || '');
                  const dayIndex = days.indexOf(day);
                  const isPast = dayIndex < todayIndex;

                  const dinnerSlot = getSlot(day, 'dinner');
                  const made = dinnerSlot?.actual?.made;

                  const getBgColor = (m: any) => {
                    if (m === true) return 'bg-green-50 border-l-[var(--accent-sage)]';
                    if (m === 'outside_meal') return 'bg-amber-50 border-l-amber-400';
                    if (m === 'freezer_backup') return 'bg-blue-50 border-l-blue-400';
                    if (m === 'leftovers') return 'bg-purple-50 border-l-purple-400';
                    if (m === false || (isPast && m === undefined)) return 'bg-red-50 border-l-red-300';
                    return 'hover:bg-gray-50';
                  };

                  const bgColorClass = getBgColor(made);
                  const isColored = bgColorClass !== 'hover:bg-gray-50';

                  return (
                    <td key={day} className={`p-4 text-sm border-b border-l border-[var(--border-subtle)] transition-all duration-300 ${isColored
                      ? `${bgColorClass} shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] border-l-[3px]`
                      : bgColorClass
                      }`}>
                      <div className="flex items-start gap-2">
                        <SelectionCheckbox
                          day={day}
                          type="dinner"
                          label="Dinner"
                          value={dinnerSlot?.resolved?.actual_meal || ''}
                          editMode={viewState.editMode}
                          selectedItems={selectedItems}
                          toggleSelection={toggleSelection}
                        />
                        <div
                          className={`flex-1 ${viewState.isSwapMode ? 'cursor-pointer p-2 rounded border-2 transition-all user-select-none' : ''} ${viewState.swapSelection.includes(day)
                            ? 'border-[var(--accent-sage)] bg-green-50 shadow-md transform scale-[1.02]'
                            : viewState.isSwapMode
                              ? 'border-dashed border-gray-300 hover:border-[var(--accent-sage)] hover:bg-gray-50'
                              : 'border-transparent'
                            }`}
                          onClick={() => handleDayClick(day)}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-medium leading-tight">
                              {dinnerSlot?.resolved?.recipe_id ? (
                                <Link
                                  href={viewState.isSwapMode ? '#' : `/recipes/${dinnerSlot.resolved.recipe_id}`}
                                  onClick={(e) => viewState.isSwapMode && e.preventDefault()}
                                  className={viewState.isSwapMode ? '' : "hover:text-[var(--accent-sage)] hover:underline"}
                                >
                                  {getMealName(dinnerSlot)}
                                </Link>
                              ) : (
                                getMealName(dinnerSlot)
                              )}
                            </span>
                            {getFeedbackBadge(dinnerSlot?.actual?.kids_feedback || dinnerSlot?.actual?.feedback, dinnerSlot?.actual?.made, dinnerSlot?.actual?.needs_fix)}
                          </div>
                          {!viewState.isSwapMode && viewState.editMode && (
                            <button
                              title="Find a substitute for this meal"
                              className="ml-auto text-gray-300 hover:text-[var(--accent-sage)] p-1 rounded-full hover:bg-gray-100 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewState(prev => ({
                                  ...prev, replacementModal: {
                                    isOpen: true,
                                    day: day,
                                    currentMeal: dinnerSlot?.resolved?.actual_meal || dinnerSlot?.resolved?.recipe_id || '',
                                    type: 'dinner'
                                  }
                                }));
                              }}
                            >
                              🔄
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Kids Lunch Row */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  <span className="mr-2">🥪</span>
                  <span>Kids Lunch</span>
                </td>
                {days.map((day) => {
                  const todayIndex = days.indexOf(status?.current_day || '');
                  const dayIndex = days.indexOf(day);
                  const isPast = dayIndex < todayIndex;

                  const kidsLunchSlot = getSlot(day, 'kids_lunch');
                  const made = kidsLunchSlot?.actual?.made;

                  const getBgColor = (m: any) => {
                    if (m === true) return 'bg-green-50';
                    if (m === 'outside_meal') return 'bg-amber-50';
                    if (m === 'freezer_backup') return 'bg-blue-50';
                    if (m === 'leftovers') return 'bg-purple-50';
                    if (m === false || (isPast && m === undefined)) return 'bg-red-50';
                    return '';
                  };

                  const bgColorClass = getBgColor(made);

                  return (
                    <td key={day} className={`p-4 text-sm border-b border-l border-[var(--border-subtle)] ${bgColorClass !== ''
                      ? `${bgColorClass} shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]`
                      : ''
                      }`}>
                      <div className="flex items-start gap-2">
                        <SelectionCheckbox
                          day={day}
                          type="kids_lunch"
                          label="Kids Lunch"
                          value={kidsLunchSlot?.actual?.actual_meal || ''}
                          editMode={viewState.editMode}
                          selectedItems={selectedItems}
                          toggleSelection={toggleSelection}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-gray-600 italic">
                              {getMealName(kidsLunchSlot, 'Leftovers')}
                            </span>
                            {getFeedbackBadge(kidsLunchSlot?.actual?.actual_meal, kidsLunchSlot?.actual?.made, kidsLunchSlot?.actual?.needs_fix)}
                          </div>
                          {!viewState.isSwapMode && viewState.editMode && (
                            <button
                              title="Replace"
                              className="text-[10px] text-gray-300 hover:text-[var(--accent-sage)] flex items-center gap-1 mt-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewState(prev => ({
                                  ...prev, replacementModal: {
                                    isOpen: true,
                                    day: day,
                                    currentMeal: kidsLunchSlot?.actual?.actual_meal || '',
                                    type: 'kids_lunch'
                                  }
                                }));
                              }}
                            >
                              🔄 Replace
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* School Snack Row */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  <span className="mr-2">🎒</span>
                  <span>School Snack</span>
                </td>
                {days.map((day) => {
                  const todayIndex = days.indexOf(status?.current_day || '');
                  const dayIndex = days.indexOf(day);
                  const isPast = dayIndex < todayIndex;

                  const schoolSnackSlot = getSlot(day, 'school_snack');
                  const isWeekend = day === 'sat' || day === 'sun';
                  const made = schoolSnackSlot?.actual?.made;

                  const getBgColor = (m: any) => {
                    if (m === true) return 'bg-green-50';
                    if (m === 'outside_meal') return 'bg-amber-50';
                    if (m === 'freezer_backup') return 'bg-blue-50';
                    if (m === 'leftovers') return 'bg-purple-50';
                    if (!isWeekend && (m === false || (isPast && m === undefined))) return 'bg-red-50';
                    return '';
                  };

                  const bgColorClass = getBgColor(made);

                  return (
                    <td key={day} className={`p-4 text-sm border-b border-l border-[var(--border-subtle)] ${bgColorClass !== ''
                      ? `${bgColorClass} shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]`
                      : ''
                      }`}>
                      {!isWeekend ? (
                        <div className="flex items-start gap-2">
                          <SelectionCheckbox
                            day={day}
                            type="school_snack"
                            label="School Snack"
                            value={schoolSnackSlot?.actual?.actual_meal || ''}
                            editMode={viewState.editMode}
                            selectedItems={selectedItems}
                            toggleSelection={toggleSelection}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-gray-600 font-mono text-xs">
                                {getMealName(schoolSnackSlot, 'TBD')}
                              </span>
                              {getFeedbackBadge(schoolSnackSlot?.actual?.actual_meal, schoolSnackSlot?.actual?.made, schoolSnackSlot?.actual?.needs_fix)}
                            </div>
                            {!viewState.isSwapMode && viewState.editMode && (
                              <button
                                title="Replace"
                                className="text-[10px] text-gray-300 hover:text-[var(--accent-sage)] flex items-center gap-1 mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewState(prev => ({
                                    ...prev, replacementModal: {
                                      isOpen: true,
                                      day: day,
                                      currentMeal: schoolSnackSlot?.actual?.actual_meal || '',
                                      type: 'school_snack'
                                    }
                                  }));
                                }}
                              >
                                🔄 Replace
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Home Snack Row */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  <span className="mr-2">🏠</span>
                  <span>Home Snack</span>
                </td>
                {days.map((day) => {
                  const todayIndex = days.indexOf(status?.current_day || '');
                  const dayIndex = days.indexOf(day);
                  const isPast = dayIndex < todayIndex;

                  const homeSnackSlot = getSlot(day, 'home_snack');
                  const isWeekend = day === 'sat' || day === 'sun';
                  const made = homeSnackSlot?.actual?.made;

                  const getBgColor = (m: any) => {
                    if (m === true) return 'bg-green-50';
                    if (m === 'outside_meal') return 'bg-amber-50';
                    if (m === 'freezer_backup') return 'bg-blue-50';
                    if (m === 'leftovers') return 'bg-purple-50';
                    if (!isWeekend && (m === false || (isPast && m === undefined))) return 'bg-red-50';
                    return '';
                  };

                  const bgColorClass = getBgColor(made);

                  return (
                    <td key={day} className={`p-4 text-sm border-b border-l border-[var(--border-subtle)] ${bgColorClass !== ''
                      ? `${bgColorClass} shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]`
                      : ''
                      }`}>
                      {!isWeekend ? (
                        <div className="flex items-start gap-2">
                          <SelectionCheckbox
                            day={day}
                            type="home_snack"
                            label="Home Snack"
                            value={homeSnackSlot?.actual?.actual_meal || ''}
                            editMode={viewState.editMode}
                            selectedItems={selectedItems}
                            toggleSelection={toggleSelection}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-gray-600 font-mono text-xs">
                                {getMealName(homeSnackSlot, 'TBD')}
                              </span>
                              {getFeedbackBadge(homeSnackSlot?.actual?.actual_meal, homeSnackSlot?.actual?.made, homeSnackSlot?.actual?.needs_fix)}
                            </div>
                            {!viewState.isSwapMode && viewState.editMode && (
                              <button
                                title="Replace"
                                className="text-[10px] text-gray-300 hover:text-[var(--accent-sage)] flex items-center gap-1 mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewState(prev => ({
                                    ...prev, replacementModal: {
                                      isOpen: true,
                                      day: day,
                                      currentMeal: homeSnackSlot?.actual?.actual_meal || '',
                                      type: 'home_snack'
                                    }
                                  }));
                                }}
                              >
                                🔄 Replace
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Adult Lunch Row */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  <span className="mr-2">☕</span>
                  <span>Adult Lunch</span>
                </td>
                {days.map((day) => {
                  const todayIndex = days.indexOf(status?.current_day || '');
                  const dayIndex = days.indexOf(day);
                  const isPast = dayIndex < todayIndex;

                  const adultLunchSlot = getSlot(day, 'adult_lunch');
                  const made = adultLunchSlot?.actual?.made;

                  const getBgColor = (m: any) => {
                    if (m === true) return 'bg-green-50';
                    if (m === 'outside_meal') return 'bg-amber-50';
                    if (m === 'freezer_backup') return 'bg-blue-50';
                    if (m === 'leftovers') return 'bg-purple-50';
                    if (m === false || (isPast && m === undefined)) return 'bg-red-50';
                    return '';
                  };

                  const bgColorClass = getBgColor(made);

                  return (
                    <td key={day} className={`p-4 text-sm border-b border-l border-[var(--border-subtle)] ${bgColorClass !== ''
                      ? `${bgColorClass} shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]`
                      : ''
                      }`}>
                      <div className="flex items-start gap-2">
                        <SelectionCheckbox
                          day={day}
                          type="adult_lunch"
                          label="Adult Lunch"
                          value={adultLunchSlot?.actual?.actual_meal || ''}
                          editMode={viewState.editMode}
                          selectedItems={selectedItems}
                          toggleSelection={toggleSelection}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-gray-500 italic text-xs">
                              {getMealName(adultLunchSlot, 'Leftovers')}
                            </span>
                            {getFeedbackBadge(adultLunchSlot?.actual?.actual_meal, adultLunchSlot?.actual?.made, adultLunchSlot?.actual?.needs_fix)}
                          </div>
                          {!viewState.isSwapMode && viewState.editMode && (
                            <button
                              title="Replace"
                              className="text-[10px] text-gray-300 hover:text-[var(--accent-sage)] flex items-center gap-1 mt-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewState(prev => ({
                                  ...prev, replacementModal: {
                                    isOpen: true,
                                    day: day,
                                    currentMeal: adultLunchSlot?.actual?.actual_meal || '',
                                    type: 'adult_lunch'
                                  }
                                }));
                              }}
                            >
                              🔄 Replace
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Weekly Stats Summary */}
        <section className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <div className="card p-4 bg-green-50/50 border-green-100 flex flex-col items-center text-center">
            <span className="text-2xl mb-1">✅</span>
            <span className="text-2xl font-black text-green-700">{stats.followed}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-600/70">Followed Plan</span>
          </div>
          <div className="card p-4 bg-amber-50/50 border-amber-100 flex flex-col items-center text-center">
            <span className="text-2xl mb-1">🍽️</span>
            <span className="text-2xl font-black text-amber-700">{stats.ateOut}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/70">Ate Out</span>
          </div>
          <div className="card p-4 bg-red-50/50 border-red-100 flex flex-col items-center text-center">
            <span className="text-2xl mb-1">🏃‍♂️</span>
            <span className="text-2xl font-black text-red-700">{stats.skipped}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-600/70">Skipped</span>
          </div>
          <div className="card p-4 bg-blue-50/50 border-blue-100 flex flex-col items-center text-center">
            <span className="text-2xl mb-1">🧊</span>
            <span className="text-2xl font-black text-blue-700">{stats.backup}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/70">Backup Used</span>
          </div>
          <div className="card p-4 bg-purple-50/50 border-purple-100 flex flex-col items-center text-center">
            <span className="text-2xl mb-1">🥗</span>
            <span className="text-2xl font-black text-purple-700">{stats.leftovers}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600/70">Leftovers</span>
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
