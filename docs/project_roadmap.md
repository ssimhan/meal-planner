# Meal Planner Implementation Guide - Project Roadmap

**Last Updated:** 2026-01-28
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
**Phase 35: Household Synergy & Infrastructure**

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

### 📅 Upcoming Roadmap

### 🚨 Next Session Priority: UX/Deploy Polish
**Goal:** Ensure Shopping List generator works reliably in Vercel (read-only) environments and exposes debug info to the user.
- [ ] **Frontend Integration:** Update `ShoppingListStep.tsx` to display the "warnings" returned by the API (e.g., missing ingredients, recipe content errors) as toasts/alerts.
- [ ] **Vercel Verification:** Verify that the "500 Error" is resolved by the recent backend fixes and that users get useful feedback if it fails.

### Phase 35: Household Synergy & Infrastructure
**Goal:** Enable multiple members to coordinate and stabilize the data foundation.

- **Block 1: Shared Coordination (~10 hrs)**
  - [ ] **Member Management:** Migrate `GroceryMapper` data to Supabase table `store_mappings` (TD-005).
  - [ ] **Feedback Loop:** Add "Who liked/disliked this?" toggles and basic trend identification.
  - [ ] **Shared Brain Dump:** DB-backed `household_notes` table for shared household items and real-time Dashboard widget.
- **Block 2: Smart Operations & Hygiene (~10 hrs)**
  - [ ] **Inference:** Implement `GroceryMapper.infer_category()` to auto-assign items to Fridge/Pantry/Freezer.
  - [ ] **Infrastructure:** Standardize all `StorageEngine` persistence to Supabase (TD-007).
  - [ ] **Performance:** Optimize `get_pending_recipes` and add background worker for heavy tasks (TD-008, TD-009).
  - [ ] **Schedule Flexibility:** Implement a more logical, editable prep time slot selector for varied household schedules.

### Phase 36: AI-Powered Operations & Search
**Goal:** Leverage AI for low-friction logging and intelligent assistance.

- **Block 1: Multimodal Inventory (~14 hrs)**
  - [ ] **AI Vision:** Implement Gemini Vision to detect items from uploaded fridge/pantry photos.
  - [ ] **Voice API:** Implement an interactive, back-and-forth voice interface to log items.
- **Block 2: Intelligent Assistance (~15 hrs)**
  - [ ] **Universal Search:** Global search (recipes/inventory/history) + Multi-timer support in Focus Mode.
  - [ ] **Integrations:** Weather/Calendar meal suggestions and Weekly Summary Emails.
  - [ ] **AI Substitutions:** Ingredient swap suggestions based on inventory and allergens.

### Phase 37: Mobile Experience & PWA
**Goal:** Ensure the app feels like a native utility on mobile.

- **Block 1: Mobile UX & Offline (~10 hrs)**
  - [ ] **Mobile UX Audit:** Optimize "Week View" and Navigation for one-handed mobile use.
  - [ ] **PWA & Capacitor:** Implement Offline Service Workers and wrap with Capacitor for native haptics.

### Phase 38: Nutrition & Precision Tracking
**Goal:** Granular health and consumption analytics.

- **Block 1: Health & Split Meals (~8 hrs)**
  - [ ] **Nutrition API:** Integration with nutrition databases for recipe analysis.
  - [ ] **Split-Meal Model:** Overhaul data model for "Who is eating what" granular tracking.

---

## ✅ Previously Completed
(See archived phases 1-32 in docs/PROJECT_HISTORY.md)
