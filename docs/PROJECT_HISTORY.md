# Meal Planner Project History

**Project Goal:** Build an automated meal planning system that respects energy levels throughout the week, protects evening family time, and integrates farmers market shopping.

**Target Audience:** Busy parents who want nutritious home-cooked meals without cooking stress interfering with bedtime routines.

## Core Philosophy

See [README.md](README.md#design-philosophy) for the complete design philosophy and meta-goals.

## Key Design Decisions

### 1. Energy-Based Prep Model ⚡ CRITICAL PIVOT

**The Problem:** Traditional meal plans assume equal energy every day. After 3 weeks, cooking every night created stress - Thu/Fri became survival mode, evenings consumed by cooking.

**The Solution:**
- **Monday PM:** Chop vegetables for Mon/Tue/Wed dinners, batch cooking
- **Tuesday AM + PM:** Continue prep (chop Thu/Fri vegetables, prep lunch components)
- **Wednesday PM:** Finish remaining prep (verify all Thu/Fri components ready)
- **Thursday Morning:** Light prep allowed 8-9am only, NO chopping after noon, NO evening prep
- **Friday:** STRICT no-prep day - NO chopping at any time, only reheating/assembly

**Impact:** Transformed from "ambitious but stressful" to "actually sustainable" - Thu/Fri restful, evenings protected.

**Learning:** Design for worst day, not best day - the best plan includes failure modes.

### 2. Evening Protection (5-9pm Sacred Time)

**The Problem:** Dinner prep bleeding into bedtime routines creates chaos and stress.

**The Solution:**
- Every dinner plan includes "Evening assembly (5-9pm)" section
- Only permitted actions: reheating, simple assembly
- No chopping, no active cooking, no multitasking
- Thursday/Friday dinners MUST be no-chop compatible

**Learning:** Constraints create freedom. Limiting evening tasks paradoxically reduces stress.

### 3. Freezer Backup Strategy

**The Problem:** Even the best plans fail when life happens (sick kid, unexpected work crisis, pure exhaustion).

**The Solution:**
- Maintain 3 complete backup meals in freezer at all times
- When making dal, curry, or soup → make 2x batch, freeze half
- Backup meals must reheat in <15 minutes
- Track backup inventory in weekly plan overview

**Learning:** Build failure modes into the system. The best plan includes "what if this doesn't work?"

### 4. YAML + Markdown + HTML Instead of an App

**Decision:** Store recipes in YAML, generate meal plans as HTML files, track history in YAML.

**Rationale:**
- **Plain text = version control friendly:** All data lives in Git, easy to track changes
- **No database overhead:** YAML files are human-readable and easy to edit manually
- **Portable:** Just files in a folder - no server, no dependencies, no login
- **HTML output:** Beautiful, printable meal plans that work offline
- **Future-proof:** Plain text will always be accessible, unlike proprietary app formats

**Learning:** Sometimes the simplest solution (files in folders) beats a complex app.

### 5. Recipe Tagging System

- Rich metadata in `recipes/index.yml` (effort_level, main_veg, avoid_contains, template)
- Key fields enable constraint satisfaction (no-chop, dietary restrictions, farmers market vegetables)
- **Learning:** Good metadata is the foundation of automation - tag once, query forever

### 6. Anti-Repetition Rules

- Track 3+ weeks in `history.yml`
- No recipe repeats within 3 weeks, no template repeats within same week
- **Learning:** Simple data structures enable complex logic

### 7. Lunch Strategy: Repeatability > Variety

- Repeatable defaults (PBJ, egg sandwich, ravioli, quesadillas)
- Adult lunches default to leftovers
- **Learning:** Kids don't want variety - they want familiar foods

### 8. One Snack Per Day (Not Three)

- ONE snack per day (reuse ingredients from meals)
- Heavy snack for late class days (fruit + protein/fat)
- **Learning:** More options ≠ better - one good option beats four mediocre ones

## Technical Architecture Evolution

### Phases 0-19 (Legacy Archive)
> [!NOTE]
> Detailed history for Phases 0-19 (December 2025 - January 2026) has been moved to [docs/archive/PROJECT_HISTORY_LEGACY.md](archive/PROJECT_HISTORY_LEGACY.md) to keep this file focused on current development.

### Phase 20: Advanced Planning Control (2026-01-13) ✅ Complete

**Goal:** Give users granular control over the automated planning process.

**Block 1: Selective Replanning (Completed)**
- **Feature:** Added "Lock" toggles (🔒/🔓) to meal cards in the Tentative Plan wizard step.
- **Logic:** Users can now lock perfectly good days (e.g., "Monday looks great") and regenerate only the days that don't fit.
- **Technical:** `generate_draft_route` filters history to preserve locked slots before calling the allocation engine.

**Block 2: "Confirm for Today" (Completed)**
- **Feature:** Added a "✓ Confirm Plan" button to the Dashboard header.
- **Impact:** One-tap validation for days where the plan was followed exactly. No more multi-click logging for success paths.
- **Technical:** Extended `log_meal` endpoint with `confirm_day=True` flag that marks all scheduled meals (dinner + snacks + lunch) as `made`.

**Block 3: Default Week Fix (Completed)**
- **Stabilization:** Verified and locked in logic ensuring the dashboard always defaults to the current calendar week, preventing "blank screens" on new visits.

### Phase 21: Inventory UI/UX Overhaul (2026-01-13) ✅ Complete

**Goal:** Transform the inventory from a raw list into a managed tool with high data integrity.

**Block 1: Visual Improvements (Completed)**
- **Feature:** Tabbed interface for Fridge / Pantry / Frozen Ingredients.
- **Layout:** "leftovers" and "Freezer Meals" (Backups) promoted to high-priority sections at the top.
- **UX:** Removed text truncation, allowing full ingredient visibility (critical for "Trader Joe's..." items).

**Block 2: Interactive Management (Completed)**
- **Feature:** "Move" action with Move-to-Category logic.
- **Logic:** Atomic move (Add Destination + Delete Source) with quantity merging.
- **Impact:** Users can easily "defrost" items (Freezer -> Fridge) or "store" leftovers (Fridge -> Freezer).

**Block 3: Data Integrity (Completed)**
- **Feature:** Backend deduplication.
- **Logic:** Adding an item that already exists now increments the quantity of the existing entry (merging them) rather than creating a duplicate row.
- **Cleanup:** Ran a database scrubber to merge all 100% duplicate entries, leaving a clean slate for the new logic.

### Phase 22 Preliminary: UX Redesign Prototype (2026-01-13)

**Goal:** Create a high-fidelity prototype for a complete UI/UX overhaul.

**Rationale:** The current app is functional but "stilted" and lacks aesthetic appeal. The user requested a "premium," modern interface with glassmorphism, smooth animations, and an "Earth Tone" palette.

**Built:**
- **Single-File Prototype:** Created `ux_redesign_prototype.html` containing the entire new frontend vision.
- **Design System:**
    - **Palette:** Earth tones (Sage Green, Terracotta, Warm Beige, Espresso) + Light/Dark mode support.
    - **Layout:** Sidebar navigation + 6 Tabs (Dashboard, Meal Plan, Recipes, Inventory, Shop, Settings).
    - **Interaction:** Javascript-based tab switching, hover effects, modal logic.
- **New Features Prototyped:**
    - **Brain Dump:** Quick-add input for ingredients/ideas on the dashboard.
    - **Recipe Filters:** Chip-based filtering (Vegetarian, Italian, etc.).
    - **Advanced Replanning:** Modal for "Replan with Notes" (natural language intent).
    - **People Profiles:** Settings section for family dietary preferences.

**Roadmap Restructure:**
- Realigned `project_roadmap.md` to prioritize the UX implementation (Phase 22) and push Authentication to Phase 24.
- Phase 23 defined for specific bug fixes (logic gaps) and advanced features (personalization).

**Learning:** Prototyping in a single HTML file is an incredibly fast way to validate UX/UI changes before committing to complex React/Next.js refactors.

### Phase 22: UX Redesign & Feature Parity (2026-01-13) ✅ Complete

**Goal:** Implement the new "Earth Tones" high-fidelity UX, ensuring all existing functionality is preserved.

**Block 1: Frontend Architecture (Completed)**
- **Feature:** Full visual redesign using "Earth Tones" palette (Sage, Terracotta, Beige).
- **Layout:** Replaced simple header navigation with a responsive `AppLayout` featuring a sidebar (desktop) and bottom menu (mobile).
- **Theme:** Implemented comprehensive Light/Dark mode via `ThemeContext` and Tailwind variables.
- **Pages:** Ported Dashboard, Plan, Recipes, Inventory, and Week View to the new layout structure.


**Block 2: Feature Parity (Completed)**

## Verification
- **Verification:** Systematically verified that core functionalities work within the new UI:
  - **Confirm for Today:** Dashboard header action working.
  - **Flexible Logging:** New modal options (Leftovers, Ate Out) integrated into new card styles.
  - **Inventory Quick Add:** "Quick Add" bar migrated to new Inventory page header.
  - **Wizard Flow:** Complex multi-step wizard successfully wrapped in new layout without logic breakage.
  - **Build Stability:** Restored missing backend script (`log_execution.py`) and fixed test imports to ensure CI/CD reliability.

**Learning:** "Feature Parity" is not just about looks; it's about detailed interaction testing. Migrating a complex wizard into a new layout requires careful checking of state persistence and hook ordering.

### Phase 23: Experience Refinement & Personalization (2026-01-13) ✅ Complete
**Goal:** Polish the UX to match the "Earth Tones" prototype and add personalization features.

**Block 1: Dashboard & Plan UX (Completed)**
- **Dashboard Visuals:** Realized the "Timeline View" for chronological meal tracking and added the "Brain Dump" area for quick notes.
- **Timeline Options Modal:** Overhauled the dinner "Options" modal into a full **Decision Tree** workflow. Added "Log Status" vs "Reschedule" tabs.
- **Decision Tree Logic:** Implemented "Did you make it?" (Yes -> Feedback/Leftovers, No -> Alternatives like freezer/leftovers/ate out).
- **Prep Accordion:** Implemented collapsible list grouping prep tasks by recipe, reducing visual clutter on the main page.
- **Direct Plan Access:** Added client-side routing to `plan/page.tsx` that automatically redirects to the active plan if the week is already generated, bypassing unnecessary wizard starts.

**Block 2: Inventory & Recipes (Completed)**
- **Recipe Browser:** Integrated filter chips (Cuisine, Effort, Tags) as client-side state filters for instant feedback.
- **Inventory Grouping:** Added frontend classification logic to group items into categories (Produce, Dairy, etc.) within Fridge/Pantry tabs.
- **Ate Out Leftovers:** Integrated "Ate Out" logging with inventory. Users can now capture restaurant leftovers directly into the fridge inventory from the logging modal.
- **Recipe Scaling:** Added dynamic 0.5x, 1x, and 2x scaling buttons to the recipe detail page using regex-based ingredient parsing.

**Block 4: Settings & Personalization (Completed)**
- **Settings UI:** Created a centralized management page for kid profiles, store lists (Costco, TJ), dietary preferences, and work schedules.
- **Smart Replanning:** (MVP) Implemented "Special Requests" in the replan workflow. Users can now enter notes like "No chicken" or "Want soup", which triggers a keyword-based filter/boost logic in the allocation engine.
- **Supabase Resilience:** Standardized backend routes to handle missing database records (`PGRST116`) gracefully, ensuring the UI doesn't crash on uninitialized weeks.

**Bug Fixes:**
- **Date Bug:** Resolved the "4 weeks of data" date bug by strictly filtering out future unselectable weeks in the wizard.
- **Positioning Bug:** Fixed modal positioning by moving global modals (DinnerOptionsModal, PendingRecipesModal) out of the header to the root layout.
- **Parsing Bug:** Fixed JSX parsing error in `ReplanWorkflowModal` caused by unescaped `<` characters in the "PRO TIP" section.

**Learning:** Keyword-based "Smart Filtering" is a high-value MVP that provides 80% of the benefit of an LLM with 0% of the latency or cost. Resilience in data-fetching (`.execute()` vs `.single()`) is critical for "Draft Mode" where plan records might not exist yet. Moving modals to the root prevents "Z-index wars" with animated parent elements.

### Phase 23.5: Household Configuration (2026-01-13) ✅ Complete
**Goal:** Enhance the "Single Household" configurability before multi-user support.

**Block 1: UI Polish (Completed)**
- **Dark Mode:** Refined glassmorphism variables (`--glass-bg`) in `globals.css` ensuring legibility across themes.
- **Dashboard:** Simplified the "System & Actions" card and refined "Week at a Glance" badges.
- **Prep Visibility:** Updated `status.py` to filter Prep Tasks, showing only Today's + Overdue tasks.

**Block 2: Settings Schema (Completed)**
- **Adult Profiles:** Added management for Adult profiles, including "Office Days" tracking.
- **Meal Scope:** Added toggles to `SettingsPage.tsx` allowing users to disable planning for specific meal types (Dinner, Lunch, Snacks).
- **Backend Logic:** Updated `actions.py` (Generator) and `status.py` (Dashboard) to strictly respect "Meal Scope" toggles—disabled meals are excluded from generation and live view.

**Block 3: Refinements & Bug Fixes (Completed)**
- **Week View:** Fixed data resolution in `meal_resolution.py` to correctly display all meal types (Lunches/Snacks) and improved visual badges.
- **Log Integrity:** Fixed a critical bug in `log_meal` where new history entries defaulted to unplanned_meal, causing adherence mismatches.
- **Inventory:** Added visual grouping (icons/colors) and prioritized Leftovers in the Inventory tab.
- **Settings:** Enabled full editing of "Meal Defaults" and dynamic removal of Adult profiles.

### Stabilization: Phase 23.5 Baseline (2026-01-13) ✅ Complete
**Goal:** Establish a clean, stable baseline for future refactoring work.

**Context:** During Phase 24/25 development (Authentication & Collaboration), the codebase accumulated complexity and ESLint/TypeScript issues. Decision made to revert to Phase 23.5 as the stable foundation.

**Actions Taken:**
1. **Codebase Revert:** Created `refactor/from-phase-23-5` branch from commit `389df37a`.
2. **Baseline Fixes:**
   - Fixed syntax error in `src/app/settings/page.tsx` (duplicate map closing `))}`).
   - Added missing `slots` property to `WorkflowStatus` interface in `src/types/index.ts`.
3. **Tag Created:** `stable-phase-23-5` at commit `dca091b`.
4. **Backup Preserved:** `backup/phase-25-before-revert` branch contains Phase 24/25 work for future reference.

**Build Status:** `npm run build` exits 0. ESLint prints a non-blocking warning about module resolution (to be addressed in incremental refactoring).

**Next Steps:** Incremental type hardening starting with `src/types/index.ts` and `src/lib/api.ts`, one file per commit, verifying build after each change.
### Phase 26: Wizard UX Improvements (2026-01-14) 🔄
**Goal:** Streamline the weekly planning wizard for better usability.

**Built:**
- **Block 1: Meal Type Separation:** Successfully separated dinners and snacks into dedicated wizard steps. Added a `WizardProgress` breadcrumb component for better navigation.
- **Block 2: Leftovers Enhancement:** Implemented a new "Use Up Leftovers" step where users can assign multiple leftovers to specific meal slots (Lunch/Dinner) on different days.
- **Improved UI:** Applied "Earth Tones" styling to all wizard steps, ensuring consistent visuals and improved readability.
- **Backend Integration:** Updated the meal selection and lunch generation logic to respect pre-assigned leftovers.

**Block 3: Prep Workflow & Data Integrity (2026-01-16) ✅ COMPLETE**
- **Bulk Prep Task Completion:** Added `/api/prep/bulk-check` and frontend "Check All" (✅) UI for efficient task management.
- **Duplication Bug Fix:** Resolved critical issue where in-place list modification in `LunchSelector` caused doubling of ingredient tasks.
- **Dashboard & Replan Consolidation:** Fixed Stat Card counters and display logic. Refactored `ReplanWorkflowModal` and `ReplacementModal` to use the standardized `MealLogFlow` logic with **enhanced leftovers handling** (top-level selection, dedicated leftovers tabs, and prominent dinner prompts), refined `Week View` visuals (bucket-based color coding), and added automated **Weekly Summary Statistics**.
- **Layout & UX Stabilization:** Optimized the `Week View` for responsive use by implementing a fixed-width desktop grid (using `table-fixed` and `colgroup`), adding `line-clamp` for meal name wrapping, and enhancing mobile interactions with increased tap targets, consistent card padding, and a pulse-animated "TODAY" marker.
- **Data & Fixes:** Deduplicated 27 tasks from current active week data and resolved a critical bug in `ReplacementModal` where freezer/leftover selections were not correctly color-coding in the main view.

**Learning:** "Bulk" actions significantly reduce friction. Defensive programming (copying lists with `list()`) is essential when multiple modules analyze the same source data.

### Phase 27: Recipe Index Refinement & Review Workflow (2026-01-17) ✅ Complete
**Goal:** Clean up the recipe ecosystem and automate the quality control loop.

**Block 1: Recipe Index Standardization (Completed)**
- **Data Clean-up**: Standardized all 185 recipes with consistent cuisine and effort levels.
- **Audit Tags**: Ran a full audit to identify "not meal" components and recipes with missing ingredients/instructions.
- **Bulk Fixes**: Updated 36 recipes with missing content and 21 recipes with incorrect meal classification.

**Block 2: Recipe Content Editor (Completed)**
- **Modal Editor**: Built a high-fidelity modal for editing recipe name, tags (with '✕' removal), ingredients, and instructions.
- **Local-First Save**: Implemented a two-stage save process:
    - **Stage 1**: Save to local YAML files (`recipes/details/`) for immediate editing.
    - **Stage 2**: Bulk sync metadata (name, tags, cuisine, effort) to Supabase.
- **Resilience**: Fixed `.join()` crashes and missing YAML file errors by returning sensible defaults and creating files on-demand.

**Block 3: Dynamic Review Button & Automation (Completed)**
- **Active Review**: Replaced "Review Incomplete" link with a premium **Emerald Green Review Button** that glows when recipes need attention.
- **Ghost State**: Button fades to a subtle outlined state when the index is clean, reducing visual clutter.
- **Automated Capture**: New manual entries or URL imports now automatically receive audit tags (`not meal`, `missing ingredients`, `missing instructions`), ensuring they immediately drop into the review queue.

**Block 4: Visual Effort Indicators & Recalibration (Completed)**
- **Battery-Style Indicators**: Replaced text effort tags with vertical visual blocks across the app (Recipe Card, Detail, Review Modal, Batch Edit).
    - 1 Green segment: Low
    - 2 Yellow segments: Medium/Normal
    - 3 Red segments: High
- **Smart Recalibration**: Developed an instruction-parsing script to estimate total time (prep + cook) from unstructured text. Automatically updated 24 recipes > 45 minutes to "High" effort.

**Block 5: Mobile "Focus Mode" Cooking Experience (Completed)**
- **Kitchen-First UI**: Focused, high-legibility interface that splits recipes into Ingredients -> Prep -> Cook phases.
- **Interactive Checklists**: Large tap targets for checking off ingredients/steps, allowing users to track progress hands-free-ish while cooking.
- **Dynamic Theming**: Interface shifts colors (Emerald -> Amber -> Rose) as the cook progresses through phases.

**Learning for Vibecoders (Self-Taught Developers):**
- **"Vibe-First" Prototyping**: Don't start with the database schema. Start with the *feeling* of the UI. If it feels too transparent or "stiff", tweak the CSS variables first. The "vibes" often reveal the missing logic.
- **Regex is a Superpower**: When your data is messy (like timing trapped inside instruction text), a simple regular expression can "recalibrate" hundreds of rows in seconds. It's better than manual entry 100% of the time.
- **Component Wrapping**: If you have a complex server-side page (like a Recipe Detail) and want to add an interactive modal (like Focus Mode), don't try to make the whole page a Client Component. Wrap just the interactive parts in a "Client Wrapper" to keep the speed of server rendering.
- **Schema Normalization**: Built `fix_yaml_schema.py` to auto-split instructions into lists and rename `name` -> `title`.

### Phase 28: General Workflow and Frontend Clean up (2026-01-24) ✅ Complete
**Goal:** Standardize the visual system, fix inventory/shopping friction, and polish workflow persistence.

**Blocked 1: Global Visual Polish & Coherence (Completed)**
- **Dark Mode:** Improved legibility and contrast across all card components.
- **Unified Styling:** Standardized buttons, usage of color, animations, and shadows.
- **Premium Buttons:** Updated meal plan page buttons to match high-fidelity "Review" button styling.

**Block 2: Inventory & Shopping Stability (Completed)**
- **Shop Page:** Fixed broken store categorization.
- **Alphabetical Ordering:** Sorted inventory lists alphabetically.
- **Deduplication:** Implemented auto-consolidation of duplicate items.
- **Immediate Sync:** Ensured added items appear immediately in the correct category.

**Block 3: Recipe Experience & Data Cleanup (Completed)**
- **Focus Mode Integration:** Linked `StepByStepCooking` component from Dashboard and Meal Plan pages.
- **Tag Migration:** Converted legacy notes into standardized tag system.
- **Pending Recipe Workflow:** Implemented logic to push recipes mentioned in Brain Dump/Quick Add to the Recipe Index.

**Block 4: Advanced Planning Persistence (Completed)**
- **Infrastructure:** Implemented persistent state for planning pauses (localStorage/Supabase).
- **Resume UI:** Added "Resume Planning" banner/modal triggered on login/refresh.
- **Wizard Inventory Upgrades:** Separated meals vs veggies sections, added freezer inventory option, and specific quantity inputs.

**Block 7: Sequential Suggestion Flow & Context-Aware Lunches (Completed)**
- **Sequential Progression:** Split "Plan Your Extras" into Lunch and Snack phases.
- **Ingredient Ranking:** Backend scoring for lunches based on dinner ingredients.
- **Leftover Integration:** Immediate sync of assigned leftovers into the lunch grid.
- **Visual Feedback:** "Match ✨" badges for ingredient-efficient recipes.

### Phase 29: Wizard Architecture Refactor (2026-01-25) ✅ Complete
**Goal:** Modularize the monolithic `src/app/plan/page.tsx` for maintainability and performance.

**Block 1: Component Extraction (Completed)**
- **Refactor:** Extracted `ReviewStep`, `InventoryStep`, `SuggestionsStep`, `DraftStep`, and `GroceryStep` components.
- **Critical Fixes:** Resolved infinite rendering loops & SSL connection errors.

**Block 2: State Logic Separation & Stability (Completed)**
- **Context API:** Created `WizardContext` to fix circular dependencies in `autoDraft`.
- **Logic Move:** Moved state management and API side-effects out of `page.tsx`.
- **Debugging:** Added structured error logging (`MISSING_PARAMETERS`, `PLAN_NOT_FOUND`).
- **Critical Fix:** Fixed "Missing session data" error in `WeekView` (incorrect state access).

**Block 3: Type Definitions (Completed)**
- **Strict Typing:** Centralized wizard types into `src/types/wizard.ts`.
- **Extraction:** Extracted `ReviewDay`, `InventoryState`, and implemented strict unions.

**Learning:** Managing complex state in a multi-step wizard requires a dedicated Context. Passing props down 4 levels created a "prop drilling" nightmare that obscured the source of truth. Converting to `WizardContext` reduced `page.tsx` from 1200 lines to <200 lines and made bugs immediately obvious.

- **Determinism**: Added a checksum mode to CI so pre-commit hooks catch bad YAML before it merges.

### Phase 29: Wizard Architecture Refactor (2026-01-23) ✅ Complete
**Goal:** Modularize the monolithic `src/app/plan/page.tsx` for maintainability and performance.

**Block 1: Component Extraction (Completed)**
- **Refactor:** Successfully extracted `ReviewStep`, `InventoryStep`, `SuggestionsStep`, `DraftStep`, and `GroceryStep` into standalone components.
- **State Logic:** Identified circular dependency risks and planned `WizardContext` migration.

**Block 2: Critical Fixes & Debugging (Completed)**
- **Bug Fix:** Fixed "Missing session data" error in `WeekView` where replacements failed due to incorrect state access (`status.week_data.week_of` vs `status.week_of`).
- **Error Logging:** Implemented structured error handling (`MISSING_PARAMETERS`, `PLAN_NOT_FOUND`) across both Backend and Frontend.
- **Wizard Stability:** Extended enhanced error logging to `DraftStep` and `WizardContext`, ensuring clear feedback for plan generation failures.

**Block 3: Documentation Updates**
- **API Reference:** Added comprehensive "Error Handling" section to `API_REFERENCE.md`.
- **Future Roadmap:** Defined "Phase 34: Execution Flow Refinements" to tackle "Ate Out" options and retroactive leftover prompts.

**Learning:** When refactoring deeply nested state (like `status.week_data`), TypeScript types are your best friend—but runtime validation via robust logging is the only way to catch edge cases in production.

- **Deterministic Formatting**: Created `scripts/normalize_recipes.py` to ensure all recipe files follow a strict schema with sorted categories (Grains -> Produces -> Aromatics -> Fats -> Spices).
- **Culinary Intelligence**: Implemented automated spice cleanup (stripping quantities from seasonings) and heuristic-based instruction splitting (Prep vs. Cook phases).
- **CI Readiness**: Added a `--check` mode for idempotency verification, ensuring the repository remains standardized over time.

**Block 7: Repository Sync & Cleanup (2026-01-17) ✅ COMPLETE**
- **Local-Cloud Parity**: Synchronized the local filesystem with the active Supabase instance, bringing the index to exactly **185 active recipes**.
- **Data Purge**: Safely removed 52 inactive detail files and 53 content files that were no longer part of the master index.
- **Index Alignment**: Updated `recipes/index.yml` to match the definitive database state, resolving ID inconsistencies (e.g., `ragada_patty`) and ensuring 100% data integrity.

**Learning for Vibecoders:**
- **The Database is the Source of Truth**: When local files get messy, your production database (Supabase) is your definitive anchor. Use its row count to "prune" your local dev environment.
- **Idempotency is Peace of Mind**: A script that does nothing when there's nothing to do is the safest script. Always design your automation so it can be run 1,000 times without side effects.

### Phase 28: Logic Refinement & Sequential Flow (2026-01-18) ✅ Complete

**Goal:** Transform "Plan Your Extras" into a logic-driven, 3-phase progression to reduce decision fatigue and improve ingredient efficiency.

**Implemented:**
- **Sequential Progression:** Refactored the manual planning steps into a strict sequence: **Phase 1: Dinners -> Phase 2: Lunches -> Phase 3: Snacks**.
- **Context-Aware Lunches:** Updated the backend (`/api/plan/suggest-options`) to analyze chosen dinner ingredients and rank lunch recipes by overlap.
- **Match ✨ Indicator:** Added a visual "Match" badge for lunch recipes that reuse ingredients from the week's dinner plan.
- **Leftover Sync:** Integrated assigned leftovers directly into the lunch grid. They appear as "Assigned Leftover" slots, preventing accidental double-planning.
- **Granular Selection:** Replaced global toggles with a per-day lunch review grid.

**Learning for Vibecoders:**
- **Sequential Architecture:** Forcing a specific sequence (Dinners -> Lunches -> Snacks) allows subsequent steps to be "smarter" because they can inherit context from previous choices.
- **Visual Micro-Feedback:** A simple badge like "Match ✨" makes the system feel much more intelligent than just sorted text.
- **Sync is Sanity:** Providing immediate visual feedback for choices made in previous steps (like assigned leftovers) builds trust and reduces cognitive load.

**Final Phase 28 Status:** General workflow is stabilized, suggestion logic is context-aware, and the wizard provides a frictionless end-to-end planning experience.

### Phase 28: Maintenance & Debugging (2026-01-19) ✅
**Goal:** Resolve critical persistence bugs and plan future architecture.

**Fixed:**
- **Inventory Persistence:** Fixed the 'leftovers' category mapping in `api/routes/inventory.py`, ensuring repeated adds correctly increment quantity instead of overwriting.
- **Ghost Data in Reviews:** Updated `swap_meals` in `api/routes/meals.py` to synchronize `history_data` alongside `plan_data`. This prevents original meals from reappearing in the Review step after a swap.

**Operations:**
- **Start-Over Capability:** Created `reset_week.py` script to manually delete specific meal plan weeks from Supabase when the UI state gets stuck.

**Planning:**
- **Phase 29 Definitions:** Defined the "Wizard Architecture Refactor" phase to break down the monolithic `src/app/plan/page.tsx` (1800+ lines) into modular components and custom hooks.

**Learning:** 
- **Data Duplication:** When you store data in two places (Plan vs History), *every* operation (Swap, Move, Edit) must update both. Forgetting one leads to "Ghost Data" where the UI shows one thing but the underlying record shows another.
- **Monoliths Hide Bugs:** Large files (`page.tsx`) make it hard to see state flow. If you can't see the state, you can't debug persistence. Refactoring is not just cleanup; it's a transparency tool.

**Build Fixes:**
- **Type Hardening:** Resolved TypeScript build errors in `src/app/page.tsx` and `src/app/plan/page.tsx` by synchronizing the `NormalizedInventory` interface with the frontend state types. Explicitly handled the `spice_rack` property and fixed `slot` string casting.

- **ESLint/React Hook Fixes:** Systematically resolved React Hook dependency warnings in `src/app/page.tsx` and `src/app/plan/page.tsx`. Wrapped unstable functions (`fetchStatus`, `loadInventory`, `loadSuggestions`) in `useCallback` and corrected `useEffect` dependency arrays to ensure stable and predictable re-renders.

### Phase 29: Wizard Architecture Refactor (2026-01-21) 🔄

**Goal:** Modularize the monolithic `PlanningWizard` component to improve maintainability and separate UI from business logic.

**Block 1: Component Extraction (Completed)**
- **Extracted UI Components:** Sliced the 1300-line `page.tsx` file by extracting major steps into standalone components:
    - `GroceryStep` (Grocery List & Store grouping)
    - `DraftStep` (Tentative plan review & regeneration)
    - `SuggestionsStep` (Including `WeeklyMealGrid` logic)
    - `WizardProgress` (Shared navigation component)
- **Shared Utilities:** Moved `toTitleCase` to `src/lib/utils.ts`.
- **Cleanup:** Updated `InventoryStep` and `ReviewStep` to use the new shared components, removing duplicate definitions.
- **Result:** `page.tsx` is now significantly cleaner, serving primarily as a state container and orchestrator.

**Block 2: State Logic Separation (Completed)**
- **Architecture:** Implemented `WizardContext` (React Context API) to manage state, replacing prop drilling.
- **Provider:** Created `WizardProvider` to encapsulate logic and business rules.
- **Refactor:** Migrated `ReviewStep`, `InventoryStep`, `SuggestionsStep`, `DraftStep`, and `GroceryStep` to consume context.

**Block 3: Type Safety & Maintenance (Completed)**
- **Strict Types:** Created `src/types/wizard.ts` and centralized type definitions.
- **Cleanup:** Fixed circular dependencies and established strict discriminated unions for Wizard Steps.

**Bug Fixes (Post-Refactor)**
- **Inventory UI (USR-001):** Clarified distinction between "Meals" (leftovers) and "Ingredients".
- **Week View (UI-002, NAV-001):** Fixed missing week label and added navigation to view past weeks.
- **Linting:** Fixed `jest.config` CommonJS conflict and cleaned up ESLint configuration.

**Result:** The planning wizard is now architecturally mature, type-safe, and easier to extend. The `page.tsx` file is minimal, and state is globally accessible where needed.

## Strategic Pivot: Preparing for Scale (January 2026)

*Context for future blog post: "From Personal Tool to SaaS Product"*

### The "God Component" Refactor (Phase 29 Retrospective)
As we prepared to add multi-user collaboration to the Weekly Planning Wizard, we hit a wall. The `PlanWizard` (`src/app/plan/page.tsx`) had grown into a classic "God Component"—managing UI, complex business logic, API side-effects, and state for 6 different steps all in one file.

**The Problem:**
- **Prop Drilling Hell:** Passing `setInventory` down 4 levels to a grandchild component just to update a checkbox.
- **Fragile State:** A change in the "Grocery" step would trigger re-renders in the "Review" step.
- **Testing Nightmare:** You couldn't test the logic without rendering the entire page.

**The Decision: Context over Redux**
We opted for React Context API (`WizardContext`) rather than an external library like logical Redux or Zustand.
- *Why?* The wizard state is complex but *scoped*. It lives for the duration of the session and doesn't need to be global across the entire app.
- *Execution:* We established a strict Type System first (`src/types/wizard.ts`) to define the shape of our state before writing runtime code. This "Types First" approach caught dozens of potential bugs where undefined states might have crashed the wizard.

**Outcome:**
The code is now modular. `page.tsx` is less than 200 lines (down from 1000+), acting only as a layout shell. Each step (`ReviewStep`, `DraftStep`) consumes strictly the data it needs from the `useWizard` hook.

---

### The UI/UX Realignment (Inventory & Navigation)
While refactoring, we addressed two persistent user friction points that highlighted a mismatch between our Data Model and the User's Mental Model.

**1. "Meals" vs "Ingredients" (Inventory)**
Previously, our inventory system dumped "Leftover Spaghetti" in the same visual bucket as "Raw Chicken Breast".
- *User Mental Model:* "I am hungry *now* (Ready to Eat)" vs "I want to *cook* (Ingredients)".
- *Fix:* We physically separated the UI. Top cards now show **Ready-to-Eat** items (Leftovers, Freezer Stash), while distinct tabs below handle **Raw Ingredients**. This simple grouping change significantly reduced cognitive load during "What's for dinner?" decision fatigue.

**2. Lost in Time (Week View)**
The "Week at a Glance" was a floating timeline without anchors. Users would swipe and lose track of whether they were viewing "This Week" or "Last Week".
- *Fix:* We re-introduced explicit "Week Of [Date]" labels and a dedicated Year/Week dropdown navigation. It seems obvious in hindsight, but in a Single Page App, it's easy to forget that users need constant temporal orientation.

---

### The Architecture Pivot: Multi-Tenancy First (Looking Ahead to Phase 30)
We originally planned to build "Household Notes" next. However, we realized we were about to build a "Collaboration Feature" on top of a single-player foundation.

**The Realization:**
If we built shared notes now, we'd hardcode them to the current user. When we eventually added "Spouse Login", we'd have to rewrite the entire database schema to support sharing.

**The Decision: Infrastructure before Features**
We completely reordered the roadmap to prioritize **Phase 30: Multi-Tenant Architecture**.
1.  **Identity is not Authorization:** Just because a user is logged in (AuthN) doesn't mean they belong to a household (AuthZ).
2.  **The Household Entity:** We are introducing a `households` table. Users will belong to a household. *Data* (recipes, plans) will belong to a household, not a user.
3.  **RLS as the Firewall:** We will use Postgres Row Level Security (RLS) to enforce this at the database engine level. `SELECT * FROM recipes` will automatically only return recipes `WHERE household_id = current_user_household_id`.

**Why this matters:**
This transforms the project from a "Personal Tool" into a "SaaS Platform". It enables the future Mobile App (Phase 33) to simply hit the API, and the backend handles the security transparency. We are paying the "complexity tax" now to buy "velocity" later.

We are paying the "complexity tax" now to buy "velocity" later.

### Phase 30: Multi-Tenant Architecture & Trigger Debugging (2026-01-25) ✅ Complete

**Goal:** Transform single-user MVP into a secure multi-tenant SaaS with robust onboarding.

**Architectural Highlights:**
1. **Row Level Security (RLS):** Implemented strict DB-level policies. `SELECT *` now acts as a firewall, returning only data belonging to the user's `household_id`.
2. **Onboarding Flow:**
   - **Trigger-Based Provisioning:** A Postgres trigger (`handle_new_user`) detects new auth signups and automatically provisions a "My Household" and Owner Profile.
   - **Session Injection:** Middleware injects the `household_id` into every API request, ensuring backend code never has to manually query for it.

**Issue:** "Database error saving new user"
Users encountered a generic error during signup. The root cause was the Postgres Trigger `handle_new_user` running with `SECURITY DEFINER` privileges in a restricted search path.

**Root Cause:**
`SECURITY DEFINER` functions do not inherit the caller's search path. The function `gen_random_uuid()` (needed for ID generation) was not found because the search path didn't explicitly include `pg_catalog` or `extensions`.

**Attempts:**
1. **Implicit Defaults (Failed):** Relied on table `DEFAULT gen_random_uuid()`. Failed because triggers running as superuser sometimes bypass standard default firing or context.
2. **Explicit Call without Schema (Failed):** Called `gen_random_uuid()` directly. Failed due to `search_path` restriction.
3. **Explicit Schema + Path (Success):**
   - Identified correct namespace: `pg_catalog`.
   - Updated Trigger to `SET search_path = public, pg_catalog, extensions`.
   - Explicitly called `pg_catalog.gen_random_uuid()`.

**Learning:** When using `SECURITY DEFINER` in Postgres triggers, *always* explicitly set the `search_path` and use fully qualified function names (`schema.function`). Ambiguity is the enemy of security definers.


### Phase 30: Multi-Tenant Architecture (Completed 2026-01-25)

**Goal:** Transform the single-user local app into a secure, multi-household SaaS platform.

**Built:**
- **Data Model:** Added `households` and `profiles` tables with foreign keys and RLS policies.
- **Auth Flow:** Implemented Supabase Auth with automatic household creation triggers.
- **Config Migration:** Moved configuration from local files to the database.

**Audit Log (Bugs Fixed):**
- Fixed: Database Trigger Error (UUID Type Mismatch in `handle_new_user`) (CRIT-001)
- Fixed: Signup Flow Validation & Error Feedback (AUTH-001)


### Bug Fix: Future Planning State Reset (2026-01-26) ✅ Complete

**Issue:** Users reported seeing "Planning for week of: 2026-04-13" (months in the future) when trying to update inventory, confusing the workflow.

**Root Cause:**
The system had likely auto-generated or the user had accidentally triggered empty placeholders for future weeks up to April 2026. The `status` API identifies the "next planning week" by finding the latest week in the database + 1, or simply lists future weeks as "active" if they exist.

**Fix:**
- **Data Cleanup:** Executed a script to strictly delete all `meal_plans` rows with `week_of > 2026-01-26`.
- **Validation:** Verified the database now correctly reflects 2026-01-26 as the current active week.

**Impact:** Restored the correct temporal state for the planning wizard.

### Phase 30.5: Serverless Stability Hardening (2026-01-27) ✅ Complete
**Goal:** Fix critical crashes caused by Vercel's read-only filesystem restrictions and improve error visibility.

**Critical Fixes:**
- **Read-Only Guards:** Audited `api/utils/storage.py`, `scripts/workflow/replan.py`, and `api/routes/meals.py`. Wrapped all legacy file write operations (history backup, HTML generation, local preference updates) in `try...except OSError` blocks.
- **Detailed Error Handling:** Replaced generic "500 Internal Server Error" responses in the Replan workflow with specific `ReplanError` codes (`HISTORY_NOT_FOUND`, `INPUT_READ_ERROR`).
- **Replan UX:**
    - **Inventory Scroll (UI-005):** Removed fixed height constraint on inventory list to allow natural scrolling.
    - **Error Feedback (SYS-003):** Updated Replan Modal to show specific backend error messages instead of generic alerts.

**New Issues Identified:**
- `UI-006`: Inventory Scroll Usability (Needs clearer swipe/scroll affordance).
- `UI-007`: Replace JS Alerts with Toast Notifications.

**Learning:** Serverless environments are hostile to "local-first" patterns. Legacy code that successfully writes "backups" to disk in development will crash production. Every `open(..., 'w')` must be guarded or removed.

### Phase 31: Advanced Replan & Smart Features (2026-01-27) ✅ Complete
**Goal:** Give users more control when life happens (work runs late, plans change) without destroying the progress they've already made.

**Block 1: Flexible Replanning Strategies (Completed)**
- **Feature:** Strategy Selector ("Shuffle Remaining" vs. "Fresh Plan").
- **Logic:**
    - **Shuffle:** Just moves existing planned meals to new days (preserves ingredients).
    - **Fresh Plan:** Keeps specified meals but regenerates the rest from the recipe database based on current inventory.
- **Control:** Added "Keep" checkboxes for meals and "Prep Available" toggles for days.
- **Sync:** Automatically calculates new ingredient needs and appends them to the Farmers Market list.

**Block 2: Backend Robustness (Completed)**
- **Feature:** Granular Error Handling.
- **Impact:** Replaced generic 500 Server Errors with specific codes (`HISTORY_NOT_FOUND`, `INPUT_ERROR`), making debugging significantly faster.
- **Fix:** Resolved a critical crash (`UnboundLocalError: idx`) in the fresh replan logic path.
- **Fix:** Corrected UX navigation flow where "Update Inventory" skipped the Strategy step.

**Learning:** "Replan" isn't one thing. Sometimes you just need to shuffle days (Shuffle), and sometimes you need to scrap half the week and start over (Fresh). The system must support both mental models.

### Phase 32: Smart Shopping & Production Reliability (2026-01-27) ✅ Complete
**Goal:** Intercept the meal planning workflow with smart shopping list reviews and harden the system for production-grade reliability.

**Block 1: Smart Shopping Integration**
- **Intelligence Layer:**
    - **Staples Exclusion:** Automatic filtering of oils, ghee, salt, pepper, and common spices from shopping suggestions.
    - **Inventory Awareness:** Items with `quantity > 0` in Fridge, Pantry, or Freezer are automatically subtracted from the list.
- **Backend API:** Created `/api/plan/shopping-list/smart-update` for interactive "I Have This" and "Don't Need" actions.

**Block 2: Production Reliability Hardening**
- **Retry Logic:** Implemented exponential backoff for all Supabase operations to handle `[Errno 35]` transient network errors.
- **Reliability Standards:** Established a P0 checklist for all new code (timeouts, idempotency, validation, error logging, and resource cleanup).
- **Workflow Portability:** Synced project-specific workflows to global standards, ensuring reliability checks are integrated into every code review.

**Learning:** 
- **The "Pre-flight" Pattern:** High-intent moments (like right after planning) are the best times to capture user data (like updated inventory). 
- **Production-Grade ≠ Just Working:** Moving from "it works locally" to "production-grade" means designing for failure (retries) and scale (idempotency). 5 P0 checks can prevent 80% of production outages.

### Phase 32: Database Stability & Error Resilience (2026-01-28) ✅ Complete

**Goal:** Eliminate transient database connection errors and improve system reliability under concurrent load.

**Problem:** Users experiencing `[Errno 35] Resource temporarily unavailable` errors when:
- Fetching inventory on dashboard load
- Navigating to the planning wizard (`/plan`)
- Making rapid concurrent API calls

**Root Cause Analysis:**
The Supabase Python client (`supabase-py`) makes HTTP requests to a remote database. When multiple requests fire simultaneously (e.g., dashboard loading status + inventory + recipes), the underlying connection pool can become temporarily exhausted, causing socket errors. This is especially common in serverless environments where cold starts create connection spikes.

**Solution: Retry Logic with Exponential Backoff**

Built a centralized `execute_with_retry()` wrapper in `api/utils/storage.py`:
```python
def execute_with_retry(query, max_retries=3, base_delay=0.1):
    """Execute a Supabase query with exponential backoff retry logic."""
    for attempt in range(max_retries):
        try:
            return query.execute()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(base_delay * (2 ** attempt))
```

**Implementation:**
- **Wrapped ~30 database calls** across the codebase:
  - `api/utils/storage.py` (17 calls) - Core operations
  - `api/routes/status.py` (3 calls) - Dashboard data
  - `api/routes/meals.py` (7 calls) - Meal planning
  - `api/routes/groceries.py` (3 calls) - Shopping lists
- **Added global error handler** to `api/index.py` for better debugging visibility
- **Standardized error responses** with detailed tracebacks in development

**Critical Debugging Insight: Objects vs Arrays in JavaScript**

During debugging, discovered prep tasks weren't displaying despite being correctly stored in the database. The issue revealed an important frontend pattern:

**The Problem:**
```typescript
// API returns this structure:
{
  "today": {
    "prep_tasks": [
      {"task": "Chop onions", "day": "tue"},
      {"task": "Chop peppers", "day": "wed"}
    ]
  }
}

// Frontend component filters tasks:
const grouped = tasks.reduce((acc, task) => {
  const mealKey = task.meal_name || 'General Prep';
  if (!acc[mealKey]) acc[mealKey] = [];  // ← Array
  acc[mealKey].push(task);
  return acc;
}, {} as Record<string, PrepTask[]>);  // ← Object with array values
```

**Why This Matters:**
- **Arrays** (`[]`) are ordered lists accessed by index: `tasks[0]`, `tasks[1]`
- **Objects** (`{}`) are key-value maps accessed by name: `grouped["Balsamic Bruschetta"]`
- **The Pattern:** Using an object to group arrays is extremely common in data processing
  - Start with flat array from API
  - Transform into grouped object for UI rendering
  - Each group contains an array of related items

**Real-World Example:**
```javascript
// Input (Array from API):
[
  {task: "Chop herbs", meal_name: "Bruschetta"},
  {task: "Chop peppers", meal_name: "Salad"},
  {task: "Wash greens", meal_name: "Salad"}
]

// Output (Object with Array values):
{
  "Bruschetta": [{task: "Chop herbs", ...}],
  "Salad": [
    {task: "Chop peppers", ...},
    {task: "Wash greens", ...}
  ]
}
```

This pattern enables:
1. **Efficient lookups** - Find all tasks for a specific meal in O(1) time
2. **Clean rendering** - Map over object keys to create UI sections
3. **Type safety** - TypeScript knows each value is an array

**Learning for Readers:**
- **Arrays** = "List of things in order" (shopping list, timeline)
- **Objects** = "Named buckets" (settings, grouped data)
- **Hybrid** = Object containing arrays (most real-world data structures)

Understanding when to use each is fundamental to frontend development. Most bugs in data display come from mismatched expectations about structure.

**Impact:**
- ✅ Inventory errors eliminated
- ✅ Planning wizard stable under load
- ✅ Prep tasks displaying correctly (was always working, just needed to scroll)
- ✅ System resilient to transient network issues

**Remaining Work:**
- 11 non-critical `.execute()` calls in edge cases (onboarding, auth)
- Can be wrapped incrementally as needed

**Learning:** Transient errors in distributed systems are inevitable. Retry logic with exponential backoff is a standard pattern that should be built into database wrappers from day one. The cost of 3 retries (max 700ms delay) is negligible compared to the user experience improvement.

### Phase 33: Recipe Editing & Management Overhaul (2026-01-28) ✅ Complete

**Goal:** Streamline the recipe lifecycle—from automated capture to structured editing.

**Block 1: Recipe Link Extraction**
- **Problem:** Importing required manual entry or copy-pasting.
- **Solution:** Integrated `recipe-scrapers` library (free, deterministic) instead of LLMs.
- **Built:**
  - `POST /api/recipes/extract` endpoint wrapping 60+ site scrapers.
  - `ImportRecipeModal` with a 2-step "Extract -> Verify" workflow.
  - Restoration logic for `scripts/parse_recipes.py` to fix capture bugs.

**Block 2: 3-Box Recipe Editor**
- **Problem:** The existing editor was a simple text field or YAML file, lacking the structure of the new "Focus Mode" viewer. Data storage was split between YAML (content) and Supabase (metadata).
- **Solution:** A unified 3-box editing experience (Ingredients, Prep Steps, Instructions) backed by Markdown storage.
- **Built:**
  - **Unified Storage:** Refactored `StorageEngine` to support read/write of Markdown files directly, keeping them in sync with Supabase `content` column. Removed reliance on legacy `recipes/details/*.yaml`.
  - **Explicit Prep Steps:** Added first-class support for `prep_steps` in the API and storage layer, reinforcing the "Energy-Based Prep" philosophy.
  - **RecipeEditor Component:** A dedicated React component with auto-expanding textareas for the 3 distinct sections.
  - **Seamless Mode Switching:** Updated `RecipeDetailClientWrapper` to toggle between "View", "Edit", and "Cooking" modes instantly, using `router.refresh()` to propagate server-side updates.

**Learning:** aligning the *editor* UI with the *viewer* UI minimizes cognitive dissonance. If the viewer separates "Prep" from "Steps", the editor must enforce that separation to ensure data quality. Using Markdown as the single source of truth (synced to DB) simplifies the mental model compared to split YAML/Text files.

### Phase 34: Frictionless Recipe Loop & Architecture Hardening (2026-01-29) ✅ Complete

**Goal:** Enable complex meal combinations, streamline shopping intelligence, and address core performance issues.

**Key Design Decisions:**

1. **Multi-Recipe Data Model (Modular Recipes):** Pivot from a single `recipe_id` (string) to a `recipe_ids` (array) per slot. This enabled "Modular Recipes" (e.g., Tacos + 3 Sides) but required updating the `StorageEngine`, UI modals, and recommendation engine to handle arrays across the entire stack.
2. **Statelessness vs. Performance:** Opted for a "Stateless" Supabase-first approach to avoid race conditions, but introduced a multi-layer caching strategy (LRU for recipe content, TTL for heavy historical scans) to maintain sub-10ms response times.

**Technical Hurdles:**
- **Service Layer Extraction:** De-tangling `api/routes/meals.py` (1000+ line monolith) into `api/services/meal_service.py` required isolating deeply coupled logic between history logging, inventory sync, and daily feedback.
- **Frictionless Shopping Logic:** Developing the "Shopping Intelligence" engine to aggregate ingredients from *multiple* recipes simultaneously while filtering out "Permanent Pantry" basics.
- **Test Suite Modernization:** Rewriting legacy integration tests that relied on a local file system to work correctly with a fully mocked Supabase `StorageEngine`.

**Block 1: Modular Recipes & Pairing Logic (Completed)**
- **Pairing Engine:** Built a history-based suggestion engine that analyzes past pairings to recommend complementary sides.
- **Pairing Drawer:** Added a slide-out UI for rapid side-dish selection during the planning wizard.

**Block 2: Frictionless Shopping & Library Mastery (Completed)**
- **Ingredient Aggregation:** Automatically combines ingredients from multiple recipes in the same slot.
- **Permanent Pantry Filtering:** Added intelligence to skip basics (oil, salt, ghee) and "Permanent Pantry" items (flour, sugar) from the shopping list.
- **Bulk Tagging:** Added a "Batch Editor" for rapid categorization of the recipe library (Main, Side, Needs Side).

**Block 3: Strategic Technical Debt Cleanup (Completed)**
- **Service Layer Extraction:** Extracted logging logic from `meals.py` into `api/services/meal_service.py`.
- **Multi-Layer Performance Caching:** Implemented LRU/TTL caching for expensive operations.
- **Integration Test Hardening:** Restored 100% test pass rate by updating mocks.

**Learning:** "Modularization" is the theme of this phase. Moving from single recipe strings to ID arrays required updates across 15+ files, but unlocked the ability to plan real-world meals that aren't just one-pot dishes. Technical debt cleanup restored feature velocity for the upcoming multi-household features.

### Workflow Evolution: Plan & Build (2026-01-29) ✅ Complete

**Goal:** Simplify the agentic development cycle and standardize reliability.

- **Renamed Commands:** Legacy `/design` and `/implement` were renamed to **`/plan`** and **`/build`** to better match developer mental models.
- **Reliability Standards:** Integrated a **Production Reliability Checklist** (timeouts, idempotency, validation) into the core workflows.
- **Global Sync:** Pushed these improvements to the `claude-code-quickstart` repository for cross-project standardization.

### Phase 34 Continuation: Test Coverage & SWR Cache (2026-02-02) ✅ Complete

**Goal:** Increase test coverage for core services and implement serverless-friendly caching patterns.

**1. meal_service.py Test Coverage (TD-014):**
- **Problem:** The 6 helper functions extracted in TD-009 lacked unit test coverage.
- **Solution:** Added 12 comprehensive tests covering:
  - `update_dinner_feedback()` - vegetables parsing, kids feedback, complaints tracking
  - `update_daily_feedback()` - basic feedback, confirm_day bulk marking, prep completion deduplication
  - `update_inventory_from_meal()` - 2x batch freezer, freezer used deletion, outside leftovers, leftover quantity parsing
  - `auto_add_recipe_from_meal()` - new recipe creation, existing recipe skip, Indian cuisine inference
- **Result:** 100% function coverage for `meal_service.py`.

**2. SWR (Stale-While-Revalidate) Cache Pattern (TD-013):**
- **Problem:** Simple TTL caching forced users to wait for fresh data when cache expired, even in serverless environments where background refresh isn't possible.
- **Solution:** Implemented `SWRCache` class with three states:
  - **Fresh (0-5 min):** Return immediately, no refresh needed
  - **Stale (5-10 min):** Return cached data immediately, mark for refresh on next miss
  - **Miss (>10 min):** Fetch fresh data, with fallback to stale on error
- **Benefits:**
  - Fast responses even when cache expired
  - Graceful degradation on errors (returns stale data)
  - Debugging utilities: `get_pending_recipes_cache_stats()`, `refresh_pending_recipes_cache()`
- **Result:** Dashboard loads remain fast even with expired cache; errors don't break the UI.

**3. Test Suite Improvements:**
- Added 5 tests for `SWRCache` class (fresh/stale/miss status, refresh clearing, invalidation)
- Total test count in `test_phase_32.py`: 23 tests (up from 6)
- All tests pass with proper mocking patterns

**Learning:** The SWR pattern is ideal for serverless environments where true background processing is impossible. By accepting slightly stale data (within a reasonable window), we eliminate the latency penalty of cache expiration while maintaining eventual consistency.



## 2026-01-30 [Decision] Deprecate 'actual_meal' String Logic
**Context**: Phase 34 introduced Modular Recipes, allowing multiple recipes per meal slot. However, the legacy  string field was causing split-brain states where meals logged as text overrides lost their structured data (ingredients, prep steps).
**Decision**: 
1. Strictly enforce  (array) as the source of truth for all resolved meals.
2. Deprecate the  string logic for content. It may still be used for display or temporary notes, but not as the primary data.
3. "Quick Add" text entries will now auto-create placeholder recipes in the database to ensure every slot maps to a valid .
**Impact**: Requires refactoring  endpoint and updating  replacement logic. Ensures full support for multi-recipe slots and interactive recipe cards.

### Phase 34: Debugging & Tooling Enhancements (2026-02-01)

**Goal:** Resolve critical 500 errors in the Planning Wizard and improve developer tooling for easier local testing.

**1. Critical Crash Fixes (500 Internal Server Error):**
- **Issue:** Planning Wizard crashed at `draft` and `shopping-list` stages.
- **Root Cause:** 
    - `draft`: Missing or `None` lunch IDs causing generation failures.
    - `shopping-list`: `TypeError` when iterating over `None` recipe IDs in `inventory_intelligence.py`. 
    - **Inventory Mismatch:** Local generator was reading from stale `data/inventory.yml` instead of live Supabase data, causing "no ingredients found" errors.
- **Fix:**
    - Patched `html_generator.py` and `lunch_selector.py` to handle `None` values.
    - Updated `api/routes/meals.py` to fetch live inventory from Supabase and pass it to the generator.
    - Added comprehensive error codes (`SHOPPING_LIST_GENERATION_FAILED`, `DRAFT_GENERATION_FAILED`) for better observability.

**2. Improved Debug Visibility:**
- **Problem:** Errors on Vercel were hard to debug because terminal logs aren't visible.
- **Solution:** Updated the `/api/plan/shopping-list` endpoint to include a `debug_info` object in the JSON response.
- **Impact:** Developers can now inspect the browser Network tab to see "warnings" (e.g., "Recipe content not found") without needing server logs.

**3. Tooling: Cascading Meal Plan Reset:**
- **Problem:** The "Clear Current Plan" button only deleted a single week, leaving orphaned future plans (from replans) that corrupted testing state.
- **Solution:** 
    - Upgraded `scripts/reset_week.py` to support **Cascading Deletes** (deleting target week + ALL future weeks).
    - **Settings UX Update:** Replaced the static "Clear Current Plan" button with a **Date Picker** and "Clear Plans (Cascade)" button.
    - **Refactor:** Extracted logic into `reset_from_week` shared function used by both CLI and API.

**Learning:** 
- **Tooling Parity:** Dev tools (scripts) and UI tools (Settings page) should share the same underlying logic to prevent behavior mismatches.
- **Observability:** In serverless environments, critical debug info must be exposed in the API response or Toast notifications, not just stdout.

### Phase 34: Infrastructure Hardening & Modular Architecture (2026-02-01 to 2026-02-02) ✅ Complete

**Goal:** Transform the meal engine from a legacy string-based model to a modular, service-oriented architecture while "vaccinating" the system against data fragility.

**Achievements:**
- **Systemic Sanitization Layer**: Implemented a normalization pipeline in `StorageEngine` that ensures all data (Recipes, History, Plans) is type-safe and default-populated before hitting the frontend. Resolved TD-015.
- **Modular Recipe Slots**: Transitioned the core data model from `recipe_id` to `recipe_ids` (array), enabling side-dish pairings and multi-recipe meal slots. 
- **Service Domain Extraction**: Extracted 20+ logic helpers from `meals.py` into dedicated `meal_service.py` and `pairing_service.py`, improving testability and code hygiene.
- **SWR Performance Engine**: Implemented Stale-While-Revalidate caching for pending recipes, significantly improving perceived performance in Vercel's serverless environment.
- **Earthy Spice UX Refresh**: Applied the premium design system to the new Pairing Drawer and Replacement Modal components, ensuring high-fidelity interaction design.
- **Workflow Hardening**: Established the **Reproduction FIRST** TDD convention and split logic review from UX verification to ensure production-grade reliability.

**Decision (Infrastructure)**: Chose to prioritize a foundational data sanitization layer over ad-hoc error handling. This "boundary-first" approach eliminated an entire class of 500 errors and simplified all downstream logic.
**Decision (Workflows)**: Decided to archive legacy project history (Phases 0-19) to maintain sub-second scannability of current project context while preserving historical records in `docs/archive`.
**Decision (Quality)**: Enforced **Reproduction FIRST** for all bug fixes, including the use of **Markdown UI Test Plans** for complex visual bugs. This ensures every fix is proven and verifiable.
**Learning (Observability)**: Discovered that granular error codes and centralized sanitization are force-multipliers for debugging in serverless environments, where logs can be ephemeral and stack traces expensive.

**Next Phase**: Transitioning to Phase 35: Frictionless Shopping & Architecture Hardening.
