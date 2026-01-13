---
description: Test Plan for Phase 20-21 Features (Inventory & Planning Controls)
---

# Test Phase 20-21 Features

Run these manual validation steps to ensure the recent UI/UX and logic updates are working correctly.

## 1. Inventory UI/UX (Phase 21)
**Goal:** Verify visual changes and move interactions.

1.  **Visual Check:**
    *   Navigate to `/inventory`.
    *   Verify you see 4 sections: Sticky Search, Leftovers (Top Left), Freezer Stash (Top Right), and Tabbed View (Bottom).
    *   Click through the tabs (Fridge, Pantry, Frozen Ingredients). Ensure items switch instantly.
    *   **Text Wrap:** Find a long item (e.g., add "Trader Joe's Organic Fancy Paste"). Verify the text wraps and is not cut off with `...`.

2.  **Move Interaction:**
    *   Find an item in "Fridge".
    *   Click the **Move ➔** arrow button.
    *   Select "To Freezer".
    *   **Verify:** Item disappears from Fridge list. Switch to "Frozen Ingredients" tab (or Freezer Stash if it was a meal) and verify it appears there.
    *   **Undo:** Try moving it back.

3.  **Deduplication (Frontend Check):**
    *   Note the quantity of an item (e.g., "Eggs: 6").
    *   Click the **(+)** button to "Quick Add".
    *   Type "Eggs" (same spelling).
    *   **Verify:** The existing row flashes or updates to "Eggs: 7" (or whatever quantity you added). It should **not** create a second "Eggs" row.

## 2. Default Week & Confirm Today (Phase 20)
**Goal:** Verify dashboard stability and daily accelerators.

1.  **Default Week:**
    *   Navigate to root `/`.
    *   **Verify:** The dashboard loads the **current calendar week** immediately (check the dates in the header). It should not show a blank screen or an old week.

2.  **Confirm for Today:**
    *   Look at the Dashboard Header (top right).
    *   Find the **"✓ Confirm Plan"** button.
    *   **Action:** Click it.
    *   **Verify:** A toast appears ("Confirmed all meals!").
    *   Scroll down to "Today's Schedule".
    *   **Verify:** Dinner, Lunch, and Snacks for *today* are all marked as completed (green checkmarks or "Made" status).

## 3. Selective Replanning (Phase 20)
**Goal:** Verify the locking mechanism in the wizard.

1.  **Start Wizard:**
    *   Click "Start New Week" -> "Generate Draft Plan".
2.  **Locking:**
    *   On the "Review Draft" screen (Step 4), look for the **Lock 🔓** icon on each day.
    *   **Action:** Click the lock on "Monday" (changes to 🔒).
    *   **Action:** Click "Regenerate Plan" (or "Shuffle").
    *   **Verify:** Monday's meal **remains exactly the same**. Other unlocked days change.
