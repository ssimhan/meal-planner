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

### Phase 17: Core Stability & Data Hygiene (Immediate)
**Goal:** Fix known bugs and standardize data to ensure a reliable foundation.
- **Block 1: Fix Week View Bug (1h).** Ensure "Actual Meals" appear correctly in the weekly overview.
- **Block 2: System Cleanup (0.5h).** Remove legacy GitHub Actions/Cron jobs (Daily Check-in) and unused YAML parsing code.
- **Block 3: Recipe Index Standardization (1.5h).** Standardize spelling (e.g., "tomato" vs "tomatoe") and deduplicate entries.

### Phase 18: Enhanced Planning Workflow (Wizard 2.0)
**Goal:** Remove friction from the weekly planning process and daily execution.
- **Block 1: Wizard UX Overhaul.**
    - Chunk 1: Split "Dinners" and "Snacks" into separate wizard pages (1.5h).
    - Chunk 2: Update Inventory: Separate meals vs. veggies; add quantity tracking (2h).
    - Chunk 3: Improve Leftovers logic: Ask for specific serving counts (1h).
- **Block 2: Pause Capability (2h).** Allow saving the wizard state ("Draft Mode") to pause planning (e.g., for shopping) and resume later.
- **Block 3: Nightly Confirmation (1.5h).** Add a persistent 6pm banner prompting validation of that day's meals (Snacks/Lunch/Dinner).

### Phase 19: Loop Closure & Adjustments
**Goal:** Close the loop between execution and planning.
- **Block 1: Recipe Ingestion Workflow.**
    - Chunk 1: Detect new "Actual Meals" not in index (1.5h).
    - Chunk 2: Banner & Ingestion Form (1.5h).
- **Block 2: Mid-Week Adjustments (2h).** Enable dynamic replanning for the current active week.

### Phase 20: User Authentication (The "Family Gate")
**Goal:** Secure the application for single-household access (architected for future multi-tenant support).
- **Block 1: Supabase Auth.**
    - Chunk 1: Infrastructure & RLS Policies (1h).
    - Chunk 2: Login Page Implementation (1h).


---

**Other Ideas:**
- Freezer ingredients tracking (raw components vs backup meals)
- Advanced analytics (monthly trends, preferences)
- Nutrition estimation

See [PROJECT_HISTORY.md](PROJECT_HISTORY.md) for detailed development timeline.
