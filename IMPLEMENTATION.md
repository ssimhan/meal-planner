# GitHub Actions Implementation Plan

This document tracks the automation journey from CLI-only workflow to GitHub Actions.

## Progress Tracker

**Last Updated:** 2025-12-30

| Phase | Status | Key Files |
|-------|--------|-----------|
| **Phases 1-4: Core Automation** | ✅ **COMPLETE** | GitHub Pages, Weekly Planning, Daily Check-ins, Inventory |
| **Phase 5: UI Polish** | 🚧 **IN PROGRESS** | Landing page, navigation, mobile optimization |
| **Phase 6: Learning & Adaptation** | ⏸️ Future | Analytics, recipe scoring |

**Current Status:** ✅ All automation complete. Now focusing on user experience improvements.

**Live Site:** https://ssimhan.github.io/meal-planner/

---

## Current Focus: UI Polish & User Experience 🎨

**Goal:** Transform the auto-generated GitHub Pages site into a polished, mobile-friendly meal planning hub.

### Task 1: Design and Build Landing Page
**Status:** ✅ **COMPLETE**

**What we're building:**
A welcoming home page that serves as the meal planning dashboard.

**Design Requirements:**
- **Solarpunk aesthetic** - Match existing meal plan theme (warm, organic, sustainable vibes)
- **Mobile-first** - Primary use case is checking plans from phone in kitchen/grocery store
- **Glanceable info** - Quick overview without scrolling

**Content Sections:**
1. **Hero section**
   - Project title: "My Meal Planner"
   - Tagline: Brief description of the system (e.g., "Energy-aware vegetarian meal planning with freezer backup strategy")
   - Visual element (optional): Solarpunk-themed graphic or icon

2. **This Week section**
   - Week date range (e.g., "Week of Jan 6-12, 2025")
   - Large button: "View This Week's Plan" → links to latest meal plan HTML
   - Quick status indicators:
     - Freezer backup count (e.g., "🧊 3 backup meals ready")
     - Days until next grocery trip (e.g., "🛒 Shopping in 2 days")

3. **Quick Actions section**
   - Button: "Past Meal Plans" → archive view
   - Button: "View Recipes" → link to recipe index (if we build this)
   - Link: "Daily Check-in" → current GitHub issue (if applicable)

4. **How It Works section** (collapsible/expandable)
   - Brief explanation of the automated workflow
   - Sunday: Weekly plan PR → Edit vegetables → Merge
   - Daily: Check-in issue → Log meals → Auto-update
   - Links to GitHub repo for more details

**Technical Implementation:**
- Static HTML file: `index.html` (will be generated/updated by workflow)
- Embedded CSS (no external dependencies for offline reliability)
- Minimal JavaScript (or none) - prefer static content
- Read data from:
  - `data/inventory.yml` - freezer backup count
  - List of plan files in `plans/` directory - find latest week
  - Current date - calculate days until Sunday

**Files Created:**
- [x] `templates/landing-page-template.html` - Template with placeholders
- [x] `scripts/generate_landing_page.py` - Script to populate template with live data
- [x] Update `.github/workflows/deploy-pages.yml` - Generate landing page before deployment

**Success Criteria:**
- [x] Landing page renders beautifully on mobile (primary device)
- [x] One-tap access to current week's meal plan
- [x] Freezer backup status visible at a glance
- [x] Matches Solarpunk aesthetic of meal plans
- [x] Loads instantly (no external dependencies)

**Completed:** 2025-12-30
**Live at:** https://ssimhan.github.io/meal-planner/

---

### Task 2: Archive Page Organization
**Status:** ⏸️ Next

**What we're building:**
Organize past meal plans by year and month for easier browsing.

**Current state:** Landing page lists all plans in reverse chronological order (newest first)

**Improved design:**
- Group plans by year and month
- Collapsible sections (e.g., "2025 → December", "2025 → January")
- Each month shows list of weeks
- Visual hierarchy makes it easy to find specific time periods

**Technical Implementation:**
- Update `scripts/generate_landing_page.py` to group plans by year/month
- Modify landing page template to show organized sections
- Add CSS for collapsible month sections

**Files to Modify:**
- [ ] `templates/landing-page-template.html` - Add month/year grouping UI
- [ ] `scripts/generate_landing_page.py` - Parse dates and organize by month

**Success Criteria:**
- [ ] Plans organized by year and month
- [ ] Easy to find meal plans from 6+ months ago
- [ ] Collapsible sections keep page clean

---

## Completed Work (Archive)

<details>
<summary><strong>Phases 1-4: Core Automation</strong> ✅ (Click to expand)</summary>

### Phase 1: GitHub Pages Setup ✅
- Automated deployment of meal plans as static HTML
- Accessible at https://ssimhan.github.io/meal-planner/
- Files: [deploy-pages.yml](.github/workflows/deploy-pages.yml)

