# Meal Planner Implementation Guide

**Last Updated:** 2026-01-05
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

## Future Roadmap

### Phase 10: Immediate Priorities (High ROI) - COMPLETED 2026-01-04
**1. Logging Completeness** ✅
- [x] **Enhanced Feedback System**: Redesigned all meal logging with multi-step flow
    - **Made/Not Made First**: Binary choice (✓ Made or ✗ Skip) for all meal slots
    - **Preference Emojis**: After "Made" → show ❤️ 👍 😐 👎 ❌ for feedback
    - **Override Logging**: After "Skip" → text input for "What did you eat instead?"
    - **Applied to**: School Snack, Kids Lunch, Adult Lunch, Home Snack, Dinner
- [x] **Sophisticated Dinner Flow**: Multi-step alternatives when plan not followed
    - Step 1: Made as Planned or Did Not Make
    - Step 2: If not made → Choose: Freezer Meal / Ate Out / Something Else
    - Step 3a: Freezer → Radio button selection from inventory (auto-removes used meal)
    - Step 3b: Ate Out → Simple confirmation
    - Step 3c: Something Else → Text input for custom entry
- [x] **Data Structure**: New `daily_feedback` structure in `history.yml` stores all feedback + made status
- [x] **State Stability (Batch 3)**: Fixed dashboard re-render issues by lifting `DinnerLogging` state to the parent component, ensuring "Skip" alternatives remain open during data refreshes.

