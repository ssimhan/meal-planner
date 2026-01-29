# Meal Planner Implementation Guide

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

---

## 📅 Upcoming Roadmap

### Phase 33: Household Collaboration & Recipe Enhancements
**Goal:** Enable multiple adults to coordinate and improve recipe actionability.

- **Block 1: Member Management & Preferences (~4 hrs)**
  - [ ] **Household Members:** Add capability to define household members in Settings.
  - [ ] **Invite Flow:** "Invite Spouse" capability (via email or join code).
  - [ ] **Profile Settings:** Manage display names and individual preferences.
  - [ ] **Fix Defaults:** Remove/re-scope "Meal Defaults" as they clash in multi-household setups (MG-001).
- **Block 2: Recipe to Shopping List (~2 hrs)**
  - [ ] **UI:** Add "Add Ingredients to Shopping List" button to `RecipeDetailClientWrapper`.
  - [ ] **Logic:** Implement API call to `/api/plan/shopping-list/add` with recipe ingredients.
  - [ ] **Feedback:** Add toast notification for success/failure.
- **Block 3: Shopping Experience Polish (~3 hrs)**
  - [ ] **Bug: Purchased -> Inventory (SHOP-001):** Ensure checking an item in the shopping list adds it to the correct inventory category (using TD-003 inference).
  - [ ] **Feature: Store Preference:** Ensure store mapping is explicitly saved when a user selects a store for an item in the shopping list.
- **Block 4: Recipe Link Extraction (GPT-powered) (~5 hrs)**
  - [ ] **Backend:** Implement enhanced extraction logic in `scripts/import_recipe.py` with optional LLM support (GPT-4) for parsing ingredients/steps.
  - [ ] **API:** Update `/api/recipes/import` to return extracted ingredients and steps for confirmation.
  - [ ] **UI:** Add "Import from Link" option to the Add Recipe interface.
- **Block 5: Recipe Management Enhancements (~4 hrs)**
  - [ ] **Sync:** Update "Save Locally" to sync to Supabase (and rename to "Save Recipe").
  - [ ] **UI:** Update editor to have 3 distinct boxes: Ingredients, Prep Steps, and Cook Steps.
  - [ ] **Consistency:** Ensure Markdown viewer and YAML editor stay in sync.
- **Block 6: Recipe & Data Cleanup (~3 hrs)**
  - [ ] **TD-004:** Standardize ingredients (e.g., "tamarind pulp" -> "tamarind concentrate").
  - [ ] **TD-005:** Fix mashed ingredient quantities (e.g., "1onion" -> "1 onion") across recipe files.
  - [ ] **TD-006:** Remove redundant cuisine tags (already in `cuisine` field).
- **Block 7: Multi-item Meal Slots (~5 hrs)**
  - [ ] **Data Model:** Update `meal_plans` and `history` to support multiple `recipe_id`s per slot (e.g., as delimiter-separated strings or list).
  - [ ] **AI/Logic:** Update `generate_meal_plan` and `get_shopping_list` to handle multiple recipes per day.
  - [ ] **UI:** Update Week View and Draft Modals to allow adding/searching multiple items for a single slot.
- **Block 8: Prep Task & Slot Polish (~4 hrs)**
  - [ ] **UI:** Implement a more logical prep time slot selector (e.g., categorical or hourly blocks) that works across different household schedules.
  - [ ] **Logic:** Ensure `generate_prep_steps.py` respects these new slot definitions.
- **Block 9: Per-Member Meal Feedback (~4 hrs)**
  - [ ] **Data Model:** Update meal history to store "liked/disliked" status per household member.
  - [ ] **UI:** Update meal logs/confirmation to include member-specific feedback toggles.
  - [ ] **Analytics:** Add basic trend identification for which dishes are household favorites vs controversial.
- **Block 10: Shared Brain Dump (formerly Ph30) (~3 hrs)**
  - [ ] **Persistence:** DB-backed `household_notes` table (replacing local state).
  - [ ] **Real-time:** Display shared notes on Dashboard for all household members.
  - [ ] **CRUD:** Add/Edit/Delete shared notes.

### Phase 34: Multimodal Inventory
**Goal:** Enable futuristic, low-friction inventory updates using vision and voice.

- **Block 1: Vision-based Inventory (~8 hrs)**
  - [ ] **Infrastructure:** Set up storage for uploaded images/videos.
  - [ ] **AI Integration:** Implement Gemini Pro Vision or equivalent to detect items from fridge photos/videos.
  - [ ] **UI:** Add camera capture and upload capability to the Inventory page.
