# Meal Planner Implementation Guide

**Last Updated:** 2025-12-30
**Live Site:** https://ssimhan.github.io/meal-planner/

## Status Overview

| Phase | Status | Description |
|-------|--------|-------------|
| **Phases 1-4: Core Automation** | ✅ Complete | GitHub Pages, Weekly Planning, Daily Check-ins, Inventory |
| **Phase 5: UI Polish** | ✅ Complete | Landing page, mobile optimization, archive organization |
| **Phase 6: Learning & Adaptation** | 💡 Future | Analytics, recipe scoring (optional) |

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

## Phase 5: UI Polish - Completed Work ✅

### Priority 1: Weekly Plan Visual Hierarchy (2025-12-30)
**Compact, mobile-first meal plan design**
- White card backgrounds with 4px colored left borders (lunch/snack/dinner/prep)
- Compact 20px spacing - see 3-4 sections per mobile screen
- Small uppercase headers for quick scanning
- Files: [weekly-plan-template.html](templates/weekly-plan-template.html)

### Priority 2: Landing Page Workflow Status (2025-12-30)
**Status badges removed from landing page for simplicity**
- Quick actions are contextual and workflow-aware (sufficient status indication)
- Files: [landing-page-template.html](templates/landing-page-template.html), [generate_landing_page.py](scripts/generate_landing_page.py)

### Priority 3: Landing Page Quick Actions (2025-12-30)
**Context-aware action buttons**
- Priority 1: "📝 Review Farmers Market Veggies" or "🚀 Generate Next Week's Plan"
- Priority 2: "🛒 View Shopping List" (current week)
- Always available: Daily Check-in, Past Plans, GitHub
- Files: [generate_landing_page.py](scripts/generate_landing_page.py:216-287)

### Priority 4: Lunch Selection Intelligence (2025-12-30)
**Expanded lunch variety from 5 to 109 recipes**
- Changed filter from explicit `lunch_suitable` flag to `meal_type` (sandwich, salad, grain_bowl, tacos_wraps, soup_stew, pasta_noodles, appetizer)
- Made ingredient reuse optional (bonus points, not required)
- Adult lunches default to leftovers (Tue-Fri), kids get rotating defaults
- Files: [lunch_selector.py](scripts/lunch_selector.py)

### Task 2: Archive Page Organization (2025-12-30)
**Past plans grouped by month with collapsible sections**
- Plans organized by year/month (e.g., "January 2026", "December 2025")
- Collapsible `<details>` sections with rotating arrow animation
- Newest months first, weeks sorted within each month
- Files: [generate_landing_page.py](scripts/generate_landing_page.py:157-213), [landing-page-template.html](templates/landing-page-template.html:340-348)

---

## Core Automation (Phases 1-4)

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

## Future Ideas 💡

### Phase 6: Learning & Adaptation (Optional)
- Meal success scoring from daily log keywords
- Freezer backup intelligence (track most-used backups)
- Recipe frequency optimization

### Other Possibilities
- Dynamic meal plan updates (show planned vs. actual)
- Email/SMS notifications (instead of GitHub issues)
- Mobile app wrapper
- Recipe rating system in UI
- Grocery delivery integration

---

## Quick Start

**First-time setup:**
1. Enable GitHub Pages in repository settings (deploy from gh-pages branch)
2. Manually trigger workflows from Actions tab to test
3. Let scheduled workflows run automatically

**Ongoing use:**
- **Saturday 5am:** Review weekly planning PR, edit vegetables, merge
- **Daily 8pm:** Respond to daily check-in issue with meal details
- **Anytime:** View plans at https://ssimhan.github.io/meal-planner/

---

## Cost & Resources

**GitHub Actions:** ~48 mins/month (well within 2,000 min/month free tier)
- Weekly planning: ~5 mins
- Daily check-ins: ~7 mins/week
- Deployment: ~1 min/push

**Storage:** Minimal (~1MB for plans, data, and history)
