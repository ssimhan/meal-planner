# Meal Planner Implementation Guide

**Last Updated:** 2026-01-12
**Live Site:** [meal-planner-eta-seven.vercel.app](https://meal-planner-eta-seven.vercel.app/)

---

> **Workflow Rule:** 
> 1. **Phase = One Branch:** Every phase belongs in a single dedicated branch (e.g. `phase-22-ux-redesign`) until fully complete.
> 2. **Block/Chunk Workflow:** Code -> Test Locally -> Push to Branch (Vercel Preview) -> Manual Verification on Vercel.
> 3. **Merge to Main:** ONLY merge to `main` when the *entire phase* is 100% complete and verified.

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

**Current State:** Stable Phase 23.5 Baseline (`stable-phase-23-5` tag). Incremental refactoring in progress.

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
- **22:** UX Redesign & Feature Parity (Earth Tones theme)
- **23:** Experience Refinement & Personalization
- **23.5:** Household Configuration & UI Polish

---

## Implementation Roadmap (Ideal Order)

### Phase 22: UX Redesign & Feature Parity
**Goal:** Implement the new "Earth Tones" high-fidelity UX, ensuring all existing functionality is preserved.

### Phase 23: Bugs, Personalization & Advanced Replanning
**Goal:** Fix known UX/Logic issues and add layer of personalization.

### Phase 24: User Authentication (The "Family Gate")
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

### Phase 22: UX Redesign & Feature Parity ✅ Complete
**Goal:** Implement the new "Earth Tones" high-fidelity UX, ensuring all existing functionality is preserved.
- **Block 1: Frontend Architecture.** ✅ Complete
    - ✅ Implement new layout (Sidebar + 6 Tabs)
    - ✅ Create Earth Tones theme with light/dark mode
    - ✅ Wrap all existing pages (Dashboard, Meal Plan, Recipes, Inventory, Week View) with new AppLayout
    - ✅ Create placeholder Shopping List page
    - ✅ Create placeholder Settings page
    - ✅ Refine individual page layouts to match prototype design
- **Block 2: Feature Parity.** ✅ Complete
    - ✅ Ensure "Confirm for Today" works in new Dashboard
    - ✅ Ensure "Flexible Logging" works
    - ✅ Ensure Inventory "Quick Add" works
    - ✅ Ensure all existing "Wizard" functionality flows correctly in the new UI
    - ✅ Full testing of all features with new layout

### Phase 23: Experience Refinement & Personalization ✅ Complete
**Goal:** Polish the UX to match the "Earth Tones" prototype and add personalization features.
**Test Plan:** [docs/TEST_PLAN_PHASE_23.md](TEST_PLAN_PHASE_23.md)

- **Block 1: Dashboard & Plan UX.** ✅ Complete
    - ✅ **Dashboard Visuals:** match `ux_redesign_prototype.html` (Brain dump area, Timeline view, visual hierarchy).
    - ✅ **Prep Tasks:** Implement accordion/collapsible logic grouping tasks/ingredients by recipe on the main page.
    - ✅ **Active Plan Access:** If a plan is active, the Plan tab should open it directly (bypass Wizard start screen).
    - ✅ **Decision Tree Modal:** Overhauled "Options" modal into a full Log Status decision tree with Reschedule tab.
- **Block 2: Inventory & Recipes.** ✅ Complete
    - ✅ **Recipe Browser:** Implement Filter Chips (Cuisine, Effort, Tags) as per prototype.
    - ✅ **Inventory Grouping:** Organize items within Fridge/Pantry tabs into logical sub-groups (e.g., Produce, Dairy, Grains) for better scanning.
    - ✅ **Ate Out Leftovers:** Dynamic "capture leftovers" logic in logging modal.
- **Block 3: Shopping Experience.** ✅ Complete
    - ✅ **Quick Add:** "Brain Dump" style input for rapidly adding multiple items.
    - ✅ **Store Management:** Add tagging for specific stores (Costco, Trader Joe's, Indian Grocery).
    - ✅ **Custom Stores:** Allow users to define/add their own store names.
- **Block 4: Settings & Personalization.** ✅ Complete
    - ✅ **Settings UI:** Move configuration from `config.yml` to the UI (People Profiles, Store Lists, Dietary Preferences).
    - ✅ **Advanced Replanning:** Implement "Replan with Notes" (Keyword/Smart filtering logic).
    - ✅ **Data Integrity:** Fix known date bugs (4-week view).
    - ✅ **Resilience:** Internalized error handling for Supabase edge cases (`PGRST116`).
    - ✅ **Build Safety:** Fixed JSX parsing errors in wizard guidance.

### Phase 23.5: Household Configuration & UI Polish ✅ Complete
**Goal:** Finalize household customization and visual stability before multi-user rollout.
- **Block 1: UI Polish & Bug Fixes.** ✅ Complete
    - ✅ Fix Dark Mode contrast/legibility (glassmorphism variable updates).
    - ✅ Simplify Dashboard "System" card (removed clutter).
    - ✅ Refine Prep Task visibility (Today/Overdue only).
    - ✅ Week View visual cues (shadows/badges for completed days).
- **Block 2: Household Schema.** ✅ Complete
    - ✅ Add Adult Profiles (with Office Days).
    - ✅ Configure "Included Meals" (toggles for Dinner/Lunch/Snack planning).
    - ✅ Configure "Prep Time" preferences (Morning vs Evening slots).
- **Block 3: Week at a Glance Refinements.** ✅ Complete
    - ✅ **Visuals:** Enhance shadows/cues for completed and confirmed days.
    - ✅ **Bug:** Fix missing meal plan data in view (backend resolution logic).
    - ✅ **Bug:** Fix "Save Changes" failure when replacing a meal (history data integrity).
- **Block 4: Inventory Refinements.** ✅ Complete
    - ✅ **Leftover Meals:** Ability to add explicit "Leftover Meal" items to fridge (distinct from raw ingredients).
    - ✅ **Visual Grouping:** Improve visual distinction between inventory groups (Leftovers vs Produce vs Condiments vs Fruit).
- **Block 5: Advanced Settings.** ✅ Complete
    - ✅ **Editable Defaults:** Make "Meal Defaults" section fully editable (read-only fix).
    - ✅ **Person Management:** Ability to dynamically add/remove Adult profiles (not just Kids).
    - ✅ **Meal Scope Granularity:** Customize "Included Meals" (Dinner/Lunch/Snack) per day of the week.
    - ✅ **Prep Time Granularity:** Select specific prep time slots (Morning, Afternoon, Before Dinner, After Dinner) per day of the week.

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
