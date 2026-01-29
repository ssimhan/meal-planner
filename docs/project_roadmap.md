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
**Phase 33: Advanced Recipe Management**

---

## ✅ Phase 32: Bug Cleanup & Tech Debt (Complete)
- [x] **Prep Refresh:** Implemented heuristic fallback for prep steps (BUG-001).
- [x] **Inventory Sync:** Implemented smart category inference for sync (BUG-002, TD-001).
- [x] **Household Flexibility:** Removed hardcoded weekend defaults (BUG-003).
- [x] **Database Hygiene:** Batch normalized 73 recipes for tags/veg naming (TD-002, TD-004).

---

## 📅 Upcoming Roadmap

### Phase 33: Advanced Recipe Management
**Goal:** Transform recipe creation and organization into a high-utility engine.

- **Block 1: Link Extraction (GPT-powered) (~5 hrs)**
  - [x] **1.1 Extraction API (2 hrs):** Update `scripts/import_recipe.py` and create `/api/recipes/extract` endpoint using GPT-4 for URL/Image parsing.
  - [x] **1.2 Import UI - Input (1.5 hrs):** Add "Import from Link" dialog to UI; implement loading states and API integration.
  - [x] **1.3 Import UI - Verification (1.5 hrs):** Build interactive confirmation step to review/edit extracted ingredients and steps before saving.
- **Block 2: 3-Box Recipe Editor (~4 hrs)**
  - [x] **2.1 3-Box Layout (2 hrs):** Overhaul recipe editor UI with distinct Ingredients, Prep Steps, and Cook Steps sections.
  - [x] **2.2 Persistence Sync (2 hrs):** Implement immediate local Markdown to Supabase sync logic on recipe save.
- **Block 3: Multi-item Meal Slots (~5 hrs)**
  - [ ] **3.1 Data Model & API (2 hrs):** Update `meal_plans` schema (`recipe_ids` array) and Python endpoints to support multiple recipes per slot.
  - [ ] **3.2 UI Rendering (1.5 hrs):** Update Draft/Week views to display and manage multiple items (e.g., Soup AND Salad) per meal.
  - [ ] **3.3 Shopping List Aggregate (1.5 hrs):** Update inventory/shopping engine to aggregate ingredients from all recipes in a multi-item slot.

### Phase 34: Household Synergy
**Goal:** Enable multiple members to coordinate preferences and feedback.

- **Block 1: Member Management (~4 hrs)**
  - [ ] **Infrastructure:** Migrate `GroceryMapper` data to Supabase table `store_mappings` (TD-005).
  - [ ] **Fix:** Remove or re-scope legacy "Meal Defaults" that clash in multi-household setups (BUG-003 - ✅ Fixed).
- **Block 2: Per-Member Feedback Loop (~4 hrs)**
  - [ ] **UI:** Add "Who liked/disliked this?" toggles during meal confirmation.
  - [ ] **Analytics:** Implement basic trend identification for dish popularity across the household.
- **Block 3: Shared Brain Dump (~3 hrs)**
  - [ ] **Persistence:** DB-backed `household_notes` table for shared household items.
  - [ ] **UI:** Real-time Dashboard widget for shared notes and reminders.

### Phase 35: Frictionless Operations & Hygiene
**Goal:** Eliminate manual friction in shopping and prep workflows.

- **Block 1: Smart Category Inference (TD-001) (~3 hrs)**
  - [ ] **Logic:** Implement `GroceryMapper.infer_category()` to auto-assign items to Fridge/Pantry/Freezer based on inventory or keywords.
- **Block 2: Closed-Loop Shopping (~4 hrs)**
  - [ ] **Sync:** Ensure marking an item as "Purchased" in the shopping list adds it to the correct inventory category (BUG-002).
  - [ ] **Persistence:** Automatically save store preference/mapping during shopping (Block B3).
  - [ ] **Optimization:** Cache heuristic prep tasks at the recipe level in Supabase (TD-006).
- **Block 3: Recipe-to-List Automation (~3 hrs)**
  - [ ] **UI:** Add "Add Ingredients to Shopping List" button to the Recipe Detail wrapper.
  - [ ] **Logic:** Implement deduplication/checking against current inventory when adding.
- **Block 4: Prep & Data Hygiene (~4 hrs)**
  - [ ] **Infrastructure:** Standardize all `StorageEngine` persistence to Supabase (TD-007).
  - [ ] **UI:** Implement a more logical, editable prep time slot selector for varied household schedules.
  - [ ] **Normalization:** Batch fix ingredient typos (TD-002 - ✅), mashed quantities (TD-003 - ✅), and remove redundant tags (TD-004 - ✅).
  - [ ] **Performance:** Optimize `get_pending_recipes` and add background worker for heavy tasks (TD-008, TD-009).

### Phase 36: Multimodal Inventory (The Future)
**Goal:** Low-friction inventory tracking.

- **Block 1: Vision-based Logging (~8 hrs)**
  - [ ] **AI:** Implement Gemini Vision to detect items from uploaded fridge/pantry photos.
- **Block 2: Conversational Voice API (~6 hrs)**
  - [ ] **Voice:** Implement an interactive, back-and-forth voice interface to log items.

### Phase 37: Mobile First & PWA Foundation
**Goal:** Ensure the app feels like a native utility on mobile.

- **Block 1: Mobile UX Audit (~4 hrs)**
  - [ ] Optimize "Week View" and Navigation for one-handed mobile use.
- **Block 2: PWA & Capacitor (~6 hrs)**
  - [ ] Implement Offline Service Workers and Manifest.
  - [ ] Wrap with Capacitor for native haptics and status bar control.

### Phase 38: Intelligent Power Features
**Goal:** Advanced automation and integrations.

- **Block 1: Universal Search & Timers (~5 hrs)**
  - [ ] Global search (recipes/inventory/history) + Multi-timer support in Focus Mode.
- **Block 2: External Integrations (~6 hrs)**
  - [ ] Weather/Calendar meal suggestions and Weekly Summary Emails.
- **Block 3: AI Substitutions (~4 hrs)**
  - [ ] Ingredient swap suggestions based on inventory and allergens.

### Phase 39: Nutrition & Precision Tracking
**Goal:** Granular health and consumption analytics.

- **Block 1: Nutrition & Split Meals (~8 hrs)**
  - [ ] Nutrition API integration + "Who is eating what" split-meal overhauled data model.

---

## ✅ Previously Completed
(See archived phases 1-32 in docs/PROJECT_HISTORY.md)
