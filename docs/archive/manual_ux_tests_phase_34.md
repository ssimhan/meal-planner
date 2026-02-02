# Manual UX Test Plan: Phase 34 Features

This document outlines the manual verification steps for the "Robust Batch Operations" and "Modular Replacement Architecture" features.

## Prerequisites
1.  Ensure the Flask backend is running (`npm run dev:api`).
2.  Ensure the Next.js frontend is running (`npm run dev`).
3.  Open the application at `http://localhost:3000`.

---

## Part 1: Batch Editor (Tag Persistence)

**Objective**: Verify that system tags (like `imported`, `not meal`) are NOT lost when bulk updating recipes.

### Steps
1.  **Navigate to Batch Editor**:
    *   Go to [http://localhost:3000/batch-edit](http://localhost:3000/batch-edit) (or via Settings > Batch Edit).
2.  **Identify a Test Target**:
    *   Find a recipe that has the `imported` tag. If none exist, you can mentally note one recipe and assume it has hidden metadata, or manually add a tag to one via the UI first.
    *   *Tip*: You can use the search bar to filter.
3.  **Perform Edit**:
    *   Select the recipe.
    *   Add a NEW user tag, e.g., `test_tag_v1`.
    *   Optionally change the "Effort Level".
    *   **Do not** remove the `imported` tag (if visible) or any other tags.
4.  **Save**:
    *   Click "Save Changes" (or "Save All").
5.  **Verify**:
    *   Refresh the page.
    *   Check the recipe again.
    *   **Success Criteria**: The recipe should have BOTH `test_tag_v1` AND the original `imported` tag.
    *   *Failure*: If `imported` is gone, the "Smart Merge" fix is not working.

---

## Part 2: Week View (Modular Replacement)

**Objective**: Verify that the "Replace Meal" feature correctly handles text input (auto-creation) and multi-recipe selection.

### Test Case A: Auto-Creation (Legacy Text Support)
1.  **Navigate to Week View**:
    *   Go to [http://localhost:3000/week-view](http://localhost:3000/week-view).
2.  **Initiate Replace**:
    *   Find a Dinner slot (e.g., Monday).
    *   Click the **Replace** icon (or use the Edit Mode pencil).
3.  **Enter Text**:
    *   In the "Manual" tab or search box, type a meal name that **does not exist** in your index.
    *   Example: `Spontaneous Tacos Test`.
    *   *Note*: Ensure "Add this as a new recipe" checkbox explains/defaults correctly (the system should now auto-create regardless of checkbox for the slot purpose, but checking it ensures it's added to index explicitly).
4.  **Confirm**:
    *   Save/Confirm the replacement.
5.  **Verify**:
    *   The slot should show "Spontaneous Tacos Test".
    *   **Crucial Check**: If you click the meal name (if linked) or check the "Recipes" page, a new recipe named `Spontaneous Tacos Test` should exist.
    *   The system should no longer treat it as a "ghost" text string; it is a real recipe ID under the hood.

### Test Case B: Multi-Select Replacement
1.  **Initiate Replace**:
    *   Pick another slot (e.g., Tuesday).
2.  **Select Main**:
    *   Search for an existing main dish (e.g., `Roasted Chicken`). Select it.
3.  **Add Side (Pairing)**:
    *   If the UI prompts for a side (Pairing Drawer), select a side dish (e.g., `Steamed Broccoli`).
    *   If not prompted automatically, check if you can select multiple items or if the flow supports it. (Currently, the UI typically supports Main + Side via the drawer).
4.  **Confirm**:
    *   Save.
5.  **Verify**:
    *   The slot on Week View should display **both** items, e.g., "Roasted Chicken + Steamed Broccoli".
    *   This confirms the backend is storing an **array** of `recipe_ids` (`['roasted_chicken', 'steamed_broccoli']`) rather than a single string.
