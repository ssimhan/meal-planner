// Import all types from centralized types file
import type {
    WorkflowStatus,
    LogMealData,
    LogMealResponse,
    GeneratePlanResponse,
    CreateWeekResponse,
    ConfirmVegResponse,
    RecipesResponse,
    InventoryResponse,
    InventoryOperationResponse,
    InventoryUpdateData,
    BulkAddInventoryItem,
    ImportRecipeResponse,
    ReplanResponse,
    SwapMealsResponse,
    Analytics,
} from '@/types';

export async function getStatus(): Promise<WorkflowStatus> {
    const res = await fetch('/api/status');
    if (!res.ok) {
        throw new Error('Failed to fetch status');
    }
    return res.json();
}

export async function generatePlan(week_of: string): Promise<GeneratePlanResponse> {
    const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ week_of }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to generate plan');
    }
    return res.json();
}

export async function getRecipes(): Promise<RecipesResponse> {
    const res = await fetch('/api/recipes');
    if (!res.ok) {
        throw new Error('Failed to fetch recipes');
    }
    return res.json();
}

export async function getInventory(): Promise<InventoryResponse> {
    const res = await fetch('/api/inventory');
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch inventory');
    }
    return res.json();
}

export async function createWeek(week_of?: string): Promise<CreateWeekResponse> {
    const res = await fetch('/api/create-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_of }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create week');
    }
    return res.json();
}

export async function confirmVeg(confirmed_veg: string[]): Promise<ConfirmVegResponse> {
    const res = await fetch('/api/confirm-veg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed_veg }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to confirm vegetables');
    }
    return res.json();
}

export async function addItemToInventory(category: string, item: string): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, item }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to add item to inventory');
    }
    return res.json();
}

export async function deleteItemFromInventory(category: string, item: string): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, item }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete item from inventory');
    }
    return res.json();
}

export async function updateInventoryItem(category: string, item: string, updates: InventoryUpdateData): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, item, updates }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update inventory item');
    }
    return res.json();
}

export async function logMeal(data: LogMealData): Promise<LogMealResponse> {
    const res = await fetch('/api/log-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to log meal');
    }
    return res.json();
}

export async function bulkAddItemsToInventory(items: BulkAddInventoryItem[]): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to bulk add items to inventory');
    }
    return res.json();
}

export async function importRecipe(url: string): Promise<ImportRecipeResponse> {
    const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to import recipe');
    }
    return res.json();
}

export async function replan(): Promise<ReplanResponse> {
    const res = await fetch('/api/replan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to replan week');
    }
    return res.json();
}

export async function swapMeals(week: string, day1: string, day2: string): Promise<SwapMealsResponse> {
    const res = await fetch('/api/swap-meals', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ week, day1, day2 }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to swap meals');
    }
    return res.json();
}

export async function getAnalytics(): Promise<Analytics> {
    const res = await fetch('/api/analytics');
    if (!res.ok) {
        throw new Error('Failed to fetch analytics');
    }
    return res.json();
}

// Re-export types for convenience
export type { WorkflowStatus, LogMealData } from '@/types';