- **Block 2: Interactive Voice Inventory (~6 hrs)**
  - [ ] **Audio Logic:** Implement back-and-forth Voice API style interface.
  - [ ] **Integration:** Connect voice transcriptions to `StorageEngine.update_inventory_item` using existing category inference.

### Phase 35: Mobile Friendly UX (Shifted up)
**Goal:** Ensure - and validate - that the application is fully responsive and optimized for mobile devices.
- **Block 1: Navigation & Layout**
  - [ ] Fix collapsible mobile navigation.
  - [ ] Optimize "Week at a Glance" for vertical scrolling or compact view.
  - [ ] Ensure all forms and inputs are zoom-friendly and accessible.
- **Block 2: Interaction Design**
  - [ ] Audit touch targets (min 44px) across the app.
  - [ ] Improve modal behavior on small screens.

### Phase 36: Native Mobile App (Hybrid/PWA)
**Goal:** Package the responsive web app into an installable mobile experience.
- **Block 1: PWA Foundation (~2 hrs)**
  - [ ] **Manifest:** Update `manifest.json` with correct icons, screenshots, and theme colors.
  - [ ] **Service Worker:** Implement offline fallback page and asset caching.
  - [ ] **Installability:** Add "Add to Home Screen" prompt logic.
- **Block 2: Capacitor Integration (~4 hrs)**
  - [ ] **Wrap:** Integrate Capacitor to wrap the Next.js app.
  - [ ] **Native Features:** Implement Haptics for interaction feedback.
  - [ ] **Status Bar:** Configure safe areas and native status bar styling.
- **Block 3: App Store Prep (Future)**
  - [ ] **Splash Screen:** Create native splash screens.
  - [ ] **Push Notifications:** Setup OneSignal or Firebase-for-Capacitor.

### Phase 37: Analytics & Advanced Features
**Goal:** Lower-priority enhancements for power users.
- **Block 1: Universal Search**
  - [ ] Global search bar (recipes, inventory, history).
- **Block 2: Future Ideas**
  - [ ] Freezer ingredients tracking
  - [ ] Nutrition estimation

### Phase 38: Advanced Features & Integrations
**Goal:** Enhance the system with automation, intelligence, and integrations.
- **Block 1: Universal Search (Detailed) (~3 hrs)**
  - [ ] Search across recipes (title, ingredients, tags)
  - [ ] Search inventory items
  - [ ] Search meal plan history
  - [ ] Keyboard shortcuts (Cmd+K / Ctrl+K)
- **Block 2: Timer Capability (~2 hrs)**
  - [ ] Multi-timer support in Focus Mode (Step-by-Step Cooking)
  - [ ] Named timers (e.g., "Simmer sauce", "Bake muffins")
  - [ ] Audio/visual notifications
  - [ ] Persistent timers across page navigation
