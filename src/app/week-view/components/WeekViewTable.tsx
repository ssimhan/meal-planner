import React from 'react';
import Link from 'next/link';
import { ChefHat } from 'lucide-react';
import { SelectionCheckbox } from './SelectionCheckbox';

interface WeekViewTableProps {
    days: string[];
    dayNames: string[];
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

export const WeekViewTable = ({
    days,
    dayNames,
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
}: WeekViewTableProps) => {

    const getBgColor = (m: any, isPast: boolean) => {
        if (m === true) return 'bg-[var(--status-followed)] text-[var(--status-followed-text)] border-l-[var(--status-followed-text)]';
        if (m === 'outside_meal') return 'bg-[var(--status-ate-out)] text-[var(--status-ate-out-text)] border-l-[var(--status-ate-out-text)]';
        if (m === 'freezer_backup') return 'bg-[var(--status-backup)] text-[var(--status-backup-text)] border-l-[var(--status-backup-text)]';
        if (m === 'leftovers') return 'bg-[var(--status-leftovers)] text-[var(--status-leftovers-text)] border-l-[var(--status-leftovers-text)]';
        if (m === false || (isPast && m === undefined)) return 'bg-[var(--status-skipped)] text-[var(--status-skipped-text)] border-l-[var(--status-skipped-text)]';
        return '';
    };

    const getDinnerBgColor = (m: any, isPast: boolean) => {
        if (m === true) return 'bg-[var(--status-followed)] text-[var(--status-followed-text)] border-l-[var(--status-followed-text)]';
        if (m === 'outside_meal') return 'bg-[var(--status-ate-out)] text-[var(--status-ate-out-text)] border-l-[var(--status-ate-out-text)]';
        if (m === 'freezer_backup') return 'bg-[var(--status-backup)] text-[var(--status-backup-text)] border-l-[var(--status-backup-text)]';
        if (m === 'leftovers') return 'bg-[var(--status-leftovers)] text-[var(--status-leftovers-text)] border-l-[var(--status-leftovers-text)]';
        if (m === false || (isPast && m === undefined)) return 'bg-[var(--status-skipped)] text-[var(--status-skipped-text)] border-l-[var(--status-skipped-text)]';
        return 'hover:bg-[var(--bg-secondary)]';
    };


    return (
        <div className="hidden md:block overflow-x-auto card p-0 overflow-hidden shadow-lg border-none">
            <table className="w-full border-collapse table-fixed">
                <colgroup>
                    <col className="w-[140px]" />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                </colgroup>
                <thead>
                    <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                        <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-card)] border-b border-[var(--border-subtle)]">
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
                    <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
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

                            const bgColorClass = getDinnerBgColor(made, isPast);
                            const isColored = bgColorClass !== 'hover:bg-[var(--bg-secondary)]';

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
                                                            <span className="line-clamp-2" title={getMealName(dinnerSlot)}>
                                                                {getMealName(dinnerSlot)}
                                                            </span>
                                                        </Link>
                                                    ) : (
                                                        getMealName(dinnerSlot)
                                                    )}
                                                    {dinnerSlot?.resolved?.recipe_id && !viewState.editMode && (
                                                        <button
                                                            onClick={() => handleOpenFocusMode(dinnerSlot.resolved!.recipe_id, getMealName(dinnerSlot))}
                                                            className="ml-2 inline-flex items-center justify-center p-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-all transform hover:scale-110 active:scale-95"
                                                            title="Start Focus Mode"
                                                        >
                                                            <ChefHat size={12} />
                                                        </button>
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
                    <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
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

                            const bgColorClass = getBgColor(made, isPast);

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
                                                <span className="text-[var(--text-muted)] italic line-clamp-2" title={getMealName(kidsLunchSlot, 'Leftovers')}>
                                                    {getMealName(kidsLunchSlot, 'Leftovers')}
                                                </span>
                                                {kidsLunchSlot?.resolved?.recipe_id && !viewState.editMode && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenFocusMode(kidsLunchSlot.resolved!.recipe_id!, getMealName(kidsLunchSlot));
                                                        }}
                                                        className="inline-flex items-center justify-center p-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-all transform hover:scale-110 active:scale-95"
                                                        title="Start Focus Mode"
                                                    >
                                                        <ChefHat size={12} />
                                                    </button>
                                                )}
                                                {getFeedbackBadge(kidsLunchSlot?.actual?.actual_meal, kidsLunchSlot?.actual?.made, kidsLunchSlot?.actual?.needs_fix)}
                                            </div>
                                            {!viewState.isSwapMode && viewState.editMode && (
                                                <button
                                                    title="Replace"
                                                    className="text-[10px] text-gray-300 hover:text-[var(--accent-sage)] flex items-center gap-1 mt-1"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewState((prev: any) => ({
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
                    <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
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

                            const bgColorClass = !isWeekend ? getBgColor(made, isPast) : '';

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
                                                    <span className="text-[var(--text-muted)] font-mono text-xs line-clamp-2" title={getMealName(schoolSnackSlot, 'TBD')}>
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
                    <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
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

                            const bgColorClass = !isWeekend ? getBgColor(made, isPast) : '';

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
                                                    <span className="text-[var(--text-muted)] font-mono text-xs line-clamp-2" title={getMealName(homeSnackSlot, 'TBD')}>
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
                    <tr className="hover:bg-[var(--bg-secondary)] transition-colors">
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

                            const bgColorClass = getBgColor(made, isPast);

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
                                                <span className="text-[var(--text-muted)] italic text-xs line-clamp-2" title={getMealName(adultLunchSlot, 'Leftovers')}>
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
    );
};
