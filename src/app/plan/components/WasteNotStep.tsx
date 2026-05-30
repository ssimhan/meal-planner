import React, { useState } from 'react';
import { InventoryState, InventoryItem } from '@/types';
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent
} from '@dnd-kit/core';

interface WasteNotRecipe {
    id: string;
    name: string;
    description?: string;
    used_ingredients?: string[];
    match_score?: number;
}

interface WasteNotStepProps {
    step: 'waste_not';
    inventory: InventoryState | null;
    wasteNotSuggestions: WasteNotRecipe[];
    selections: { day: string, slot: string, recipe_id: string, recipe_name: string }[];
    setSelections: React.Dispatch<React.SetStateAction<{ day: string, slot: string, recipe_id: string, recipe_name: string }[]>>;
    leftoverAssignments: { day: string, slot: 'lunch' | 'dinner', item: string }[];
    setLeftoverAssignments: React.Dispatch<React.SetStateAction<{ day: string, slot: 'lunch' | 'dinner', item: string }[]>>;
    setStep: (step: any) => void;
    WizardProgress: React.ComponentType<{ currentStep: string }>;
    onNext: () => void;
    onBack: () => void;
}

// Draggable Wrapper
const DraggableSource = ({ id, data, children, className }: { id: string, data: any, children: React.ReactNode, className?: string }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id,
        data
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`${className || ''} ${isDragging ? 'opacity-30' : 'hover:scale-[1.02] hover:shadow-lg'} transition-all cursor-grab active:cursor-grabbing`}
        >
            {children}
        </div>
    );
};

// Droppable Wrapper
const DroppableDay = ({ day, isAssigned, children }: { day: string, isAssigned: any, children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: day,
    });

    return (
        <div
            ref={setNodeRef}
            className={`p-4 rounded-xl border transition-all duration-300 ${isOver ? 'ring-2 ring-[var(--accent-sage)] bg-[var(--accent-sage)]/10 scale-105 shadow-xl z-10' : ''
                } ${isAssigned
                    ? (isAssigned.type === 'leftover' ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-[var(--accent-sage)]')
                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] border-dashed'
                }`}
        >
            {children}
        </div>
    );
};

