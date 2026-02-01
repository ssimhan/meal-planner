# Meal Planner Project History - Legacy (Phases 0-19)

**Project Goal:** Build an automated meal planning system that respects energy levels throughout the week, protects evening family time, and integrates farmers market shopping.

## Technical Architecture Evolution

### Phase 0-6: CLI Foundation (2025-12-30)

**Built:**
- Recipe parser extracting 234 HTML files → structured YAML
- Two-step workflow (propose vegetables → shop → confirm → generate plan)
- Algorithm with 3-week lookback, template filtering, busy-day no-chop matching
- `./mealplan next` - single command with state tracking

**Learning:** Validation scripts are like spell-check for automation - catch mistakes before you see them.

### Phase 7-12: Human-Centered Refinement (2025-12-30)

**Built:**
- HTML plans with 9 tabs (Overview, Mon-Fri, Sat-Sun, Groceries)
- Solarpunk design aesthetic (earth-tone palette, print-friendly)
- Clickable recipe links reducing mental load
- Snack simplification (3-4 options → 1 strategic choice)

**Learning:** Technical implementation was necessary but insufficient. Human-centered design made the system actually usable.

### GitHub Actions → Vercel Migration (2026-01-04) ⚡ CRITICAL PIVOT

**Trigger:** Need for real-time inventory updates, meal logging without CLI.

**Decision:** Move from static GitHub Pages to Vercel serverless app.

**Architecture:**
- Python serverless functions (`/api` endpoints)
- Next.js frontend (React + Tailwind CSS)
- GitHub-as-database (GitOps persistence via API)
- Cost: $0/mo on Vercel Hobby tier

**Constraints:**
- Read-only filesystem on Vercel required rethinking all I/O operations
- All writes must go through GitHub API
- Cache invalidation critical for state consistency

**Learning:** Serverless environments require different patterns - functions that work locally may fail in read-only environments.

### Phase 6: Execution Tracking (2026-01-01)

**Key Decisions:**

1. **Single source of truth:** Use `history.yml` only - no separate execution files
   - Rationale: Minimize duplication, optimize LLM context usage, simpler data management
   - Learning: More files ≠ better organization - single file with clear structure beats multiple files

2. **Minimal required fields:** `made` (yes/no/freezer) + `vegetables_used` only
   - Removed: prep time tracking, energy levels, lunch tracking
   - Learning: Start simple, expand only if needed - avoid premature complexity

3. **Structured inputs over AI parsing:** GitHub Issue checkboxes instead of free-text parsing
   - Why: Higher reliability, better mobile UX, less parsing complexity
   - Learning: Let users pick from lists when possible

