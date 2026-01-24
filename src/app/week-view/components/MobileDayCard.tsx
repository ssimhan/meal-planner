import React from 'react';
import Link from 'next/link';
import { ChefHat } from 'lucide-react';
import { SelectionCheckbox } from './SelectionCheckbox';

interface MobileDayCardProps {
    day: string;
    dayName: string;
    isToday: boolean;
    status: any;
    viewState: any;
    setViewState: React.Dispatch<React.SetStateAction<any>>;
    selectedItems: any[];
    toggleSelection: (day: string, type: string, label: string, value: string) => void;
    getSlot: (day: string, type: string) => any;
    handleDayClick: (day: string) => void;
    getMealName: (slot: any, fallback?: string) => string;
    getFeedbackBadge: (feedback?: string, made?: boolean | string, needsFix?: boolean) => React.ReactNode;
    handleOpenFocusMode: (recipeId: string, recipeName: string) => void;
}

export const MobileDayCard = ({
    day,
    dayName,
    isToday,
    status,
    viewState,
    setViewState,
    selectedItems,
    toggleSelection,
    getSlot,
    handleDayClick,
    getMealName,
    getFeedbackBadge,
    handleOpenFocusMode
}: MobileDayCardProps) => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const todayIndex = days.indexOf(status?.current_day || '');
    const dayIndex = days.indexOf(day);
    const isPast = dayIndex < todayIndex;

    const dinnerSlot = getSlot(day, 'dinner');
    const kidsLunchSlot = getSlot(day, 'kids_lunch');
    const schoolSnackSlot = getSlot(day, 'school_snack');
    const homeSnackSlot = getSlot(day, 'home_snack');
    const adultLunchSlot = getSlot(day, 'adult_lunch');

    const getSlotBg = (slot: any) => {
        const made = slot?.actual?.made;
        if (made === true) return 'bg-[var(--status-followed)] text-[var(--status-followed-text)] border-[var(--status-followed-text)]/20 shadow-sm';
        if (made === 'outside_meal') return 'bg-[var(--status-ate-out)] text-[var(--status-ate-out-text)] border-[var(--status-ate-out-text)]/20 shadow-sm';
        if (made === 'freezer_backup') return 'bg-[var(--status-backup)] text-[var(--status-backup-text)] border-[var(--status-backup-text)]/20 shadow-sm';
        if (made === 'leftovers') return 'bg-[var(--status-leftovers)] text-[var(--status-leftovers-text)] border-[var(--status-leftovers-text)]/20 shadow-sm';
        if (made === false || (isPast && made === undefined)) return 'bg-[var(--status-skipped)] text-[var(--status-skipped-text)] border-[var(--status-skipped-text)]/20 shadow-sm';
        return 'bg-[var(--bg-card)] border-transparent';
    };

    return (
        <div
            className={`card ${isToday ? 'border-2 border-[var(--accent-sage)] shadow-lg' : ''} ${viewState.editMode ? 'ring-2 ring-amber-100' : ''}`}
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {dayName}
                </h3>
                {isToday && (
                    <span className="text-[10px] font-black tracking-widest px-3 py-1 bg-[var(--accent-sage)] text-white rounded-full shadow-md animate-pulse">
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
                        className={`flex-1 min-h-[44px] ${viewState.isSwapMode ? 'cursor-pointer p-2 rounded border-2 transition-all user-select-none' : ''} ${viewState.swapSelection.includes(day)
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
                                className="text-[10px] text-gray-400 hover:text-[var(--accent-sage)] mt-3 flex items-center gap-1 min-h-[32px] px-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewState((prev: any) => ({
                                        ...prev, replacementModal: {
                                            isOpen: true,
                                            day: day,
                                            currentMeal: dinnerSlot?.resolved?.actual_meal || dinnerSlot?.resolved?.recipe_id || '',
                                            type: 'dinner'
                                        }
                                    }));
                                }}
                            >
                                <span className="text-xs">🔄</span>
                                <span className="font-bold uppercase tracking-wider">Replace</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Kids Lunch */}
                <div className={`flex items-start p-3 rounded-lg border transition-all ${getSlotBg(kidsLunchSlot)}`}>
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
                                className="text-[10px] text-gray-400 hover:text-[var(--accent-sage)] mt-2 flex items-center gap-1 min-h-[32px] px-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (viewState.editMode) {
                                        setViewState((prev: any) => ({
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
                                <span className="text-xs">🔄</span>
                                <span className="font-bold uppercase tracking-wider">Replace</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* School Snack */}
                <div className={`flex items-start p-3 rounded-lg border transition-all ${getSlotBg(schoolSnackSlot)}`}>
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
                                className="text-[10px] text-gray-400 hover:text-[var(--accent-sage)] mt-2 flex items-center gap-1 min-h-[32px] px-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewState((prev: any) => ({
                                        ...prev, replacementModal: {
                                            isOpen: true,
                                            day: day,
                                            currentMeal: schoolSnackSlot?.actual?.actual_meal || '',
                                            type: 'school_snack'
                                        }
                                    }));
                                }}
                            >
                                <span className="text-xs">🔄</span>
                                <span className="font-bold uppercase tracking-wider">Replace</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Home Snack */}
                <div className={`flex items-start p-3 rounded-lg border transition-all ${getSlotBg(homeSnackSlot)}`}>
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
                                className="text-[10px] text-gray-400 hover:text-[var(--accent-sage)] mt-2 flex items-center gap-1 min-h-[32px] px-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewState((prev: any) => ({
                                        ...prev, replacementModal: {
                                            isOpen: true,
                                            day: day,
                                            currentMeal: homeSnackSlot?.actual?.actual_meal || '',
                                            type: 'home_snack'
                                        }
                                    }));
                                }}
                            >
                                <span className="text-xs">🔄</span>
                                <span className="font-bold uppercase tracking-wider">Replace</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Adult Lunch */}
                <div className={`flex items-start p-3 rounded-lg border transition-all ${getSlotBg(adultLunchSlot)}`}>
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
                                className="text-[10px] text-gray-400 hover:text-[var(--accent-sage)] mt-2 flex items-center gap-1 min-h-[32px] px-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewState((prev: any) => ({
                                        ...prev, replacementModal: {
                                            isOpen: true,
                                            day: day,
                                            currentMeal: adultLunchSlot?.actual?.actual_meal || '',
                                            type: 'adult_lunch'
                                        }
                                    }));
                                }}
                            >
                                <span className="text-xs">🔄</span>
                                <span className="font-bold uppercase tracking-wider">Replace</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
