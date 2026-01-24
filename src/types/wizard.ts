import { DinnerData, SnackData, InventoryItem } from './index';

export type WizardStep =
    | 'review_meals'
    | 'review_snacks'
    | 'inventory'
    | 'suggestions'
    | 'draft'
    | 'groceries';

export type SuggestionPhase = 'dinners' | 'lunches' | 'snacks';

export type InventoryOperation = 'add' | 'remove' | 'update';
export type InventoryItemType = 'meal' | 'ingredient';

export interface PendingInventoryChange {
    category: string;
    item: string;
    quantity: number;
    type?: InventoryItemType;
    operation: InventoryOperation;
}

export interface ReviewDay {
    day: string;
    dinner: {
        planned_recipe_id: string | null;
        planned_recipe_name: string | null;
        made: boolean | null;
        actual_meal: string | null;
        leftovers: boolean | null;
        leftovers_note: string;
        leftovers_qty: number;
        instead_meal?: string;
    };
    snacks: {
        school_snack: string | null;
        home_snack: string | null;
        kids_lunch: string | null;
        adult_lunch: string | null;
    };
    planned_snacks: {
        school_snack: string | null;
        home_snack: string | null;
        kids_lunch: string | null;
    };
}

export interface InventoryState {
    meals: InventoryItem[];
    ingredients: {
        fridge: InventoryItem[];
        freezer: InventoryItem[];
        pantry: InventoryItem[];
        spice_rack: InventoryItem[];
    };
}

export interface WizardState {
    step: WizardStep;
    reviews: ReviewDay[];
    pendingChanges: PendingInventoryChange[];
    selections: any[];
    shoppingList: any[];
    purchasedItems: string[];
    customShoppingItems: string[];
    lockedDays: string[];
    leftoverAssignments: any[];
}
