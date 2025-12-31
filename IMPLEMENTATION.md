# GitHub Actions Implementation Plan

This document tracks the automation journey from CLI-only workflow to GitHub Actions.

## Progress Tracker

**Last Updated:** 2025-12-30

| Phase | Status | Key Files |
|-------|--------|-----------|
| **Phase 1: GitHub Pages Setup** | ✅ **COMPLETE** | [deploy-pages.yml](.github/workflows/deploy-pages.yml) |
| **Phase 2: Automated Weekly Planning** | ✅ **COMPLETE** | [weekly-plan-start.yml](.github/workflows/weekly-plan-start.yml), [weekly-plan-generate.yml](.github/workflows/weekly-plan-generate.yml) |
| **Phase 3: Daily Check-ins** | ✅ **COMPLETE** | [daily-checkin-create.yml](.github/workflows/daily-checkin-create.yml), [daily-checkin-parse.yml](.github/workflows/daily-checkin-parse.yml) |
| **Phase 4: Inventory Automation** | ✅ **COMPLETE** | [parse_daily_log.py](scripts/parse_daily_log.py), [inventory.yml](data/inventory.yml) |
| **Phase 5: Learning & Adaptation** | ⏸️ Not Started | Future: `scripts/analyze_logs.py` |

**Current Status:** ✅ All core automation phases (1-4) complete and pushed to GitHub!

**Live Site:** https://ssimhan.github.io/meal-planner/

---

## Recommended Order of Remaining Work

### Priority 1: Testing & Validation 🧪
**Estimated Effort:** 30-60 minutes

**Goal:** Verify all workflows work correctly on GitHub before using in production.

**Tasks:**
1. **Test Phase 2 - Weekly Planning Workflow**
   - Go to Actions tab → "Start Weekly Meal Planning" → Run workflow
   - Verify PR is created with farmers market suggestions
   - Edit the input file on GitHub to confirm vegetables
   - Merge PR and verify meal plan generates automatically
   - Check that plan appears on GitHub Pages

2. **Test Phase 3 - Daily Check-in Workflow**
   - Go to Actions tab → "Daily Meal Check-in" → Run workflow
   - Verify issue is created with proper template
   - Add a comment with test meal data
   - Verify logs.yml is updated
   - Verify issue auto-closes

**Success Criteria:**
- [ ] Weekly planning PR workflow works end-to-end
- [ ] Daily check-in issue workflow works end-to-end
- [ ] All automated commits appear correctly
- [ ] GitHub Pages updates with new plans

---

### Priority 2: UI Polish & User Experience 🎨
**Estimated Effort:** 2-3 hours

**Goal:** Make GitHub Pages more polished and user-friendly.

**Tasks:**
1. **Create a proper landing page (index.html)**
   - Currently auto-generated - make it visually appealing
   - Add project description and instructions
   - Link to latest meal plan
   - Show freezer backup status
   - Display upcoming week information

2. **Improve meal plan HTML styling**
   - Already uses Solarpunk theme - keep it
   - Add print-friendly CSS for grocery lists
   - Better mobile responsiveness
   - Quick links to jump between days

3. **Add navigation between plans**
   - Previous/Next week buttons
   - Archive of past plans

**Success Criteria:**
- [ ] Landing page looks professional
- [ ] Easy to navigate from phone
- [ ] Print-friendly grocery list

---

### Priority 3 (Optional): Phase 5 - Learning & Adaptation 🧠
**Estimated Effort:** 4-6 hours

**Goal:** Make the system learn from your daily logs to improve suggestions.

**This is entirely optional** - the system works perfectly without it. Only pursue if you're interested in the analytics aspect.

**Suggested Minimal Implementation:**

Focus on 1-2 high-impact features:

1. **Meal Success Scoring** (Highest Impact)
   - Parse logs for keywords: "loved", "easy", "quick" vs "didn't eat", "took forever"
   - Score each recipe over time
   - Boost successful recipes in rotation

2. **Freezer Backup Intelligence**
   - Track which backup meals get used most
   - Suggest batch cooking popular backup meals
   - Learn optimal backup variety

**Implementation:**
- Create `scripts/analyze_logs.py`
- Run weekly to update recipe scores
- Use scores in dinner selection algorithm

**Success Criteria:**
- [ ] Recipe scores calculated from logs
- [ ] High-success meals appear more frequently
- [ ] System feels "smarter" after 4-6 weeks

---

## System Architecture Overview

### Phase 1: GitHub Pages Setup
**What it does:** Deploys meal plans as static HTML accessible from any device

**How it works:**
- Workflow: [deploy-pages.yml](.github/workflows/deploy-pages.yml)
- Triggers: Every push to `main` branch
- Actions: Copies all HTML files from `plans/` directory, generates index page, deploys to GitHub Pages
- Result: Meal plans accessible at https://ssimhan.github.io/meal-planner/

---

### Phase 2: Automated Weekly Planning
**What it does:** Creates PRs with farmers market suggestions, generates meal plans when PR is merged

**How it works:**
- **Workflow 1:** [weekly-plan-start.yml](.github/workflows/weekly-plan-start.yml)
  - Triggers: Sundays at 8am PST (or manual via `workflow_dispatch`)
  - Actions: Runs `python3 scripts/workflow.py start-week`, creates PR with proposed vegetables

