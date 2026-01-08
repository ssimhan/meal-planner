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

## Phase 12: Architecture & Maintainability (Completed)

**Goal:** Improve long-term maintainability, reliability, and developer experience.
**Status:** ✅ All tasks complete as of 2026-01-08.

| Sub-Phase | Focus | Outcome |
|-----------|-------|---------|
| **12.1** | Component Extraction | Cleaned up `page.tsx`, extracted `Card`, `FeedbackButtons`, `DinnerLogging`. |
| **12.2** | TypeScript Interfaces | Replaced `any` with strict types across frontend/API. |
| **12.3** | Hook Stabilization | Consolidated 25+ hooks into stable state objects; fixed rules of hooks violations. |
| **12.4** | Notification & Tests | Added toast notifications, ErrorBoundary, and comprehensive backend/frontend tests. |
| **12.5** | Backend Refactoring | Modularized `api/index.py` into Flask Blueprints and `workflow.py` into a package. |
| **12.6** | Documentation | Added `CONTRIBUTING.md`, `ARCHITECTURE.md`, `API_REFERENCE.md`, `.env.example`. |
| **12.8** | Prep Step Revision | Implemented `prep_steps` in Markdown recipes and updated planning logic to prioritize them. |

---

## Future Roadmap (Phase 13+)

Currently, the system is stable and feature-complete for the core workflow. Future ideas include:

### 13.1: Freezer Ingredients
**Idea:** Track raw frozen ingredients (e.g., "Frozen Peas", "Chopped Onions") separate from confirmed backup meals.
**Value:** Allows the meal generator to suggest recipes that use up frozen ingredients.

### 13.2: Advanced Analytics
**Idea:** Visualizing trends over months (e.g., "You eat pasta 2x/week", "Anya hates mushrooms").
**Dependency:** Requires 4-8 weeks of data from Phase 6/10 execution tracking.

### 13.3: Nutrition Estimation
**Idea:** Approximate protein/veggie content based on recipe metadata.

---

### Recipe Index Backlog
*Pending recipe additions from adjustments:*
- [ ] (None currently pending)

---

## System Requirements

-   **Runtime:** Python 3.10+
-   **Actions Usage:** ~60 mins/month (Free tier)
-   **Success Goal:** Plan adherence >80%, Freezer backups >= 3
