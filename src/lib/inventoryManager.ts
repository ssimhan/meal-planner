import { InventoryItem, FreezerMeal } from '@/types';

export interface NormalizedInventory {
    meals: any[];  // Consolidated: Fridge leftovers + Freezer backups
    ingredients: {
        fridge: any[];
        freezer: any[];
        pantry: any[];
    };
}

/**
 * Transforms the raw inventory response from the server into an intent-first model.
 * Groups items into "Ready-to-Eat" (Meals) vs "Raw Materials" (Ingredients).
 */
export function transformInventory(data: any): NormalizedInventory {
    const rawData = data.inventory || data;
    const meals: any[] = [];

    // 1. Process Fridge items (separate meals from ingredients)
    const fridgeIngredients: any[] = [];
    (rawData.fridge || []).forEach((item: any) => {
        const itemName = typeof item === 'string' ? item : item.item;

        // Detection logic for what constitutes a "Meal" vs an "Ingredient"
        const isMeal = typeof item === 'object' && item.type === 'meal';
        const isLeftover = typeof item === 'object' && (item.is_leftover || item.category === 'leftovers');
        const nameSuggestsMeal = itemName.toLowerCase().includes('leftover') ||
            (itemName.toLowerCase().includes('meal') && !itemName.toLowerCase().includes('ingredient'));

        const processed = {
            ...(typeof item === 'object' ? item : {}),
            item: itemName,
            quantity: typeof item === 'object' && item.quantity ? item.quantity : 1,
            unit: typeof item === 'object' && item.unit ? item.unit : 'unit',
            type: (isMeal || isLeftover || nameSuggestsMeal) ? 'meal' : 'ingredient',
            location: 'fridge'
        };

        if (processed.type === 'meal') {
            meals.push(processed);
        } else {
            fridgeIngredients.push(processed);
        }
    });

    // 2. Process Freezer items
    const freezerIngredients: any[] = [];
    (rawData.freezer?.backups || []).forEach((b: any) => {
        meals.push({
            ...b,
            item: b.meal,
            quantity: b.servings || 1,
            type: 'meal',
            location: 'freezer'
        });
    });

    (rawData.freezer?.ingredients || []).forEach((i: any) => {
        freezerIngredients.push({
            ...i,
            type: 'ingredient',
            location: 'freezer'
        });
    });

    return {
        meals,
        ingredients: {
            fridge: fridgeIngredients,
            freezer: freezerIngredients,
            pantry: [
                ...(rawData.pantry || []),
                ...(rawData.spice_rack || [])
            ].map((item: any) => ({
                ...(typeof item === 'object' ? item : {}),
                item: typeof item === 'string' ? item : item.item,
                quantity: typeof item === 'object' && item.quantity ? item.quantity : 1,
                unit: typeof item === 'object' && item.unit ? item.unit : 'unit'
            }))
        }
    };
}
