import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedbackButtons, { FeedbackButtonsProps } from '../FeedbackButtons';

// Mock MealCorrectionInput to isolate FeedbackButtons test
jest.mock('../MealCorrectionInput', () => {
    return function DummyInput({ onSave, onCancel }: any) {
        return (
            <div>
                <input data-testid="mock-input" aria-label="correction-input" />
                <button onClick={() => onSave('New Meal', false)}>Save</button>
                <button onClick={onCancel}>Cancel</button>
            </div>
        );
    };
});

describe('FeedbackButtons', () => {
    const mockOnLogFeedback = jest.fn();
    const defaultProps: FeedbackButtonsProps = {
        feedbackType: 'school_snack',
        mealName: 'Test Meal',
        logLoading: false,
        recipes: [],
        onLogFeedback: mockOnLogFeedback,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders emojis when madeStatus is true', () => {
        render(<FeedbackButtons {...defaultProps} madeStatus={true} />);

        expect(screen.getByText('❤️')).toBeInTheDocument();
        expect(screen.getByText('👍')).toBeInTheDocument();
        expect(screen.getByText('🔧 Fix / Edit Details')).toBeInTheDocument();
    });

    it('calls onLogFeedback when emoji is clicked', () => {
        render(<FeedbackButtons {...defaultProps} madeStatus={true} />);

        fireEvent.click(screen.getByText('❤️'));
        expect(mockOnLogFeedback).toHaveBeenCalledWith(
            'school_snack', '❤️', true
        );
    });

    it('switches to edit mode when Fix/Edit is clicked', () => {
        render(<FeedbackButtons {...defaultProps} madeStatus={true} />);

        fireEvent.click(screen.getByText('🔧 Fix / Edit Details'));
        expect(screen.getByTestId('mock-input')).toBeInTheDocument();
    });

    it('calls onLogFeedback with override when edit is saved', () => {
        render(<FeedbackButtons {...defaultProps} madeStatus={true} />);

        // Enter edit mode
        fireEvent.click(screen.getByText('🔧 Fix / Edit Details'));

        // Save
        fireEvent.click(screen.getByText('Save'));

        // Check callback
        // The mock calls onSave('New Meal', false)
        // handleEditSubmit calls onLogFeedback(feedbackType, '', true, mealName, false, requestRecipe)
        expect(mockOnLogFeedback).toHaveBeenCalledWith(
            'school_snack', '', true, 'New Meal', false, false
        );
    });

    it('renders Skipped status when madeStatus is false', () => {
        render(<FeedbackButtons {...defaultProps} madeStatus={false} />);
        expect(screen.getByText(/Skipped/)).toBeInTheDocument();
    });
});
