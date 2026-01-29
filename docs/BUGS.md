# Bug Tracking & Technical Debt

**Last Updated:** 2026-01-26
**Current Phase:** 30 (Multi-Tenant Architecture)

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

**Count: 2** 

| ID | Area | Description | Impact | Effort | Notes |
|----|------|-------------|--------|--------|-------|
| PLAN-001 | Replan | Prep tasks don't refresh after a replan. | High | 2hr | Needs to trigger `generate_prep_steps.py` after replan. |
| SHOP-001 | Shopping List | Items purchased in list don't sync to inventory. | High | 2hr | Should trigger `add_to_inventory` logic. |
| MG-001 | Management | Meal defaults don't make sense for multiple households. | Medium | 1hr | Consider removal or scoped per-household defaults. |

---

## Features

**New features or enhancements identified during development.**

| ID | Area | Description | Impact | Effort | Notes |
|----|------|-------------|--------|--------|-------|
| TD-003 | Smart Shopping | "I Have This" defaults to Pantry. Should infer category. | Low | 1hr | Hardcoded in `api/routes/groceries.py` |
| TD-004 | Recipes | Standardize ingredients (e.g. tamarind pulp -> concentrate, typos). | Low | 2hr | Affects shopping list aggregation. |
| TD-005 | Recipes | Mashed ingredient quantities (e.g. 1onion -> 1 onion). | Low | 1hr | Found in several .md recipe files. |
| TD-006 | Recipes | Redundant cuisine tags (italian, mexican, etc). | Low | 1hr | Cuisine is already a dedicated field. |

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

**Historical reference only - issues from completed phases.**

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

### Phase 32 (In Progress / Finishing)
- Fixed: `TypeError: e.map is not a function` in ReviewGroceriesModal (SM-001). API response was an object, expected array.
- Fixed: `[Errno 30] Read-only file system: 'debug_log.txt'` during replan confirm (SYS-001)
- Fixed: Replan Inventory Scroll (UI-005)
- Fixed: Replan Failed Alert (SYS-003)
- Fixed: Inventory Scroll Usability (UI-006) - Removed nested scroll container
- Fixed: Replan Error Toast (UI-007) - Confirmed use of Toast instead of alert()
- Fixed: Replan 500 Error (Server Crash) - Added robustness for missing data and auto-injection of `week_of`.
- Fixed: Inventory Visibility in Replan (ID: 4) - Standardized inventory state to use normalized structure, fixing empty list display.
- Fixed: Cache Invalidation (CACHE-001) - Added `invalidate_cache()` to 3 endpoints (`add_store`, `map_item`, `update_settings`) that were missing it.


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
- Verify both tables are empty (for current phase items)
- Block merge to main if bugs remain
- Suggest de-scoping features if needed to hit quality gate
