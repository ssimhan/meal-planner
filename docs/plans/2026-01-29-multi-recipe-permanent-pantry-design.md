# Design Doc: Phase 34 - Frictionless Shopping & Recipe Loop

Frictionless coordination of meal planning and shopping through modular recipe pairings and intelligent pantry filtering.

## 1. Problem Statement
The current system treats meal slots as single-recipe entries, forcing users to create composite recipe names (e.g., "Rasam rice and beetroot kai"). This makes recipe management rigid and complicates shopping list generation. Additionally, common staples ("Permanent Pantry") unnecessarily clutter the inventory and shopping list.

## 2. Proposed Solution

### 2.1 Modular "Main + Side" Relationships (Option A)
Instead of manual linking, the system will use **Cooking History** to suggest side dishes.
- **Data Model**: Update `meal_plans.plan_data` to support a `recipe_ids` array per slot. Add `requires_side` boolean to recipe metadata.
- **Pairing Engine**: A service that queries `history_data` for co-occurrence. If Recipe A (Main) and Recipe B (Side) appear in the same slot frequently, Recipe B becomes a "Top Recommendation" when Recipe A is selected.

### 2.2 Permanent Pantry
A household-level configuration to exclude "always-in-stock" items from the shopping list.
- **Default List**: Indian spices (mustard, turmeric, etc.), rice, atta, salt, pepper, garlic powder.
- **Implementation**: `GroceryMapper.get_shopping_list()` will filter out any item found in the `permanent_pantry` config.

## 3. Architecture & Data Flow

### 3.1 Metadata & Schema Changes
- **Recipes**: Add optional `tags` (e.g., `main`, `side`) and `requires_side: boolean` to metadata for better filtering.
- **Meal Plans**: Transition from `recipe_id: string` to `recipe_ids: string[]` in the JSONB schema.

### 3.2 Sequence: Planning a Modular Meal
1. User selects a "Main" recipe.
2. If `requires_side` is true, the **Pairing Drawer** appears automatically. Otherwise, a "Add Side" button is available.
3. The Drawer shows:
   - "Frequently Paired With" (History-based).
   - "Quick Side Filter" (Shows only recipes tagged as `side`).
4. User adds one or more sides.
4. Shopping engine aggregates ingredients from ALL selected recipes.

## 4. UI/UX Design (Premium Aesthetics)
- **Domain**: Tempering, Saffron, Pairing, Staple.
- **Signature**: The **Pairing Drawer** - a smooth, side-sliding panel with high-density cards for quick "Side" additions.
- **Visuals**: Earthy tones (Turmeric, Beetroot, Cardamom) with subtle shadows for depth.

## 5. Failure Modes & Fallbacks
- **No History**: Fall back to showing all recipes tagged as `main`. Provide a toggle to flip between "Mains" and "Sides" in the selector.
- **Bulk tagging**: Since most recipes are currently "mains", we will default untagged recipes to `main` and provide a bulk-tagging interface for `side` recipes.
- **Duplicate Ingredients**: Logic must deduplicate before summing quantities.

## 6. Success Criteria
- [ ] Zero composite recipe names in the active plan.
- [ ] Shopping list contains 0 items from the "Permanent Pantry" list.
- [ ] "Must-have sides" appear automatically based on previous choices.