### Phase 2: Automated Weekly Planning ✅
- Saturday 5am PST: PR creation with farmers market suggestions
- Auto-generate meal plan on PR merge
- Files: [weekly-plan-start.yml](.github/workflows/weekly-plan-start.yml), [weekly-plan-generate.yml](.github/workflows/weekly-plan-generate.yml)

### Phase 3: Daily Check-ins ✅
- Automated GitHub issue creation at 8pm PST daily
- Parse user responses and update logs.yml
- Files: [daily-checkin-create.yml](.github/workflows/daily-checkin-create.yml), [daily-checkin-parse.yml](.github/workflows/daily-checkin-parse.yml)

### Phase 4: Inventory Automation ✅
- Track freezer backups automatically
- Smart farmers market suggestions
- Files: [parse_daily_log.py](scripts/parse_daily_log.py), [inventory.yml](data/inventory.yml)

### Testing & Validation ✅
- All workflows tested end-to-end
- Verified on GitHub with real data
- System ready for production use

</details>

<details>
<summary><strong>Phase 5 - Task 1: Landing Page</strong> ✅ (Click to expand)</summary>

### Beautiful Solarpunk Landing Page ✅
**Completed:** 2025-12-30

**What we built:**
- Mobile-first landing page with Solarpunk aesthetic matching meal plan design
- Live data integration: freezer backup count, next shopping day, current week link
- Past meal plans archive (will be organized by year/month in Task 2)
- Collapsible "How It Works" section
- Quick action buttons

**Files created:**
- `templates/landing-page-template.html` - Solarpunk HTML/CSS template
- `scripts/generate_landing_page.py` - Python script to populate with live data
- Updated `.github/workflows/deploy-pages.yml` - Generate landing page on deployment

**Live site:** https://ssimhan.github.io/meal-planner/

</details>

---

## Future Ideas (Backlog)

### Phase 6: Learning & Adaptation 🧠
**Goal:** Make the system learn from daily logs to improve suggestions.

**Minimal Implementation:**
- Meal success scoring from log keywords
- Freezer backup intelligence
- Recipe frequency optimization

**This is optional** - system works perfectly without it.

### Other Ideas 💡
- **Dynamic meal plan updates** - Show "planned vs. actual" as daily check-ins are logged
- Email/SMS notifications instead of GitHub issues
- Mobile app wrapper around GitHub Pages
- Recipe rating system in UI
- Integration with grocery delivery services

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
  - Triggers: Saturdays at 5am PST (or manual via `workflow_dispatch`)
  - Actions: Runs `python3 scripts/workflow.py start-week`, creates PR with proposed vegetables

- **Workflow 2:** [weekly-plan-generate.yml](.github/workflows/weekly-plan-generate.yml)
  - Triggers: When PR with `weekly-planning` label is merged
  - Actions: Runs `python3 scripts/workflow.py generate-plan`, commits plan and history

**User flow:**
1. Saturday 5am: Receive PR with farmers market suggestions
2. Edit vegetables on GitHub web UI
3. Merge PR when ready
4. Meal plan auto-generates and appears on GitHub Pages

---

### Phase 3: Daily Check-ins
**What it does:** Creates GitHub issues for daily meal logging, parses responses and updates logs

**How it works:**
- **Workflow 1:** [daily-checkin-create.yml](.github/workflows/daily-checkin-create.yml)
  - Triggers: Daily at 8pm PST (or manual via `workflow_dispatch`)
  - Actions: Creates issue with template for logging lunch/dinner/notes

- **Workflow 2:** [daily-checkin-parse.yml](.github/workflows/daily-checkin-parse.yml)
  - Triggers: When comment is added to issue with `daily-checkin` label
  - Actions: Runs [parse_daily_log.py](scripts/parse_daily_log.py), updates [logs.yml](data/logs.yml), closes issue

**User flow:**
1. 8pm PST daily: Receive GitHub issue notification
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
- Testing workflows on GitHub (Priority 1)

### Planned 📋
- Polish landing page and UI
- Add navigation between meal plans
- (Optional) Learning & Adaptation

### Future Ideas 💡
- **Dynamic meal plan updates** - Update weekly HTML plan as daily check-ins are logged
  - Show "planned vs. actual" comparison
  - Add checkmarks for completed meals
  - Highlight when freezer backups were used
  - Display deviations from the plan
  - Could trigger on daily-checkin-parse workflow completion
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
- Saturday 5am: Automated PR created with farmers market suggestions
- Review PR: Edit vegetables, confirm, and merge when ready
- Daily 8pm: Receive GitHub issue notification for daily check-in
- Reply with meal details from phone/web
- View plans anytime at: https://ssimhan.github.io/meal-planner/

