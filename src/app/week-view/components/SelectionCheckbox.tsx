import React from 'react';

interface SelectionCheckboxProps {
    day: string;
    type: string;
    label: string;
    value: string;
    editMode: boolean;
    selectedItems: { day: string; type: string; label: string; value: string }[];
    toggleSelection: (day: string, type: string, label: string, value: string) => void;
}

export const SelectionCheckbox = ({ day, type, label, value, editMode, selectedItems, toggleSelection }: SelectionCheckboxProps) => {
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
