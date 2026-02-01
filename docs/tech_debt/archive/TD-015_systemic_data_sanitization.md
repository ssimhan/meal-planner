# TD-015: Systemic Recipe Data Sanitization

**Status:** Resolved
**Created:** 2026-02-01
**Related Phase:** 34

## Problem Description
Currently, scripts like `workflow/html_generator.py`, `replan.py`, and `inventory_intelligence.py` utilize defensive programming locally (e.g., `recipe.get('main_veg') or []`) to handle cases where Supabase returns `None` for list fields. This is fragile because any new script accessing these fields without this specific pattern will crash with a 500 error or `TypeError`.

## Proposed Solution
Implement a centralized sanitization layer in `api/utils/storage.py` within the `StorageEngine` class.

### Goal
Ensure that `get_recipes()`, `get_recipe_details()`, and other fetch methods *always* return valid empty lists (`[]`) for list fields, never `None`. This "vaccinates" the codebase against this class of error.

## Implementation Plan

### 1. Modify `api/utils/storage.py`

Update `StorageEngine.get_recipes()` loop to explicitly sanitize metadata fields during the transformation step:

```python
# Current
return [
    {
        "id": r['id'],
        # ...
        "tags": (r.get('metadata') or {}).get('tags', []),
        # ...
    }
]

# Proposed
meta = r.get('metadata') or {}
return [
    {
        "id": r['id'],
        # ...
        "tags": meta.get('tags') or [],            # Handles None explicitly
        "main_veg": meta.get('main_veg') or [],    # Handles None explicitly
        "ingredients": meta.get('ingredients') or [],
        # ...
    }
]
```

Similarly update `StorageEngine.get_recipe_details()`.

### 2. Verification
Create a test script `scripts/test_sanitization.py` that mocks a malformed recipe response (with `None` values) and asserts that the `StorageEngine` returns clean empty lists.

## Impact
- ** Reliability:** Eliminates a common source of 500 errors.
- ** Developer Velocity:** Reduces the mental overhead of remembering "safety patterns" when writing new scripts.
