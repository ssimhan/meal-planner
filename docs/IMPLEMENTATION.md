# Meal Planner Implementation Guide

**Last Updated:** 2026-01-09
**Live Site:** [meal-planner-eta-seven.vercel.app](https://meal-planner-eta-seven.vercel.app/)

---

## System Overview

Hybrid Serverless application for weekly meal planning, daily execution tracking, and inventory management. Python logic engine + Next.js frontend.

### Core Workflow

1. **Weekly Planning:** "Start New Week" → enter farmers market purchases → "Generate Weekly Plan"
2. **Daily Execution:** View "Today's Schedule" → one-tap logging for meals/prep tasks
3. **Inventory:** Update via "Quick Add" or "Brain Dump"

### Data Files

- **history.yml:** Source of truth for all past plans and execution data
- **inventory.yml:** Freezer/Fridge/Pantry stock (maintains ≥3 freezer backup meals)
- **recipes/:** YAML recipe files with metadata
- **config.yml:** All user settings (dietary preferences, schedules, kid profiles)

---

## Key Features

### Energy-Based Prep Schedule
Declining energy model: Monday (high) → Friday (zero prep)

- **Monday PM:** Chop Mon/Tue/Wed veg, batch cook components, prep freezer meals (2x, freeze half)
- **Tuesday AM/PM:** Lunch prep for Wed/Thu/Fri, chop Thu/Fri dinner veg
- **Wednesday PM:** Finish ALL remaining prep (no chopping after this)
- **Thursday AM:** Light assembly only (8-9am), NO chopping after noon, NO evening prep
- **Friday:** Zero prep - reheating/assembly only, dinner must be `no_chop_compatible: true`

### Smart Personalization
- Kid profiles in `config.yml` with individual allergies
- School snacks automatically nut-free
- Leftover pipelines: dinner → next day lunch for family

### Architecture
- **Frontend:** Next.js dashboard (`src/app`)
- **Backend:** Python Serverless Functions (`api/`)
- **Persistence:** GitOps model (all changes committed to GitHub)
- **Plans:** Static HTML (`public/plans/`) with 9 tabs

---

## Local Development

```bash
./scripts/dev.sh  # Auto-regenerates plans on file changes
```

---

## Development Status

**Current State:** Phase 16 Complete. End-to-end smart planning workflow implemented.

**Completed Phases:**
- **1-9:** Foundation (recipe parsing, CLI, energy-based prep, HTML plans)
- **10-11:** Logging, performance, inventory intelligence, analytics
- **12:** Architecture refactoring, TypeScript migration, testing
- **13.1-13.4:** State fixes, inventory UX, prep workflow, white-labeling
- **14:** Data Layer Redesign (Plan vs Actual separation)
- **15:** Database Migration (Supabase integration)

**Phase 13.4 (White-labeling):** ✅ Complete
System now fully configurable via `config.yml` with:
- Interactive setup wizard (`scripts/setup.py`)
- Comprehensive docs (`docs/CONFIGURATION.md`)
- Schema validation (`validate_yaml.py --config`)
- Example template (`config.example.yml`)

---

## Known Issues

### Bug: Week View Not Displaying Actual Meals
**Status:** 🐛 Open
**Description:** "Week at a Glance" view is not pulling actual meal data from the current week's plan
**Impact:** Users cannot see scheduled meals in the week overview
**Reported:** 2026-01-09
**Priority:** Medium

---

## Future Roadmap

> [!IMPORTANT]
> **Priority Shift:** The immediate focus is completing the ongoing Supabase migration to resolve current frontend instability.

### Phase 15: Complete Database Migration (Supabase) ✅ Complete
**Goal:** Shift from YAML to Postgres to stabilize the application and enable complex queries.
- **Block 1: Connection & Infrastructure:** Established stable Supabase connection in Vercel.
- **Block 2: Schema & Data Migration:** Ported `inventory`, `history`, and `recipes` data to Postgres.
- **Block 3: API Refactor:** Updated `api/` routes to use Supabase StorageEngine.

### Phase 16: Smart Weekly Workflow (8-Step)
**Goal:** Implement an "End-to-End" planning flow using database intelligence.

1.  **Step 0: Review Prior Week:** Prompt user to confirm which meals were made and log any leftovers (for the Fridge).
2.  **Step 1: Inventory Update:** Bulk update interface to ensure stock levels are accurate. ✅ Complete
3.  **Step 2: "Waste Not" Suggestions:** Propose meals for Mon/Tue that use up leftovers and perishables. ✅ Complete
4.  **Step 3: Tentative Plan:** Generate a draft plan for the rest of the week based on preferences. ✅ Complete
5.  **Step 4: Smart Grocery List:** Auto-generate a shopping list based on (Plan Ingredients - Current Inventory). ✅ Complete
6.  **Step 5: Purchase Confirmation:** Interactive list to "check off" items -> automatically moves them to Inventory. ✅ Complete
7.  **Step 6: Finalize Plan:** Lock in the week to "Active" status. ✅ Complete
8.  **Step 7: Mid-Week Adjustments:** Allow dynamic replanning for "life happens" moments.

### Phase 17: System Cleanup
**Goal:** Remove legacy workflows and annoyances.
- **Block 1: Remove Daily Check-in:** Locate and delete the GitHub workflow/cron triggering daily issues.
- **Block 2: Legacy File Cleanup:** Remove unused YAML parser code once DB is primary.

### Phase 18: User Authentication (The "Family Gate")
**Goal:** Secure the application for single-household access.
*   **Auth Provider:** Supabase Auth.
*   **Mechanism:** Simple login screen gating the existing dashboard.
*   **Data Model:** Single household (shared data).


---

**Other Ideas:**
- Freezer ingredients tracking (raw components vs backup meals)
- Advanced analytics (monthly trends, preferences)
- Nutrition estimation

See [PROJECT_HISTORY.md](PROJECT_HISTORY.md) for detailed development timeline.
