# Meal Planner Implementation Guide

**Last Updated:** 2026-01-01
**Live Site:** https://ssimhan.github.io/meal-planner/

---

## Status Overview

| Phase | Status | Description |
|-------|--------|-------------|
| **Phases 1-4: Core Automation** | ✅ Complete | GitHub Pages, Weekly Planning, Daily Check-ins, Inventory |
| **Phase 5: UI Polish** | ✅ Complete | Landing page, mobile optimization, archive organization |
| **Phase 6: Execution Tracking** | 🚧 In Progress | Track actual meals, vegetables, freezer, kids preferences |
| **Phase 7: Learning & Adaptation** | 💡 Future | Analytics, recipe scoring, insights reports |

---

## How It Works

### Weekly Planning (Automated)
- **Saturday 5am PST:** PR created with farmers market vegetable suggestions
- **User reviews:** Edit vegetables in GitHub, merge when ready
- **On merge:** Meal plan auto-generates and deploys to GitHub Pages

### Daily Check-ins (Automated)
- **8pm PST daily:** GitHub issue created for meal logging
- **User responds:** Log meals from phone/web
- **On comment:** System parses response, updates logs.yml, closes issue

### GitHub Pages (Automated)
- **On push to main:** Landing page regenerated, meal plans deployed
- **Accessible at:** https://ssimhan.github.io/meal-planner/

---

## Phase 1-4: Core Automation ✅

### Phase 1: GitHub Pages
- Workflow: [deploy-pages.yml](.github/workflows/deploy-pages.yml)
- Deploys meal plans as static HTML on every push to main

### Phase 2: Weekly Planning
- Start: [weekly-plan-start.yml](.github/workflows/weekly-plan-start.yml) - Saturday 5am PST
- Generate: [weekly-plan-generate.yml](.github/workflows/weekly-plan-generate.yml) - On PR merge

### Phase 3: Daily Check-ins
- Create: [daily-checkin-create.yml](.github/workflows/daily-checkin-create.yml) - 8pm PST daily
- Parse: [daily-checkin-parse.yml](.github/workflows/daily-checkin-parse.yml) - On issue comment

### Phase 4: Inventory Automation
- Tracks freezer backups via [parse_daily_log.py](scripts/parse_daily_log.py)
- Smart farmers market suggestions via [workflow.py](scripts/workflow.py)
- Data: [inventory.yml](data/inventory.yml)

---

## Phase 5: UI Polish ✅

### Priority 1: Weekly Plan Visual Hierarchy
**Compact, mobile-first meal plan design**
- White card backgrounds with 4px colored left borders (lunch/snack/dinner/prep)
- Compact 20px spacing - see 3-4 sections per mobile screen
- Small uppercase headers for quick scanning
- Files: [weekly-plan-template.html](templates/weekly-plan-template.html)

### Priority 2: Landing Page Workflow Status
**Status badges removed from landing page for simplicity**
- Quick actions are contextual and workflow-aware (sufficient status indication)
- Files: [landing-page-template.html](templates/landing-page-template.html), [generate_landing_page.py](scripts/generate_landing_page.py)

### Priority 3: Landing Page Quick Actions
**Context-aware action buttons**
- Priority 1: "📝 Review Farmers Market Veggies" or "🚀 Generate Next Week's Plan"
- Priority 2: "🛒 View Shopping List" (current week)
- Always available: Daily Check-in, Past Plans, GitHub
- Files: [generate_landing_page.py](scripts/generate_landing_page.py:216-287)

### Priority 4: Lunch Selection Intelligence
**Expanded lunch variety from 5 to 109 recipes**
- Changed filter from explicit `lunch_suitable` flag to `meal_type` (sandwich, salad, grain_bowl, tacos_wraps, soup_stew, pasta_noodles, appetizer)
- Made ingredient reuse optional (bonus points, not required)
- Adult lunches default to leftovers (Tue-Fri), kids get rotating defaults
- Files: [lunch_selector.py](scripts/lunch_selector.py)

