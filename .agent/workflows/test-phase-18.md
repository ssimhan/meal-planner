---
description: Steps to verify Pause Capability, Nightly Banner, and Interactive Shopping List
---

# Phase 18 Testing Workflow

// turbo-all

## 1. Local Persistence Test
1. Start the wizard at `/plan`.
2. Complete the 'Review' steps.
3. Refresh the browser.
4. Confirm you are still on the same step with previous data populated.

## 2. Inventory Sync Test
1. Advance to the 'Groceries' step in the wizard.
2. Add a custom item "Test Milk".
3. Check the checkbox for "Test Milk".
4. Click "Finalize Plan".
5. Navigate to `/inventory` and verify "Test Milk" exists in the Fridge.

## 3. Nightly Banner Test (Clock Simulation)
1. Open `api/utils/storage.py`.
2. Change `now.hour >= 18` to `now.hour >= 0`.
3. Check the Dashboard for the terracotta banner.
4. Revert `api/utils/storage.py`.

## 4. Vercel Preview
1. Run `git push origin phase-18-enhanced-workflow`.
2. Open the Vercel Preview URL provided in the PR or Vercel dashboard.
3. Repeat steps 1 & 2 on the live preview environment.
