# Meal Planner Implementation Guide

**Last Updated:** 2026-01-27
**Live Site:** [meal-planner-eta-seven.vercel.app](https://meal-planner-eta-seven.vercel.app/)

---

> **Workflow Rule:**
> 1. **Phase = One Branch:** Every phase belongs in a single dedicated branch (e.g. `phase-22-ux-redesign`) until fully complete.
> 2. **Block/Chunk Workflow:** Code -> Test Locally -> Push to Branch (Vercel Preview) -> Manual Verification on Vercel.
> 3. **Merge to Main:** ONLY merge to `main` when the *entire phase* is 100% complete and verified.
>
> **Quality Gate (Zero-Debt Policy):**
> No phase is complete until **Active Bugs = 0** and **Technical Debt = 0**.
> See [BUGS.md](BUGS.md) for current status. Fix all issues before marking blocks complete.

## 🚀 Active Phase

### Phase 32: Smart Shopping Integration
**Goal:** Close the loop between meal selection and grocery shopping with intelligent, incremental prompts.
- **Block 1: Backend Intelligence**
  - [ ] **Staples Exclusion:** Hardcode specific staples to ALWAYS be excluded (Oil, Ghee, Salt, Pepper, Red Chili Powder, Turmeric).
  - [ ] **Quantity Awareness:** Logic must check *quantity* (e.g. need 6 eggs, have 2 -> suggest eggs), not just presence.
  - [ ] **Exact Matching:** Use strict normalized string matching (no fuzzy matching) to prevent false negatives.
- **Block 2: User Experience**
  - [ ] **Workflow:** Trigger "Review Groceries" modal immediately after confirming a plan.
  - [ ] **Smart Actions:**
    - **"I have this":** Auto-adds the item to digital inventory (Fridge/Pantry) to improve future accuracy.
    - **"Skip":** Explicit opt-out ("I don't have time to buy this") without updating inventory.

---

## 📅 Upcoming Roadmap

### Phase 33: Household Collaboration (The "Team" Update)
**Goal:** Enable multiple adults to coordinate within the same verified household.

- **Block 1: Member Management (~2 hrs)**
  - [ ] **Invite Flow:** "Invite Spouse" capability (via email or join code).
  - [ ] **Profile Settings:** Manage display names and individual preferences within the household.
- **Block 2: Shared Brain Dump (formerly Ph30) (~3 hrs)**
  - [ ] **Persistence:** DB-backed `household_notes` table (replacing local state).
  - [ ] **Real-time:** Display shared notes on Dashboard for all household members.
  - [ ] **CRUD:** Add/Edit/Delete shared notes.

### Phase 34: Mobile Friendly UX (Shifted up)
**Goal:** Ensure - and validate - that the application is fully responsive and optimized for mobile devices.
- **Block 1: Navigation & Layout**
  - [ ] Fix collapsible mobile navigation.
  - [ ] Optimize "Week at a Glance" for vertical scrolling or compact view.
  - [ ] Ensure all forms and inputs are zoom-friendly and accessible.
- **Block 2: Interaction Design**
  - [ ] Audit touch targets (min 44px) across the app.
  - [ ] Improve modal behavior on small screens.

### Phase 35: Native Mobile App (Hybrid/PWA)
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

### Phase 36: Analytics & Advanced Features
**Goal:** Lower-priority enhancements for power users.
- **Block 1: Universal Search**
  - [ ] Global search bar (recipes, inventory, history).
- **Block 2: Future Ideas**
  - [ ] Freezer ingredients tracking
  - [ ] Nutrition estimation

### Phase 37: Advanced Features & Integrations
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

### Phase 38: Individual Meal Tracking & Preferences
**Goal:** deeply integrate individual household member preferences and track consumption at a granular level.
- **Block 1: Enhanced Member Profiles**
  - [ ] Track individual likes/dislikes (e.g., "Dad hates cilantro", "Kid 1 loves pasta").
  - [ ] Integrate individual preferences into recipe scoring and suggestions.
- **Block 2: Per-Person Meal Tracking (The "Split Meal" Overhaul)**
  - [ ] Overhaul data model to track "who is eating what" for any given meal slot.
  - [ ] Support split meals (e.g., Parents eating Recipe A, Kids eating Recipe B).
  - [ ] Individual feedback logging (who liked it, who didn't).

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
