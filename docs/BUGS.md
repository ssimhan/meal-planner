# Bug Tracking & Technical Debt

**Last Updated:** 2026-01-29
**Current Phase:** 34 (Frictionless Shopping)

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
| BUG-001 | Replan | Prep tasks don't refresh after a replan. | High | 2hr | Fixed via heuristic fallback. |
| BUG-002 | Shopping List | Items purchased in list don't sync to inventory. | High | 2hr | Fixed with category inference. |
| BUG-003 | Management | Meal defaults don't make sense for multiple households. | Medium | 1hr | Removed hardcoded weekend defaults. |
| BUG-004 | Roadmap | Review future roadmap phases (35-39) for multi-household support. | Medium | 2hr | Completed review. |
| BUG-005 | Inventory | `add_inventory` has redundant whole-inventory fetch check. | Low | 1hr | Fixed: Removed redundant fetch, uses targeted query. |
| BUG-006 | Auth | Hardcoded household ID fallback in `require_auth` hides profile gaps. | Medium | 1hr | Fixed: Now returns 403 with `PROFILE_INCOMPLETE` code. |
| BUG-007 | Week View | Replace button (🔄) persists in View Mode after exiting Edit Mode. | Low | 1hr | Fixed: State closure race condition in editMode toggle. |

---

## Features

**New features or enhancements identified during development.**

| ID | Area | Description | Impact | Effort | Notes |
|----|------|-------------|--------|--------|-------|
| TD-001 | Smart Shopping | "I Have This" defaults to Pantry. Should infer category. | Low | 1hr | Fixed in phase 32. |
| TD-002 | Recipes | Standardize ingredients (e.g. tamarind pulp -> concentrate, typos). | Low | 2hr | Bulk fixed 73 recipes in phase 32. |
| TD-003 | Recipes | Mashed ingredient quantities (e.g. 1onion -> 1 onion). | Low | 1hr | Audited in phase 32 (0 found). |
| TD-004 | Recipes | Redundant cuisine tags (italian, mexican, etc). | Low | 1hr | Bulk fixed 73 recipes in phase 32. |
| TD-005 | Architecture | GroceryMapper uses local JSON (`data/store_map.json`). | High | 3hr | Fixed: Migrated to Supabase `households.config.store_preferences`. |
| TD-006 | Performance | Heuristic prep-task generation reads MD files on every request. | Medium | 2hr | Fixed: Added LRU cache with content hash key for `get_prep_tasks`. |
| TD-007 | Persistence | `StorageEngine` writes to local YAML/JSON in some methods. | High | 2hr | Fixed: Migrated `ignored_recipes`, `preferences` to DB config. |
| TD-008 | Performance | `get_pending_recipes` is a heavy, unoptimized scan. | Medium | 2hr | Fixed: Added TTL-based caching (5 min) per household. |
| TD-009 | Architecture | Large route files (`meals.py`) contain complex business logic. | Medium | 4hr | Fixed: Extracted 6 helpers to `api/services/meal_service.py`. Reduced `log_meal` from 258 to ~180 lines. |
| TD-010 | Testing | Integration tests need proper mocking and test data fixtures. | Medium | 4hr | Fixed: Rewrote `test_api_perf.py` and `test_backend.py` with proper mocking and assertions. |
| TD-011 | UX | Import preview modal is too small and "Save" button is hard to find. | Low | 1hr | Fixed: Added min-height on textareas, prominent animated Save button. |
| TD-013 | Architecture | BatchEditPage `saveAll` is non-atomic (sequential API calls). | High | 3hr | Fixed: Implemented `bulk_update_recipes` atomic endpoint. |
| TD-015 | Architecture | Vulnerability: Scripts crash if recipe metadata is None. | High | 2hr | Fixed: Implemented systemic sanitization layer in `StorageEngine`. |

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

