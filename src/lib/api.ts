export interface WorkflowStatus {
    week_of: string;
    state: string;
    has_data: boolean;
    status: string;
    message?: string;
    current_day?: string;
    today_dinner?: {
        day: string;
        recipe_id: string;
        made?: boolean | string;
        vegetables?: string[];
        kids_feedback?: string;
    };
    today_lunch?: {
        recipe_id?: string;
        recipe_name?: string;
        prep_style?: string;
        assembly_notes?: string;
    };
    today_snacks?: {
        school: string;
        home: string;
    };
    prep_tasks?: string[];
    week_data?: any;
}

export async function getStatus(): Promise<WorkflowStatus> {
    const res = await fetch('/api/status');
    if (!res.ok) {
        throw new Error('Failed to fetch status');
    }
    return res.json();
}

export async function generatePlan(week_of: string): Promise<any> {
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
export async function getRecipes(): Promise<any> {
    const res = await fetch('/api/recipes');
    if (!res.ok) {
        throw new Error('Failed to fetch recipes');
    }
    return res.json();
}

export async function getInventory(): Promise<any> {
    const res = await fetch('/api/inventory');
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch inventory');
    }
    return res.json();
}
export async function createWeek(week_of?: string): Promise<any> {
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

export async function confirmVeg(confirmed_veg: string[]): Promise<any> {
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

export async function addItemToInventory(category: string, item: string): Promise<any> {
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

export interface LogMealData {
    week: string;
    day: string;
    made: string | boolean;
    vegetables?: string;
    kids_feedback?: string;
    kids_complaints?: string;
    actual_meal?: string;
    made_2x?: boolean;
    freezer_meal?: string;
    reason?: string;
}

export async function logMeal(data: LogMealData): Promise<any> {
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
export async function bulkAddItemsToInventory(items: { category: string, item: string, quantity?: number, unit?: string }[]): Promise<any> {
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
