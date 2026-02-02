# Meal Planner Implementation Guide - Project Roadmap

**Last Updated:** 2026-02-02
**Live Site:** [meal-planner-eta-seven.vercel.app](https://meal-planner-eta-seven.vercel.app/)

---

> **Workflow Rule:**
> 1. **Phase = One Branch:** Every phase belongs in a single dedicated branch (e.g. `phase-22-ux-redesign`) until fully complete.
>    - **CRITICAL:** Before starting a new phase, ALWAYS ask the user to create a new branch. Do not create it automatically without asking.
> 2. **Block/Chunk Workflow:** Code -> Test Locally -> Push to Branch (Vercel Preview) -> Manual Verification on Vercel.
> 3. **Merge to Main:** ONLY merge to `main` when the *entire phase* is 100% complete and verified.
>
> **Quality Gate (Zero-Debt Policy):**
> No phase is complete until **Active Bugs = 0** and **Technical Debt = 0**.
> See [BUGS.md](BUGS.md) for current status. Fix all issues before marking blocks complete.

## 🚀 Active Phase
## ✅ Phase 34: Strategic Tech Debt Cleanup (Complete)
- [x] **TD-006:** LRU caching for `get_prep_tasks` with content-hash keys
- [x] **TD-008:** SWR (Stale-While-Revalidate) cache for `get_pending_recipes`
- [x] **TD-009:** Extracted `meal_service.py` with 6 helpers, 100% test coverage (12 tests)
- [x] **TD-010:** Restored integration tests with proper StorageEngine mocking
- [x] **TD-011/12:** Import recipe UX improvements and auto prep task generation
- [x] **TD-013:** SWRCache class for serverless environments (5 tests)
- [x] **TD-014:** Unit test coverage for all `meal_service.py` functions
- [x] **TD-015:** Systemic data sanitization layer in `StorageEngine`

---

## ✅ Phase 33: Advanced Recipe Management (Complete)
- [x] Multi-recipe slots per dinner
- [x] 3-box recipe editor (Ingredients, Prep Steps, Instructions)
- [x] Recipe import with auto-prep task generation

---

## ✅ Phase 32: Bug Cleanup & Tech Debt (Complete)
- [x] **Prep Refresh:** Implemented heuristic fallback for prep steps (BUG-001).
- [x] **Inventory Sync:** Implemented smart category inference for sync (BUG-002, TD-001).
- [x] **Household Flexibility:** Removed hardcoded weekend defaults (BUG-003).
- [x] **Database Hygiene:** Batch normalized 73 recipes (TD-002, TD-004).
- [x] **Modular Recipes:** Implemented Pairing Service and Pairing Drawer (Phase 34 Block 1).
- [x] **Smart Inventory:** Added Permanent Pantry filtering and multi-recipe aggregation (Phase 34 Block 1).
- [x] **Data Robustness:** Implemented systemic recipe data sanitization (TD-015).

---

### Phase 35: Frictionless Shopping & Recipe Loop (Current)
**Goal:** Transform the core user loop into a high-utility, automated engine, ensuring Shopping List generator works reliably in Vercel environments.

- **Block 1: Closed-Loop Shopping (~4 hrs)**
  - [ ] **Sync:** Ensure marking an item as "Purchased" in the shopping list adds it to the correct inventory category.
  - [ ] **Persistence:** Automatically save store preference/mapping during shopping.
- **Block 2: Recipe-to-List Automation (~3 hrs)**
  - [ ] **UI:** Add "Add Ingredients to Shopping List" button to the Recipe Detail wrapper.
  - [ ] **Logic:** Implement deduplication/checking against current inventory when adding.
- **Block 3: UX/Deploy Polish**
  - [ ] **Frontend Integration:** Update `ShoppingListStep.tsx` to display the "warnings" returned by the API (e.g., missing ingredients, recipe content errors) as toasts/alerts.
  - [ ] **Vercel Verification:** Verify that the "500 Error" is resolved by latest backend fixes.

### Phase 36: Household Synergy & Coordination
**Goal:** Enable multiple members to coordinate and improve household collaboration.

- **Block 1: Shared Coordination (~10 hrs)**
  - [ ] **Member Management:** Invite household members and manage permissions.
  - [ ] **Feedback Loop:** Add "Who liked/disliked this?" toggles and basic trend identification.
  - [ ] **Shared Brain Dump:** DB-backed `household_notes` table for shared household items and real-time Dashboard widget.
- **Block 2: Schedule Flexibility (~5 hrs)**
  - [ ] **Schedule Flexibility:** Implement a more logical, editable prep time slot selector for varied household schedules.

### Phase 37: AI-Powered Operations & Search
**Goal:** Leverage AI for low-friction logging and intelligent assistance.

- **Block 1: Multimodal Inventory (~14 hrs)**
  - [ ] **AI Vision:** Implement Gemini Vision to detect items from uploaded fridge/pantry photos.
  - [ ] **Voice API:** Implement an interactive, back-and-forth voice interface to log items.
- **Block 2: Intelligent Assistance (~15 hrs)**
  - [ ] **Universal Search:** Global search (recipes/inventory/history) + Multi-timer support in Focus Mode.
  - [ ] **Integrations:** Weather/Calendar meal suggestions and Weekly Summary Emails.
  - [ ] **AI Substitutions:** Ingredient swap suggestions based on inventory and allergens.

### Phase 38: Mobile Experience & PWA
**Goal:** Ensure the app feels like a native utility on mobile.

- **Block 1: Mobile UX & Offline (~10 hrs)**
  - [ ] **Mobile UX Audit:** Optimize "Week View" and Navigation for one-handed mobile use.
  - [ ] **PWA & Capacitor:** Implement Offline Service Workers and wrap with Capacitor for native haptics.

### Phase 39: Nutrition & Precision Tracking
**Goal:** Granular health and consumption analytics.

- **Block 1: Health & Split Meals (~8 hrs)**
  - [ ] **Nutrition API:** Integration with nutrition databases for recipe analysis.
  - [ ] **Split-Meal Model:** Overhaul data model for "Who is eating what" granular tracking.

---

## ✅ Previously Completed
(See archived phases 1-32 in docs/PROJECT_HISTORY.md)
