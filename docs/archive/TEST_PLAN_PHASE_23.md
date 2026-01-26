# Phase 23 Manual Verification Plan: Settings & Personalization

This plan outlines the verification steps for Phase 23, divided into functional logic (Local) and aesthetic/UX polish (Vercel).

---

## Phase 1: Local Verification (Functional & Logic)
*Best performed in the local development environment (`npm run dev:full`).*

### 1. Advanced Replanning (The "Brain")
- **Action:** Go to `/week-view` and trigger "Replan with Inventory".
- **Step:** In the "Special Requests" box, type a known exclusion like `"No chicken"`.
- **Verification:** Check terminal logs for `Applying Replan Exclusions: ['chicken']`. Verify the resulting plan excludes chicken recipes.
- **Dynamic Check:** Type `"I want soup"`. Verify recipes with "soup" in the title are prioritized (pushed to Monday/Tuesday).

### 2. Settings & Data Persistence
- **Action:** Go to `/settings`.
- **Changes:** Toggle an Office Day or add a Kids Dislike item.
- **Verification:** Save, refresh the page, and ensure values persist.
- **Supabase Check:** Verify that the `households` table `config` column updates with the new JSON structure.

### 3. Redirection & State Handling
- **Action:** While a week is active, manually navigate to `/plan`.
- **Verification:** Ensure instant redirect to `/week-view`.
- **Resilience:** Refresh the page on Step 2 of the Planning Wizard. Verify state is restored via the `/api/wizard/state` endpoint without console errors.

---

## Phase 2: Vercel Verification (UX & Aesthetics)
*Best performed on the Vercel deployment to verify high-fidelity polish and mobile feel.*

### 1. "Earth Tones" Aesthetic Review
- **Color Palette:** Verify Dashboard and Settings use the specific brown/sage/cream palette from the design reference.
- **Glassmorphism:** Verify cards have subtle transparency, borders, and premium shadows.

### 2. Animations & Micro-interactions
- **Prep Accordion:** Click recipe headers in the prep list. Verify chevrons rotate smoothly and lists expand with clean transitions.
- **Timeline:** Verify the dot-and-line "Timeline View" on the dashboard renders correctly without layout shifts.

### 3. Change Plan Decision Tree
- **Action:** Click "Options" on a dinner card in the Timeline.
- **Verification:**
    - Modal should be centered and high-contrast glassmorphism.
    - Swapping to "Reschedule" tab shows the 7-day grid.
    - Selecting "No" under "Did you make it?" → "Ate Out" → Toggling "Capture leftovers" should show an input for the dish name.
    - Saving should close the modal and show a success toast.

### 4. Mobile Responsiveness
- **Shopping List:** Test on a mobile device. Verify "Store Tags" are easy to tap.
- **Settings:** Ensure the settings sections (Appearance, Profiles, Schedule) stack correctly on small screens.

---

## Error Handling Checklist
- [ ] No `PGRST116` errors in console when loading empty weeks.
- [ ] Toast notifications appear for both Success and Error states (e.g., "Settings Saved").
- [ ] Skeleton loaders display while fetching Draft Plans.
