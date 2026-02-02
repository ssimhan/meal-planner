# Bug Tracking & Technical Debt

**Last Updated:** 2026-02-02
**Current Phase:** 35 (Frictionless Shopping)

---

## ⚠️ Quality Gate: Zero-Debt Policy

**No phase is complete until:**
- Active Bugs = 0
- Planned Features for Phase = 0
- All tests passing
- Vercel preview verified

---

## Active Bugs

**Must be 0 before phase completion.**

**Count: 0** ✅

| ID | Area | Description | Impact | Effort | Notes |
|----|------|-------------|--------|--------|-------|

---

## Resolved Bugs

| ID | Description | Resolution | Resolved |
|----|-------------|------------|----------|
| BUG-001 | Vercel build fail: `@types/jest@^29.7.0` invalid version. | Downgraded to `@types/jest@^29.5.14` (last valid v29 types). | 2026-02-02 |

---

## Features

**New features or enhancements identified during development.**

| ID | Area | Description | Impact | Effort | Notes |
|----|------|-------------|--------|--------|-------|

**Count: 0** ✅


---

## Phase Completion Checklist

Before merging to `main`:

- [ ] Active Bugs = 0
- [ ] Features = 0 (for current phase)
- [ ] All block features implemented
- [ ] Local testing passed (`npm run dev:full`)
- [ ] Vercel preview deployed and verified
- [ ] project_roadmap.md updated with ✅ Complete
- [ ] PROJECT_HISTORY.md updated

---

## Audit Log

**Historical reference only.** Resolved issues from Phases 1-32 have been moved to [docs/archive/BUG_ARCHIVE.md](archive/BUG_ARCHIVE.md).

### Phase 34 (Completed 2026-02-02)
- Added: SWR (Stale-While-Revalidate) cache pattern for serverless environments (TD-013)
- Added: 12 unit tests for `meal_service.py` helpers (TD-014)
- Added: 5 unit tests for `SWRCache` class
- Upgraded: `get_pending_recipes` from simple TTL to SWR semantics (TD-008)
- Added: `refresh_pending_recipes_cache()` and `get_pending_recipes_cache_stats()` debugging utilities
- **Learning (Observability)**: Realized the critical importance of unit testing and granular error codes (e.g. `SHOPPING_LIST_GENERATION_FAILED`, `DRAFT_GENERATION_FAILED`). These significantly accelerated debugging in serverless environments and provided much better system observability.
- **Decision (Workflow Refinement)**: Enforced **Reproduction FIRST** for all bug fixes. Every fix must now be preceded by a failing code-based test or a documented Markdown UI Test Plan.
- **Build Fix**: Resolved a critical Vercel deployment blocker caused by a version mismatch in `@types/jest` (BUG-001).

**Next Phase**: Transitioning to Phase 35: Frictionless Shopping & Architecture Hardening.

### Phase 32 (Completed 2026-01-28)
- Fixed: `TypeError: e.map is not a function` in ReviewGroceriesModal (SM-001). API response was an object, expected array.
- Fixed: `[Errno 30] Read-only file system: 'debug_log.txt'` during replan confirm (SYS-001)
- Fixed: Replan Inventory Scroll (UI-005)
- Fixed: Replan Failed Alert (SYS-003)
- Fixed: Inventory Scroll Usability (UI-006) - Removed nested scroll container
- Fixed: Replan Error Toast (UI-007) - Confirmed use of Toast instead of alert()
- Fixed: Replan 500 Error (Server Crash) - Added robustness for missing data and auto-injection of `week_of`.
- Fixed: Inventory Visibility in Replan (ID: 4) - Standardized inventory state to use normalized structure, fixing empty list display.
- Fixed: Cache Invalidation (CACHE-001) - Added `invalidate_cache()` to 3 endpoints (`add_store`, `map_item`, `update_settings`) that were missing it.

### Phase 30 (Completed 2026-01-25)
- Fixed: Database Trigger Error (UUID Type Mismatch in `handle_new_user`) (CRIT-001)
- Fixed: Signup Flow Validation & Error Feedback (AUTH-001)
- Fixed: Future Planning State Reset (Future weeks > 2026-01-26 deleted) (DAT-001)
- Fixed: Brain dump items don't display after submission (INV-001) - missing `setNormalized()` call

### Phase 29 (Completed 2026-01-25)
- Fixed: Week at a Glance: Rows don't line up properly (UI-001)
- Refactored: WeekView component split into sub-components (TD-001)
- Improved: Strict Types for InventoryState (TD-002)
- Fixed: Inventory UI Confusion (Meals vs Ingredients) (USR-001)
- Fixed: Week View missing week label (UI-002)
- Added: Week View Navigation (NAV-001)

### Phase 28 (Completed 2026-01-24)
- All bugs resolved before completion
- Zero technical debt carried forward

### Phase 27 (Completed 2026-01-17)
- Fixed: `.join()` Type Error in Content Modal
- Fixed: Missing YAML file 404 in Editor

### Phase 26 (Completed 2026-01-15)
- Fixed: Draft Error (`'selections' is not defined`)
- Fixed: Shopping List Rendering (object as React child)
- Fixed: Leftovers Sync Failure (Misclassified as Ingredients)
- Fixed: Task Duplication (In-place list modification)
- Fixed: Prep Counter / Dinner Display out of sync


---

## Guidelines

### When to Add to Active Bugs
- Functionality broken or regressed
- Error messages in console
- Data not saving/loading correctly
- UI rendering incorrectly
- **Add immediately when discovered** (don't defer)

### When to Add to Features
- New functionality requests
- Improvements to existing logic
- Refactoring tasks (formerly tech debt)
- UI polish items
- **Add when identifying a need that isn't a bug**

### Priority Levels
- **Critical:** Data loss, crashes, core functionality broken
- **High:** Significant UX impact, workaround exists
- **Medium:** Minor UX issue, edge case
- **Low:** Cosmetic, nice-to-have

### Impact Levels (Features)
- **High:** Critical for user value or developer velocity
- **Medium:** Standard enhancement
- **Low:** Nice-to-have, can be deferred

### Effort Estimates
- **15min:** Quick fix
- **1hr:** Straightforward refactor
- **2-4hrs:** Moderate complexity
- **8hrs+:** Major refactor (consider breaking into smaller items)

---

## AI Assistant Notes

**During development sessions:**
1. Scan for TODOs/FIXMEs in modified files
2. Flag copy-pasted code patterns
3. Remind about zero-debt policy before phase completion
4. Help triage priority/impact levels

**Before phase completion:**
1. Verify both tables are empty (for current phase items)
2. Block merge to main if bugs remain
3. Suggest de-scoping features if needed to hit quality gate