4. **Kids preferences tracking:** Multi-choice feedback (Loved it ❤️ / Liked it 👍 / Neutral 😐 / Didn't like 👎 / Refused ❌)
   - Track both favorites (what to repeat) and dislikes (what to avoid)

### Phase 7: Smart Features (2026-01-01)

**Built:**
- Analytics script (`analyze_trends.py`) - recipe success rates, vegetable consumption, weekly adherence
- Live development setup (`dev.sh`) - auto-regenerate plans on file changes
- Persistent meal substitutions - respect manual changes in `history.yml`
- Recipe measurement standardization - 83 recipes fixed (35% → 9.4% with issues)
- Smart re-planning - automatically shifts skipped meals to future days

**Learning:** Data quality compounds - good measurements make grocery lists accurate, which reduces food waste and shopping stress.

### Phase 8-11: Web Dashboard (2026-01-04)

**Built:**
- Interactive dashboard with real-time state
- "Start New Week" / "Confirm Veg" / "Generate Plan" buttons
- Daily check-in with emoji feedback for all meals
- Freezer inventory auto-removal when meals used
- Multi-step dinner logging (Made / Freezer Backup / Ate Out / Something Else)
- Prep completion tracking with checkboxes
- Week at a Glance view with execution status

**Technical Decisions:**
1. **Full API Response on Write:** POST endpoints return complete updated state to prevent stale data
2. **State Lifting:** Dinner logging state lifted to parent Dashboard to prevent re-render issues
3. **Optimistic UI with Undo:** Inventory deletions have 5-second undo instead of confirmation dialogs
4. **Progressive Disclosure:** Multi-step flows reduce cognitive load

**Learning:** Feedback is as important as speed - clear loading states prevent "is it frozen?" feeling.

### Phase 11: Advanced Features (2026-01-05 - 2026-01-06)

**Block 1: Performance Optimization**
- Split monolithic `recipes.json` → 227 individual YAML files
- API caching (5-minute TTL, invalidation on write)
- Response time (cached): <10ms

**Block 2: Meal Swap**
- Drag-and-drop style swapping between days
- Dynamic prep regeneration (swapping meals also moves prep instructions)
- State-based 2-click selection (simpler than drag-and-drop libraries)

**Block 4: Inventory Intelligence**
- Split `freezer` into `backups` (ready-to-eat) and `ingredients` (components)
- Smart substitution engine scoring recipes by available ingredients
- Replacement modal with 3 tabs: Shop Your Fridge / Freezer Stash / Quick Fix

**Block 5: Recipe Format Migration**
- Migrated 227 recipes from HTML to Markdown with YAML frontmatter
- 70% reduction in token usage for meal planning
- Rich recipe viewer with `react-markdown` and Tailwind Typography

**Learning:** Migrating to simpler text-based format reveals hidden data inconsistencies and provides immediate performance boost.

### Phase 12: Architecture Hardening (2026-01-08)

**Problem:** Monolithic files, no types, limited tests, silent errors.

**Built:**

**12.1 Component Extraction:**
- Reduced `page.tsx` from 950 lines to 634 lines (33% reduction)
- Extracted `Skeleton`, `Card`, `FeedbackButtons`, `DinnerLogging` components

**12.2 TypeScript Interfaces:**
- Created `src/types/index.ts` with 30+ interfaces
- TypeScript errors: 34 → 7 (79% reduction)
- All 15 API functions properly typed

**12.3 Hook Stabilization:**
- Fixed "Minified React Error #310" (Rules of Hooks violation)
- Consolidated 25+ `useState` hooks into structured state objects
- Added global `ErrorBoundary` and `ToastContext`

**12.5 Backend Refactoring:**
- Split `api/index.py` (1400 lines) → Flask Blueprints (`status.py`, `meals.py`, `inventory.py`, `recipes.py`)
- Refactored `workflow.py` (2652 lines) → package structure (`state.py`, `selection.py`, `html_generator.py`, `replan.py`, `actions.py`)

**12.6 Documentation:**
- Created `CONTRIBUTING.md`, `ARCHITECTURE.md`, `API_REFERENCE.md`
- Created `recipes/TEMPLATE.md` with Prep Steps section
- Created `.env.example` for environment variables

**Learning:** Technical debt compounds - organic growth through 11 phases created architectural debt that needed explicit acknowledgment.

### Phase 13: Refinement & Productization (2026-01-08 - Present)

**13.1 Critical State Fixes (2026-01-08) ✅ Complete**
- Fixed "No active week plan found" by adding `week_data` to status API
- Fixed analytics page argument mismatch
- Removed analytics widgets from main dashboard

**13.2 Advanced Inventory UX (2026-01-08) ✅ Complete**
- Unified search across Fridge/Pantry/Freezer
- Quick actions: `(+)` and `(-)` for quantity adjustments
- Move functionality to transfer items between locations
- Brain Dump modal for bulk adding

**13.3 Persistent Prep Workflow (2026-01-08) ✅ Complete**
- Prep tasks extracted from recipes during plan generation
- Deterministic task IDs for robust status tracking
- Tasks stored in `history.yml` with `status: pending`
- Interactive checklist grouped by meal on dashboard
- Real-time backend sync when checking boxes

**Learning:** Granular tasks provide better tracking than generic categories. Leveraging existing data structures prevents state fragmentation.

**13.4 Productization Architecture (2026-01-09 - In Progress) 🔄**
**Goal:** Enable white-labeling by making all personal data config-driven

**Audit Findings (2026-01-09):**
Identified 7 locations with hardcoded personal data:
1. `scripts/workflow/actions.py:27` - Entire config fallback object
2. `scripts/mealplan.py:255-257` - Default preferences
3. `scripts/lunch_selector.py:39-54` - Kids lunch defaults
4. `scripts/update_lunch_fields.py:57-63` - Lunch field mapping
5. `api/routes/status.py:46` - Hardcoded Pacific timezone
6. `api/routes/status.py:86-89, 92-98` - Snack defaults (2 locations)
7. `scripts/workflow/html_generator.py:210-211` - Schedule fallbacks

**Progress:**
- **Chunks 1-7 (2026-01-09, 30min total):** Config-driven architecture migration ✅ COMPLETE
  - **Chunk 1:** Enhanced `config.yml` with `lunch_defaults`/`snack_defaults`, created `config.example.yml`, added `validate_config_schema()`
  - **Chunk 2:** Created `docs/HARDCODED_AUDIT.md` with 7 findings prioritized by impact
  - **Chunk 3:** Removed hardcoded config fallbacks in `workflow/actions.py` and `mealplan.py` (2 critical ✅)
  - **Chunk 4:** Created `_load_config()` helper in `api/routes/status.py`, timezone now config-driven (1 high ✅)
  - **Chunk 5:** Modified `lunch_selector.py` to load lunch defaults from config.yml (1 high ✅)
  - **Chunk 6:** Updated snack defaults in `api/routes/status.py` to read from config.yml (1 high ✅)
  - **Chunk 7:** Fixed schedule fallbacks in `html_generator.py` to use config.yml (1 medium ✅)

**Result:** All 7 hardcoded locations now config-driven. System ready for white-labeling.

- **Chunk 8 (2026-01-09, 10min):** Documentation
  - Created comprehensive `docs/CONFIGURATION.md` (2000+ words) with examples, troubleshooting, best practices
  - Updated `CONTRIBUTING.md` with "Customizing for Your Family" section
  - Enhanced `README.md` quick start with configuration steps
- **Chunk 9 (2026-01-09, 10min):** Interactive Setup Script
  - Created `scripts/setup.py` - 300-line interactive wizard for guided config generation
  - Prompts for timezone, schedule, preferences, family profiles, lunch/snack defaults
  - Includes preview, validation, and backup of existing config
  - Updated README.md and CONFIGURATION.md to reference setup wizard

**Phase 13.4 COMPLETE ✅** - Total time: 50 minutes (vs 20 hours estimated = 24x faster)

**Remaining (Optional):** Frontend config display in dashboard, white-label end-to-end testing

**Learning:** Systematic audit enabled laser-focused fixes. Distributed config loading (each module loads independently) worked better than centralized helper. Comprehensive documentation + interactive tooling as critical as code for white-labeling success.


### Phase 14: Data Layer Redesign (2026-01-10)

**Goal:** Strict separation of "Plan" (Historical Intent) vs "Actual" (Reality) for accurate analytics.

**Problem:**
Previously, the frontend received a merged "week view" where actual execution data overwrote the planned slot. This made it impossible to answer questions like "how often do we stick to the plan?" or "what do we usually eat when we skip the plan?".

**Solution: The 3-Layer Data Model**
1.  **Plan Layer (Intent):** Immutable record of what was generated/planned (e.g., "Tacos").
2.  **Actual Layer (Reality):** Sparse record of what actually happened (e.g., "Pizza", "Skipped", "Leftovers").
3.  **Resolved Layer (Display):** Runtime logic merging Plan + Actual -> Final State.

**Implementation:**
- **New Module:** `api/utils/meal_resolution.py` handles the merge logic.
- **Strict Adherence States:**
    - `ADHERED`: Actual matches Plan.
    - `SUBSTITUTED`: Actual exists but differs from Plan.
    - `SKIPPED`: Explicitly marked as not made.
    - `NOT_LOGGED`: Plan exists, no actual data.
    - `UNPLANNED`: No plan, but meal logged.
    - `EMPTY`: Neither plan nor actual.
- **API Strategy:** `GET /api/status` now returns a new `slots` object with strict state, while maintaining the legacy `dinners` list for frontend compatibility.
- **Testing:** Moved from mocking external libraries (Supabase) to mocking the internal `StorageEngine` for robust, deterministic tests.

**Learning:** Separating "intent" from "reality" is critical for analytics. A "merged" view is good for UI, but bad for data science. Always store the raw layers.

### Phase 15: Database Migration & Infrastructure Stability (2026-01-10 - 2026-01-11)

**Goal:** Establish a robust database foundation (Supabase) and resolve technical debt introduced by Next.js/React framework upgrades.

**Key Decisions:**
1. **Supabase Integration:** Transitioned from file-based (YAML/GitOps) storage to Supabase (PostgreSQL).
   - **Rationale:** Eliminate race conditions during concurrent updates and provide a real query engine for future features (like "Smart Suggestions").
   - **Learning:** Database schemas force data cleanliness. The migration script revealed structural inconsistencies in historical YAML files that the application was previously "masking."
2. **Next.js 15 Compatibility:** Proactively addressed the breaking change in Next.js 15 where `searchParams` and `params` became async.
3. **Dependency Consolidation:** Downgraded to stable versions of Next.js/React to eliminate "noise" from deprecation warnings while ensuring core functionality remained modern.

**Built:**
- `scripts/migrate_to_supabase.py`: Full ETL pipeline for porting YAML data to SQL.
- `scripts/verify_supabase.py`: Integrity checker for the new data layer.
- `api/utils/meal_resolution.py`: Merged Plan vs. Actual logic into a unified "Resolved" state.
- Automated tests for database integration (100% coverage on new resolution logic).

**Critical Lessons from Phase 15 Deployment:**
- **Pinning is Mandatory**: Never leave library names "barefoot" in `requirements.txt`. A transient update to `httpx` broke the incompatible `supabase-py` library in production. Always use `==` for every dependency.
- **Async Props in Next.js 15**: `params` and `searchParams` in Page components are now Promises. Failing to `await` them causes build-time TypeScript errors and runtime crashes.
- **Env Var Pre-flight**: Local `.env.local` success does not guarantee production success. Always verify Vercel secrets before merging to `main`.
- **Debug Endpoints Save Time**: Adding `/api/debug` to expose initialization errors (`init_error: string`) turned a "black box" 500 error into a 5-minute fix.

**Learning:** The "Git-as-a-Database" model was an excellent starting point for speed, but SQL becomes necessary once you need to perform complex analytical queries across history and inventory.

### Phase 16: Smart Weekly Planning Workflow (End-to-End) (2026-01-11)

**Goal:** Create a guided, intelligent wizard for weekly planning that leverages historical data.

**Block 1: Smart Data Collection (Completed)**
- **Step 0 (Prior Week Review):** Interactive UI to confirm made/skipped meals and log leftovers.
- **Step 1 (Inventory Update):** Bulk update interface integrated into the planning wizard.
- **Step 2 (Waste Not Engine):** Suggests recipes for Mon/Tue based on leftovers and perishable fridge items.
- **Block 2: Collaborative Planning (Completed)**
    - **Step 3 (Tentative Plan):** Logic to fill remaining days while respecting manual selections.
    - **Step 4 (Smart Grocery List):** Dynamic shopping list generation comparing plan needs vs current inventory.
    - **Step 5 (Purchase Confirmation):** UI to confirm purchases and auto-update inventory.
    - **Step 6 (Plan Finalization):** Endpoint to set plan status to "active" and lock it in.
- **Technical Implementation:**
    - New `PlanningWizard` components for all steps.
    - New Backend routes: `/api/plan/draft`, `/api/plan/shopping-list`, `/api/plan/finalize`.
    - Integrated `inventory_intelligence.get_shopping_list` for smart subtraction.
    - Full end-to-end flow from Review -> Active Plan.

### Phase 17: Core Stability & Data Hygiene (2026-01-11)

**Goal:** Establish a stable foundation by fixing critical bugs and standardizing data before adding new features.

- **Bug Fix:** Resolved critical "Week View" issue where adhered meals showed "Not planned" due to missing recipe metadata in the resolved state. Updated `api/routes/status.py` to correctly merge Plan + Actual data.
- **Workflow Standards:** Formalized branching strategy in `CLAUDE.md`. Every subphase now requires a dedicated branch, local testing, and Vercel preview validation.
- **Data Cleanup:** 
    - Removed unused imports (`yaml`, `log_execution`).
    - Standardized recipe index (fixed "tomatoe" typo, removed duplicate `ragada_patty`).


### Phase 18: Enhanced Planning Workflow (Wizard 2.0) (2026-01-11)

**Goal:** Refine the planning wizard UX to be more robust, robust, and user-friendly, handling edge cases like "no previous week" and ensuring React stability.

**Block 1: Wizard UX Overhaul & Stability (Completed)**
- **UI Enhancements:**
    - Split "Review" into distinct "Dinners" (Step 0) and "Snacks" (Step 1) screens for focus.
    - Improved "Inventory" (Step 2) with "Leftovers" vs "Ingredients" categorization and quantity inputs.
    - Added "Meal Suggestions" dashboard (Step 3) as a clear bridge between Inventory and Planning.
- **Critical Fixes:**
    - **React Hook Order:** Resolved invalid hook calls by moving conditional logic out of component rendering path.
    - **Review Fetching:** Fixed backend crash (`invalid input syntax for type date: "None"`) when no prior week existed.
    - **Draft Loading:** Fixed `planningWeek` initialization logic to correctly target the upcoming Monday.
    - **Inventory Safety:** Added robust null-checks to prevent wizard crashes on empty inventory states.
- **Workflow:** Verified full end-to-end flow from "Start Fresh" -> "Active Plan".
    - **Editable Tentative Plan:** Added pencil icon and modal to "Draft" step (Step 4) for immediate corrections without restarting.
    - **Low-Friction Leftovers:** "Did you have leftovers?" now auto-fills item name and backend intelligently aggregates batches.

**Block 2: Pause Capability (Draft Mode) (Completed)**
- **Feature:** Wizard state is now persisted to the `meal_plans` table (`wizard_state` JSON field).
- **UX:** Refreshing the page or navigating away no longer loses progress.
- **Auto-Resume:** Returning to `/plan` automatically restores the user to the correct step with all inputs (reviews, inventory draft, selections) intact.

**Block 3: Nightly Confirmation (Completed)**
- **Feature:** Dashboard now detects if it's after 6 PM and meals aren't logged.
- **UX:** Persistent banner prompts for review, simplifying the daily "did we actually eat this?" check.

**Block 4: Interactive Shopping List & Inventory Sync (Completed)**
- **Feature:** Wizard Step 5 is now an interactive checklist.
- **Integration:** Items checked off are automatically added back to the `fridge` inventory upon finalizing the plan. 
- **UX:** Supports adding custom items (milk, eggs) directly to the grocery list within the wizard.

### Phase 19: Loop Closure & Adjustments (2026-01-13) ✅ Complete
**Goal:** Close the loop between execution and planning by enabling new recipe capture and mid-week plan adjustments.

**Block 1: New Recipe Capture Flow (Completed)**
- **Detection:** Added backend logic to scan historical logs for meals that are not in the recipe index. These are flagged as `pending_recipes`.
- **UI:** Implemented a non-intrusive "New Recipes Detected" banner on the dashboard that appears only when unindexed meals are found.
- **Capture:** Created a modal allowing users to capture recipes via a URL or manual entry (Ingredients + Instructions).
- **Ingestion:** 
    - Automated the creation of Markdown recipe files with YAML frontmatter.
    - **Heuristic Prep Generation:** Built a script that automatically suggests prep tasks (e.g., "Chop onions", "Mince garlic") by analyzing recipe text during ingestion.
    - Synchronized new recipes to Supabase immediately upon capture.

**Block 2: Index Intelligence & Hygiene (Completed)**
- **Audit:** Automated index audit found 0 duplicates across 235 recipes.
- **Prep Standardization:** Overhauled `generate_prep_steps.py` with improved heuristics and forced a standardization pass across the entire index (145 recipes updated).
- **Auto-Generation:** New recipes now get prep steps automatically.

**Block 3: Flexible Logging & Adjustments (Completed)**
- **Feature:** Added native support for logging "Leftovers" and "Ate Out" (Restaurant) meals, ensuring accurate adherence metrics (adhered=False but accounted for).
- **Feature:** Implemented "Change Plan" modal directly on the dashboard dinner card.
- **UX:** Users can now move today's dinner to another day with one click, swapping meals if necessary, handling the common "too tired today, will cook Friday" scenario.
