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
    ExtractRecipeResponse,
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
        // Support for disabling auth in local development
        if (process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true') {
            console.warn('Auth disabled: Ignoring 401 error');
            return res.json();
        }
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

            // Create enhanced error object
            const error: any = new Error(errorMessage);
            error.code = errorData.code;
            error.details = errorData.details;
            throw error;
        } catch (e) {
            // If body is not JSON or other parsing error, use fallback
            if (e instanceof Error && (e as any).code) throw e; // Re-throw enhanced error

            errorMessage = `${fallbackMessage}: ${res.statusText}`;
            throw new Error(errorMessage);
        }
    }
    return res.json();
}

/**
 * Standard headers with Auth
 */
export async function getAuthHeaders(includeJson: boolean = true) {
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
        cache: 'no-store'
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
        cache: 'no-store'
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

export async function extractRecipe(url: string): Promise<ExtractRecipeResponse> {
    const res = await fetch('/api/recipes/extract', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ url }),
    });
    return handleResponse<ExtractRecipeResponse>(res, 'Failed to extract recipe');
}

export async function replan(notes?: string, strategy: 'shuffle' | 'fresh' = 'shuffle', keep_days: string[] = [], prep_days: string[] = []): Promise<ReplanResponse> {
    const res = await fetch('/api/replan', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ notes, strategy, keep_days, prep_days }),
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

export async function bulkCheckPrepTasks(week: string, taskIds: string[], status: 'complete' | 'pending'): Promise<{ status: string }> {
    const res = await fetch('/api/prep/bulk-check', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week, task_ids: taskIds, status }),
    });
    return handleResponse<{ status: string }>(res, 'Failed to update prep tasks');
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

export async function getSuggestOptions(selections: any[] = [], leftovers: any[] = []): Promise<any> {
    const res = await fetch('/api/plan/suggest-options', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ selections, leftovers }),
    });
    return handleResponse<any>(res, 'Failed to fetch plan suggestions');
}

export async function generateDraft(
    week_of: string,
    selections: { day: string, slot: string, recipe_id: string, recipe_name: string }[],
    locked_days: string[] = [],
    leftovers: { day: string, slot: string, item: string }[] = [],
    exclude_defaults: string[] = []
): Promise<any> {
    const res = await fetch('/api/plan/draft', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week_of, selections, locked_days, leftovers, exclude_defaults }),
    });
    return handleResponse<any>(res, 'Failed to generate draft plan');
}


export async function getShoppingList(week_of: string): Promise<any> {
    const res = await fetch(`/api/plan/shopping-list?week_of=${week_of}`, {
        headers: await getAuthHeaders(false),
        cache: 'no-store'
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

export async function updateRecipeMetadata(recipeId: string, updates: any): Promise<any> {
    const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify(updates),
    });
    return handleResponse<any>(res, 'Failed to update recipe metadata');
}

export async function deleteRecipe(recipeId: string): Promise<any> {
    const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
    });
    return handleResponse<any>(res, 'Failed to delete recipe');
}

export async function searchRecipes(query: string): Promise<any> {
    const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(query)}`, {
        headers: await getAuthHeaders(),
    });
    return handleResponse<any>(res, 'Failed to search recipes');
}

export async function getRecipeContent(recipeId: string): Promise<any> {
    const res = await fetch(`/api/recipes/${recipeId}/content`, {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<any>(res, 'Failed to get recipe content');
}

export async function updateRecipeContent(
    recipeId: string,
    ingredients?: string[],
    instructions?: string[],
    name?: string,
    cuisine?: string,
    effort_level?: string,
    tags?: string[]
): Promise<any> {
    const res = await fetch(`/api/recipes/${recipeId}/content`, {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ ingredients, instructions, name, cuisine, effort_level, tags }),
    });
    return handleResponse<any>(res, 'Failed to update recipe content');
}

export async function ignoreRecipe(name: string): Promise<any> {
    const res = await fetch('/api/recipes/ignore', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ name }),
    });
    return handleResponse<any>(res, 'Failed to ignore recipe');
}

export async function savePreference(ingredient: string, brand: string): Promise<any> {
    const res = await fetch('/api/settings/preference', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ ingredient, brand }),
    });
    return handleResponse<any>(res, 'Failed to save preference');
}

// Re-export types for convenience
export type { WorkflowStatus, LogMealData } from '@/types';
// Groceries & Stores
// Groceries & Stores
export async function getStores() {
    const res = await fetch('/api/groceries/stores', {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<{ stores: string[] }>(res, 'Failed to fetch stores');
}

export async function addStore(name: string) {
    const res = await fetch('/api/groceries/stores', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ name }),
    });
    return handleResponse<{ stores: string[] }>(res, 'Failed to add store');
}

export async function mapItemToStore(item: string, store: string) {
    const res = await fetch('/api/groceries/map', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ item, store }),
    });
    return handleResponse<any>(res, 'Failed to map item');
}

export async function addShoppingListExtras(weekOf: string, items: string[]) {
    const res = await fetch('/api/plan/shopping-list/add', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week_of: weekOf, items }),
    });
    return handleResponse<any>(res, 'Failed to add items');
}

export async function removeShoppingListExtra(weekOf: string, item: string) {
    const res = await fetch('/api/plan/shopping-list/remove-extra', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week_of: weekOf, item }),
    });
    return handleResponse<any>(res, 'Failed to remove extra item');
}

export async function smartAction(weekOf: string, item: string, action: 'add_to_inventory' | 'exclude_from_plan') {
    const res = await fetch('/api/plan/shopping-list/smart-update', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week_of: weekOf, item, action }),
    });
    return handleResponse<any>(res, 'Failed to perform smart action');
}

export async function getSettings() {
    const res = await fetch('/api/settings', {
        headers: await getAuthHeaders(false),
    });
    return handleResponse<any>(res, 'Failed to fetch settings');
}

export async function saveSettings(settings: any) {
    const res = await fetch('/api/settings', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(settings),
    });
    return handleResponse<any>(res, 'Failed to save settings');
}
export async function deleteWeek(week_of: string): Promise<any> {
    const res = await fetch('/api/delete-week', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ week_of }),
    });
    return handleResponse<any>(res, 'Failed to delete week');
}
