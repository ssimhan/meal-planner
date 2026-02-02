# Bug & Technical Debt Archive

Historical records of resolved issues from completed phases.

---
7: 
8: ### Phase 34 (Completed 2026-02-02)
9: - Fixed: Prep tasks don't refresh after a replan (BUG-001)
10: - Fixed: Items purchased in list don't sync to inventory (BUG-002)
11: - Fixed: Meal defaults don't make sense for multiple households (BUG-003)
12: - Completed: Review future roadmap phases (35-39) for multi-household support (BUG-004)
13: - Fixed: `add_inventory` has redundant whole-inventory fetch check (BUG-005)
14: - Fixed: Hardcoded household ID fallback in `require_auth` hides profile gaps (BUG-006)
15: - Fixed: Replace button (🔄) persists in View Mode after exiting Edit Mode (BUG-007)
16: - Fixed: "I Have This" defaults to Pantry. Should infer category (TD-001)
17: - Fixed: Standardize ingredients and redundant cuisine tags (TD-002, TD-004)
18: - Fixed: GroceryMapper usage of local JSON (TD-005)
19: - Fixed: Performance issues with prep-task generation and pending recipes (TD-006, TD-008)
20: - Fixed: Local YAML/JSON persistence in `StorageEngine` (TD-007)
21: - Fixed: Monolithic route files business logic extraction (TD-009)
22: - Fixed: Integration test mocking and coverage (TD-010, TD-014)
23: - Fixed: Import recipe UX and auto-prep task generation (TD-011, TD-012)
24: - Added: SWR (Stale-While-Revalidate) cache pattern for serverless (TD-013)
25: - Fixed: Systemic data sanitization for null metadata (TD-015)
26: 
27: ---

### Phase 32 (Completed 2026-01-30)
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