**1.5 Mobile & UX Polish** ✅ - COMPLETED 2026-01-04
- [x] **Mobile Responsive Dashboard**: Grid uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-5` (cards stack vertically on mobile)
- [x] **Full Week View**: Dedicated `/week-view` page with enhanced features:
    - **Desktop**: Table layout with alternating row colors, "Today" column highlighting, feedback badges
    - **Mobile**: Card layout with collapsible sections and feedback indicators
    - **Features**: Vegetable tracking display, energy-based prep schedule, freezer inventory status
    - **Navigation**: Direct link from dashboard when plan is active
    - **Correction Workflow (2026-01-04)**: Inline `CorrectionInput` for all meal types; "Actual Meal" priority display logic ensures history reflects what was actually eaten.
    - **Recipe Harvest**: Integrated prompt to add corrections as official recipes to the index.

**2. Smart Personalization (Effort: Medium) - COMPLETED 2026-01-04**
- [x] **Kid Profiles**: Update `lunch_selector.py` to handle multiple kid profiles (e.g., specific preferences/allergies like "Akira: nuts ok" vs "Anya: no nuts").
- [x] **Synced Lunches**: Logic to sync varying kid requirements (e.g., same base meal, different sides) and prioritize "loved" dinner leftovers for lunch.
- [x] **Snack Intelligence**: Update recipe metadata to distinguish between "School Safe" (room temp stable) and "Home Only" (warm/cold) snacks.

**3. Core Flow Optimization (Effort: High) - IN PROGRESS**
- [x] **Leftover Optimizer**: Explicitly plan Dinner -> Lunch pipelines in the weekly generation logic. (COMPLETED 2026-01-04)
- [x] **Smart Re-plan Refinement**: Improve the "one-click re-plan" to handle complex mid-week shifts and auto-refresh the rest of the week to use up leftovers. (COMPLETED 2026-01-04)

### Phase 11: Future Enhancements (Backlog)

#### Block 1: Performance Optimization (Backend) - COMPLETED 2026-01-06
**Focus:** Lazy Loading Recipe Details
- **Goal:** Reduce token usage and improve plan generation speed by 80-90%.
- **Tasks:**
  - [x] Refactor `workflow.py` to load lightweight `recipes/index.yml` first.
  - [x] Implement on-demand fetching of full recipe YAMLs only for selected meals.
  - [x] Add simple in-memory caching for recipe details in the API.

#### Block 2: Drag-and-Drop Schedule Management (Frontend/UI) - COMPLETED 2026-01-06
**Focus:** Meal Swap Feature
- **Goal:** Allow users to easily rearrange their week when plans change.
- **Tasks:**
  - [x] Create a "Swap" UI in the Week View (or Dashboard).
  - [x] Implement logic to switch dinner slots (e.g., move Tuesday's Tacos to Thursday).
  - [x] Update prep instructions to reflect the new order.

#### Block 3: Inventory Intelligence (Logic) - COMPLETED 2026-01-06
**Focus:** Smart Substitutions & Freezer Management
- **Goal:** Help users use up what they have.
- **Tasks:**
  - [x] Implement logic to scan `inventory.yml` against the recipe index.
  - [x] Create a "What can I replace this with?" suggestion modal on the Dashboard.
  - [x] **BUG FIX:** Separate freezer backups (complete meals) from freezer ingredients (components)
    - [x] Currently all items mixed in `freezer.backups` array
    - [x] Need distinct `freezer.backups` vs `freezer.ingredients` structures
    - [x] Only backups should appear in "Skip Dinner → Freezer Meal" flow
    - [x] Only backups count toward ">= 3 backup meals" success metric

#### Block 4: Recipe & Family Analytics (Data) - COMPLETED 2026-01-06
**Focus:** Recipe Performance & Family Preferences
- **Goal:** Surface insights on what's working and what kids actually enjoy.
- **Implementation:**
  - **UI Location:** Dedicated `/analytics` page (linked from dashboard)
  - **Time Range:** Default to last 12 weeks (3 months), with option to view all-time
  - **Data Refresh:** Daily batch job (pre-computed analytics cached for performance)
  - **Retirement Thresholds:** Flag recipes with avg feedback < 😐, skip rate >50%, unused 6+ months, or consistent kid dislike
- **Tasks:**
  - [x] Create `/analytics` page with navigation from dashboard
  - [x] Implement daily batch job to compute analytics from `history.yml`
  - [x] **Recipe Popularity Table**: Rank by frequency + avg feedback score (last 12 weeks)
  - [x] **Kid Preference Cards**: Per-child favorite recipes, cuisines, and emoji distribution charts
  - [x] **Dinner Adherence Chart**: Made vs. skipped percentage over time
  - [x] **Leftover Pipeline Success**: Track dinner→lunch conversions vs. waste
  - [x] **Cuisine Diversity Pie Chart**: Weekly/monthly rotation balance (Indian/Mexican/Italian/etc.)
  - [x] **Snack Success Rate**: School vs. home snack performance with kid feedback
  - [x] **Recipe Retirement List**: Flagged recipes with reasons (low score/high skip/unused/kid dislike)
  - [x] **Family Favorites Widget**: Small dashboard card showing top 5 this month (links to full analytics)

#### Block 5: Recipe Format Migration (Efficiency) - COMPLETED 2026-01-06
**Focus:** Token Efficiency & Context Window
- **Goal:** Reduce recipe token count by >70% by migrating from HTML to Markdown.
- **Implementation:**
  - **Strategy:** Big bang migration - convert all 227 recipes at once
  - **Format:** YAML frontmatter + Markdown body (replace current HTML `content` field)
  - **Testing:** Validate migration on dev branch before production deployment
- **Tasks:**
  - [x] Design new recipe format schema (frontmatter fields + markdown structure)
  - [x] Create migration script (`scripts/migrate_to_md.py`) to convert all recipes
  - [x] Update `scripts/parse_recipes.py` to read/write new format
  - [x] Create React component (`RecipeViewer`) for rendering markdown recipes using `react-markdown`.
  - [x] Test migration on sample recipes (full migration successful)
  - [x] Run full migration on all 227 recipes
  - [x] Verify generated plans still render correctly
  - [x] Update recipe importer to use new format for future imports

#### Block 6: Homepage Data Consistency (Bug Fix)
**Focus:** UI State Sync
- **Goal:** Ensure homepage accurately reflects current meal plan and confirmation status.
- **Known Issues:**
  - **Stale Meal Data:** Today's Schedule shows outdated meals/prep after logging
  - **Farmers Market Status:** Vegetable confirmation doesn't reflect actual state in input file
  - **General Investigation:** Need to audit all data refresh triggers
- **Tasks:**
  - [ ] Audit dashboard data fetching (identify all API calls and refresh triggers)
  - [ ] Fix stale "Today's Schedule" after meal logging (ensure immediate refresh)
  - [ ] Fix farmers market confirmation status sync with input file
  - [ ] Add client-side cache invalidation strategy (when to force refetch)
  - [ ] Test rapid logging scenarios (multiple meals in quick succession)
  - [ ] Add loading states to prevent showing stale data during refresh

#### Block 7: Inventory Management Enhancements (UI)
**Focus:** CRUD Operations
- **Goal:** Allow full control over inventory items from the UI.
- **Implementation:**
  - **UI Location:** Inline controls on existing dashboard inventory display
  - **Edit UX:** Click item to open inline edit mode (quantity/servings field)
  - **Delete UX:** Trash icon per item, no confirmation dialog, 5-second undo toast
  - **Undo Buffer:** Track last deletion for quick restore
- **Tasks:**
  - [ ] Add edit/delete icons to each inventory item (freezer, fridge, pantry)
  - [ ] Implement inline edit mode for quantities (enter to save, esc to cancel)
  - [ ] Create delete API endpoint (`/api/inventory/delete`)
  - [ ] Implement undo toast notification with restore action
  - [ ] Add optimistic UI updates (instant feedback before API response)
  - [ ] Handle edge cases (delete while undo pending, rapid edits)
  - [ ] Add keyboard shortcuts (e for edit, delete key to remove selected item)

### Recently Completed (Phase 7-10)
- [x] **Web Workflow**: Full workflow managed via webpage.
- [x] **Inventory Management**: "Brain Dump" and quick add features implemented in Web UX.
- [x] **Today's View**: Dashboard updated with distinct cards for AM prep, kid/adult lunches, dinner, PM prep, and snacks.
- [x] **Inventory Ingest**: Text-to-inventory parsing.
- [x] **Recipe Success Scoring**: Emoji-based feedback tracking.
- [x] **Phase 10 Logging System**: Complete redesign of feedback flow with Made/Not Made checkboxes, preference emojis, override logging, and sophisticated dinner alternatives.
- [x] **Meal Correction Workflow**: Inline editing in Week View with "Actual over Planned" display priority and automated recipe index request flow.


### Recipe Index changes
*Pending recipe additions from corrections:*
- [ ] Add recipe for: Avocado packs (requested on 2026-01-06)
- [x] Add recipe for: Crackers and cheese cubes (requested on 2026-01-06, added on 2026-01-06)
- [x] Add recipe for: Blackberries (requested on 2026-01-06, added on 2026-01-06)
- [x] Add recipe for: Rasam rice and beetroot (requested on 2026-01-06, added on 2026-01-06)
- [x] Add recipe for: Rasam rice and carrot (added on 2026-01-06)
- [x] Add recipe for: Pesto gnocchi (requested on 2026-01-06, added on 2026-01-06)
- [x] Add recipe for: Rasam rice and broccoli (requested on 2026-01-05, added on 2026-01-05)

---

## System Requirements

-   **Runtime:** Python 3.10+
-   **Actions Usage:** ~60 mins/month (Free tier)
-   **Success Goal:** Plan adherence >80%, Freezer backups >= 3
