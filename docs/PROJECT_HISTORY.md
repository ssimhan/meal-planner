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

## Recurring Error Patterns & Solutions

### Pattern 1: State Synchronization in Serverless

**Symptoms:** Stale data after mutations, missing updates in UI

**Root Causes:**
- Vercel's read-only filesystem + in-memory caching
- Endpoints returning success messages instead of updated state
- Frontend expecting data shapes API didn't provide

**Solution Evolution:**
- Added GitHub API writes bypassing filesystem
- Cache invalidation on writes
- All mutation endpoints return full `WorkflowStatus`

### Pattern 2: Field Naming Inconsistencies

**Symptoms:** Data written correctly but not displayed in UI

**Root Causes:**
- `school_snack` (storage) vs `school_snack_feedback` (API) vs `today_snacks.school` (display)
- Suffix transformations applied inconsistently across layers

**Solution:** Created `FIELD_NAMING_CONVENTION.md` documenting 3-layer naming system

### Pattern 3: React Hook Ordering Violations

**Symptoms:** "Minified React error #310" crashes

**Root Causes:**
- 25+ individual `useState` hooks in monolithic components
- Conditional hook calls inside logic blocks
- Component definitions inside render loops (IIFEs)

**Solution:**
- Consolidated to structured state objects
- Lifted all hooks to top of component (before any logic)
- Extracted sub-components outside render function

### Pattern 5: Next.js 15 Async Params

**Symptoms:** "Type '{ searchParams: ... }' does not satisfy the constraint 'PageProps'" and runtime errors in LoginPage.

**Root Cause:** Next.js 15 changed `params` and `searchParams` from plain objects to Promises in page/layout components.

**Solution:** Updated component types and awaited `searchParams` before access.

### Pattern 6: Supabase/Vercel Proxy Conflict

**Symptoms:** Success locally but 500/Crash in Vercel with "proxy" argument errors.

**Root Cause:** `supabase-py` versions < 2.11.0 had a bug trying to handle proxies in serverless environments.

**Solution:** Forced upgrade to `supabase>=2.11.0` and `httpx>=0.28.0`.

### Pattern 7: Module-level errors propagate silently - test imports in isolation

## Decision Frameworks

### Framework 1: Progressive Enhancement Over Big Rewrites

**Examples:**
- CLI → GitHub Actions → Vercel (not CLI → full web app immediately)
- Static HTML → Dynamic dashboard → Interactive editing
- Generic feedback → Emoji feedback → Multi-step workflows

**Principle:** Each phase must be production-ready; no "throw it all away" moments

### Framework 2: Constraints Create Freedom

**Examples:**
- Limiting Thu/Fri to no-prep increased usability (not decreased it)
- ONE snack/day reduced decision fatigue vs 3-4 options
- Freezer backup quota (maintain 3 meals) made system resilient

**Principle:** Well-designed limits paradoxically expand capability

### Framework 3: Data Quality Compounds

**Examples:**
- Recipe metadata → constraint satisfaction → accurate plans → less food waste
- Measurement standardization → better grocery lists → less shopping stress
- Structured feedback → analytics → smarter future plans

**Principle:** Invest in tagging/structure early - multiplies value over time

### Framework 4: Optimize for Debugging

**Examples:**
- Verbose console output for inventory scoring ("45/100: fridge=tomato, pantry=bean")
- Field naming documentation after mapping bugs
- Type interfaces as executable documentation

**Principle:** Make the system's reasoning transparent to humans

## What Would Be Different in a Rewrite?

### Start With:
1. **Type-first design:** Define TypeScript interfaces before writing any API code
2. **Component library:** Build reusable components (Card, Modal, Buttons) in Phase 1
3. **API contract:** Document endpoint shapes in OpenAPI before implementation
4. **Test harness:** Write data validation tests alongside feature code

### Avoid:
1. **Premature optimization:** Don't split files until they're painful to navigate (>800 lines)
2. **Over-abstraction:** Three similar lines > premature helper function
3. **Magic parsing:** Structured inputs (checkboxes) > free-text AI parsing
4. **Global state:** Pass props explicitly until scale demands context/Redux

### Keep:
1. **Plain text storage:** YAML + Markdown is future-proof and version-control friendly
2. **Energy-based scheduling:** This is the core innovation - never compromise it
3. **Freezer backup system:** Escape hatches make rigid systems usable
4. **Incremental migration:** Each phase delivered working software

## Metrics That Mattered

### Pre-System (Manual Spreadsheets):
- 30min/week planning time
- High recipe repetition (same 10 meals)
- Frequent "what's for dinner?" panic
- Evening cooking interfered with bedtime routines

### Post-System (Current State):
- 5min/week planning time (90% reduction)
- 0 recipe repeats within 3 weeks (enforced by algorithm)
- Zero planning paralysis (system proposes, user approves)
- Thu/Fri evenings device-free (5-9pm protected)
- 3 freezer backups maintained (system tracks automatically)

### Code Quality Evolution:
- Phase 0-6: 3 Python files, no types, no tests
- Phase 12 Complete: 40+ modular files, 30+ TypeScript interfaces, 15+ test suites
- Phase 15 Complete: Supabase Postgres migration, 100% resolution logic test coverage, Next.js 15 compatibility
- TypeScript errors: 34 → 0 (100% resolution of build errors)
- API response time (cached): <10ms (instant)

## Lessons for Future Projects

1. **Start manual first** - Understand problem deeply before automating
2. **Write clear instructions** - CLAUDE.md = "how to do your job" manual
3. **Plain text > databases** - YAML is human-readable, version-controlled, future-proof
4. **Design for failure** - Freezer backups = escape hatch for imperfect adherence
5. **Constraints create freedom** - Limiting Thu/Fri to no-prep increases usability
6. **Iterate in public (Git)** - Track evolution, revert mistakes, learn from history
7. **Metadata is magic** - Tag once, query forever
8. **Let AI handle complex logic** - Constraint satisfaction is hard for humans, easy for AI
9. **Progressive enhancement** - Each phase delivers working software
10. **Documentation during implementation** - This history file captured decisions in real-time
11. **Chunking for sanity** - Break work into 1-2 hour execution blocks. "Heavy" blocks lead to painful debugging sessions.

## Final Thoughts

**Systems should serve human needs, not idealized behavior.** The energy-based prep model works because it acknowledges energy depletion. The freezer backup works because it acknowledges plans fail.

The best tools are the ones you actually use. This system works because it reduces cognitive load, respects constraints (evening time, energy levels), and builds in flexibility.

**Meta-Learning:** The best documentation is written during implementation (not after). This history file captured decisions in real-time, making consolidation possible. Future projects should maintain a running PROJECT_HISTORY.md from Day 1.

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

**Hardening Phase: Bug & Fix Requirement Gathering (2026-01-12) ✅**
- **Artifact:** Compiled a comprehensive "Bug & Fix List" covering Recipe Ingestion, Main Page UX, Inventory IA, and Global Behavior.
- **Goal:** Standardize data normalization, ensure prep step persistence, and overhaul the Inventory interface.
- **Impact:** Shifted focus back to Phase 17 (Stability) and defined Phase 19/21 for better closure and UX.

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

**Learning:** Automated "loop closure" is critical. By detecting missing recipes (`pending_recipes`) and allowing easy mid-week pivots ("Change Plan"), the system minimizes friction and prevents "abandonment due to rigidity."

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
- Realigned `IMPLEMENTATION.md` to prioritize the UX implementation (Phase 22) and push Authentication to Phase 24.
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
