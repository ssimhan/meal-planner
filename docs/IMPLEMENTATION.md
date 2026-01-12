# Meal Planner Implementation Guide

**Last Updated:** 2026-01-11
**Live Site:** [meal-planner-eta-seven.vercel.app](https://meal-planner-eta-seven.vercel.app/)

---

> **Workflow Rule:** Every subphase MUST be implemented in a dedicated branch. Test locally -> Push to Branch (Vercel Preview) -> Merge to Main.

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
- **Thursday Morning:** Light assembly only (8-9am), NO chopping after noon, NO evening prep
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

**Current State:** Phase 17 In Progress.

**Completed Phases:**
- **1-9:** Foundation (recipe parsing, CLI, energy-based prep, HTML plans)
- **10-11:** Logging, performance, inventory intelligence, analytics
- **12:** Architecture refactoring, TypeScript migration, testing
- **13.1-13.4:** State fixes, inventory UX, prep workflow, white-labeling
- **14:** Data Layer Redesign (Plan vs Actual separation)
- **15:** Database Migration (Supabase integration)
- **16:** Smart Weekly Planning Workflow (End-to-End)

---

## Implementation Roadmap (Ideal Order)

### Phase 17: Core Stability & Data Hygiene (Current)
**Goal:** Fix known bugs and standardize data to ensure a reliable foundation.
- **Block 1: Fix Week View Bug.** ✅ Complete.
- **Block 2: System Cleanup.** ✅ Complete.
- **Block 3: Recipe Index Standardization (Expanded).** ✅ Complete.
    - **Chunk 2: Prep Step Standardization.** Ensure consistently structured prep steps across all recipes.
    - **Chunk 3: Auto-Generation.** First time a recipe is finalized in a plan, generate and save missing prep steps.
- **Block 4: Main Page & Prep Logic.**
    - **Chunk 1: Default Week.** Main page should always load the current calendar week by default.
    - **Chunk 2: Prep Ordering.** Prep tasks should be sorted biologically (when the meal is needed).
    - **Chunk 3: Dynamic Prep Updates.** Prep tasks must automatically move/update when meals are swapped.

### Phase 18: Enhanced Planning Workflow (Wizard 2.0)
**Goal:** Remove friction from the weekly planning process and daily execution.
- **Block 1: Wizard UX Overhaul (In Progress).**
    - Dinners/Snacks Split (Step 0/1). ✅ Complete.
    - Inventory Improvements (Step 2). ✅ Complete.
    - **Chunk 3: Editable Tentative Plan.** Allow users to edit the generated plan in the "Draft" step before confirming.
    - Chunk 4: Low-friction "Leftovers" logic.
- **Block 2: Pause Capability.** Allow saving state to resume later (e.g., "Draft Mode").
- **Block 3: Nightly Confirmation.** Persistent 6pm banner for day's meals validation.

### Phase 19: Loop Closure & Adjustments
**Goal:** Close the loop between execution and planning.
- **Block 1: Recipe Ingestion Workflow.**
    - Chunk 1: Detect new "Actual Meals" not in index.
    - Chunk 2: Banner & Ingestion Form.
- **Block 2: Mid-Week Adjustments.** Enable dynamic replanning for the current active week.

### Phase 20: User Authentication (The "Family Gate")
**Goal:** Secure the application for single-household access.
- **Block 1: Supabase Auth.** Infrastructure & RLS Policies.
- **Block 2: Login Page.**

---

**Other Ideas:**
- Freezer ingredients tracking
- Advanced analytics
- Nutrition estimation

See [PROJECT_HISTORY.md](PROJECT_HISTORY.md) for detailed development timeline.