export const WasteNotStep: React.FC<WasteNotStepProps> = ({
    step,
    inventory,
    wasteNotSuggestions,
    selections,
    setSelections,
    leftoverAssignments,
    setLeftoverAssignments,
    setStep,
    WizardProgress,
    onNext,
    onBack
}) => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const dayNames: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

    // DnD State
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeItem, setActiveItem] = useState<any | null>(null);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    // Filtered Items
    const fridgeMeals = (inventory?.meals || []).filter(m => m.location === 'fridge' && m.quantity > 0);
    const freezerMeals = (inventory?.meals || []).filter(m => m.location === 'freezer' && m.quantity > 0);

    const getDinnerAssignment = (day: string) => {
        const leftover = leftoverAssignments.find(l => l.day === day && l.slot === 'dinner');
        if (leftover) return { type: 'leftover', name: leftover.item };

        const selection = selections.find(s => s.day === day && s.slot === 'dinner');
        if (selection) return { type: 'recipe', name: selection.recipe_name };

        return null;
    };

    const handleAssignLeftover = (item: InventoryItem, day: string) => {
        const newLeftovers = leftoverAssignments.filter(l => !(l.day === day && l.slot === 'dinner'));
        const newSelections = selections.filter(s => !(s.day === day && s.slot === 'dinner'));

        setSelections(newSelections);
        setLeftoverAssignments([
            ...newLeftovers,
            { day, slot: 'dinner', item: item.item }
        ]);
    };

    const handleAssignRecipe = (recipe: WasteNotRecipe, day: string) => {
        const newLeftovers = leftoverAssignments.filter(l => !(l.day === day && l.slot === 'dinner'));
        const newSelections = selections.filter(s => !(s.day === day && s.slot === 'dinner'));

        setLeftoverAssignments(newLeftovers);
        setSelections([
            ...newSelections,
            { day, slot: 'dinner', recipe_id: recipe.id, recipe_name: recipe.name }
        ]);
    };

    const handleClearDay = (day: string) => {
        setLeftoverAssignments(prev => prev.filter(l => !(l.day === day && l.slot === 'dinner')));
        setSelections(prev => prev.filter(s => !(s.day === day && s.slot === 'dinner')));
    };

    // DnD Handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        setActiveItem(event.active.data.current);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveItem(null);

        if (over && active.data.current) {
            const day = over.id as string;
            const data = active.data.current;

            if (data.sourceType === 'leftover' || data.sourceType === 'freezer') {
                handleAssignLeftover(data.item, day);
            } else if (data.sourceType === 'recipe') {
                handleAssignRecipe(data.recipe, day);
            }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <main className="container mx-auto max-w-5xl px-4 py-12 select-none">
                <WizardProgress currentStep={step} />

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <span className="text-3xl">♻️</span> Waste Not, Want Not
                        </h1>
                        <p className="text-[var(--text-muted)] mt-2 max-w-2xl">
                            Drag items to your dinner schedule to assign them.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <button
                            onClick={onNext}
                            className="btn-premium px-8 py-4 shadow-xl flex items-center gap-2 text-sm"
                        >
                            Next: Confirm Dinners →
                        </button>
                        <button
                            onClick={onBack}
                            className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-sage)] transition-colors"
                        >
                            ← Back to Inventory
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN: Draggable Sources */}
                    <div className="lg:col-span-7 space-y-8">

                        {/* 1. Fridge Leftovers */}
                        {fridgeMeals.length > 0 && (
                            <section>
                                <h3 className="text-sm font-black uppercase tracking-widest text-purple-600 mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                    Eat First (Fridge Leftovers)
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {fridgeMeals.map((meal: any, idx) => (
                                        <DraggableSource
                                            key={`fridge-${idx}`}
                                            id={`fridge-${meal.item}`}
                                            data={{ sourceType: 'leftover', item: meal }}
                                            className="card p-4 border border-purple-100 bg-purple-50/30 touch-manipulation"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-sm">{meal.item}</span>
                                                <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-purple-100">x{meal.quantity}</span>
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)] mt-2 flex items-center gap-1">
                                                <span className="text-lg">✊</span> Drag to assign
                                            </div>
                                        </DraggableSource>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 2. Waste Not Suggestions */}
                        {wasteNotSuggestions.length > 0 && (
                            <section>
                                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--accent-sage)] mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[var(--accent-sage)]"></span>
                                    Use Up Ingredients
                                </h3>
                                <div className="space-y-3">
                                    {wasteNotSuggestions.map((recipe) => (
                                        <DraggableSource
                                            key={recipe.id}
                                            id={`recipe-${recipe.id}`}
                                            data={{ sourceType: 'recipe', recipe }}
                                            className="card p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50"
                                        >
                                            <div>
                                                <p className="font-bold text-sm">{recipe.name}</p>
                                                {recipe.used_ingredients && recipe.used_ingredients.length > 0 && (
                                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                                        Uses: <span className="text-[var(--accent-sage)]">{recipe.used_ingredients.join(', ')}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)] hidden sm:block">:: Drag</div>
                                        </DraggableSource>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 3. Freezer Stash */}
                        {freezerMeals.length > 0 && (
                            <section>
                                <h3 className="text-sm font-black uppercase tracking-widest text-blue-500 mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Freezer Stash
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {freezerMeals.map((meal: any, idx) => (
                                        <DraggableSource
                                            key={`freezer-${idx}`}
                                            id={`freezer-${meal.item}`}
                                            data={{ sourceType: 'freezer', item: meal }}
                                            className="card p-4 border border-blue-100 bg-blue-50/30"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-sm">{meal.item}</span>
                                                <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-blue-100">x{meal.quantity}</span>
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)] mt-2 flex items-center gap-1">
                                                <span className="text-lg">🧊</span> Drag to assign
                                            </div>
                                        </DraggableSource>
                                    ))}
                                </div>
                            </section>
                        )}

                        {fridgeMeals.length === 0 && wasteNotSuggestions.length === 0 && freezerMeals.length === 0 && (
                            <div className="p-12 text-center text-[var(--text-muted)] border-2 border-dashed border-[var(--border-subtle)] rounded-2xl">
                                <p>No leftovers or suggestion found! You're starting fresh. 🌱</p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Droppable Schedule */}
                    <div className="lg:col-span-5">
                        <div className="sticky top-8 space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                Dinner Schedule
                            </h3>
                            {days.map(day => {
                                const assignment = getDinnerAssignment(day);
                                return (
                                    <DroppableDay key={day} day={day} isAssigned={assignment}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                                {dayNames[day]}
                                            </span>
                                            {assignment && (
                                                <button
                                                    onClick={() => handleClearDay(day)}
                                                    className="text-[var(--text-muted)] hover:text-red-500 text-xs"
                                                >
                                                    × Clear
                                                </button>
                                            )}
                                        </div>
                                        <p className={`text-sm font-bold ${assignment ? '' : 'text-[var(--text-muted)] italic'}`}>
                                            {assignment ? assignment.name : 'Drop here to plan'}
                                        </p>
                                        {assignment && (
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-2 inline-block ${assignment.type === 'leftover' ? 'bg-purple-100 text-purple-700' : 'bg-[var(--accent-sage)] text-white'
                                                }`}>
                                                {assignment.type === 'leftover' ? 'Leftover' : 'Waste Not Recipe'}
                                            </span>
                                        )}
                                    </DroppableDay>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Drag Overlay for Visual Feedback */}
                <DragOverlay>
                    {activeId && activeItem ? (
                        <div className="card p-4 shadow-2xl bg-white border-2 border-[var(--accent-sage)] w-64 transform rotate-3 cursor-grabbing opacity-90">
                            <p className="font-bold text-sm truncate">
                                {activeItem.sourceType === 'recipe' ? activeItem.recipe.name : activeItem.item.item}
                            </p>
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                {activeItem.sourceType === 'leftover' && 'Leftover'}
                                {activeItem.sourceType === 'freezer' && 'Freezer'}
                                {activeItem.sourceType === 'recipe' && 'Recipe'}
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>

            </main>
        </DndContext>
    );
};
