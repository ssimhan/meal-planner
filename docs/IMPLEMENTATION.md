# Meal Planner Implementation Guide

**Last Updated:** 2026-01-01
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

### Phase 7: User Experience & Logging Improvements
- the full workflow can be managed and viewed in webpage (currently github page but maybe should switch to vercel or webapp)
-   **Quick feedback buttons:** Thumbs up/down in daily check-ins for faster logging
-   **Leftover optimizer:** Explicitly plan dinner → lunch pipelines
-   **Weekly summary email:** Adherence %, vegetables used, freezer status, upcoming week preview
-   **Web UX expansion:** Display suggested veggies, pantry/fridge/freezer details on live site

### Phase 8: Intelligence & Automation
### Phase 8: Dashboard Overhaul & Intelligence (Completed)
-   **Inventory Ingest ("Brain Dump")**: ✅ Implemented text-to-inventory parsing with editable confirmation table.
-   **Today's Schedule View**: ✅ Comprehensive card-based view on the main dashboard showing:
    -   School Snack (rotating default schedule)
    -   Kids Lunch (recipe-specific with assembly notes)
    -   Adult Lunch (leftover pipelines)
    -   Home Snack
    -   Dinner (with integrated logging and feedback buttons)
-   **Prep Interface Timeline**: ✅ Dynamic timeline displaying specific AM/PM tasks (chopping, batch cooking, assembly) based on the current day's plan.
-   **Unified Data Engine**: ✅ API merges current plan inputs with historical execution data for seamless "Today" views.
-   **Recipe Success Scoring**: ✅ Implemented emoji-to-score calculation (❤️=+3) for better meal selection.
-   **Analytics Exports**: ✅ Added support for `.json` stats generation in `analyze_trends.py`.

### Phase 9: Intelligence & Automation (Ongoing)
-   **Automated Re-planning**: Further refine the "one-click re-plan" to handle complex mid-week shifts.
-   **Weather/calendar integration**: Auto-detect busy days, suggest soups on rainy days.
-   **Recipe importer**: Paste URL → auto-extract and add to index.
-   **Weather/calendar integration:** Auto-detect busy days, suggest soups on rainy days
-   **Recipe importer:** Paste URL → auto-extract and add to index
-   **Nutrition tracking:** Calculate macros, show weekly vegetable diversity scores
-   **Meal swap feature:** Drag-and-drop to reorder dinner schedule mid-week
-   **Smart substitutions:** Suggest recipe swaps based on current inventory

### other feature requests 
- inventory add feature in web ux should work
- keep track of what each kid likes (set up profile for multiple kids, quick emoji response in daily check in for each kid, all tracked in appropriate history files)
- kid lunches are synced when possible (Peanut butter and jelly sandwich for Akira who can take nuts to school vs jelly sandwich for Anya who can't take nuts) but if one kid really loves a dinner, then they can get the leftover for lunch
- update recipe index for snack category to account for whether something can be a school snack (relatively room temp stable) or home snack (best served warm or cold) or both. 
- daily view cards updated to include differentiation between am prep, lunch for each kid, dinner, pm prep, home snack and school snack
- after daily check in, the meal plan for the rest of the week is refreshed automatically to use up what's leftover. 
- add option for "outside meal" which means we bought food or went to someone's house


---

## System Requirements

-   **Runtime:** Python 3.10+
-   **Actions Usage:** ~60 mins/month (Free tier)
-   **Success Goal:** Plan adherence >80%, Freezer backups >= 3