### Priority 5: Archive Page Organization
**Past plans grouped by month with collapsible sections**
- Plans organized by year/month (e.g., "January 2026", "December 2025")
- Collapsible `<details>` sections with rotating arrow animation
- Newest months first, weeks sorted within each month
- Files: [generate_landing_page.py](scripts/generate_landing_page.py:157-213), [landing-page-template.html](templates/landing-page-template.html:340-348)

---

## Phase 6: Execution Tracking 🚧

**Status:** In Progress - Building Phase 6.1
**Goal:** Track actual meal execution to improve planning and reduce waste

### Overview

Track actual meal execution vs. planned meals to:
1. **Refresh weekly plans** - Show what's been done, what's remaining
2. **Track vegetables** - Monitor family consumption and reduce waste
3. **Manage inventory** - Track freezer backups and fridge vegetables
4. **Learn preferences** - Track kids' feedback and dislikes
5. **Analyze patterns** - Understand adherence, identify problem recipes

### Design Principles

✅ **Single source of truth:** Use `history.yml` only - no new files
✅ **Minimal friction:** Quick daily logging via GitHub Actions
✅ **Context-efficient:** Keep data compact for LLM context windows
✅ **Incremental:** Build Phase 6.1 first, validate, then expand

---

### Enhanced `history.yml` Schema

**Structure:**

```yaml
weeks:
  - week_of: '2026-01-05'

    # Weekly summary (auto-calculated by script)
    plan_adherence_pct: 80  # % of dinners made as planned

    # Inventory tracking
    freezer_inventory:
      - meal: "Bisi Bele Bath"
        frozen_date: "2026-01-06"
      - meal: "Dal Makhani"
        frozen_date: "2025-12-28"
      - meal: "Pasta Sauce"
        frozen_date: "2025-12-20"

    fridge_vegetables:  # Initialized from Groceries tab, updated as used
      - bell pepper
      - broccoli
      - carrot
      - corn
      - cucumber
      - garlic
      - onion
      - peas
      - potato
      - tomato

    # Kids dislikes (accumulated over time)
    kids_dislikes:
      - complaint: "Lentils too mushy"
        date: "2026-01-08"
        recipe: "dal_makhani"

    dinners:
      - recipe_id: bisi_bele_bath
        cuisine: indian
        meal_type: soup_stew
        day: mon
        vegetables: [beans, carrot, onion, peas, potato, tomato]

        # === EXECUTION TRACKING (added after cooking) ===
        made: true  # or false or "freezer_backup"
        made_2x_for_freezer: true  # optional, only if batch cooked
        vegetables_used: [carrot, onion, peas, potato, tomato]
        kids_feedback: "Loved it ❤️"  # Loved it ❤️ | Liked it 👍 | Neutral 😐 | Didn't like 👎 | Refused to eat ❌

      - recipe_id: cheesy_veggie_quesadilla
        day: tue
        vegetables: [bell pepper, corn, garlic, onion]

        made: true
        vegetables_used: [bell pepper, corn, onion]  # didn't use garlic
        kids_feedback: "Liked it 👍"

      - recipe_id: cherry_tomato_salad
        day: wed
        vegetables: [garlic, tomato]

        made: false
        actual_meal: "freezer_backup"
        freezer_used:
          meal: "Dal Makhani"
          frozen_date: "2025-12-28"
        reason: "Too tired after work"
        vegetables_used: []  # used freezer meal
        kids_feedback: "Neutral 😐"
        kids_complaints: "Didn't want dal again"  # optional
```

**Field Definitions:**

**Required fields (added after execution):**
- `made`: `true` | `false` | `"freezer_backup"`
- `vegetables_used`: List of vegetables actually used (can be empty)

