# TD-017: Refactor `meals.py` Monolith

## Status
- **Priority:** Medium (Maintenance/Scalability)
- **Created:** 2026-02-01
- **Owner:** TBD

## Context
The `api/routes/meals.py` file has grown significantly, currently exceeding 1000 lines. It acts as a central controller for a wide variety of meal-related functionality, including:
- Plan Generation & Drafting
- Meal Logging & Tracking
- Shopping List Generation
- Meal Swapping & Manipulation
- Vegetable Confirmation
- Prep Task Management

## Problem
- **Cognitive Load:** The file is too large to easily reason about. finding a specific route requires searching.
- **Mixed Concerns:** It mixes distinct domains:
    - *Planning* (Future-focused, heavy logic)
    - *Tracking* (Present-focused, state updates)
    - *Shopping* (Derivative data)
- **Maintainability:** As new features are added (like "Batch Editor" or "Smart Shopping"), this file tends to be the default dumping ground, exacerbating the issue.

## Proposed Solution
Refactor `meals.py` by splitting it into domain-specific route modules.

### Suggested Split
1.  **`api/routes/planning.py`**
    - `generate_plan_route`
    - `generate_draft_route`
    - `create_week`
    - `replan_route`
    - `finalize_plan_route`
    - `suggest_options_route` (maybe?)

2.  **`api/routes/tracking.py`**
    - `log_meal`
    - `swap_meals`
    - `confirm_veg`
    - `check_prep_task`
    - `bulk_check_prep_tasks`
    - `update_plan_with_actuals`

3.  **`api/routes/shopping.py`**
    - `get_shopping_list_route`

4.  **`api/routes/suggestions.py`** (Optional, or keep in `recipes.py` or `planning.py`)
    - `get_paired_recipes_route`

## Implementation Steps
1.  Create new blueprint files in `api/routes/`.
2.  Move route functions and their specific imports to the new files.
3.  Update `api/__init__.py` (or where blueprints are registered) to register the new blueprints.
4.  Ensure `meals_bp` is either deprecated or kept as a shell if needed for backward compatibility (though API routes shouldn't change if endpoints remain the same). *Note: Blueprint names might change, so existing frontend calls might need checking if they rely on `url_for` with blueprint names, specifically.*

## Risks
- **`url_for` References:** If the frontend or Jinja templates use `url_for('meals.some_route')`, these will break if the blueprint name changes.
    - *Mitigation:* Keep the Blueprint name as `meals` for the main chunk (e.g., tracking) or alias them, or (better) do a global search and replace in the frontend/templates.
- **Circular Imports:** Watch out for shared utility imports.
