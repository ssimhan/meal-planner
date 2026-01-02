# Meal Planner Implementation Guide

**Last Updated:** 2026-01-01
**Live Site:** [ssimhan.github.io/meal-planner/](https://ssimhan.github.io/meal-planner/)

---

## System Overview

The Meal Planner is a semi-automated system that manages weekly meal planning, daily execution tracking, and inventory management using GitHub Actions, Python scripts, and static HTML pages.

### Core Workflow

1.  **Weekly Planning (Sat 5am PST):** GitHub Action creates a PR with vegetable suggestions.
2.  **Review & Merge:** User reviews veggies in the PR, merges to trigger full plan generation.
3.  **Generation:** Plan auto-deploys to GitHub Pages with Groceries, Prep, and Pantry/Freezer views.
4.  **Daily Check-in (8pm PST):** GitHub Action creates an issue for meal logging.
5.  **Logging:** User responds to the issue; system parses the comment to update `history.yml` and `inventory.yml`.

---

## Data Architecture

-   **[history.yml](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/data/history.yml):** The source of truth for all past plans and execution data.
-   **[inventory.yml](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/data/inventory.yml):** Central tracking for Freezer, Fridge, and Pantry stock.
-   **[recipes/](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/recipes/):** Directory of YAML recipe files with meal types and ingredients.
-   **[config.yml](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/config.yml):** Global settings (timezones, schedules, default counts).

---

## Key Components & Features

### 1. Automation Engine
-   **Workflows:** Located in `.github/workflows/` for deployment, planning, and check-ins.
-   **Validation:** `validate_yaml.py` and `test_logic.py` run on every push to ensure data integrity.

### 2. Planning Logic
-   **[workflow.py](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/scripts/workflow.py):** Main entry point for generating plans.
-   **[lunch_selector.py](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/scripts/lunch_selector.py):** Intelligent lunch selection with kid/adult differentiation.
-   **Smart Re-plan:** `workflow.py` includes `replan` logic to shift skipped meals and handle rollover to the next week.
-   **Fuzzy Matching:** Ingredients and meals are matched using fuzzy logic to handle manual variations.

### 3. Execution Tracking
-   **[log_execution.py](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/scripts/log_execution.py):** Updates history and inventory based on daily logs.
-   **Vegetable Tracking:** Auto-populates fridge stock from plans and tracks consumption.
-   **Kids Feedback:** Captures feedback and complaints to refine future plans.

### 4. UI Framework
-   **Templates:** `templates/` directory contains HTML templates for the landing page and weekly plans.
-   **Responsive Design:** Optimized for mobile use with compact cards and clear hierarchy.
-   **Dynamic Groceries:** Categorized shopping lists generated from selected recipes.

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

### Phase 7: Learning & Adaptation
-   **Analytics:** Use `analyze_trends.py` to identify favorite recipes and reduce vegetable waste.
-   **Recipe Scoring:** Automatically adjust rotation based on kids' feedback.
-   **Insights Reports:** Monthly summaries of adherence and freezer usage.

### Potential Enhancements
-   **Mobile App Wrapper:** For easier access on the go.
-   **Grocery Integration:** Link grocery lists to delivery services (e.g., Instacart).
-   **Frictionless Logging:** Explore SMS or WhatsApp integration for check-ins.

---

## Resources & Metrics
-   **Platform:** GitHub (Pages & Actions).
-   **Runtime:** Python 3.10+.
-   **Actions Usage:** ~60 mins/month (Free tier).
-   **Success Goal:** Plan adherence >80%, Freezer backups >= 3.