**Optional fields (only if applicable):**
- `made_2x_for_freezer`: `true` (adds to freezer inventory)
- `kids_feedback`: Quick rating (multiple choice)
- `kids_complaints`: Free text (for tracking dislikes)
- `actual_meal`: What you made instead (if `made: false`)
- `freezer_used`: Object with `meal` and `frozen_date` (if used freezer)
- `reason`: Quick note on why plan changed

**Auto-calculated:**
- `plan_adherence_pct`: Percentage of dinners made as planned

---

### Phase 6.1: Core Logging Script ✅

**Goal:** CLI tool for manual execution logging

#### Component: `scripts/log_execution.py`

**Purpose:** Log daily execution and update `history.yml`

**Usage:**
```bash
# Simplest case - made as planned
python3 scripts/log_execution.py \
  --week 2026-01-05 \
  --day mon \
  --made yes \
  --vegetables "carrot,onion,peas,potato,tomato" \
  --kids-feedback "Loved it ❤️"

# Made 2x for freezer
python3 scripts/log_execution.py \
  --week 2026-01-05 \
  --day mon \
  --made yes \
  --made-2x \
  --vegetables "carrot,onion,peas,potato,tomato" \
  --kids-feedback "Loved it ❤️"

# Used freezer backup
python3 scripts/log_execution.py \
  --week 2026-01-05 \
  --day wed \
  --made freezer \
  --freezer-meal "Dal Makhani" \
  --reason "Too tired" \
  --kids-feedback "Neutral 😐" \
  --kids-complaints "Didn't want dal again"

# Made something else
python3 scripts/log_execution.py \
  --week 2026-01-05 \
  --day wed \
  --made no \
  --actual-meal "Pasta with butter" \
  --vegetables "garlic" \
  --reason "Kids requested pasta" \
  --kids-feedback "Loved it ❤️"
```

**Script behavior:**
1. Load `history.yml`
2. Find the dinner for `week_of` + `day`
3. Add execution tracking fields
4. Update `fridge_vegetables` (remove what was used)
5. Update `freezer_inventory` (add if made 2x, remove if used)
6. Add to `kids_dislikes` if complaints provided
7. Recalculate `plan_adherence_pct` for the week
8. Save back to `history.yml`
9. Print summary

**Output example:**
```
✅ Logged execution for 2026-01-05 Monday

Dinner: Bisi Bele Bath
Made: Yes (2x batch for freezer)
Vegetables used: carrot, onion, peas, potato, tomato
Kids: Loved it ❤️

Freezer inventory: 3 meals (GOAL MET ✅)
  - Bisi Bele Bath (frozen 2026-01-06)
  - Dal Makhani (frozen 2025-12-28)
  - Pasta Sauce (frozen 2025-12-20)

Fridge vegetables remaining: bell pepper, broccoli, corn, cucumber, garlic

Week progress: 1/5 dinners logged (20% complete)
```

**Implementation tasks:**
- [ ] Create script with argument parsing
- [ ] Implement history.yml loading/saving
- [ ] Add execution field updates
- [ ] Implement inventory tracking (freezer + fridge)
- [ ] Add kids_dislikes tracking
- [ ] Calculate plan_adherence_pct
- [ ] Test manually on 2026-01-05 week

**Validation:** Can log a dinner manually via CLI

---

### Phase 6.2: Manual Testing ⏸️

**Goal:** Validate schema and identify friction

**Tasks:**
- [ ] Log dinner each evening via CLI for 3-5 days
- [ ] Review data quality in history.yml
- [ ] Check if vegetable tracking is useful
- [ ] Verify freezer inventory updates correctly

**Validation:** Schema feels right, no missing data

---

### Phase 6.3: GitHub Actions Integration 🔮

**Goal:** Automate daily logging

#### Update existing workflows

**Workflow:** `.github/workflows/daily-checkin-create.yml`

**New issue template (structured form):**

