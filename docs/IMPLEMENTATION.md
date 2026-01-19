# Meal Planner Implementation Guide

**Last Updated:** 2026-01-17
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
- 24 and 25 - original attempt at google oauth and multi-household features. Ended up having big errors and was rolled back. 
- **27:** Recipe Index Refinement & Review Workflow
---

## Implementation Roadmap (Ideal Order)

> [!IMPORTANT]
> **Priority Check:** Before starting new features or moving to the next phase, please go through all the bugs listed in the bug tables and on each page. Ensure existing functionality is stable and verified before proceeding with the implementation plan.

### Phase 26: Wizard UX Improvements
**Goal:** Streamline the weekly planning wizard for better usability.
- **Block 1: Meal Type Separation (~2 hrs)**
  - [x] Separate pages for dinners in wizard
  - [x] Separate pages for snacks in wizard
- **Block 2: Leftovers Enhancement (~2 hrs)**
  - [x] Leftovers quantity input (number of servings, not yes/no)
  - [x] "Use Up Leftovers" page with day assignment
- **Block 3: Prep Workflow & Data Integrity (~2 hrs) ✅ Complete**
  - [x] Bulk Prep Task Completion (Backend + UI)
  - [x] Prep task duplication bug fix (defensive copying)
  - [x] Dashboard sync (Counter & "Dinner Tonight" logic)
- **Block 4: Layout & UX Stabilization (~2 hrs) ✅ Complete**
  - [x] Responsive Week View (Fixed Grid + Line Clamping)
  - [x] Mobile UX Polish (Tap targets + Pulse indicators)
  - [x] Replacement Modal Freezer/Leftover Color Fix

### Phase 27: Recipe Index Refinement & Review Workflow ✅ Complete
**Goal:** Clean up the recipe ecosystem and automate the quality control loop.
- **Block 1: Recipe Index Standardization ✅**
  - [x] Define tag/cuisine taxonomy
  - [x] Batch update recipes
- **Block 2: Recipe Content Editor ✅**
  - [x] Modal UI for editing metadata and content
  - [x] Two-stage save (Local YAML -> Supabase Sync)
- **Block 3: Dynamic Review Button ✅**
  - [x] Emerald Green active state / Ghost faded state
  - [x] Automated audit tags for new captures
- **Block 4: Continuous YAML Normalization ✅**
  - [x] Schema mapping (name -> title) and instruction splitting
  - [x] Ingredient standardization (category sorting + spice quantity stripping)
  - [x] Deterministic rewrite & CI check mode

### Phase 28: General Workflow and Frontend Clean up ✅ Complete
**Goal:** Standardize the visual system, fix inventory/shopping friction, and polish workflow persistence.
> **Note:** I will be adding other bugs and workflow edits.

- **Block 1: Global Visual Polish & Coherence (~3 hrs) ✅ Complete**
  - [x] **Dark Mode:** Improve legibility and contrast across all card components (currently too dark/low contrast).
  - [x] **Unified Styling:** Standardize buttons, use of color, animations, and shadows for consistency.
  - [x] **Premium Buttons:** Update meal plan page buttons to match the new high-fidelity "Review" button styling from the recipe index.

- **Block 2: Inventory & Shopping Stability (~4 hrs) ✅ Complete**
  - [x] **Shop Page:** Fix broken store categorization.
  - [x] **Alphabetical Ordering:** Sort all inventory lists alphabetically.
  - [x] **Deduplication:** Automatically consolidate items when duplicates are found.
  - [x] **Move Logic:** Implement ability to move items from "General" to specific categories.
  - [x] **Immediate Sync:** Ensure added items appear immediately in the correct category (Leftovers, Freezer, Fridge, etc.).

- **Block 3: Recipe Experience & Data Cleanup (~4 hrs) ✅ Complete**
  - [x] **Focus Mode Integration:** Link `StepByStepCooking` component from the Dashboard and Meal Plan pages where relevant.
  - [x] **Tag Migration:** Convert legacy notes (e.g., "instant pot", "stovetop", source names) into the standardized tag system.
  - [x] **Pending Recipe Workflow:** Implement logic to push recipes mentioned in Brain Dump/Quick Add to the Recipe Index for batch processing.

- **Block 4: Advanced Planning Persistence (~3 hrs) ✅ Complete**
  - [x] **Infrastructure:** Pause state infrastructure (localStorage/Supabase).
  - [x] **Resume UI:** Resume planning UI with banner/modal triggered on login/refresh.
  - [x] **Wizard Inventory Upgrades:** 
    - [x] Separate sections for meals vs. veggies in wizard inventory.
    - [x] Add freezer inventory option directly in wizard.
    - [x] Specific quantity inputs (servings for meals, count for produce).

