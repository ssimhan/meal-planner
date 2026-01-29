# Implementation Plan - Phase 33 Block 1: Recipe Link Extraction

## Goal
Implement a robust, automated recipe extraction workflow using the `recipe-scrapers` library to import recipes from URL, with a verification step to ensure data quality before saving.

## Architecture
- **Backend (Flask)**: New `/api/recipes/extract` endpoint using `recipe-scrapers` for standardized parsing.
- **Frontend (Next.js)**: New `ImportRecipeModal` component with a multi-step wizard (Input -> Verify -> Save).
- **Pattern**: 
  - **Facade Pattern** to wrap the scraper library and normalize its output to our internal schema.
  - **DTO Pattern** for the standardized recipe structure between API and UI.

## Technology Stack
- **Backend**: Python (Flask), `recipe-scrapers` (New Dependency)
- **Frontend**: React, Lucide React (icons), Tailwind CSS
- **Testing**: Pytest (Backend), Jest (Frontend)

## User Review Required
> [!NOTE]
> **New Dependency**: We will add `recipe-scrapers` to `requirements.txt`. It is a free, open-source library that handles parsing for 100+ major sites.

## Proposed Changes

### Phase 1: Backend Extraction Logic (Block 1.1)
#### [NEW] [api/utils/scrapers.py](file:///Users/sandhya.simhan/Desktop/GitHub%20Repos/meal-planner/api/utils/scrapers.py)
- Implement `extract_recipe_from_url(url: str) -> dict`
- Handle `SchemaOrg` fallback for generic sites.
- Normalize output: Name, Ingredients[], Instructions[], Time, Yields.

#### [MODIFY] [requirements.txt](file:///Users/sandhya.simhan/Desktop/GitHub%20Repos/meal-planner/requirements.txt)
- Add `recipe-scrapers`

#### [MODIFY] [api/routes/recipes.py](file:///Users/sandhya.simhan/Desktop/GitHub%20Repos/meal-planner/api/routes/recipes.py)
- Create POST `/api/recipes/extract` that calls the scraper utility.

#### [NEW] [tests/test_extraction.py](file:///Users/sandhya.simhan/Desktop/GitHub%20Repos/meal-planner/tests/test_extraction.py)
- Integration test with sample URLs (using mocked HTML to avoid network calls in test suite).

### Phase 2: Frontend Import UI (Block 1.2 & 1.3)
#### [NEW] [src/components/ImportRecipeModal.tsx](file:///Users/sandhya.simhan/Desktop/GitHub%20Repos/meal-planner/src/components/ImportRecipeModal.tsx)
- **Step 1: Input**: URL input field. Loading spinner.
- **Step 2: Verification**: 
  - Editable form for Name, Ingredients list, and Instructions steps using our 3-box layout.
  - "Save to Cookbook" action.

#### [MODIFY] [src/app/recipes/page.tsx](file:///Users/sandhya.simhan/Desktop/GitHub%20Repos/meal-planner/src/app/recipes/page.tsx)
- Add "Import Recipe" button to the header/toolbar actions.

## Verification Plan

### Automated Tests
- **Backend**: Run `pytest tests/test_extraction.py` to verify the scraper integration and schema normalization.

### Manual Verification
1.  **Setup**: Install new requirements (`pip install -r requirements.txt`).
2.  **Server**: Start backend and frontend.
3.  **Action**: Click "Import Recipe".
4.  **Test Case 1**: Import a recipe from **AllRecipes** or **Serious Eats**. Verify ingredients and steps are parsed correctly.
5.  **Test Case 2**: Import from a generic blog (uses Schema.org fallback).
6.  **Persistence**: Save and verify the recipe is created in the database.