```markdown
## 🍽️ Dinner Check-in: [Day] 2026-01-06

### Did you make the planned dinner?
- [ ] ✅ Made as planned
- [ ] ❄️ Made as planned + froze 2x batch
- [ ] 🍲 Used freezer backup
- [ ] 🔄 Made something else
- [ ] 🍽️ Ate out

---

**If "Used freezer backup" → which meal?**
- [ ] Bisi Bele Bath (frozen 2026-01-06)
- [ ] Dal Makhani (frozen 2025-12-28)
- [ ] Pasta Sauce (frozen 2025-12-20)

**If "Made something else" → what did you make?**
[Free text]

---

### What vegetables did you use tonight?
_(Check all that apply from fridge inventory)_

- [ ] bell pepper
- [ ] broccoli
- [ ] carrot
- [ ] corn
- [ ] cucumber
- [ ] garlic
- [ ] onion
- [ ] peas
- [ ] potato
- [ ] tomato

---

### Kids' feedback?
- [ ] ❤️ Loved it
- [ ] 👍 Liked it
- [ ] 😐 Neutral
- [ ] 👎 Didn't like
- [ ] ❌ Refused to eat

**Any complaints?** (optional)
[Free text]

---

### Notes (optional)
[Free text for any other observations]
```

**Workflow:** `.github/workflows/daily-checkin-parse.yml`

Update `scripts/parse_daily_log.py` to:
1. Parse checkbox selections from issue comment
2. Call `log_execution.py` with parsed arguments
3. Close issue with summary

**Tasks:**
- [ ] Update `daily-checkin-create.yml` with structured form
- [ ] Update `parse_daily_log.py` to parse checkboxes
- [ ] Call `log_execution.py` from parser
- [ ] Test workflow end-to-end

**Validation:** Can log via GitHub issue instead of CLI

---

### Phase 6.4: Vegetable Initialization 🔮

**Goal:** Auto-populate fridge vegetables from plan

#### Component: `scripts/init_week_vegetables.py`

**Purpose:** Extract vegetables from HTML Groceries tab at start of week

**Usage:**
```bash
python3 scripts/init_week_vegetables.py --week 2026-01-05
```

**Behavior:**
1. Read `plans/2026-01-05-weekly-plan.html`
2. Extract vegetables from "Fresh Produce" section in Groceries tab
3. Add `fridge_vegetables: [...]` to that week in `history.yml`
4. Initialize `freezer_inventory` from current state (manual for now)

**Tasks:**
- [ ] Create `init_week_vegetables.py`
- [ ] Parse HTML Groceries tab
- [ ] Extract Fresh Produce items
- [ ] Add to history.yml at week start

**Validation:** Vegetables auto-populated on Sunday

---

### Default Behaviors

**If dinner not logged:**
- Script assumes `made: true` (as planned)
- `vegetables_used` defaults to `vegetables` (planned list)
- No kids feedback recorded

**If vegetables not specified:**
- Defaults to planned vegetables from recipe

**If freezer count drops below 3:**
- Print warning in log output
- Future: Alert in weekly plan refresh

---

## Phase 7: Learning & Adaptation 💡

**Status:** Future - Depends on 4-8 weeks of Phase 6 data

### Component: `scripts/analyze_trends.py`

**Purpose:** Generate insights from execution tracking data

**Usage:**
```bash
python3 scripts/analyze_trends.py --weeks 8 --output insights-2026-02-01.md
```

**Outputs:**

1. **Recipe Performance**
   - Success rate (% made vs skipped)
   - Kids' favorite recipes (Loved it ❤️ count)
   - Recipes to remove (frequently skipped or disliked)

2. **Vegetable Consumption**
   - Weekly average usage
   - Most/least used vegetables
   - Waste patterns (bought but not used)

3. **Freezer Backup Analysis**
   - Usage frequency by day
   - Whether 3-backup goal is maintained
   - Which frozen meals are favorites

4. **Plan Adherence**
   - Overall adherence % trend
   - Which days deviate most (likely Fri)
   - Common reasons for deviation

