# Design Reference - Original UX Vision

**Status:** Aspirational design for future development

**Current implementation:** See [project_roadmap.md](../project_roadmap.md) for what's actually built

---

## The Ideal User Flow

**Vision:** A 10-15 minute weekly planning session that gets smarter over time

### Weekly Planning Session
1. **Open app** → Click "Start this week's meal planning"
2. **Inventory check** → Confirm fridge/pantry/freezer contents
3. **Farmers market suggestions** → Review seasonal produce + rough meal outline
4. **Schedule confirmation** → Adjust WFH/office/busy days as needed
5. **Prep recommendations** → Accept or adjust prep timing
6. **Final plan + grocery list** → Save complete week (Mon-Sun)

### Daily During Week
7. **Daily check-in** → Log what you actually made, mark inventory changes
8. **Auto-update inventory** → Used items reduce, leftovers carry forward
9. **Next week starts smarter** → Learns from your patterns

---

## What The System Should Learn

**From daily logs, the app should silently learn:**

- **Meal reliability** - Which meals you actually make vs skip, success patterns
- **Time realism** - Meals that took longer than planned, prep that didn't happen
- **Kid response** - Meals consistently eaten vs complained about
- **Ingredient behavior** - Produce that goes unused, staples always consumed
- **Prep effectiveness** - Prep that made week easier vs wasn't worth it
- **Preference drift** - Seasonal shifts, cuisine fatigue (without asking explicitly)
- **Confidence signals** - Meals labeled "easy", "reliable"; calm vs chaotic weeks

**Meta-goal:** Move from "Here's a plan you *could* follow" to "Here's the plan you almost always *do* follow."

---

## Implementation Status

### Currently Built ✅
- Steps 3-6: Farmers market → meal plan generation (CLI + GitHub Actions)
- Anti-repetition, constraint satisfaction, energy-based prep model
- Daily check-ins via GitHub Issues (Phase 3 complete)
- Inventory automation (Phase 4 complete)

### Not Yet Built ❌
- Step 2: Interactive inventory check
- Steps 7-9: Learning and adaptation from daily logs
- Meal reliability tracking
- Time estimation improvements
- Preference drift detection

### Future (Phase 6 - Optional)
See [project_roadmap.md](../project_roadmap.md) "Phase 6: Learning & Adaptation" for technical details.

---

## Why This Document Exists

This describes the *ideal experience* - what the system could become if fully developed. It serves as:
- Long-term vision for features
- Design reference for incremental improvements
- Reminder of the meta-goal (mental load reduction, not just nutrition)

**For what's actually built:** See [project_roadmap.md](../project_roadmap.md)
**For current capabilities:** See [README.md](../README.md)