- **Block 3: AI-Powered Substitutions (~4 hrs)**
  - [ ] Ingredient swap suggestions based on current inventory
  - [ ] Allergen-safe substitution logic
  - [ ] Preserve recipe integrity (e.g., don't swap critical ingredients)
  - [ ] Integration with recipe view and planning wizard
- **Block 4: Weather/Calendar Integration (~3 hrs)**
  - [ ] Weather API integration (OpenWeatherMap or similar)
  - [ ] Suggest meals based on weather (e.g., soups on cold days)
  - [ ] Calendar sync for family events/busy days
  - [ ] Auto-adjust schedule based on calendar conflicts
- **Block 5: Weekly Summary Email (~3 hrs)**
  - [ ] Email template design (meal plan summary)
  - [ ] Auto-generate weekly summary (meals, groceries, prep tasks)
  - [ ] Email delivery integration (SendGrid, Resend, or similar)
  - [ ] Subscription management (opt-in/out, frequency)
- **Block 6: Nutrition Tracking (~4 hrs)**
  - [ ] Add nutrition data to recipe schema (calories, protein, carbs, fat)
  - [ ] Nutrition API integration (USDA FoodData Central or similar)
  - [ ] Display nutrition info in recipe view
  - [ ] Weekly nutrition summary dashboard
  - [ ] Dietary goal tracking (optional)

### Phase 39: Per-Person Tracking Overhaul (Deep Integration)
**Goal:** Deeply integrate individual household member preferences and track consumption at a granular level.
- **Block 1: Per-Person Meal Tracking (The "Split Meal" Overhaul)**
  - [ ] Overhaul data model to track "who is eating what" for any given meal slot.
  - [ ] Support split meals (e.g., Parents eating Recipe A, Kids eating Recipe B).

---

## 🏗️ System Overview

Hybrid Serverless application for weekly meal planning, daily execution tracking, and inventory management. Python logic engine + Next.js frontend.

### Core Workflow
1. **Weekly Planning:** "Start New Week" → enter farmers market purchases → "Generate Weekly Plan"
2. **Daily Execution:** View "Today's Schedule" → one-tap logging for meals/prep tasks
3. **Inventory:** Update via "Quick Add" or "Brain Dump"
4. **Confirmation-Driven Fixes:** When normalization or prep-step ambiguity arises, system asks user, records decision, and updates implementation plan for permanent resolution.

### Data Files
- **history.yml:** Source of truth for all past plans and execution data
- **inventory.yml:** Freezer/Fridge/Pantry stock (maintains ≥3 freezer backup meals)
- **recipes/:** YAML recipe files with metadata
- **config.yml:** All user settings (dietary preferences, schedules, kid profiles)

---

## ✅ Previously Completed

**Current State:** Phase 31 Complete. Setup for multi-tenancy (Phase 30) active. Smart Shopping (Phase 32) in progress.

### Phase 32: Smart Shopping Integration ✅ Complete
**Goal:** Close the loop between meal selection and grocery shopping with intelligent, incremental prompts.
- **Block 1: Backend Intelligence** ✅
  - [x] **Staples Exclusion:** Hardcode specific staples to ALWAYS be excluded (Oil, Ghee, Salt, Pepper, Red Chili Powder, Turmeric).
  - [x] **Quantity Awareness:** Logic must check *quantity* (e.g. need 6 eggs, have 2 -> suggest eggs), not just presence.
  - [x] **Exact Matching:** Use strict normalized string matching (no fuzzy matching) to prevent false negatives.
- **Block 2: User Experience** ✅
  - [x] **Workflow:** Trigger "Review Groceries" modal immediately after confirming a plan.
  - [x] **Smart Actions:**
    - [x] **"I have this":** Auto-adds the item to digital inventory (Fridge/Pantry) to improve future accuracy.
    - [x] **"Skip":** Explicit opt-out ("I don't have time to buy this") without updating inventory.
- **Block 3: Hardening & Resilience** ✅
  - [x] **Metadata Preservation:** Fixed `StorageEngine` logic to merge metadata instead of wiping it.
  - [x] **Recipe Persistence:** Corrected `replan_meal_plan` to preserve recipe data (vegetables, cuisines) for shopping list consistency.
  - [x] **Cache Reliability:** Added `no-store` headers to critical API fetches to ensure immediate UI updates.
  - [x] **API Tests:** Implemented and verified full suite of API tests for smart actions.

### Phase 31: Advanced Replan & Smart Features ✅ Complete
**Goal:** Give users granular control over replanning without destroying existing progress.
- **Block 1: Strategies.** ✅ Complete
    - ✅ **Fresh Plan:** Regenerate remaining days from scratch while respecting locks.
    - ✅ **Shuffle:** Optimized logic for just moving existing meals.
- **Block 2: UX & Sync.** ✅ Complete
    - ✅ **Keep/Lock:** Checkbox UI to preserve specific meals during fresh replan.
    - ✅ **Prep Config:** Toggle "Prep Available" days to force No-Chop meals on busy days.
    - ✅ **Shopping Sync:** Auto-add ingredients for new meals to the shopping list.
- **Block 3: Hardening.** ✅ Complete
    - ✅ **Error Codes:** Specific backend errors (`HISTORY_NOT_FOUND`) instead of generic 500s.
    - ✅ **Crash Fix:** Resolved `idx` variable scope crash in replan logic.

### Phase 30: Multi-Tenant Architecture & Authentication ✅ Complete
**Goal:** Transform the single-user local app into a secure, multi-household SaaS platform.
- **Block 1: Data Model Isolation (~4 hrs) ✅**
  - [x] **Schema Migration:** Add `households` table and `profiles` table (linking `auth.users` to `households`).
  - [x] **Multi-Tenancy:** Add `household_id` foreign key to ALL core tables (`inventory`, `recipes`, `plan_history`, `week_status`).
  - [x] **RLS Policies:** Implement Row Level Security policies ensuring users only access their household's data.
- **Block 2: Configuration Migration (~3 hrs) ✅**
  - [x] **Settings Extraction:** Migrate logic from local `config.yml` to DB-backed `household_settings` table.
  - [x] **Context Awareness:** Ensure backend reads from DB context, not file system.
- **Block 3: Auth Flow (~3 hrs) ✅**
  - [x] **Sign Up / Login:** Supabase Auth UI integration.
  - [x] **Onboarding:** Automatic "Create Household" trigger upon fresh signup.
  - [x] **Session Context:** Ensure `household_id` is available in API headers/context.

### Phase 29: Wizard Architecture Refactor ✅ Complete
**Goal:** Modularize the monolithic `src/app/plan/page.tsx` for maintainability and performance.
- **Block 1: Component Extraction (~3 hrs) ✅ Complete**
  - [x] Extract `ReviewStep` component
  - [x] Extract `InventoryStep` component
  - [x] Extract `SuggestionsStep`, `DraftStep`, and `GroceryStep` components
  - [x] **Critical Fixes:** Resolved infinite rendering loops & SSL connection errors.
- **Block 2: State Logic Separation & Stability (~3 hrs) ✅ Complete**
  - [x] Create `WizardContext` (Recommended to fix circular dependencies in `autoDraft`)
  - [x] Move state management and API side-effects out of `page.tsx`
  - [x] **Debugging Improvements:** Added structured error logging (`MISSING_PARAMETERS`, `PLAN_NOT_FOUND`) and frontend error inspection.
  - [x] **Critical Fix:** Fixed "Missing session data" error in `WeekView` (incorrect state access).
- **Block 3: Type Definitions (~1 hr) ✅ Complete**
  - [x] Centralize wizard types into `src/types/wizard.ts`
  - [x] Extract `ReviewDay`, `InventoryState` and strict unions.

### Phase 28: General Workflow and Frontend Clean up ✅ Complete
**Goal:** Standardize the visual system, fix inventory/shopping friction, and polish workflow persistence.

- **Block 1: Global Visual Polish & Coherence (~3 hrs) ✅ Complete**
  - [x] **Dark Mode:** Improve legibility and contrast across all card components.
  - [x] **Unified Styling:** Standardize buttons, use of color, animations, and shadows.
  - [x] **Premium Buttons:** Update meal plan page buttons.

- **Block 2: Inventory & Shopping Stability (~4 hrs) ✅ Complete**
  - [x] **Shop Page:** Fix broken store categorization.
  - [x] **Alphabetical Ordering:** Sort all inventory lists alphabetically.
  - [x] **Deduplication:** Automatically consolidate items when duplicates are found.
  - [x] **Move Logic:** Implement ability to move items between categories.
  - [x] **Immediate Sync:** Ensure added items appear immediately.

- **Block 3: Recipe Experience & Data Cleanup (~4 hrs) ✅ Complete**
  - [x] **Focus Mode Integration:** Link `StepByStepCooking` component.
  - [x] **Tag Migration:** Convert legacy notes into standardized tags.
  - [x] **Pending Recipe Workflow:** Logic to push recipes to Recipe Index.

- **Block 4: Advanced Planning Persistence (~3 hrs) ✅ Complete**
  - [x] **Infrastructure:** Pause state infrastructure (localStorage/Supabase).
  - [x] **Resume UI:** Resume planning UI with banner/modal triggered on login/refresh.
  - [x] **Wizard Inventory Upgrades:** 
    - [x] Separate sections for meals vs. veggies in wizard inventory.
    - [x] Add freezer inventory option directly in wizard.
    - [x] Specific quantity inputs (servings for meals, count for produce).

- **Block 7: Sequential Suggestion Flow & Context-Aware Lunches (~3 hrs) ✅ Complete**
  - [x] **Sequential Progression:** Split "Plan Your Extras" into Lunch and Snack phases.
  - [x] **Ingredient Ranking:** Backend scoring for lunches based on dinner ingredients.
  - [x] **Leftover Integration:** Immediate sync of assigned leftovers into the lunch grid.
  - [x] **Visual Feedback:** "Match ✨" badges.

### Phase 27: Recipe Index Refinement & Review Workflow ✅ Complete
**Goal:** Clean up the recipe ecosystem and automate the quality control loop.
- **Block 1: Recipe Index Standardization ✅**
  - [x] Define tag/cuisine taxonomy
  - [x] Batch update recipes
- **Block 2: Recipe Content Editor ✅**
  - [x] Modal UI for editing metadata and content
  - [x] Two-stage save (Local YAML -> Supabase Sync)
- **Block 3: Dynamic Review Button ✅**
  - [x] Emerald Green active state / Ghost faded state
  - [x] Automated audit tags for new captures
- **Block 4: Continuous YAML Normalization ✅**
  - [x] Schema mapping (name -> title) and instruction splitting
  - [x] Ingredient standardization (category sorting + spice quantity stripping)
  - [x] Deterministic rewrite & CI check mode

### Phase 26: Wizard UX Improvements ✅ Complete
**Goal:** Streamline the weekly planning wizard for better usability.
- **Block 1: Meal Type Separation (~2 hrs)**
  - [x] Separate pages for dinners in wizard
  - [x] Separate pages for snacks in wizard
- **Block 2: Leftovers Enhancement (~2 hrs)**
  - [x] Leftovers quantity input (number of servings, not yes/no)
  - [x] "Use Up Leftovers" page with day assignment
- **Block 3: Prep Workflow & Data Integrity (~2 hrs) ✅ Complete**
  - [x] Bulk Prep Task Completion (Backend + UI)
  - [x] Prep task duplication bug fix (defensive copying)
  - [x] Dashboard sync (Counter & "Dinner Tonight" logic)
- **Block 4: Layout & UX Stabilization (~2 hrs) ✅ Complete**
  - [x] Responsive Week View (Fixed Grid + Line Clamping)
  - [x] Mobile UX Polish (Tap targets + Pulse indicators)
  - [x] Replacement Modal Freezer/Leftover Color Fix

### Phase 23.5: Household Configuration & UI Polish ✅ Complete
**Goal:** Finalize household customization and visual stability before multi-user rollout.
- **Block 1: UI Polish & Bug Fixes.** ✅ Complete
    - ✅ Fix Dark Mode contrast/legibility.
    - ✅ Simplify Dashboard "System" card.
    - ✅ Refine Prep Task visibility.
    - ✅ Week View visual cues.
- **Block 2: Household Schema.** ✅ Complete
    - ✅ Add Adult Profiles (with Office Days).
    - ✅ Configure "Included Meals".
    - ✅ Configure "Prep Time" preferences.
- **Block 3: Week at a Glance Refinements.** ✅ Complete
    - ✅ **Visuals:** Enhance shadows/cues.
    - ✅ **Bug:** Fix missing meal plan data in view.
    - ✅ **Bug:** Fix "Save Changes" failure (history integrity).
- **Block 4: Inventory Refinements.** ✅ Complete
    - ✅ **Leftover Meals:** Explicit "Leftover Meal" items in fridge.
    - ✅ **Visual Grouping:** Improve visual distinction between inventory groups.
- **Block 5: Advanced Settings.** ✅ Complete
    - ✅ **Editable Defaults:** Make "Meal Defaults" section fully editable.
    - ✅ **Person Management:** Add/Remove Adult profiles.
    - ✅ **Meal Scope Granularity:** Customize "Included Meals" per day.
    - ✅ **Prep Time Granularity:** Select specific prep time slots per day.

### Phase 23: Experience Refinement & Personalization ✅ Complete
**Goal:** Polish the UX to match the "Earth Tones" prototype and add personalization features.
- [x] Block 1: Dashboard & Plan UX.
- [x] Block 2: Inventory & Recipes.
- [x] Block 3: Shopping Experience.
- [x] Block 4: Settings & Personalization.

### Phase 22: UX Redesign & Feature Parity ✅ Complete
**Goal:** Implement the new "Earth Tones" high-fidelity UX.
- [x] Block 1: Frontend Architecture.
- [x] Block 2: Feature Parity.

### Phase 21: Inventory UI/UX Overhaul ✅ Complete
- [x] Ingredient names wrap/expand.
- [x] Drag and drop items between locations.
- [x] Deduplication logic.

### Phase 20: Advanced Planning Control ✅ Complete
- [x] Selective replanning.
- [x] "Confirm for Today" logic.

### Phases 1-19 (Foundation)
See [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) for details on:
- 1-9: CLI Foundation & Energy-Based Prep
- 10-15: Database Migration & Core Logic
- 16-19: Initial Wizard & Recipe Index

---

## 🐛 Bug & Technical Debt Tracking
**See [BUGS.md](BUGS.md)**
