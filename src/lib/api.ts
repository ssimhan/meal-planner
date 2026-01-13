// Import all types from centralized types file
import { createClient } from '@/utils/supabase/client';
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
    CaptureRecipeRequest,
    CaptureRecipeResponse,
    Analytics,
} from '@/types';

/**
 * Centered response handler to standardize error extraction
 */
async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
    if (res.status === 401) {
        // Redirect to login if unauthorized
        if (typeof window !== 'undefined') {
            window.location.href = '/login?error=Session expired. Please login again.';
        }
        throw new Error('Unauthorized');
    }
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

/**
 * Standard headers with Auth
 */
async function getAuthHeaders(includeJson: boolean = true) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${session?.access_token || ''}`,
    };
    if (includeJson) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

export async function getStatus(week?: string): Promise<WorkflowStatus> {
    const url = week ? `/api/status?week=${week}` : '/api/status';
    const res = await fetch(url, {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<WorkflowStatus>(res, 'Failed to fetch status');
}

export async function generatePlan(week_of: string): Promise<GeneratePlanResponse> {
    const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week_of }),
    });
    return handleResponse<GeneratePlanResponse>(res, 'Failed to generate plan');
}

export async function getRecipes(): Promise<RecipesResponse> {
    const res = await fetch('/api/recipes', {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<RecipesResponse>(res, 'Failed to fetch recipes');
}

export async function getInventory(): Promise<InventoryResponse> {
    const res = await fetch('/api/inventory', {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<InventoryResponse>(res, 'Failed to fetch inventory');
}

export async function createWeek(week_of?: string): Promise<CreateWeekResponse> {
    const res = await fetch('/api/create-week', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week_of }),
    });
    return handleResponse<CreateWeekResponse>(res, 'Failed to create week');
}

export async function confirmVeg(confirmed_veg: string[]): Promise<ConfirmVegResponse> {
    const res = await fetch('/api/confirm-veg', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ confirmed_veg }),
    });
    return handleResponse<ConfirmVegResponse>(res, 'Failed to confirm vegetables');
}

export async function addItemToInventory(category: string, item: string): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ category, item }),
    });
    return handleResponse<InventoryOperationResponse>(res, 'Failed to add item to inventory');
}

export async function deleteItemFromInventory(category: string, item: string): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ category, item }),
    });
    return handleResponse<InventoryOperationResponse>(res, 'Failed to delete item from inventory');
}

export async function updateInventoryItem(category: string, item: string, updates: InventoryUpdateData): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ category, item, updates }),
    });
    return handleResponse<InventoryOperationResponse>(res, 'Failed to update inventory item');
}

export async function moveInventoryItem(item: string, fromCategory: string, toCategory: string): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/move', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ item, from_category: fromCategory, to_category: toCategory }),
    });
    return handleResponse<InventoryOperationResponse>(res, 'Failed to move inventory item');
}

export async function logMeal(data: LogMealData): Promise<LogMealResponse> {
    const res = await fetch('/api/log-meal', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<LogMealResponse>(res, 'Failed to log meal');
}

export async function bulkAddItemsToInventory(items: BulkAddInventoryItem[]): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/bulk-add', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ items }),
    });
    return handleResponse<InventoryOperationResponse>(res, 'Failed to bulk add items to inventory');
}

export async function bulkUpdateInventory(changes: { category: string, item: string, operation: 'add' | 'remove' }[]): Promise<InventoryOperationResponse> {
    const res = await fetch('/api/inventory/bulk-update', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ changes }),
    });
    return handleResponse<InventoryOperationResponse>(res, 'Failed to bulk update inventory');
}

export async function importRecipe(url: string): Promise<ImportRecipeResponse> {
    const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ url }),
    });
    return handleResponse<ImportRecipeResponse>(res, 'Failed to import recipe');
}

export async function replan(): Promise<ReplanResponse> {
    const res = await fetch('/api/replan', {
        method: 'POST',
        headers: await getAuthHeaders(),
    });
    return handleResponse<ReplanResponse>(res, 'Failed to replan week');
}

export async function swapMeals(week: string, day1: string, day2: string): Promise<SwapMealsResponse> {
    const res = await fetch('/api/swap-meals', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week, day1, day2 }),
    });
    return handleResponse<SwapMealsResponse>(res, 'Failed to swap meals');
}

export async function getAnalytics(): Promise<Analytics> {
    const res = await fetch('/api/analytics', {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<Analytics>(res, 'Failed to fetch analytics');
}

export async function checkPrepTask(week: string, taskId: string, status: 'complete' | 'pending'): Promise<{ status: string }> {
    const res = await fetch('/api/check-prep', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week, task_id: taskId, status }),
    });
    return handleResponse<{ status: string }>(res, 'Failed to update prep task');
}

export async function getSuggestions(): Promise<any> {
    const res = await fetch('/api/suggestions', {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<any>(res, 'Failed to fetch suggestions');
}

export async function getLastWeekReview(): Promise<any> {
    const res = await fetch('/api/reviews/last_week', {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<any>(res, 'Failed to fetch last week review');
}

export async function submitReview(week_of: string, reviews: any[]): Promise<any> {
    const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week_of, reviews }),
    });
    return handleResponse<any>(res, 'Failed to submit review');
}

export async function getWasteNotSuggestions(): Promise<any> {
    const res = await fetch('/api/suggestions/waste-not', {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<any>(res, 'Failed to fetch waste-not suggestions');
}

export async function generateDraft(week_of: string, selections: { day: string, recipe_id: string }[]): Promise<any> {
    const res = await fetch('/api/plan/draft', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week_of, selections }),
    });
    return handleResponse<any>(res, 'Failed to generate draft plan');
}


export async function getShoppingList(week_of: string): Promise<any> {
    const res = await fetch(`/api/plan/shopping-list?week_of=${week_of}`, {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<any>(res, 'Failed to fetch shopping list');
}

export async function finalizePlan(week_of: string): Promise<any> {
    const res = await fetch('/api/plan/finalize', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week_of }),
    });
    return handleResponse<any>(res, 'Failed to finalize plan');
}

export async function saveWizardState(week_of: string, state: any): Promise<any> {
    const res = await fetch('/api/wizard/state', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week_of, state }),
    });
    return handleResponse<any>(res, 'Failed to save wizard state');
}

export async function getWizardState(week_of: string): Promise<any> {
    const res = await fetch(`/api/wizard/state?week_of=${week_of}`, {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<any>(res, 'Failed to fetch wizard state');
}

export async function captureRecipe(data: CaptureRecipeRequest): Promise<CaptureRecipeResponse> {
    const res = await fetch('/api/recipes/capture', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<CaptureRecipeResponse>(res, 'Failed to capture recipe');
}

// Re-export types for convenience
export type { WorkflowStatus, LogMealData } from '@/types';
