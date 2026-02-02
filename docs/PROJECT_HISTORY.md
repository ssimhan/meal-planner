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

### Phases 0-30 (Legacy Archive)
> [!NOTE]
> Detailed history for Phases 0-30 (December 2025 - January 2026), including the initial CLI foundation, UX redesigns, and the migration to the Multi-Tenant Supabase architecture, has been moved to [docs/archive/PROJECT_HISTORY_LEGACY.md](archive/PROJECT_HISTORY_LEGACY.md) to keep this file focused on current development.


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
- **Modular Recipe Slots**: Transitioned core data model from `recipe_id` (string) to `recipe_ids` (array), enabling multi-recipe meal slots and intelligent pairings.
- **Service Domain Extraction**: Extracted 20+ logic helpers from `meals.py` into dedicated `meal_service.py` and `pairing_service.py` for algorithmic side-dish suggestions.
- **SWR Performance Engine**: Implemented Stale-While-Revalidate caching for pending recipes, eliminating "cold start" latency in serverless environments.
- **Earthy Spice UX Refresh**: Applied the premium design system to new components like the Pairing Drawer and Replacement Modal.

**💡 Key Learnings & Decisions:**
- **Decision (Boundary Sanitization)**: Opted for a "Gatekeeper" pattern in `StorageEngine`. By normalizing data at the DB-to-Service boundary, we eliminated an entire class of 500 errors.
- **Decision (Service-Oriented Split)**: Strategically decoupled route logic from state management. `meal_service.py` now handles all inventory/logging side-effects.
- **Decision (SWR Performance)**: Chose SWR over simple TTL to ensure the UI feels instant by eliminating waiting on cold DB queries for non-critical data.
- **Decision (Quality - Reproduction FIRST)**: Cemented as a project law. No bug is worked on without a failing reproduction (code-based or Markdown UI Test Plan).
- **Decision (Logic vs UX Split)**: Formally separated `/code-review` and `/verify-ux` to ensure architectural changes don't compromise aesthetic fidelity.
- **Learning (Observability)**: Discovered that granular, domain-specific error codes are force-multipliers for debugging in serverless environments.

**Phase 34.5: Repository Hardening & Scannability (2026-02-02) ✅ Complete**

**Achievements:**
- **Aggressive Project Archival**: Moved all project history prior to Phase 30.5 (Supabase migration anchor) to `docs/archive/PROJECT_HISTORY_LEGACY.md`.
- **Codebase Reorganization**: Deleted 30+ redundant files, legacy prototypes, and defunct one-off scripts to improve repository scannability.
- **Documentation Refactor**: Updated `README.md` and `REPO_STRUCTURE.md` to reflect the high-fidelity, simplified architecture.

**💡 Session Learning:**
- **Hurdle (Workflow Redundancy)**: Discovered that legacy repositories like `claude-code-quickstart` contained outdated versions of core workflows (`/build`, `/plan`, `/closeout`). Deleting these non-authoritative sources ensures the team only pulls from the high-fidelity global workflow definitions.

**Next Phase**: Transitioning to Phase 35: Frictionless Shopping & Architecture Hardening.