5. **Kids Preferences**
   - Dislikes to avoid
   - Recipes that consistently win
   - Patterns in complaints

**Example output:**
```markdown
# Meal Planning Insights (8 weeks)

## Recipe Performance

### Winners (80%+ success, high ratings)
- **Bisi Bele Bath**: 100% success (7/7), avg rating: Loved it ❤️
- **Cheesy Veggie Quesadilla**: 85% success (6/7), avg rating: Liked it 👍

### Remove from rotation
- **Cherry Tomato Salad**: 40% success (2/5), kids: "Too plain"
- **Dal Makhani**: 60% success (3/5), kids: "Lentils too mushy"

## Vegetable Trends

**Weekly average:** 12 vegetables used/week
**Favorites:** tomato (8x), onion (7x), garlic (6x)
**Underused:** cucumber (1x), peas (2x)

## Freezer Backup

**Usage:** 1.2x/week average (mostly Fridays)
**Goal status:** 3-backup maintained 75% of weeks ✅
**Favorite backup:** Bisi Bele Bath (used 4x)

## Recommendations

1. **Add more Bisi Bele Bath** - 100% success, family loves it
2. **Remove Cherry Tomato Salad** - frequently skipped, kids dislike
3. **Reduce cucumber purchases** - consistently goes unused
4. **Friday adherence low (40%)** - increase freezer backups
```

### Other Future Possibilities

- Dynamic meal plan updates (show planned vs. actual)
- Email/SMS notifications (instead of GitHub issues)
- Mobile app wrapper
- Recipe rating system in UI
- Grocery delivery integration
- Plan refresh with execution overlay

---

## Quick Start

### First-time setup
1. Enable GitHub Pages in repository settings (deploy from gh-pages branch)
2. Manually trigger workflows from Actions tab to test
3. Let scheduled workflows run automatically

### Ongoing use
- **Saturday 5am:** Review weekly planning PR, edit vegetables, merge
- **Daily 8pm:** Respond to daily check-in issue with meal details
- **Anytime:** View plans at https://ssimhan.github.io/meal-planner/

### Phase 6 Quick Reference

**Log tonight's dinner (made as planned):**
```bash
python3 scripts/log_execution.py \
  --week 2026-01-05 \
  --day mon \
  --made yes \
  --vegetables "carrot,onion,peas" \
  --kids-feedback "Loved it ❤️"
```

**Check freezer inventory:**
```bash
grep -A5 "freezer_inventory" data/history.yml
```

**Check fridge vegetables:**
```bash
grep -A10 "fridge_vegetables" data/history.yml | head -15
```

**View week summary:**
```bash
python3 scripts/log_execution.py --week 2026-01-05 --summary
```

---

## Cost & Resources

**GitHub Actions:** ~60 mins/month (well within 2,000 min/month free tier)
- Weekly planning: ~5 mins
- Daily check-ins: ~10 mins/week (with execution tracking)
- Deployment: ~1 min/push

**Storage:** Minimal (~2MB for plans, data, history, and execution tracking)

---

## Success Metrics

### Phase 6 Success Criteria
- ✅ Can log daily execution in < 2 minutes
- ✅ Freezer inventory stays accurate
- ✅ Vegetable tracking feels useful (not tedious)
- ✅ Kids preferences accumulate over time
- ✅ Data quality good enough for analysis

### Phase 7 Success Criteria
- ✅ Insights report identifies 2-3 recipes to remove
- ✅ Vegetable waste reduced by seeing usage patterns
- ✅ Plan adherence trends visible
- ✅ Kids' dislikes inform future meal planning

---

## Notes

- **Phases 1-5 complete:** Core automation and UI polish done
- **Phase 6 in progress:** Building execution tracking incrementally
- **Phase 7 future:** Analytics depend on data from Phase 6
- **Simplicity first:** Test each phase before building next
- **Context efficiency:** Single `history.yml` file keeps LLM usage low
