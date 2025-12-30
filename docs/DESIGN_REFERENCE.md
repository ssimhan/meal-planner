# Meal Planner - Design Reference

This document describes the original ideal user experience vision. It serves as a design reference for building features incrementally.

**For technical implementation details, see [IMPLEMENTATION.md](../IMPLEMENTATION.md)**
**For current roadmap and progress, see [README.md](../README.md)**

---

## Weekly Meal Planning App — User Navigation Flow

This describes the *exact order* you experience when using the app, from opening it to daily tracking.

---

### 1) Open the app → Start
You open a simple HTML page.

You see:
- One primary action: **"Start this week's meal planning"**
- A small helper line: *"Takes ~10–15 minutes"*

You click **Start**.

---

### 2) Quick inventory check (fridge / pantry / freezer)
The app shows what it currently thinks you have, grouped by:
- Fridge
- Pantry
- Freezer

Vegetables and perishables are visually highlighted.

You're asked:
> "Is this still accurate?"

You can:
- Add items
- Remove items
- Mark items as *running low*
- Add quick notes (e.g., "use soon", "opened already")

You click **Confirm inventory**.

---

### 3) Seasonal farmers market suggestions + rough plan
Based on:
- Your updated inventory
- Current seasonality

The app shows:
- **Seasonal produce worth buying at the farmers market**
- A **rough meal plan outline** (high‑level lunch/dinner ideas, not locked yet)

You're asked:
> "Anything here you want to exclude or swap?"

You can:
- Remove an ingredient
- Flag something as "don't feel like it this week"

You click **Looks good**.

---

### 4) Confirm schedule (defaults included)
The app now shows your week with defaults pre‑filled:
- WFH days
- Office days
- Kid activities / busy evenings

You're asked:
> "Is this week typical?"

You can:
- Accept as‑is
- Quickly adjust a day or two

You click **Confirm schedule**.

---

### 5) Prep recommendations
Using your schedule, the app suggests:
- Best days and times to prep
- What to prep in each window

Defaults are already filled in (e.g., duration, energy level).

You're asked:
> "Does this prep plan work for you?"

You can:
- Accept
- Nudge timing earlier/later

You click **Lock prep plan**.

---

### 6) Final weekly meal plan + grocery list
The app generates the final plan:
- Lunches and dinners for **Monday → Sunday**
- Meals optimized for:
  - Inventory usage first
  - Schedule constraints
  - Prep efficiency

You also see:
- A **complete grocery list**, grouped by section
- Clear callouts for **farmers market vs grocery store**

You click **Save this week's plan**.

---

### 7) Daily check‑in (used throughout the week)
Each day, you open the app and see:
> "What did you actually make today?"

You can quickly:
- Select the planned meal or type what you made
- Mark items as *used up*, *leftover*, or *still untouched*
- Add a short note (e.g., "kids didn't eat", "took longer than expected")

You click **Log today**.

---

### 8) Inventory stays up to date automatically
As you log meals:
- Used items reduce inventory
- Leftovers carry forward
- Notes accumulate quietly in the background

You never have to do a full reset unless you want to.

---

### 9) Next week starts smarter
When you start the next week:
- Inventory reflects reality
- The app remembers what worked and what didn't
- Prep suggestions and meal choices feel increasingly "you"

You click **Start this week's meal planning** again — and it's faster every time.

---

## What the app should quietly learn from your daily notes
Your notes aren't just logs — they're training signals. Over time, the app should learn:

### Meal reliability
- Which meals you *actually* make vs skip
- Which meals get repeated voluntarily
- Which meals consistently leave leftovers (good or bad)

This helps it favor **low-friction, high-success meals**.

### Time realism
- Meals that took longer than planned
- Prep sessions that didn't happen
- Office days where cooking ambition was too high

This helps it downshift complexity on busy days automatically.

### Kid & household response patterns
- Meals kids consistently eat
- Meals that trigger complaints or waste
- Flavors or textures that work better on certain days

This helps it bias toward **family-safe defaults** when energy is low.

### Ingredient behavior
- Produce that regularly goes unused
- Staples that are always consumed
- Items that freeze well vs spoil

This helps reduce food waste and stabilize your core grocery list.

### Prep effectiveness
- Prep that clearly made the week easier
- Prep that wasn't worth the effort
- Tasks that compound well (chopping once, using twice)

This helps the app suggest *fewer, smarter* prep steps.

### Preference drift (without asking you)
- Seasonal taste shifts
- Fatigue with certain cuisines
- Increased tolerance for repetition during busy weeks

This helps the app adapt without forcing explicit preference updates.

### Confidence signals
- Meals you label as "easy", "repeat", or "reliable"
- Weeks that felt calm vs chaotic

This lets the app optimize not just for nutrition, but for **mental load**.

---

### The meta-goal
Over time, the app should move from:
> "Here's a plan you *could* follow"

to:
> "Here's the plan you almost always *do* follow."

---

## Implementation Status

**Current (CLI-based):**
- ✅ Steps 3-6 partially implemented (farmers market → meal plan generation)
- ✅ Anti-repetition, constraint satisfaction, energy-based prep model
- ❌ Steps 2, 7-9 not yet implemented (inventory, daily check-ins, learning)

**Planned (GitHub Actions):**
- Phase 1-2: Steps 3-6 via GitHub web UI instead of CLI
- Phase 3: Step 7 via GitHub Issues
- Phase 4: Steps 2, 8 (inventory automation)
- Phase 5: Step 9 (learning and adaptation)

See [IMPLEMENTATION.md](../IMPLEMENTATION.md) for detailed technical plan.
