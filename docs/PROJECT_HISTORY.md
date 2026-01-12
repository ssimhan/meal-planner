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