- **Block 7: Sequential Suggestion Flow & Context-Aware Lunches (~3 hrs) ✅ Complete**
  - [x] **Sequential Progression:** Split "Plan Your Extras" into Lunch and Snack phases.
  - [x] **Ingredient Ranking:** Backend scoring for lunches based on dinner ingredients.
  - [x] **Leftover Integration:** Immediate sync of assigned leftovers into the lunch grid.
  - [x] **Visual Feedback:** "Match ✨" badges for ingredient-efficient recipes.

### Phase 29: Wizard Architecture Refactor
**Goal:** Modularize the monolithic `src/app/plan/page.tsx` for maintainability and performance.
- **Block 1: Component Extraction (~3 hrs)**
  - [ ] Extract `ReviewStep` component
  - [ ] Extract `InventoryStep` component
  - [ ] Extract `SuggestionsStep`, `DraftStep`, and `GroceryStep` components
- **Block 2: State Logic Separation (~3 hrs)**
  - [ ] Create `usePlanningWizard` custom hook
  - [ ] Move state management and API side-effects out of `page.tsx`
- **Block 3: Type Definitions (~1 hr)**
  - [ ] Centralize wizard types into `src/types/wizard.ts`

### Phase 30: Household Communication & Persistence
**Goal:** Enhance multi-user coordination and note-taking.
- **Block 1: Brain Dump & Household Communication (~3 hrs)**
  - [ ] **Persistence:** Define storage and API for Brain Dump notes (Supabase `household_notes` or similar).
  - [ ] **Dashboard Integration:** Display persistent Brain Dump notes on the dashboard for multi-adult coordination.
  - [ ] **Note Management:** Implement full CRUD (View, Edit, Clear) for Brain Dump notes.

### Phase 31: User Authentication (The "Family Gate")
**Goal:** Secure the application for single-household access via Supabase.
- **Block 1: Infrastructure & Schema (~3 hrs)**
  - [ ] Supabase Auth setup
  - [ ] RLS Policies
- **Block 2: Login Page & Flow (~3 hrs)**
  - [ ] Login/Signup UI
  - [ ] Session management
- **Block 3: Cleanup & Polish (~2-4 hrs)**
  - [ ] Legacy cleanup (archive local data/*.yml)
  - [ ] Auth caching optimization
  - [ ] Empty states and onboarding

### Phase 32: Analytics & Future Features
**Goal:** Lower-priority enhancements for power users.
- **Block 1: Member Management (~2 hrs)**
  - [ ] View household members in Settings
  - [ ] Invite flow (Join Code or Email)
- **Block 2: Future Ideas**
  - [ ] Freezer ingredients tracking
  - [ ] Advanced analytics
  - [ ] Nutrition estimation

### Phase 31: Mobile Friendly UX
**Goal:** Ensure - and validate - that the application is fully responsive and optimized for mobile devices.
- **Block 1: Navigation & Layout**
  - [ ] Fix collapsible mobile navigation.
  - [ ] Optimize "Week at a Glance" for vertical scrolling or compact view.
  - [ ] Ensure all forms and inputs are zoom-friendly and accessible.
- **Block 2: Interaction Design**
  - [ ] Audit touch targets (min 44px) across the app.
  - [ ] Improve modal behavior on small screens.

---

| Area | Bug | Phase | Status |
|------|-----|-------|--------|
| Plan | Draft Error (`'selections' is not defined`) | 26 | ✅ Fixed |
| Plan | Shopping List Rendering (object as React child) | 26 | ✅ Fixed |
| Plan | Leftovers Sync Failure (Misclassified as Ingredients) | 26 | ✅ Fixed |
| Prep | Task Duplication (In-place list modification) | 26 | ✅ Fixed |
| Dash | Prep Counter / Dinner Display out of sync | 26 | ✅ Fixed |
| Recipe | `.join()` Type Error in Content Modal | 27 | ✅ Fixed |
| Recipe | Missing YAML file 404 in Editor | 27 | ✅ Fixed |

---

## Previously Completed

Recent phases (23-28) have focused on stabilizing the core experience, refining the UX, and ensuring data integrity.

> **Note:** For a complete log of all fixed bugs and completed blocks, refer to [PROJECT_HISTORY.md](PROJECT_HISTORY.md).

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


---

### Future Improvements & Ideas
- **Universal Search**: Search recipes, inventory, and meal plans from a single global search bar.
- **AI-Powered Substitutions**: Suggest ingredient swaps based on current inventory.
- **Timer Capability**: Integrate multi-timer support directly into the Focus Mode recipe view for active cooking.

See [PROJECT_HISTORY.md](file:///Users/sandhyasimhan/Documents/3_Career/Coding%20Projects/meal-planner/docs/PROJECT_HISTORY.md) for detailed development timeline.
