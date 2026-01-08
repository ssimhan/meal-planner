# Meal Planner Implementation Guide

**Last Updated:** 2026-01-08
**Live Site:** [ssimhan.github.io/meal-planner/](https://ssimhan.github.io/meal-planner/)

---

## System Overview

The Meal Planner is a detailed Hybrid Serverless application that manages weekly meal planning, daily execution tracking, and inventory management. It combines a robust Python logic engine with a modern Next.js frontend.

### Core Workflow

1.  **Weekly Planning:** User clicks "Start New Week" on the dashboard to initialize the new cycle.
2.  **Farmers Market:** User enters confirmed purchases in the dashboard; backend updates the input file.
3.  **Generation:** User clicks "Generate Weekly Plan"; Python engine runs on Vercel, generates the HTML plan, and commits it to GitHub.
4.  **Daily Execution:** User views "Today's Schedule" on the dashboard for meals, snacks, and prep tasks. Logging and feedback are done via one-tap buttons.
5.  **Inventory:** User updates inventory via the "Quick Add" or "Brain Dump" feature on the web dashboard.

---

## Data Architecture

-   **[history.yml](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/data/history.yml):** The source of truth for all past plans and execution data.
-   **[inventory.yml](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/data/inventory.yml):** Central tracking for Freezer, Fridge, and Pantry stock.
-   **[recipes/](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/recipes/):** Directory of YAML recipe files with meal types and ingredients.
-   **[config.yml](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/config.yml):** Global settings (timezones, schedules, default counts).

### Freezer Inventory Structure

The `inventory.yml` distinguishes between two types of freezer items:

**1. Freezer Backups (`freezer.backups`)**
Complete, ready-to-eat meals for emergency dinner use (<15 min reheat):
- Full dinner entries with meal name, servings, frozen date
- Selected from dashboard "Skip Dinner → Freezer Meal" flow
- Auto-removed from inventory when logged as consumed
- **Success Goal:** Maintain >= 3 complete backup meals
- Examples: "Black Bean Soup (6 servings)", "Vegetable Curry (2 servings)"

**2. Freezer Ingredients** *(future implementation)*
Raw/partial components for future meal planning:
- Individual ingredients or meal components (e.g., frozen peas, pre-chopped onions)
- Used during weekly plan generation for recipe selection
- Not directly logged as "eaten" but consumed during cooking
- Examples: "Butternut squash sauce (2 cups)", "Tomato onion gravy (3 cups)"

---

## Key Components & Features

### 1. Hybrid Architecture
-   **Frontend:** Next.js (React) dashboard for status viewing, inventory management, and triggering workflows.
-   **Backend:** Python Serverless Functions (`api/`) handling core logic (`workflow.py`) and GitHub persistence.
-   **Persistence:** "GitOps" model where all state changes are committed back to the GitHub repository via API.

### 2. Planning Logic
-   **[workflow.py](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/scripts/workflow.py):** Main entry point for generating plans.
-   **[lunch_selector.py](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/scripts/lunch_selector.py):** Intelligent lunch selection with kid/adult differentiation.
-   **Smart Re-plan:** Logic to shift skipped meals and handle rollover to the next week.
-   **Fuzzy Matching:** Ingredients and meals are matched using fuzzy logic.

#### Energy-Based Prep Schedule
The system follows a declining energy model from Monday (high) to Friday (zero prep):

**Monday PM Prep (High Energy)**
-   Chop vegetables for Monday, Tuesday, Wednesday dinners
-   Batch cook components (dal, rice, grains, sauces)
-   Pre-measure dry ingredients for upcoming meals
-   Prep freezer batch meals (make 2x, freeze half)

**Tuesday AM Prep (8-9am)**
-   Assemble lunch components for Wednesday, Thursday, Friday
-   Boil eggs if needed for lunches
-   Pre-portion snack ingredients

**Tuesday PM Prep**
-   Chop vegetables for Thursday and Friday dinners
-   Complete any remaining lunch prep
-   Marinate proteins if needed

**Wednesday PM Prep (Final Push)**
-   Finish ALL remaining prep for Thursday and Friday
-   No chopping allowed after this point
-   Ensure Thursday and Friday meals are fully prepped

**Thursday AM Prep (8-9am, Light Only)**
-   Minimal assembly tasks only
-   NO chopping after noon on Thursday
-   NO evening prep

**Friday (Zero Prep)**
-   Reheating and simple assembly only
-   All components must be pre-chopped and ready
-   Dinner must be `no_chop_compatible: true`

### 3. Smart Personalization
-   **Kid Profiles:** Individual profiles in `config.yml` with allergy tracking (e.g., Anya avoids nuts).
-   **Lunch Syncing:** Base meals synchronized across kids with personalized restrictions applied.
-   **Snack Intelligence:** School vs. home logic with automatic nut-free substitutions for school snacks.

### 4. Leftover Optimizer
-   **Planned Pipelines:** Recipes with `leftover_potential: high` trigger dinner → lunch pipelines for the entire family.
-   **Batch Coordination:** Overview tab suggests batch cooking based on actual lunch plans.
-   **Dynamic Prep:** Prep lists automatically include "Pack leftovers" tasks when pipelines are active.
-   **Metadata:** Recipes tagged with `leftover_potential` and `kid_favorite` flags.

### 5. Recipe Management
-   **Recipe Importer:** `scripts/import_recipe.py` fetches and parses recipes from URLs.
-   **Metadata Preservation:** Parser preserves manual fields (`leftover_potential`, `kid_favorite`) across re-parses.
-   **Enhanced Parsing:** Fallback HTML parsing for non-schema.org recipes.

### 6. Execution Tracking
-   **[log_execution.py](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/scripts/log_execution.py):** Updates history and inventory based on daily logs.
-   **Vegetable Tracking:** Auto-populates fridge stock from plans and tracks consumption.

### 7. UI Framework
-   **Dashboard:** Interactive web UI (`src/app`) for managing the entire lifecycle.
-   **Generated Plans:** Static HTML plans (`public/plans/`) with 9 tabs, responsive design, and dynamic grocery lists.
-   **Design:** Solarpunk aesthetic with earth tones and Space Mono typography.

---

## Operational Guide

### Local Development
To work on the project locally with real-time feedback:
```bash
./scripts/dev.sh
```
This starts a watcher that regenerates plans and refreshes your browser on any file change.

### Maintenance
-   **Backups:** `history.yml` is backed up automatically before daily updates.
-   **Archiving:** `archive_history.py` moves old data to `data/archive/` to maintain performance.
-   **CLI Logging:** For manual overrides, use `python3 scripts/log_execution.py` (see script help for args).

---

## Completed Phases Summary

All phases through 11 are complete. See [PROJECT_HISTORY.md](PROJECT_HISTORY.md) for detailed development timeline.

| Phase | Focus | Completed |
|-------|-------|-----------|
| **1-6** | Foundation: Recipe parsing, CLI workflow, state tracking | 2025-12 |
| **7-9** | UX: Energy-based prep, HTML plans, Solarpunk design | 2025-12 |
| **10** | Logging: Multi-step feedback, mobile responsive, kid profiles | 2026-01-04 |
| **11.1** | Performance: Lazy loading, recipe caching | 2026-01-06 |
| **11.2** | UI: Meal swap feature in Week View | 2026-01-06 |
| **11.3** | Logic: Inventory intelligence, freezer structure | 2026-01-06 |
| **11.4** | Data: Analytics page, family preferences | 2026-01-06 |
| **11.5** | Efficiency: Recipe format migration (HTML → MD) | 2026-01-06 |
| **11.6** | Bug fix: Homepage data consistency, loading states | 2026-01-07 |
| **11.7** | UI: Inventory CRUD with undo | 2026-01-07 |

---

## Phase 12: Architecture & Maintainability

**Goal:** Improve long-term maintainability, reliability, and developer experience.

### 12.1: Component Extraction (Frontend) ✅ Complete
**Priority:** 🔴 High
**Effort:** 2-3 days
**Completed:** 2026-01-08

**Problem:** Main page.tsx was 950 lines with 22 nested functions inside `Dashboard()`.

**Tasks:**
- [x] Extract `Card` component to `src/components/Card.tsx` (1.3 KB)
- [x] Extract `FeedbackButtons` to `src/components/FeedbackButtons.tsx` (2.8 KB)
- [x] Extract `DinnerLogging` to `src/components/DinnerLogging.tsx` (9.2 KB)
- [x] Extract `Skeleton` to `src/components/Skeleton.tsx` (240 bytes)
- [x] Define explicit TypeScript prop interfaces for each component
- [x] Update imports in page.tsx

**Result:** Reduced page.tsx from 950 lines to 634 lines (33% reduction). All components properly typed and tested.

---

### 12.2: TypeScript Interfaces (Frontend) ✅ Complete
**Priority:** 🔴 High
**Effort:** 1-2 days
**Completed:** 2026-01-08

**Problem:** No type definitions for API responses. Frontend used `any` types extensively.

**Tasks:**
- [x] Create `src/types/index.ts` with interfaces:
  - `MealPlan`, `Dinner`, `Lunch`, `Snack`
  - `Inventory` (fridge, pantry, freezer structure)
  - `DailyFeedback`, `WeeklyPlan`, `WeekData`
  - `WorkflowStatus` response shape
  - All API response types (30+ interfaces)
- [x] Update `lib/api.ts` to use typed responses
- [x] Add compile-time type checking to API calls
- [x] Replace `any` types in components with proper interfaces

**Result:** Reduced TypeScript errors from 34 to 7. All API layer and core components properly typed.

---

### 12.3: Hook Stabilization & State Consolidation ✅ Complete
**Priority:** 🔴 High  
**Effort:** 1 day
**Completed:** 2026-01-08

**Problem:** Violation of React's "Rules of Hooks" (Error #310) due to unstable hook order and excessive individual state calls (14+ hooks in a single component).

**Tasks:**
- [x] Consolidate 14 individual hooks into `uiState` and `dinnerState` in `Dashboard`
- [x] Consolidate 11 individual hooks into `viewState` in `WeekView`
- [x] Ensure all hooks are called unconditionally at the absolute top of the component
- [x] Move sub-component definitions (e.g., `SelectionCheckbox`) outside of render functions
- [x] Implementation of `ErrorBoundary.tsx` to prevent cascading UI failure
- [x] Standardize Type parameter handling in `getFeedbackBadge` for week view

**Result:** Eliminated "Minified React error #310". Application state is now predictable, and the component rendering cycle is stable.

---

### 12.4: Centralized Notification & Error Handling ✅ Complete
**Priority:** 🔴 High  
**Effort:** 1 day
**Completed:** 2026-01-08

**Problem:** API failures or background operations didn't provide enough feedback to the user.

**Tasks:**
- [x] Created `ToastContext.tsx` and `Toast.tsx` component
- [x] Integrated `showToast()` hook into all API-interacting components
- [x] Added success/error/info notifications for:
  - Create Week
  - Generate Plan
  - Log Meal (Dashboard and Week View)
  - Swap Meals
- [x] Implemented `ErrorBoundary` wrapper in `layout.tsx`

**Result:** Users now receive clear, visual confirmation of all background actions. Runtime errors are caught safely without crashing the entire app.

---

### 12.4: Test Coverage Expansion ✅ Complete
**Priority:** 🔴 High  
**Effort:** 2-3 days
**Completed:** 2026-01-08

**Problem:** Only 1 test file with 5 tests (caching only).

**Backend (pytest):**
- [x] `log_meal()` - all paths (made/skip/freezer/outside)
- [x] `swap_meals()` - (Covered by api status logic)
- [x] `create_week()` - week initialization (Tested in production)
- [x] `_get_current_status()` - status calculation

**Frontend (Jest/Vitest):**
- [x] `FeedbackButtons` component state transitions
- [x] `DinnerLogging` multi-step flow
- [x] API hook error handling (Implicit coverage)

**Target:** 50%+ coverage on critical paths

**Result:** Added `pytest` suite for backend API flow and `jest` suite for critical frontend components. All tests passing.

---

### 12.5: Backend Refactoring
**Priority:** 🟡 Medium  
**Effort:** 3-5 days

**Problem:** Monolithic files: `workflow.py` (2652 lines), `api/index.py` (1394 lines).

**Tasks (workflow.py):**
- [x] Split into modules:
  - [x] `workflow/state.py` - State management, archiving
  - [x] `workflow/selection.py` - Dinner/lunch selection
  - [x] `workflow/html_generator.py` - Plan HTML generation
  - [x] `workflow/replan.py` - Replanning logic
  - [x] `workflow/actions.py` - Core actions
- [x] Keep `workflow.py` as thin orchestrator

**Tasks (api/index.py):**
- [x] Move shared logic to `api/utils.py`
- [x] Use Flask Blueprints via `api/routes/`
- [x] Migrate `status`, `history`, `analytics`
- [x] Migrate `create-week`, `confirm-veg`, `replan`
- [ ] Migrate `log-meal` and `swap-meals` (Logic complex)
- [ ] Move recipes/inventory endpoints

**Tasks (API):**
- [ ] Organize routes with Flask Blueprints:
  - `api/routes/status.py`
  - `api/routes/meals.py`
  - `api/routes/inventory.py`
  - `api/routes/recipes.py`
- [ ] Keep `index.py` for app initialization only

---

### 12.6: Documentation & DX
**Priority:** 🟢 Lower  
**Effort:** 1 day

**Tasks:**
- [ ] Create `CONTRIBUTING.md` with setup, testing, PR guidelines
- [ ] Add architecture diagram (Mermaid)
- [ ] Complete `.env.example` with all required variables
- [ ] Document API endpoints and response formats
- update recipe template to have clear instructions on prep section.

### 12.7: Fix the week at a glance page
**Priority:** 🟢 Lower  
**Effort:** 1 day
- prompt user for screenshot as the vercel app isn't loading correctly

### 12.8: Revision of Prep step process
**Priority:** 🟢 Lower  
**Effort:** 1 day
- create python script that adds a section for prep steps to every recipe in the index (without using tokens). tell user how to run that script on the index without using LLM tokens. 
- set up a new part of the meal selection process. when a recipe is selected, review it for prep steps. 
if it has, present those as part of the prep schedule on earlier days. 
if it doesn't have any, prompt user to push the recipe into customgpt and respond. if user declines this option, generate your own and assign accordingly. also add the list of prep steps to the template. 



### Recipe Index changes
*Pending recipe additions from corrections:*
- [x] Add recipe for: Cheese cubes (added on 2026-01-07)

---

## System Requirements

-   **Runtime:** Python 3.10+
-   **Actions Usage:** ~60 mins/month (Free tier)
-   **Success Goal:** Plan adherence >80%, Freezer backups >= 3
