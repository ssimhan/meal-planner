# Meal Planner Implementation Guide

**Last Updated:** 2026-01-12
**Live Site:** [meal-planner-eta-seven.vercel.app](https://meal-planner-eta-seven.vercel.app/)

---

> **Workflow Rule:** Every subphase MUST be implemented in a dedicated branch. Test locally -> Push to Branch (Vercel Preview) -> Merge to Main.

## System Overview

Hybrid Serverless application for weekly meal planning, daily execution tracking, and inventory management. Python logic engine + Next.js frontend.

### Core Workflow

1. **Weekly Planning:** "Start New Week" → enter farmers market purchases → "Generate Weekly Plan"
2. **Daily Execution:** View "Today's Schedule" → one-tap logging for meals/prep tasks
3. **Inventory:** Update via "Quick Add" or "Brain Dump"
4. **Confirmation-Driven Fixes:** When normalization or prep-step ambiguity arises, system asks user, records decision, and updates implementation plan for permanent resolution.

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

**Current State:** Phase 21 Complete. Phase 22 (Auth) Pending.

**Completed Phases:**
- **1-9:** Foundation (recipe parsing, CLI, energy-based prep, HTML plans)
- **10-11:** Logging, performance, inventory intelligence, analytics
- **12:** Architecture refactoring, TypeScript migration, testing
- **13.1-13.4:** State fixes, inventory UX, prep workflow, white-labeling
- **14:** Data Layer Redesign (Plan vs Actual separation)
- **15:** Database Migration (Supabase integration)
- **16:** Smart Weekly Planning Workflow (End-to-End)
- **17:** Core Stability & Data Hygiene
- **18:** Enhanced Planning Workflow (Wizard 2.0)
- **19:** Recipe Ecosystem & UX Polish
- **20:** Advanced Planning Control (Selective Replanning, Confirm Today)
- **21:** Inventory UI/UX Overhaul (Visuals, Move Logic, Dedup)

---

## Implementation Roadmap (Ideal Order)

### Phase 22: User Authentication (The "Family Gate")
**Goal:** Transition from single-user system to secure, multi-tenant application via Supabase Auth + RLS.

---

## Previously Completed (Recent)

### Phase 17: Core Stability & Data Hygiene ✅ Complete
**Goal:** Fix known bugs and standardise data.

### Phase 18: Enhanced Planning Workflow (Wizard 2.0) ✅ Complete
**Goal:** Remove friction from the weekly planning process.

### Phase 19: Recipe Ecosystem & UX Polish ✅ Complete
**Goal:** Close the loop on data entry.

### Phase 20: Advanced Planning Control ✅ Complete
**Goal:** Give the user more control over the automated plans.
- **Block 1: Logic Refinements.**
    - **Chunk 1: Selective Replanning.** UI to select specific meals/slots that should be replanned vs kept.
    - **Chunk 2: "Confirm for Today".** Add button to run confirm-meals logic only for the current day to handle missed logging efficiently.
    - **Chunk 3: Default Week Fix.** Ensure calendar week is always loaded by default.

### Phase 21: Inventory UI/UX Overhaul ✅ Complete
**Goal:** Improve layout and data integrity of the inventory system.
- **Block 1: Visual Improvements.**
    - Ingredient names wrap/expand (no truncation).
    - Layout: 1. Search, 2. Leftovers Card, 3. Freezer Meals Card, 4. Tabs (Fridge/Pantry/Freezer).
- **Block 2: Drag and Drop.**
    - Move items between Fridge, Pantry, and Freezer categories.
- **Block 3: Ingredient Deduplication.**
    - Merge identical ingredients regardless of unit (e.g., "2 cups milk" + "1 liter milk" -> one "milk" entry).

### Phase 22: UX Redesign & Feature Parity 🚧 In Progress
**Goal:** Implement the new "Earth Tones" high-fidelity UX, ensuring all existing functionality is preserved.
- **Block 1: Frontend Architecture.** ✅ Complete
    - ✅ Implement new layout (Sidebar + 6 Tabs)
    - ✅ Create Earth Tones theme with light/dark mode
    - ✅ Wrap all existing pages (Dashboard, Meal Plan, Recipes, Inventory, Week View) with new AppLayout
    - ✅ Create placeholder Shopping List page
    - ✅ Create placeholder Settings page
    - 🔜 Refine individual page layouts to match prototype design
- **Block 2: Feature Parity.** 🔜 Pending
    - Ensure "Confirm for Today" works in new Dashboard
    - Ensure "Flexible Logging" works
    - Ensure Inventory "Quick Add" works
    - Ensure all existing "Wizard" functionality flows correctly in the new UI
    - Full testing of all features with new layout

### Phase 23: Bugs, Personalization & Advanced Replanning
**Goal:** Fix known UX/Logic issues and add layer of personalization.
- **Block 1: Logic & UX Fixes.**
    - **Main Page:** Fix Prep steps not syncing with final recipes.
    - **Week View:** 
        - Swap meal: Add options for "Eat Out", "Pick Leftovers", "Freezer Meal", "Select Recipe".
        - Change "Cancel" to "Done Editing".
        - Fix "Replace with Inventory" missing submit button.
    - **Recipe Index:** 
        - Remove "Make at home" option entirely.
        - Plan meals for Mon-Fri only; leave Sat/Sun as "TBD".
    - **Recipe Selector:** 
        - Suggest snacks based on inventory.
        - Show "Leftover Meals" card; suggest using them before fresh meals.
    - **Data Integrity:** Fix "4 weeks of data" bug (should be 3: Dec 29, Jan 5, Jan 12).
- **Block 2: Personalization.**
    - **People Profiles:** Track likes/dislikes/cuisines per family member.
    - Weigh recommendations based on profiles.
- **Block 3: Advanced Replanning.**
    - **Replan with Notes:** Free-form text input that adjusts the schedule (e.g., "Grandma visiting, need soft food").

### Phase 24: User Authentication (The "Family Gate")
**Goal:** Secure the application for single-household access via Supabase.
- **Block 1: Supabase Auth.** Infrastructure & RLS Policies.
- **Block 2: Login Page.**

---

**Other Ideas:**
- Freezer ingredients tracking
- Advanced analytics
- Nutrition estimation

See [PROJECT_HISTORY.md](PROJECT_HISTORY.md) for detailed development timeline.
