# Meal Planner Implementation Guide

**Last Updated:** 2026-01-04
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

### 3. Execution Tracking
-   **[log_execution.py](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/scripts/log_execution.py):** Updates history and inventory based on daily logs.
-   **Vegetable Tracking:** Auto-populates fridge stock from plans and tracks consumption.

### 4. UI Framework
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

**1.5 Mobile & UX Polish** ✅
- [x] **Mobile Responsive Dashboard**: Grid uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-5` (cards stack vertically on mobile)
- [x] **Full Week View**: Dedicated `/week-view` page with table layout (desktop) and card layout (mobile)

**2. Smart Personalization (Effort: Medium) - COMPLETED 2026-01-04**
- [x] **Kid Profiles**: Update `lunch_selector.py` to handle multiple kid profiles (e.g., specific preferences/allergies like "Akira: nuts ok" vs "Anya: no nuts").
- [x] **Synced Lunches**: Logic to sync varying kid requirements (e.g., same base meal, different sides) and prioritize "loved" dinner leftovers for lunch.
- [x] **Snack Intelligence**: Update recipe metadata to distinguish between "School Safe" (room temp stable) and "Home Only" (warm/cold) snacks.

**3. Core Flow Optimization (Effort: High) - IN PROGRESS**
- [x] **Leftover Optimizer**: Explicitly plan Dinner -> Lunch pipelines in the weekly generation logic. (COMPLETED 2026-01-04)
- [x] **Smart Re-plan Refinement**: Improve the "one-click re-plan" to handle complex mid-week shifts and auto-refresh the rest of the week to use up leftovers. (COMPLETED 2026-01-04)

### Phase 11: Future Enhancements (Backlog)
-   [x] **Recipe Importer**: Paste URL → auto-extract and add to index. (COMPLETED 2026-01-04)
-   **Weather/Calendar Integration**: Auto-detect busy days, suggest soups on rainy days.
-   **Weekly Summary Email**: Adherence %, vegetables used, freezer status.
-   **Nutrition Tracking**: Calculate macros, show weekly vegetable diversity scores.
-   **Meal Swap Feature**: Drag-and-drop to reorder dinner schedule mid-week.
-   **Smart Substitutions**: Suggest recipe swaps based on current inventory.

### Recently Completed (Phase 7-10)
- [x] **Web Workflow**: Full workflow managed via webpage.
- [x] **Inventory Management**: "Brain Dump" and quick add features implemented in Web UX.
- [x] **Today's View**: Dashboard updated with distinct cards for AM prep, kid/adult lunches, dinner, PM prep, and snacks.
- [x] **Inventory Ingest**: Text-to-inventory parsing.
- [x] **Recipe Success Scoring**: Emoji-based feedback tracking.
- [x] **Phase 10 Logging System**: Complete redesign of feedback flow with Made/Not Made checkboxes, preference emojis, override logging, and sophisticated dinner alternatives (freezer selection, ate out, custom text input).


---

## System Requirements

-   **Runtime:** Python 3.10+
-   **Actions Usage:** ~60 mins/month (Free tier)
-   **Success Goal:** Plan adherence >80%, Freezer backups >= 3
