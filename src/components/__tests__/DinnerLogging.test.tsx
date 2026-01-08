import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DinnerLogging, { DinnerLoggingProps } from '../DinnerLogging';
import { WorkflowStatus } from '@/lib/api';

// Mock MealCorrectionInput
jest.mock('../MealCorrectionInput', () => {
    return function DummyInput({ onSave, onCancel }: any) {
        return (
            <div>
                <input data-testid="mock-input" aria-label="correction-input" />
                <button onClick={() => onSave('New Dinner', false)}>Save</button>
                <button onClick={onCancel}>Cancel</button>
            </div>
        );
    };
});

describe('DinnerLogging', () => {
    const mockOnLogDay = jest.fn();
    const mockSetShowAlternatives = jest.fn();
    const mockSetSelectedAlternative = jest.fn();
    const mockSetOtherMealText = jest.fn();
    const mockSetSelectedFreezerMeal = jest.fn();
    const mockSetIsDinnerEditing = jest.fn();
    const mockSetDinnerEditInput = jest.fn();

    const defaultProps: DinnerLoggingProps = {
        status: {
            week_data: { freezer_inventory: [{ meal: 'Frozen Pizza', frozen_date: '2025-01-01' }] }
        } as unknown as WorkflowStatus,
        logLoading: false,
        showAlternatives: false,
        setShowAlternatives: mockSetShowAlternatives,
        selectedAlternative: null,
        setSelectedAlternative: mockSetSelectedAlternative,
        otherMealText: '',
        setOtherMealText: mockSetOtherMealText,
        selectedFreezerMeal: '',
        setSelectedFreezerMeal: mockSetSelectedFreezerMeal,
        isDinnerEditing: false,
        setIsDinnerEditing: mockSetIsDinnerEditing,
        dinnerEditInput: '',
        setDinnerEditInput: mockSetDinnerEditInput,
        recipes: [],
        onLogDay: mockOnLogDay,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders Step 1: Made / Not Made initially', () => {
        render(<DinnerLogging {...defaultProps} />);
        expect(screen.getByText('✓ Made')).toBeInTheDocument();
        expect(screen.getByText('✗ Did Not Make')).toBeInTheDocument();
    });

    it('calls onLogDay(true) when Made is clicked', () => {
        render(<DinnerLogging {...defaultProps} />);
        fireEvent.click(screen.getByText('✓ Made'));
        expect(mockOnLogDay).toHaveBeenCalledWith(true);
    });

    it('shows alternatives when Not Made is clicked', () => {
        render(<DinnerLogging {...defaultProps} />);
        fireEvent.click(screen.getByText('✗ Did Not Make'));
        expect(mockSetShowAlternatives).toHaveBeenCalledWith(true);
    });

    it('renders Step 2: Alternatives when showAlternatives is true', () => {
        render(<DinnerLogging {...defaultProps} showAlternatives={true} />);
        expect(screen.getByText('🧊 Freezer Meal')).toBeInTheDocument();
        expect(screen.getByText('🍽️ Ate Out / Restaurant')).toBeInTheDocument();
        expect(screen.getByText('📝 Something Else')).toBeInTheDocument();
    });

    it('handles Alternative selection', () => {
        render(<DinnerLogging {...defaultProps} showAlternatives={true} />);
        fireEvent.click(screen.getByText('🧊 Freezer Meal'));
        expect(mockSetSelectedAlternative).toHaveBeenCalledWith('freezer');
    });

    it('renders Freezer selection (Step 3a)', () => {
        render(<DinnerLogging {...defaultProps} showAlternatives={true} selectedAlternative="freezer" />);
        expect(screen.getByText('Select freezer meal used:')).toBeInTheDocument();
        expect(screen.getByText('Frozen Pizza')).toBeInTheDocument();
    });

    it('renders Ate Out confirmation (Step 3b)', () => {
        render(<DinnerLogging {...defaultProps} showAlternatives={true} selectedAlternative="outside" />);
        expect(screen.getByText('Confirm: Ate at restaurant or ordered out')).toBeInTheDocument();
    });

    it('calls onLogDay for Ate Out', () => {
        render(<DinnerLogging {...defaultProps} showAlternatives={true} selectedAlternative="outside" />);
        fireEvent.click(screen.getByText('Confirm'));
        expect(mockOnLogDay).toHaveBeenCalledWith('outside_meal');
    });

    it('renders Other input (Step 3c)', () => {
        render(<DinnerLogging {...defaultProps} showAlternatives={true} selectedAlternative="other" />);
        expect(screen.getByPlaceholderText('e.g., Leftovers, Sandwiches, Cereal')).toBeInTheDocument();
    });

    it('renders Feedback emojis when status.today_dinner.made is true', () => {
        const props = {
            ...defaultProps,
            status: {
                today_dinner: { made: true, kids_feedback: '❤️' }
            } as unknown as WorkflowStatus
        };
        render(<DinnerLogging {...props} />);
        expect(screen.getByText('❤️')).toBeInTheDocument();
        expect(screen.getByText('🔧 Fix / Edit Actual Meal')).toBeInTheDocument();
    });
});