# Sandhya notes
This section is for ideas that I want to add quickly

## Priority Order (Agreed 2025-12-30)

### 🎯 Priority 1: Weekly Plan Visual Hierarchy ✅ COMPLETE
**Completed:** 2025-12-30

**What we built:**
Compact, card-based mobile-first design inspired by modern meal planning apps, adapted to Solarpunk aesthetic.

**Design Changes:**
- **Clean white card backgrounds** instead of colored gradients - dramatically improves scannability
- **Thin 4px colored left borders** for subtle color coding:
  - 🥪 Lunch: Warm gold (`--accent-gold`)
  - 🍎 Snack: Sage green (`--accent-sage`)
  - 🍽️ Dinner: Terracotta (`--accent-terracotta`)
  - ☀️/🌙 Prep: Deep green (`--accent-green`)
- **Compact spacing:** 20px margins (24px on mobile) instead of 40-50px for denser information display
- **Small uppercase headers:** 0.7rem (0.75rem on mobile) muted gray labels - LUNCH, SNACK, DINNER, AM PREP, PM PREP
- **Minimal shadows:** Subtle 1px shadows for depth without bulk
- **Smaller text hierarchy:** 0.75rem for secondary info (vegetables, prep notes, evening assembly)
- **Integrated emoji icons:** 1em size, part of compact headers for quick visual scanning

**What we kept (user preferences):**
- ✅ Warm Solarpunk color palette (gold, sage, terracotta, green)
- ✅ Current fonts (Space Mono for headers, Outfit for body, Crimson Pro for titles)
- ✅ Emoji icons for meal types
- ✅ All existing functionality and content structure

**Files modified:**
- [templates/weekly-plan-template.html](templates/weekly-plan-template.html) - Complete redesign to compact card layout
- [test-compact-design.html](test-compact-design.html) - Full preview with all meal types

**Impact:**
- Can now see 3-4 meal sections on one mobile screen (vs 1-2 before)
- Instantly scannable - white cards with thin color accents create clear visual hierarchy
- Maintains warm, organic Solarpunk feel while achieving modern app-like usability
- Perfect for quick kitchen glances: "What's for dinner tonight?" is immediately visible

**Next regeneration:** The updated template will be used automatically when the next weekly plan is generated via `./mealplan next` workflow.

### 🎯 Priority 2: Landing Page Workflow Status ✅ COMPLETE
**Completed:** 2025-12-30

**What we built:**
Compact status badge display showing workflow state for current and next week on the landing page.

**Implementation:**
- **Status detection** - Added `get_workflow_status()` function to [generate_landing_page.py](scripts/generate_landing_page.py)
  - Reads input files from `inputs/` directory
  - Detects current vs next week based on Monday date
  - Determines workflow state: `plan_complete`, `awaiting_veggies`, `ready_to_generate`, or `new_week`
- **Compact badges (Option 1)** - User-selected design without capital letters:
  - ✓ `plan active` (green badge) - Plan is complete and ready to use
  - ⏳ `awaiting veggies` (gold badge) - Farmers market vegetables need confirmation
  - → `ready to generate` (terracotta badge) - Ready to run meal plan generation
- **Clear action prompts** - Shows "Action needed:" text when user input is required
- **Template updates** - Added badge styles and placeholders to [landing-page-template.html](templates/landing-page-template.html)

**Files modified:**
- [scripts/generate_landing_page.py](scripts/generate_landing_page.py) - Added workflow state detection
- [templates/landing-page-template.html](templates/landing-page-template.html) - Added badge styles and status sections

**Live at:** https://ssimhan.github.io/meal-planner/

**Example display:**
```
Meal Planning Status

📅 Dec 29 - Jan 4, 2025
✓ plan active

📅 Jan 6 - 12, 2025
⏳ awaiting veggies
Action needed: Review and confirm farmers market vegetables
```

### 🎯 Priority 3: Landing Page Quick Actions (Combine with Priority 2)
- Current quick actions are generic (Past Plans, GitHub, Daily Check-in)
- Should map to the meal planning process stages:
  - "Review This Week's PR" (if PR is open)
  - "Confirm Veggies for Next Week" (if input file needs editing)
  - "Today's Check-in" (if issue is open)
  - "View Shopping List" (link to Groceries tab of current plan)
  - "Past Meal Plans" (archive)
- Make actions contextual to current state - only show relevant next steps

## Configuration Changes ✅
- ✅ Weekly planning trigger: Changed from Sunday 8am PST to **Saturday 5am PST**
- ✅ Removed: Print-friendly grocery list (not needed)
- ✅ Removed: Previous/Next navigation buttons (not needed)
- ✅ Changed Task 2 to: Archive organization by year/month