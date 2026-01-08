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

/**
 * Centered response handler to standardize error extraction
 */
async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
    if (!res.ok) {
        let errorMessage = fallbackMessage;
        try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorData.error || fallbackMessage;
        } catch (e) {
            // If body is not JSON, use fallback or status text
            errorMessage = `${fallbackMessage}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
    }
    return res.json();
}

export async function getStatus(): Promise<WorkflowStatus> {
    const res = await fetch('/api/status');
    return handleResponse<WorkflowStatus>(res, 'Failed to fetch status');
}

export async function generatePlan(week_of: string): Promise<GeneratePlanResponse> {
    const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ week_of }),
    });
    return handleResponse<GeneratePlanResponse>(res, 'Failed to generate plan');
}

export async function getRecipes(): Promise<RecipesResponse> {
    const res = await fetch('/api/recipes');
    return handleResponse<RecipesResponse>(res, 'Failed to fetch recipes');
}

export async function getInventory(): Promise<InventoryResponse> {
    const res = await fetch('/api/inventory');
    return handleResponse<InventoryResponse>(res, 'Failed to fetch inventory');
}

export async function createWeek(week_of?: string): Promise<CreateWeekResponse> {
    const res = await fetch('/api/create-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_of }),
    });
    return handleResponse<CreateWeekResponse>(res, 'Failed to create week');
}

export async function confirmVeg(confirmed_veg: string[]): Promise<ConfirmVegResponse> {
    const res = await fetch('/api/confirm-veg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed_veg }),
    });
    return handleResponse<ConfirmVegResponse>(res, 'Failed to confirm vegetables');
}

export async function addItemToInventory(category: string, item: string): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, item }),
    });
    return handleResponse<InventoryOperationResponse>(res, 'Failed to add item to inventory');
}

export async function deleteItemFromInventory(category: string, item: string): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, item }),
    });
    return handleResponse<InventoryOperationResponse>(res, 'Failed to delete item from inventory');
}

export async function updateInventoryItem(category: string, item: string, updates: InventoryUpdateData): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, item, updates }),
    });
    return handleResponse<InventoryOperationResponse>(res, 'Failed to update inventory item');
}

export async function logMeal(data: LogMealData): Promise<LogMealResponse> {
    const res = await fetch('/api/log-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<LogMealResponse>(res, 'Failed to log meal');
}

export async function bulkAddItemsToInventory(items: BulkAddInventoryItem[]): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
    });
    return handleResponse<InventoryOperationResponse>(res, 'Failed to bulk add items to inventory');
}

export async function importRecipe(url: string): Promise<ImportRecipeResponse> {
    const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
    });
    return handleResponse<ImportRecipeResponse>(res, 'Failed to import recipe');
}

export async function replan(): Promise<ReplanResponse> {
    const res = await fetch('/api/replan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return handleResponse<ReplanResponse>(res, 'Failed to replan week');
}

export async function swapMeals(week: string, day1: string, day2: string): Promise<SwapMealsResponse> {
    const res = await fetch('/api/swap-meals', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ week, day1, day2 }),
    });
    return handleResponse<SwapMealsResponse>(res, 'Failed to swap meals');
}

export async function getAnalytics(): Promise<Analytics> {
    const res = await fetch('/api/analytics');
    return handleResponse<Analytics>(res, 'Failed to fetch analytics');
}

// Re-export types for convenience
export type { WorkflowStatus, LogMealData } from '@/types';
