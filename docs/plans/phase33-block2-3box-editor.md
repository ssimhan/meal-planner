# Implementation Plan - Phase 33 Block 2: 3-Box Recipe Editor

## Goal
Overhaul the recipe editor UI to support a structured "3-Box" layout (Ingredients, Prep Steps, Cook Steps) and ensure robust persistence to both Supabase and local Markdown files.

## Current State & Issues
1.  **Viewer**: `src/app/recipes/[id]/page.tsx` reads directly from local `recipes/content/{id}.md`.
2.  **Legacy Edit**: `StorageEngine.update_recipe_content` currently writes to `recipes/details/{id}.yaml`, which is inconsistent with the Markdown viewer.
3.  **Missing Field**: "Prep Steps" exists in some Markdown files but isn't explicitly handled in `update_recipe_content`.

## Proposed Changes

### 1. Backend: Unify Persistence (Block 2.2)
#### [MODIFY] [api/utils/storage.py]
- **Refactor `update_recipe_content`**:
    -   Accept `prep_steps` as a new argument.
    -   **Primary Write**: Update Supabase `recipes` table (`content` column) by reconstructing the logic from the segments.
    -   **Secondary Write (Sync)**: Write to local `recipes/content/{id}.md` (Markdown) to keep local file system in sync.
    -   Remove `recipes/details/*.yaml` usage.
-   **Structure**: 
    ```markdown
    ---
    frontmatter...
    ---
    # Title

    ## Ingredients
    - ...

    ## Prep Steps
    - ...

    ## Instructions
    1. ...
    ```

#### [MODIFY] [api/routes/recipes.py]
-   Update `PATCH /api/recipes/<recipe_id>/content` to accept `prep_steps` and pass to StorageEngine.

### 2. Frontend: 3-Box Editor UI (Block 2.1)
#### [NEW] [src/components/RecipeEditor.tsx]
-   **Layout**: 3-column or stacked layout (responsive).
-   **Fields**:
    -   **Ingredients**: Textarea (lines).
    -   **Prep Steps**: Textarea (lines).
    -   **Instructions**: Textarea (lines).
-   **Interactivity**: 
    -   Auto-sizing textareas.
    -   "Save" button (floating or fixed).
    -   Ctrl+S support.

#### [MODIFY] [src/app/recipes/[id]/page.tsx]
-   **State**: Add `isEditing` state.
-   **Header**: Add "Edit Content" button.
-   **View**: Toggle between `RecipeScaler/RecipeDetailClientWrapper` (View) and `RecipeEditor` (Edit).
-   **Data Fetching**: Ensure we fetch the latest content from API/DB rather than just file system if possible, or trigger re-fetch after save. (Since it's a Server Component, we might need `router.refresh()`).

## Verification Plan
1.  **Manual Test**: Open a recipe, click Edit.
2.  **Verify**: "Prep Steps" box appears.
3.  **Action**: Add a prep step, modify an ingredient. Save.
4.  **Confirm**: 
    -   UI updates immediately.
    -   Local Markdown file `recipes/content/{id}.md` is updated.
    -   Supabase `recipes` table is updated.
    -   Reload page (Server Render) shows new content.
