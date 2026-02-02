# TD-016: Missing Recipe IDs in Lunch Entries

## Status
- **Priority:** High (Causes 500 Errors in Planning Wizard)
- **Created:** 2026-02-01
- **Owner:** Sandhya Simhan

## Context
During the debugging of a 500 error in the Planning Wizard (`/api/plan/draft`), it was discovered that `scripts/workflow/html_generator.py` crashes with an `AttributeError: 'NoneType' object has no attribute 'startswith'`.

This is caused by `suggestion.recipe_id` being `None` for some lunch entries in the database. When the HTML generator tries to check providing special styling for pipeline meals (leftovers), it attempts to access `.startswith()` on this None value.

## Problem
- **Data Integrity:** Some rows in the `meal_plans` table (specifically in the `history_data['lunches']` JSONB column) have lunch entries where `recipe_id` is missing or null.
- **Fragile Code:** The frontend and HTML generator assume `recipe_id` is always present, leading to hard crashes instead of graceful fallbacks.
- **User Impact:** The entire planning wizard flow fails at the last step, preventing users from saving their generated plan.

## Proposed Solution
1.  **Immediate Fix:** Add defensive coding in `html_generator.py` to handle `None` recipe IDs safely.
2.  **Root Cause Fix:** Update `lunch_selector.py` to ensure it never generates a `LunchSuggestion` with a `None` ID.
3.  **Cleanup:** Run a migration script or manually clean up existing bad data in the `meal_plans` table.

## Action Items
- [ ] Patch `scripts/workflow/html_generator.py` (Done in "Debugging Empty Dinner Suggestions" task)
- [ ] Patch `scripts/lunch_selector.py` to prevent future bad data (Done in "Debugging Empty Dinner Suggestions" task)
- [ ] Create a cleanup script to identify and fix historical meal plans with missing lunch IDs.