- **Workflow 2:** [weekly-plan-generate.yml](.github/workflows/weekly-plan-generate.yml)
  - Triggers: When PR with `weekly-planning` label is merged
  - Actions: Runs `python3 scripts/workflow.py generate-plan`, commits plan and history

**User flow:**
1. Sunday 8am: Receive PR with farmers market suggestions
2. Edit vegetables on GitHub web UI
3. Merge PR when ready
4. Meal plan auto-generates and appears on GitHub Pages

---

### Phase 3: Daily Check-ins
**What it does:** Creates GitHub issues for daily meal logging, parses responses and updates logs

**How it works:**
- **Workflow 1:** [daily-checkin-create.yml](.github/workflows/daily-checkin-create.yml)
  - Triggers: Daily at 6pm PST (or manual via `workflow_dispatch`)
  - Actions: Creates issue with template for logging lunch/dinner/notes

- **Workflow 2:** [daily-checkin-parse.yml](.github/workflows/daily-checkin-parse.yml)
  - Triggers: When comment is added to issue with `daily-checkin` label
  - Actions: Runs [parse_daily_log.py](scripts/parse_daily_log.py), updates [logs.yml](data/logs.yml), closes issue

**User flow:**
1. 6pm daily: Receive GitHub issue notification
2. Reply with meal details from phone/web
3. System parses response, saves to logs.yml, closes issue

---

### Phase 4: Inventory Automation
**What it does:** Tracks freezer backups, adjusts farmers market suggestions based on inventory

**How it works:**
- **Data schema:** [inventory.yml](data/inventory.yml) tracks fridge/pantry/freezer items
- **Freezer tracking:** [parse_daily_log.py](scripts/parse_daily_log.py) detects freezer backup usage, decrements count
- **Smart suggestions:** [workflow.py](scripts/workflow.py) skips items already in fridge, warns if freezer backups < 3

**Key features:**
- Automatic freezer backup decrement when "freezer backup" appears in daily logs
- Farmers market suggestions skip vegetables already in inventory
- Warning when freezer backup count drops below 3

---

## Phase 5: Learning & Adaptation (Future)

**What the system could learn from daily logs:**

### High-Impact Learning Areas
1. **Meal Reliability** - Track completion rate, boost low-friction high-success meals
2. **Time Realism** - Parse "took 30 mins" notes, adjust complexity on busy days
3. **Kid Response Patterns** - Parse "kids loved" vs "didn't eat", bias toward family-safe defaults
4. **Ingredient Behavior** - Track unused produce, reduce waste
5. **Prep Effectiveness** - Parse "Monday prep saved me" notes, suggest smarter prep steps
6. **Preference Drift** - Detect seasonal shifts, cuisine fatigue without asking
7. **Confidence Signals** - Parse "easy", "repeat", "reliable" notes, optimize for mental load

### Minimal Implementation Approach
Rather than building all 7 categories, start with:
- **Meal Success Scoring**: Parse logs for keywords, score recipes, boost successful ones
- **Freezer Intelligence**: Track which backups get used most, suggest popular batch meals

See [Priority 3](#priority-3-optional-phase-5---learning--adaptation-) above for implementation details.

---

## Updated Backlog

### Completed ✅
- GitHub Pages deployment
- Automated weekly planning via PRs
- Daily check-ins via issues
- Inventory tracking (freezer backups)
- Smart farmers market suggestions

### In Progress 🚧
- Testing workflows on GitHub

### Planned 📋
- Polish landing page and UI
- Add navigation between meal plans
- (Optional) Learning & Adaptation

### Future Ideas 💡
- Email/SMS notifications instead of relying on GitHub
- Mobile app wrapper around GitHub Pages
- Integration with grocery delivery services
- Recipe rating system in the meal plan UI
- Meal prep video links

---

## Testing Strategy

### For Each Phase
1. **Manual trigger first** - Use `workflow_dispatch` to test
2. **Verify outputs** - Check files committed correctly
3. **Test edge cases** - What if no vegetables confirmed? What if duplicate meals logged?
4. **Use for 1-2 weeks** - Real-world validation before next phase
5. **Document issues** - Add to [PROJECT_HISTORY.md](PROJECT_HISTORY.md)

### Rollback Plan
- Keep CLI workflow working at all times
- GitHub Actions are additive, not replacing
- Can disable workflows via GitHub settings
- Data in YAML files - easy to manual edit if needed

---

## Cost Tracking

GitHub Actions free tier: 2,000 minutes/month

**Estimated usage:**
- Weekly plan creation: ~3 mins
- Weekly plan generation: ~2 mins
- Daily check-ins (7 days): ~7 mins (1 min each)
- **Total per week:** ~12 minutes
- **Total per month:** ~48 minutes
- **Buffer:** 1,952 minutes remaining

**Well within free tier.**

---

## Quick Start Guide

**For first-time setup:**
1. Test workflows: Go to Actions tab and manually trigger workflows
2. Polish UI: Improve landing page (Priority 2 above)
3. Start using: Let scheduled workflows run automatically

**For ongoing use:**
- Sunday 8am: Review PR with farmers market suggestions, edit and merge
- Daily 6pm: Reply to check-in issue with meal notes
- View plans anytime at: https://ssimhan.github.io/meal-planner/

# Sandhya notes
This section is for ideas that I want to add quickly

- i want to clean up the number of github actions in this repo