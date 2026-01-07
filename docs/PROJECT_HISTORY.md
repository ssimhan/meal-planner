# Meal Planner Project History

**Project Goal:** Build an automated meal planning system that respects energy levels throughout the week, protects evening family time, and integrates farmers market shopping.

**Target Audience:** Busy parents who want nutritious home-cooked meals without cooking stress interfering with bedtime routines.

## Core Philosophy

See [README.md](README.md#design-philosophy) for the complete design philosophy and meta-goals.

## Project Structure Decisions

### Why YAML + Markdown + HTML Instead of an App?

**Decision:** Store recipes in YAML, generate meal plans as HTML files, track history in YAML.

**Rationale:**
- **Plain text = version control friendly:** All data lives in Git, easy to track changes
- **No database overhead:** YAML files are human-readable and easy to edit manually
- **Portable:** Just files in a folder - no server, no dependencies, no login
- **HTML output:** Beautiful, printable meal plans that work offline
- **Future-proof:** Plain text will always be accessible, unlike proprietary app formats

**What I learned:** Sometimes the simplest solution (files in folders) beats a complex app.

### File Organization

```
meal-planner/
├── recipes/
│   ├── index.yml          # Recipe database with tags
│   └── taxonomy.yml       # Valid categories and tags
├── inputs/
│   └── YYYY-MM-DD.yml     # Weekly constraints (schedule, farmers market)
├── plans/
│   └── YYYY-MM-DD-weekly-plan.html  # Generated meal plans
├── data/
│   └── history.yml        # Past meal plans for anti-repetition
├── scripts/
│   └── workflow.py        # Automation scripts
└── templates/
    └── weekly-plan-template.html    # HTML template for plans
```

**Decision:** Separate concerns into clear folders.

**What I learned:** Good file organization makes it easy to find things later. Future you will thank present you.

## Key Design Decisions

### 1. Energy-Based Prep Model

**The Problem:** Traditional meal plans assume you have equal energy every day. You don't.

**The Solution:**
- **Monday PM:** Start prep work (chop vegetables for Mon/Tue/Wed dinners, batch cooking)
- **Tuesday AM + PM:** Continue prep (chop Thu/Fri vegetables, prep lunch components)
- **Wednesday PM:** Finish remaining prep (verify all Thu/Fri components ready)
- **Thursday Morning:** Light prep allowed 8-9am only, NO chopping after noon, NO evening prep
- **Friday:** STRICT no-prep day - NO chopping at any time, only reheating/assembly

**What I learned:** Design systems around human energy patterns, not idealized schedules.

### 2. Evening Protection (5-9pm Sacred Time)

**The Problem:** Dinner prep bleeding into bedtime routines creates chaos and stress.

**The Solution:**
- Every dinner plan includes "Evening assembly (5-9pm)" section
- Only permitted actions: reheating, simple assembly
- No chopping, no active cooking, no multitasking
- Thursday/Friday dinners MUST be no-chop compatible

**What I learned:** Constraints create freedom. Limiting evening tasks paradoxically reduces stress.

### 3. Freezer Backup Strategy

**The Problem:** Even the best plans fail when life happens (sick kid, unexpected work crisis, pure exhaustion).

**The Solution:**
- Maintain 3 complete backup meals in freezer at all times
- When making dal, curry, or soup → make 2x batch, freeze half
- Backup meals must reheat in <15 minutes
- Track backup inventory in weekly plan overview

**What I learned:** Build failure modes into the system. The best plan includes "what if this doesn't work?"

### 4. Anti-Repetition Rules
- Track 3+ weeks in `history.yml`
- No recipe repeats within 3 weeks, no template repeats within same week
- **Learning:** Simple data structures enable complex logic

### 5. Recipe Tagging System
- Rich metadata in `recipes/index.yml` (effort_level, main_veg, avoid_contains, template)
- Key fields enable constraint satisfaction (no-chop, dietary restrictions, farmers market vegetables)
- **Learning:** Good metadata is the foundation of automation - tag once, query forever

### 6. Farmers Market Integration
- Input file tracks `confirmed_veg` from Sunday shopping
- Meal algorithm prioritizes recipes using those vegetables
- **Learning:** Systems should support existing habits, not replace them

### 7. Lunch Strategy: Repeatability > Variety
- Repeatable defaults (PBJ, egg sandwich, ravioli, quesadillas)
- Adult lunches default to leftovers
- **Learning:** Kids don't want variety - they want familiar foods

### 8. One Snack Per Day (Not Three)
- ONE snack per day (reuse ingredients from meals)
- Heavy snack for late class days (fruit + protein/fat)
- **Learning:** More options ≠ better - one good option beats four mediocre ones

### 9. Solarpunk Design Aesthetic
- HTML template with earth-tone palette, tabbed interface, print-friendly design
- **Learning:** Make tools delightful to use - good design reduces friction

## Technical Decisions

- **Python automation:** Easy to modify, excellent YAML support, no compilation
- **Claude Code for planning:** Handles complex constraint satisfaction, natural language reasoning
- **CLAUDE.md operating manual:** Documents AI behavior, makes system predictable and adaptable
- **Learning:** AI excels at constraint satisfaction - use it for the hard parts

## Development Timeline: How It Was Built

This section documents the chronological journey from concept to working system, with git commit references for each major phase.

---

### Phase 0-1: Scaffolding & Recipe Parsing
**Commit:** `c4aa6f8`

**Problem:** 234 HTML recipe files needed structured data extraction
**Solution:** Built parser using schema.org microdata to auto-extract ingredients, categorize templates/effort levels
**Learning:** Start with the data format you already have - building a parser beats manual entry

---

### Phase 2: CLI Intake + Farmers Market Integration
**Commit:** `4952578`

**Problem:** Farmers markets are unpredictable - planning before shopping causes mismatches
**Solution:** Two-step workflow (propose vegetables → shop → confirm → generate plan)
**Learning:** Design workflows around real-world constraints, not ideal scenarios

---

### Phase 3: Meal Plan Generation & Validation
**Commit:** `b319a46`

**Problem:** Complex constraint satisfaction (anti-repetition + dietary + scheduling + energy)
**Solution:** Algorithm with 3-week lookback, template filtering, busy-day no-chop matching, validation script
**Learning:** Validation scripts are like spell-check for automation - catch mistakes before you see them

---

### Phase 4: Template Classification Overhaul
**Commits:** `8cdb627`, `c118137`

**Problem:** Only 114/234 recipes (49%) classified - 120 "unknown" made variety impossible
**Solution:** Separated cuisine from meal_type, added 8 new categories, expanded keywords, manual classification
**Result:** 0 unknown recipes (100% classified)
**Learning:** Data quality determines system quality - fix your data model early

---

### Phase 5: CLI Workflow Improvements
**Commits:** `9332bb9`, `08ad54e`

**Problem:** Verbose commands hard to remember
**Solution:** Created `./mealplan` wrapper with numbered workflow (1-start, 2-update, 3-plan, 4-view, 5-latest)
**Learning:** Good UX removes friction - numbered commands = less to remember

---

### Phase 6: Streamlined Workflow with State Tracking
**Commit:** `20ea458`

**Problem:** Multiple commands to remember, unclear what to do next
**Solution:** `./mealplan next` - single command with state tracking (proposed → confirmed → complete)
**Result:** 5 commands → 1 command that knows what to do
**Learning:** State machines = "remember where you left off" - computers excel at this

---

### Phase 7: Energy-Based Prep Model ⚡ CRITICAL PIVOT
**Commit:** `43b0ded`

**Crisis:** After 3 weeks, cooking every night created stress - Thu/Fri became survival mode, evenings consumed by cooking
**Realization:** Energy depletes progressively throughout the week (traditional meal plans assume constant energy)
**Redesign:**
- Mon PM → Wed PM: Heavy prep (chop vegetables, batch cook, prep components)
- Thu: Morning-only prep (8-9am), NO chopping after noon
- Fri: STRICT no-prep day (zero chopping, only reheating)
- 5-9pm Evening Protection: Device-free time, minimal assembly only
- Freezer Backup: 3 complete meals (make 2x batch, freeze half)
**Impact:** Transformed from "ambitious but stressful" to "actually sustainable" - Thu/Fri restful, evenings protected
**Learning:** Design for worst day, not best day - the best plan includes failure modes

---

### Phase 8: HTML Plan Format with Solarpunk Design
**Commits:** `bc64c8c`, `72e3aae`, `aceb75a`

**Problem:** Markdown plans hard to scan - wall of text, no visual hierarchy
**Solution:** HTML with 9 tabs (Overview, Mon-Fri, Sat-Sun, Groceries), color-coded sections, Solarpunk aesthetic, responsive design
**Learning:** Make tools delightful - good design reduces friction and increases adoption

---

### Phase 9: Snack Simplification
**Commit:** `aceb75a`

**Problem:** 3-4 snacks per day = decision fatigue, most went unused
**Solution:** ONE snack per day reusing meal ingredients, heavy snacks for late class days (fruit + protein)
**Learning:** More options ≠ better - one good option beats four mediocre ones

---

### Phase 10: Weekend Tabs + Grocery Organization
**Commits:** `fa5dcfb`, `18affe9`

**Problem:** Weekdays vs weekends have different needs/mindsets
**Solution:** Added Saturday (rest day), Sunday (shopping), Groceries tabs - organized by aisle with quantities
**Learning:** Don't force structure where flexibility is the goal

---

### Phase 11: Prep Schedule Refinement
**Commits:** `216394f`, `506cd19`

**Problem:** Too much morning prep interfered with getting kids ready for school
**Solution:** Removed morning prep from Mon/Wed, kept Tue AM (light portioning only), Thu AM (8-9am light prep only)
**Learning:** Every prep session adds cognitive load - consolidate where possible

---

### Phase 12: Recipe Linking & HTML Recipe Cards
**Commit:** `6c8d0c3`

**Problem:** Had to search for recipes separately (5 steps: see name → copy → search → open → cook)
**Solution:** Clickable links to Solarpunk HTML recipe cards (2 steps: click → cook)
**Learning:** Links reduce mental load more than time saved suggests - zero cognitive friction

---

### Phase 13: Repository Cleanup & Documentation
**Commits:** `2a28162`, `418c44f`, `b57f384`, `39640a7`

**Work:** Removed old Markdown files, cleaned up duplicates, updated all 234 recipes to modern template
**Result:** Clean commit history, consistent templates, clear documentation

---

## Evolution Summary

1. **Manual Planning** → Spreadsheets, frequent repetition, chaotic evenings
2. **Recipe Database (Phases 0-4)** → 100% classified recipes, tags for constraints
3. **Automation (Phases 5-6)** → `./mealplan next`, end-to-end workflow
4. **Human-Centered Refinement (Phases 7-12)** → Energy-based prep, evening protection, Solarpunk design

**Key Insight:** Technical implementation (Phases 0-6) was necessary but insufficient. Human-centered refinement (Phases 7-12) made the system actually usable.

## Lessons for Non-Coders

1. **Start manual first** - Understand problem deeply before automating
2. **Write clear instructions** - CLAUDE.md = "how to do your job" manual
3. **Plain text > databases** - YAML is human-readable, version-controlled, future-proof
4. **Design for failure** - Freezer backups = escape hatch for imperfect adherence
5. **Constraints create freedom** - Limiting Thu/Fri to no-prep increases usability
6. **Iterate in public (Git)** - Track evolution, revert mistakes, learn from history
7. **Metadata is magic** - Tag once, query forever
8. **Let AI handle complex logic** - Constraint satisfaction is hard for humans, easy for AI

## Success Metrics

- Reduced evening stress (dinners don't interfere with bedtime)
- No "what's for dinner?" paralysis
- Farmers market vegetables actually used
- Meal variety without mental effort
- Friday no longer feels like survival mode

## Final Thoughts

**Systems should serve human needs, not idealized behavior.** The energy-based prep model works because it acknowledges energy depletion. The freezer backup works because it acknowledges plans fail.

The best tools are the ones you actually use. This system works because it reduces cognitive load, respects constraints (evening time, energy levels), and builds in flexibility.

---

---

## Session: 2025-12-30 (Continued) - Feature Planning & Implementation

**Work:** Implemented lunch prep recipe suggestions (lunch_selector.py, taxonomy updates, workflow integration)
**Result:** ✅ Complete - 109 lunch-suitable recipes, ingredient reuse, energy-based prep model
**Learning:** Documentation debt is real - complete half-done features before adding new ones

---

## Session: 2025-12-30 (Afternoon) - GitHub Actions Strategy

**Decision:** Use GitHub Actions instead of building web app (free, no servers, mobile-accessible via GitHub web UI)
**Plan:** 5 phases (GitHub Pages, Weekly Planning, Daily Check-ins, Inventory, Learning)
**Learning:** Explore infrastructure options before building - GitHub Actions perfect middle ground between CLI and web app

---

## Session: 2025-12-30 (Evening) - GitHub Actions Implementation

**Commits:** `09fa1f4`, `438f933`, `b48103d`, `984a725`, `8c741b5`

**Work Completed:**
- Phase 1: GitHub Pages deployment (`deploy-pages.yml`)
- Phase 2: Automated weekly planning (Saturday 5am PR → merge → auto-generate)
- Phase 3: Daily check-ins via GitHub Issues (8pm issue → comment → parse to `logs.yml`)
- Phase 4: Inventory automation (freezer backup tracking, smart farmers market suggestions)

**Game-Changer:** System now accessible from any device - no CLI required for weekly planning or daily logging

**Architectural Decisions:**
- GitHub Actions > web app (free, no servers, mobile-friendly)
- Track only freezer backups (not all ingredients) - simple, high-value
- CLI still works (incremental enhancement, not replacement)

**Learning:** Documentation drove development - IMPLEMENTATION.md with detailed workflows made implementation straightforward

---

---

## Session: 2025-12-30 (Late Evening) - GitHub Actions Permissions Fix

**Commits:** `3bb4c08`, `7c6ac3e`, `f19fbed`, `645903e`, `aef7979`

**Issue:** Workflows failed with 403 permission errors
**Root Cause:** GitHub Actions needs explicit permissions (contents: write, pull-requests: write) + PAT for PR-triggered workflows
**Solution:** Added permissions blocks, created Personal Access Token, documented in GITHUB_ACTIONS_SETUP.md
**Testing:** ✅ All workflows working end-to-end (weekly planning PR, daily check-ins, inventory tracking)
**Learning:** GitHub Actions security has two layers - workflow permissions AND token restrictions

---

## Session: 2025-12-30 (Final) - Beautiful Landing Page & Documentation Updates

**Commits:** `08f3011`, `b213745`, `80d7bed`

**Work Completed:**
- Solarpunk landing page (mobile-first, live data integration, collapsible sections)
- Weekly planning schedule changed (Saturday 5am instead of Sunday 8am)
- Priority clarification (removed print-friendly lists, clarified UI polish priorities)
- Complete documentation sync (IMPLEMENTATION.md, README.md, PROJECT_HISTORY.md)

**Architectural Insights:**
- Mobile-first design (primary use case: phone in kitchen/grocery store)
- Static HTML + dynamic data = fast, offline-capable, no backend
- Progressive enhancement (template ready for future features)

**Lessons:**
- Design systems create consistency (Solarpunk across all pages)
- Priorities evolve with usage (validate assumptions with real use)
- Small visual improvements have big impact (same data, delightful presentation)

**Next:** Priority 1 (Weekly Plan Visual Hierarchy), Priority 2 (Landing Page Intelligence), Priority 3 (Archive Organization)

---

## Session: 2026-01-01 - Phase 6 Planning (Execution Tracking)

**Commits:** `35099a3`, `eaa87a8`

**Work Completed:**
- Designed Phase 6: Execution Tracking system architecture
- Merged EXECUTION_TRACKING_IMPLEMENTATION.md into main IMPLEMENTATION.md
- Renamed phases: Phase 6 = Execution Tracking, Phase 7 = Learning & Adaptation
- Simplified design based on user feedback

**Key Design Decisions:**

1. **Single source of truth:** Use `history.yml` only - no separate execution files
   - Rationale: Minimize duplication, optimize LLM context usage, simpler data management
   - Learning: More files ≠ better organization - single file with clear structure beats multiple files

2. **Minimal required fields:** `made` (yes/no/freezer) + `vegetables_used` only
   - Removed: prep time tracking, energy levels, lunch tracking
   - Rationale: Focus on high-value data (actual execution, vegetable consumption, kids preferences)
   - Learning: Start simple, expand only if needed - avoid premature complexity

3. **Vegetable tracking per dinner:** Track actual vegetables used each night
   - Rationale: Enables waste reduction, family consumption analysis, fridge inventory management
   - Use case: "We buy cucumbers every week but only use them 20% of the time"

4. **Freezer inventory management:** Track additions (2x batches) and usage
   - Auto-update when logging: made_2x_for_freezer adds meal, freezer_used removes meal
   - Goal: Maintain 3 backup meals at all times
   - Learning: Automation works best when it's invisible - track state changes automatically

5. **Kids preferences tracking:** Two-part system
   - Quick feedback: Multiple choice (Loved it ❤️ / Liked it 👍 / Neutral 😐 / Didn't like 👎 / Refused ❌)
   - Dislikes accumulation: Optional complaints field → persistent kids_dislikes list
   - Learning: Track both favorites (what to repeat) and dislikes (what to avoid)

6. **Phased implementation:** Build → Test → Automate
   - Phase 6.1: CLI logging script (`log_execution.py`)
   - Phase 6.2: Manual testing for 3-5 days
   - Phase 6.3: GitHub Actions integration (structured forms)
   - Phase 6.4: Vegetable initialization from HTML Groceries tab
   - Learning: Test each component before integrating - validate assumptions early

7. **GitHub Actions evolution:** Structured forms instead of free text
   - Current: Free text parsing ("Dinner: quesadillas - kids loved it")
   - Planned: Checkboxes for vegetables, kids feedback, freezer meals
   - Rationale: Reduce parsing complexity, mobile-friendly interaction
   - Learning: Structured input > AI parsing - let users pick from lists when possible

8. **Fridge vegetables initialization:** Extract from HTML Groceries tab
   - Source: "Fresh Produce" section in weekly plan HTML
   - Updated: As vegetables used daily via execution logging
   - Use case: "What vegetables do I have left for Thursday/Friday?"

**Future Phase 7 (Analytics):**
- Depends on 4-8 weeks of Phase 6 data
- Insights: Recipe success rates, vegetable waste patterns, kids preferences, plan adherence trends
- Output: Markdown reports with recommendations (recipes to remove, vegetables to skip, favorites to increase)

**Architectural Insights:**
- Context efficiency matters: Single YAML file keeps token usage low for LLM workflows
- Default behaviors reduce friction: If not logged, assume "made as planned"
- State management via auto-calculation: `plan_adherence_pct` computed, not manual

**Status:** Phase 6.1 ready to implement - next session will build `log_execution.py`

**Learning:** Planning conversations with users reveal requirements better than spec documents - iterative design through Q&A uncovers edge cases and simplifications

---

## Session: 2026-01-01 (Continued) - Phase 6 Implementation (Execution Tracking)

**Work Completed:**
- **Phase 6.1 (Core Logging):** Implemented `scripts/log_execution.py` to handle meal logging, inventory updates, and adherence calculation.
- **Phase 6.2 (Simulation):** Verified system integrity by simulating a full week of logging (making 2x batches, using freezer backups, skipping meals).
- **Phase 6.3 (GitHub Actions):** Updated `daily-checkin-create.yml` to use structured checkboxes and `scripts/parse_daily_log.py` to invoke the logging script.
- **Phase 6.4 (Veg Init):** Created `scripts/init_week_vegetables.py` to auto-populate fridge inventory from the weekly plan.

**Technical Decisions:**
- **Structured Inputs:** Switched from free-text parsing to GitHub Issue checkboxes.
    - *Why:* Higher reliability, better mobile UX (tap to select), effortless data entry.
- **Inventory as Queue:** Freezer inventory logic treats adding/removing as simple list operations, simplifying the mental model.
- **Integration:** Hooked vegetable initialization into the `Generate Meal Plan` workflow so it happens automatically when a plan is merged.

**Validation:**
- Simulated end-to-end flow: `Weekly Plan` -> `Init Veggies` -> `Daily Log` -> `History Update`.
- System correctly handles edge cases like "Made 2x for freezer" (adds to inventory) and "Used freezer backup" (removes from inventory).

**Status:** Phase 6 Complete. Ready for real-world usage.

---

## Session: 2026-01-01 (Continued) - Phase 7 Implementation (Analytics)

**Work Completed:**
- **Phase 7 (Analytics):** Implemented `scripts/analyze_trends.py` to generate markdown insight reports from history.
- **Metrics Tracked:**
    - Recipe Success Rate (Planned vs. Made)
    - Vegetable Consumption Frequency
    - Weekly Adherence Trends
    - Freezer Inventory Flux

**Status:** Initial framework complete. Script is ready to run once data accumulates.


### Note on Workflow (2026-01-01)
*This session and the implementation of Phases 6 & 7 were conducted using **Google Antigravity** (Advanced Agentic Coding), differentiating it from previous sessions using the standard Claude Code plugin.*

### Phase 8: Architecture & Robustness (2026-01-01)
**Goal:** Harden the system against data loss and errors.
- **Backups:** Added automated backups for `history.yml`.
- **Validation:** Implemented strict YAML validation in CI (`data-integrity.yml`).
- **Configuration:** Centralized settings into `config.yml`.
- **Maintenance:** Created `archive_history.py` to manage long-term data growth and implemented fuzzy matching for ingredient tracking.
- **Documentation:** Conducted and implemented a full architectural review.

---

## Session: 2026-01-01 (Final) - Live Development Setup

**Work Completed:**
- **Problem:** Static HTML is hard to iterate on - manually running `workflow.py` and refreshing the browser is slow.
- **Solution:** Created `scripts/dev.sh` using `nodemon` and `browser-sync`.
- **Result:** Changes to recipes, templates, or inputs automatically regenerate the plan and refresh the browser.
**Learning:** Real-time feedback loops are critical for developer (and user) happiness.

---

## Session: 2026-01-01 (Late Afternoon) - Logic & UI Refinements

**Commit:** `504` (Refined Week at a Glance, fixed Groceries tab, and persistent meal substitutions), `771` (Unify inventory tracking)

**Work Completed:**
- **Refined Week at a Glance**: Split lunch into distinct "Kids Lunch" and "Adult Lunch" columns. Added alternating row colors for better mobile readability.
- **Dynamic Grocery Generation**: Replaced placeholder grocery list with a real aggregator that scans selected dinner and lunch recipes for produce, dairy, grains, and canned goods.
- **Persistent Meal Substitutions**: Implemented "sticky" logic in `select_dinners`. If a meal is manually changed in `history.yml` (e.g., to a "Freezer Backup Meal"), the generator respects that choice and updates prep/grocery tasks accordingly.
- **Unified Inventory Tracking**: Moved inventory stock management to `data/inventory.yml` as the single source of truth. The Overview tab and `log_execution.py` now both sync with this file.
- **Data Sanitization**: Used `sed` to fix systematic misspellings ("tomatoe" -> "tomato", "potatoe" -> "potato") across 5,000+ lines of `recipes/index.yml`.
- **Prep Schedule Balancing**: Redistributed prep load: Monday handles Mon-Tue, Tuesday handles Wed-Fri, Wednesday serves as a backup/buffer day.

**Learning:**
- **Respect User Overrides**: Automation should be a starting point, not a cage. Allowing users to manually "pin" a freezer meal in history makes the tool feel collaborative rather than prescriptive.
- **Data Fragmentation is Technical Debt**: Having inventory tracked in two different YAML files created a "split brain" problem. Consolidating to one source of truth simplified both the planning logic and the UI generation.
- **Dumb Regex is Powerful**: Cleaning up thousands of lines of misspellings via `sed` was much faster and less error-prone than trying to build a complex Python cleanup script.

---

## Session: 2026-01-01 (Evening) - Recipe Measurement Standardization

**Work Completed:**
- **Problem:** 83 recipes (35%) had inconsistent or missing measurements for core ingredients (vegetables and grains), making grocery shopping difficult.
- **Solution:** Created automated audit and fix scripts to standardize measurements to store-bought quantities.
- **Tools Built:**
  - `scripts/audit_recipe_measurements_v2.py` - Comprehensive audit script to identify measurement issues
  - `scripts/fix_recipe_measurements.py` - Automated fix script for common patterns
  - `scripts/interactive_recipe_fixer.py` - Interactive CLI for rapid manual fixes
- **Results:**
  - Fixed 171 recipe HTML files automatically
  - Reduced issues from 83 recipes (35%) to 22 recipes (9.4%)
  - Remaining 22 are acceptable edge cases (optional ingredients, canned goods with measurements, suggestions)
  - Standardized to store-bought quantities (e.g., "1 medium onion" instead of "1 cup diced onion")

**Technical Decisions:**
1. **Store-bought quantities over recipe-specific:** "1 medium onion" is more useful for shopping than "1 cup diced onion"
2. **Automated fixes for common patterns:** Missing spaces (`1onion` → `1 medium onion`) and size descriptors
3. **Interactive CLI for edge cases:** Rapid feedback loop for recipes needing manual review
4. **BeautifulSoup for HTML editing:** Preserved HTML structure while updating ingredient text

**Measurement Standards Established:**
- Vegetables: Use size descriptors (small/medium/large) or counts (e.g., "2 medium tomatoes")
- Canned goods: Include size (e.g., "1 (15 oz) can black beans")
- Herbs: Use volume for chopped (e.g., "1/4 cup chopped cilantro")
- Spices/condiments: No measurement required (used to taste)

**Learning:**
- **Data quality compounds:** Good measurements make grocery lists accurate, which reduces food waste and shopping stress
- **Automation + human review:** Scripts handle 70% automatically, interactive CLI makes the remaining 30% fast
- **Edge cases are features:** Optional ingredients and suggestions don't need precise measurements - that's intentional flexibility
- **Standardization enables automation:** Consistent data format unlocks future features (auto-generated grocery lists, nutrition tracking)

**Status:** Recipe measurement standardization complete. All 234 recipes now have consistent, store-bought measurements for core ingredients.

---

## Session: 2026-01-01 (Late Night) - Smart Re-planning & Rollover

**Work Completed:**
- **Problem:** When life happens and meals get skipped (e.g., "Ate out"), the plan breaks. Meals are lost, and upcoming days are over-scheduled.
- **Solution:** Implemented `python3 scripts/workflow.py replan` which automatically:
  1. Detects skipped meals in `history.yml` (marked as `made: false`)
  2. Shifts skipped meals to the first available future day
  3. Moves "overflow" meals (recipes that no longer fit in the week) to a `rollover` list
  4. Automatically rebuilds the Weekly Plan HTML to reflect these changes
- **Integration:** Integrated into the Daily Check-in workflow (`daily-checkin-parse.yml`), so re-planning happens automatically every time you log a status update.

**Technical Details:**
- **Robust Rollover:** "Overflow" recipes are stored in `history.yml` under a `rollover` key.
- **Priority Scheduling:** When generating the *next* week's plan (`create_new_week`), the system checks for `rollover` items and prioritizes them above all other constraints.
- **Verification:** Simulated end-to-end flow where a skipped Monday meal pushed Wednesday's meal to Friday, knocking Friday's original meal into next week's rollover queue.

**Learning:**
- **Plans must be fluid:** A static plan that breaks on the first error is useless. A dynamic plan that heals itself is resilient.
- **Automated housekeeping:** Users shouldn't have to manually "move" meals. The system should infer intent from status updates ("I didn't make this" implies "I still need to make this").

**Status:** Smart Re-planning live. System now self-corrects based on execution reality.


---

## Session: 2026-01-01 (Night) - Grocery List Enhancements

**Work Completed:**
- **Problem:** Snack categorization was poor (all lumped under "Snacks"), and shelf-stable items like crackers/nut butters were hard to find in the list.
- **Solution:**
  - Implemented logic to split composite snacks (e.g., "Apple and peanut butter") into individual components.
  - Added categorical sorting for components (Apple -> Produce, Peanut Butter -> Shelf Stable).
  - Created a dedicated "Shelf Stable" section in the grocery list.
  - Removed the redundant "Snacks" category in favor of aisle-based organization.

**Decisions:**
- **Peanut Butter is Shelf Stable:** Explicitly categorized as shelf-stable, not a dairy variant/butter.
- **Section Naming:** Removed aisle numbers (e.g., "Aisle 3/4") from section headers to keep the design clean and store-agnostic.

**Status:** Complete. Grocery list now organized purely by aisle/category, significantly improving the shopping experience.

---

## Session: 2026-01-04 - Migration to Vercel (Hybrid App)

**Problem:** GitHub Pages is static and limits "updateability" (e.g., no live dashboard to edit inventory or trigger re-plans without manual commits or GitHub Action wait times).

**Decision: Move to Option 2 (Hybrid Serverless Python App on Vercel).**

**Rationale:**
- **Flexibility:** Vercel allows for dynamic server-side logic (Python Serverless Functions) alongside a modern React (Next.js) frontend.
- **Maintain Logic:** Porting 2,500+ lines of complex Python logic (`workflow.py`, `lunch_selector.py`) to TypeScript would be high-effort; keeping it in Python but running it in the cloud is the "sweet spot."
- **Data Persistence:** Using the GitHub API as a temporary database allows for a "GitOps" workflow while moving towards a true web app interface.
- **Cost:** $0/mo on Vercel Hobby tier.

**Backups Created:**
- Git Branch: `legacy-static-backup`
- Physical Folder: `_legacy_backup/`

**Status:** Implementation started. Next step is initializing the Next.js project and refactoring Python scripts into API endpoints.

---

## Session: 2026-01-04 (Continued) - Vercel Migration & Dashboard Implementation

**Work Completed:**

- **Backend Migration:** Refactored `workflow.py` and `generate_plan.py` to work as serverless functions.
    - Replaced `sys.exit()` with exception handling.
    - Implemented `github_helper.py` to persist data (history, plans, inventory) back to GitHub via API.
    - Created `/api` endpoints: `status`, `generate-plan`, `create-week`, `confirm-veg`, `inventory`.

- **Frontend Dashboard (Next.js):**
    - Built a modern, Solarpunk-themed dashboard using Tailwind CSS.
    - **Interactive Features:**
        - **Start New Week:** Initialize the next planning cycle with one click.
        - **Confirm Veg:** Input farmers market purchases directly from the UI.
        - **Generate Plan:** Trigger the Python engine and view the resulting HTML plan instantly.
        - **Quick Add Inventory:** Update freezer, pantry, and fridge stocks in real-time.
    - **Viewers:** Added `/recipes` and `/inventory` pages for easy browsing.

- **Deployment:**
    - Live on Vercel: `meal-planner-eta-seven.vercel.app`
    - configured `vercel.json` to route API requests to Python and frontend to Next.js.
    - Set up `GITHUB_TOKEN` for secure data persistence.

**Key Technical Decisions:**
1.  **GitOps Persistence:** Even though the app runs on Vercel, the "database" is still the YAML files in the GitHub repo. The app uses the GitHub API to commit changes back to itself, ensuring we never lose the benefits of version control.
2.  **Hybrid Architecture:** Interactive UI (Next.js) + Complex Logic (Python). We kept the proven meal planning algorithms in Python but wrapped them in a modern web UI.
3.  **Public Plan Serving:** Start storing generated HTML plans in `public/plans` so they are served directly by Vercel without needing a separate GitHub Pages build step.

**Status:** Migration Complete. The system is now a fully functional web app.

---

## Session: 2026-01-04 (Continued) - Daily Check-in & UI Feedback

**Work Completed:**

- **Backend API Expansion:**
    -   Implemented `/api/log-meal` endpoint for robust logging and inventory updates.
    -   Enhanced `/api/status` to serve "Today's Dinner" context.

- **Frontend Dashboard Evolution:**
    -   Built interactive "Daily Check-in" card on dashboard.
    -   Added "Kids Feedback" buttons (❤️, 👍, 😐, 👎, ❌) for one-tap preference tracking.

**Key Decisions:**
-   **Direct API Integration:** Moved execution tracking from GitHub Issues to Web UI for better UX, synchronously updating `history.yml` and `inventory.yml`.

**Status:** Phase 7 (UX Improvements) partially complete.

---

## Session: 2026-01-04 (Late) - Dashboard Overhaul & Intelligence

**Work Completed:**

- **Overhauled "Today" View**: Replaced the simple check-in with a comprehensive "Today's Schedule" featuring 5 distinct cards (School Snack, Kids Lunch, Adult Lunch, Home Snack, Dinner).
- **Prep Interface Timeline**: Integrated a dynamic task list that surfaces specific prep requirements (AM/PM) based on the day of the week, pulling from the core energy-based prep model.
- **Inventory "Brain Dump"**: Added a powerful text-parsing interface to the inventory page, allowing users to paste raw lists and bulk-add items to specialized storage categories.
- **Intelligence & Scoring**: 
    - Updated `scripts/analyze_trends.py` to calculate numerical "Success Scores" from emoji feedback.
    - Added support for JSON exports to enable real-time dashboard stats.
- **Unified Data API**: Refactored the `/api/status` endpoint to merge current plan inputs with historical data, providing a coherent view even before a week is "logged."

**Lessons:**
- **Context is king**: Seeing the *entire* day's schedule (not just dinner) reduces cognitive load for the family.
- **Actionable Analytics**: Translating emojis into scores creates a feedback loop that directly improves the quality of future automated plans.
- **Lowering Friction**: The "Brain Dump" tool transforms one of the most tedious tasks (inventory updates) into a 10-second activity.

---

## Session: 2026-01-04 (Emergency Fix) - Vercel Read-Only Filesystem

**Issue:** Dashboard crashed with "Failed to connect to the meal planner brain" (500 Internal Server Error).
**Root Cause:**
- Vercel servers run in UTC.
- When UTC time crosses into the next week (Monday), the `archive_expired_weeks()` function triggers.
- This function attempts to write to `inputs/*.yml` and `history.yml` to archive the old week.
- Vercel's filesystem is read-only at runtime, causing the API to crash.

**Fix:** Wrappped the archival logic in `api/index.py` with a `try...except` block.
- If writing fails (e.g., on Vercel), it logs a warning and proceeds without crashing.
- The dashboard remains functional even if archival cannot be performed automatically on the server.
- Users can still trigger proper archival by running the script locally and pushing to GitHub.

**Learning:** Serverless environments often have read-only filesystems. Side-effects (like file updates) should be handled via API calls (GitHub API) or skipped gracefully, not by direct file I/O.

---

## Session: 2026-01-04 (Phase 10) - Enhanced Feedback & Logging System

**Work Completed:**

- **Redesigned Feedback Flow for All Meals:**
    - Implemented a universal 3-step feedback system for School Snack, Kids Lunch, Adult Lunch, Home Snack, and Dinner
    - **Step 1:** Made or Not Made (✓/✗) binary choice
    - **Step 2a:** If Made → Preference emojis (❤️ 👍 😐 👎 ❌)
    - **Step 2b:** If Not Made → Text input for "What did you eat instead?"
    - **Data Storage:** New `daily_feedback` structure in `history.yml` at the day level

- **Sophisticated Dinner Logging:**
    - Multi-step flow when dinner plan not followed:
        - Step 1: Made as Planned vs. Did Not Make
        - Step 2: If not made → Choose: Freezer Meal / Ate Out / Something Else
        - Step 3a: Freezer Meal → Radio button selection from `freezer_inventory` with auto-removal of used meal
        - Step 3b: Ate Out → Simple confirmation (stores `made: 'outside_meal'`)
        - Step 3c: Something Else → Text input (stores in `actual_meal` field)
    - **State Management:** Multi-step React component with `showAlternatives`, `selectedAlternative`, `otherMealText`, `selectedFreezerMeal`

- **Backend Enhancements:**
    - Updated `/api/log-meal` to handle all new feedback fields (`school_snack_made`, `home_snack_made`, `kids_lunch_made`, `adult_lunch_made`)
    - Added freezer inventory auto-removal when `freezer_meal` is used
    - Modified `/api/status` to return feedback + made status for all meal types
    - Implemented `is_feedback_only` flag to allow logging snack/lunch feedback without dinner status

- **Frontend Components:**
    - `FeedbackButtons` component: Handles 3-step flow for snacks/lunches
    - `DinnerLogging` component: Sophisticated multi-step flow with freezer selection
    - Mobile-responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-5`)

**Technical Decisions:**

1. **Unified Feedback Pattern:** Same flow for all meal types (consistency reduces learning curve)
2. **Made Status First:** Binary choice before details (reduces decision fatigue)
3. **Freezer as Inventory:** Radio button selection from actual inventory (prevents typos, ensures data quality)
4. **Auto-removal:** Used freezer meals automatically removed from inventory (zero manual bookkeeping)
5. **Day-level Storage:** `daily_feedback.{day}.{meal_type}` structure (cleaner than per-meal objects)
6. **Validation Logic:** `is_feedback_only` flag allows snack/lunch logging without dinner requirement

**Data Structure Example:**
```yaml
week_of: "2026-01-05"
dinners:
  - day: mon
    recipe_id: dal_with_rice
    made: freezer_backup
    freezer_used:
      meal: "Pasta Sauce"
      frozen_date: "2026-01-02"
daily_feedback:
  mon:
    school_snack: "👍"
    school_snack_made: true
    home_snack: "Restaurant cookies"
    home_snack_made: false
    kids_lunch: "❤️"
    kids_lunch_made: true
    adult_lunch: "😐"
    adult_lunch_made: true
freezer_inventory:
  - meal: "Dal Tadka"
    frozen_date: "2025-12-28"
  # Pasta Sauce auto-removed after use
```

**UI/UX Improvements:**
- **Step Navigation:** Clear back buttons at each step
- **Visual States:** Different button colors for each option (green=made, terracotta=freezer, gold=outside)
- **Scrollable Inventory:** Freezer list has `max-h-32 overflow-y-auto` for long lists
- **Status Badges:** Dynamic badge updates (`✓ Made`, `🧊 Freezer`, `🍽️ Restaurant`, `✗ {actual_meal}`)

**Learning:**
- **Progressive Disclosure:** Multi-step flows reduce cognitive load (show only relevant options at each stage)
- **Data Quality via UI:** Radio buttons > text input for preventing typos and ensuring consistent data
- **Automation Delights:** Auto-removing used freezer meals feels like magic (system "remembers" for you)
- **Mobile-First Matters:** Vertical stacking on mobile is critical (most logging happens on phone in kitchen)

**Status:** Phase 10 logging system complete. Only remaining item: Full Week View page.

### [2026-01-04] Smart Personalization & Snack Intelligence
- **Goal:** Implement specific kid profiles (allergies/preferences) and context-aware snack logic.
- **Changes:**
  - Updated `config.yml` with `kid_profiles` (Akira/Anya).
  - Refactored `lunch_selector.py` to resolve profile conflicts (e.g. flagging nuts for Anya).
  - Updated `workflow.py` to render personalized lunch details and School vs. Home snack sections.
  - Implemented automatic nut substitution (Sunbutter/Seeds) for School Snacks.
- **Outcome:** System now safely handles Anya's nut restriction for school meals while allowing nuts at home.

## Session: 2026-01-05 - Week View UX & Vercel Issues

**Work Completed:**
- **Problem:** "Week at a Glance" meal editing was cramped on mobile with inline inputs.
- **Solution:** Implemented "Selection & Dedicated Edit Queue" model (Option 1).
    - **Batch Selection:** "Mark for Fix" mode with checkboxes.
    - **Edit Queue:** Dedicated full-screen view for processing corrections one by one.
    - **Visuals:** Floating action bar, clear "Fix Now" calls to action.
- **Deployment Issue:** Vercel builds stopped triggering.
    - **Diagnosis:** Hit Vercel daily build rate limit.
    - **Workaround:** Configured local development environment (`npm run dev` + `python3 api/index.py`) to bypass Vercel for testing.

**Status:** Week View UX complete and verified locally. Waiting for Vercel rate limit to reset (approx 15h) for production deployment.

### [2026-01-04] Leftover Optimizer (Planned Pipelines)
- **Goal:** Transform adult-only leftovers into intentional "Planned Pipelines" for the whole family.
- **Changes:**
  - Added `leftover_potential: high` and `kid_favorite: true` metadata to key recipes in `index.yml`.
  - Refactored `lunch_selector.py` to detect these flags and plan family-wide leftover lunches.
  - Linked Overview batch-cooking suggestions to specific planned pipelines.
  - Added dynamic "Pack leftovers" tasks to previous evening prep lists in `workflow.py`.
- **Outcome:** More efficient cooking by doubling high-value meals, reducing decision fatigue for kid lunches.

### [2026-01-04] Smart Re-plan Refinement
- **Goal:** Improve the mid-week re-plan experience by auto-refreshing lunches and syncing all data sources.
- **Changes:**
  - Integrated `LunchSelector` into the `replan` command flow to auto-refresh leftover pipelines when dinner shifts.
  - Added synchronization of `inputs/{date}.yml` during re-plan to keep the dashboard in sync.
  - Added a visual notice in the HTML plan indicating when the plan was last re-planned.
- **Outcome:** Re-planning no longer breaks lunch pipelines and provides clear visual feedback to the user.

### [2026-01-04] Phase 11: Recipe Importer
- **Goal:** Enable users to import recipes from URLs without manual HTML editing.
- **Implementation:**
  - Created `scripts/import_recipe.py` to fetch, parse, and auto-add recipes from URLs.
  - Enhanced `scripts/parse_recipes.py` with:
    - Fallback HTML parsing for non-schema.org recipes (class-based selectors).
    - Metadata preservation logic to retain manual fields like `leftover_potential` and `kid_favorite` across re-parses.
  - Added `/api/recipes/import` endpoint for web UI integration.
  - Verified that re-running the parser preserves all manually added metadata.
- **Outcome:** Users can now paste a recipe URL and have it automatically added to the index without losing custom metadata.

### [2026-01-04] Enhanced Full Week View
- **Goal:** Improve week-at-a-glance visibility with better visual hierarchy and execution tracking.
- **Implementation:**
  - Enhanced `/week-view` page with comprehensive improvements:
    - **Desktop Table**: Added alternating row colors, "Today" column highlighting (green background), emoji feedback badges
    - **Mobile Cards**: Improved card layout with better spacing, today indicator, and section dividers
    - **Data Display**: Shows vegetables per dinner, lunch assembly notes, logged feedback status
    - **Energy-Based Prep**: Added visual schedule cards showing Mon/Tue/Wed prep requirements with color-coded borders
    - **Freezer Status**: Display freezer inventory with frozen dates at bottom of page
    - **Navigation**: Direct "View Full Plan" button linking to HTML plan when available
  - Integrated with WorkflowStatus API to show real-time feedback and execution data
  - Added helper function `getFeedbackBadge()` to display emoji feedback consistently
- **Technical Decisions:**
  1. **Color coding by meal type**: Each row has distinct icon (🍽️ 🥪 ☕ 🎒 🏠) for quick scanning
  2. **Today highlighting**: Green background on current day column makes it immediately visible
  3. **Responsive alternating rows**: Even/odd coloring on desktop, clean sections on mobile
  4. **Feedback integration**: Shows logged emojis (❤️ 👍 😐 👎 ❌) and skip status (✗) inline
  5. **Energy schedule emphasis**: Color-coded prep cards (sage/gold/terracotta) with critical Thu/Fri warning
- **Learning:**
  - Visual hierarchy reduces cognitive load - color coding by meal type makes scanning instant
  - Real-time feedback display creates accountability - seeing the week's progress motivates completion
  - Energy-based prep reminder reinforces the core workflow - visible schedule keeps users on track
- **Status:** Phase 10 (UX Polish) fully complete. Ready for Phase 11 advanced features.

### [2026-01-04] Energy-Based Prep Schedule Documentation
- **Goal:** Document specific prep tasks for each prep slot to improve planning clarity.
- **Implementation:**
  - Added detailed "Energy-Based Prep Schedule" section to IMPLEMENTATION.md under Planning Logic
  - Documented specific tasks for each prep window:
    - **Monday PM**: Vegetable chopping for Mon/Tue/Wed, batch cooking, freezer prep
    - **Tuesday AM**: Lunch assembly for Wed/Thu/Fri, eggs, snack portioning
    - **Tuesday PM**: Thu/Fri vegetable chopping, remaining lunch prep, marinades
    - **Wednesday PM**: Final push to complete all remaining prep
    - **Thursday AM**: Light assembly only (8-9am), strict no-chopping after noon
    - **Friday**: Zero prep - only reheating/assembly
  - Added to Phase 11 backlog: Prep Completion Tracking feature
    - Track completed prep tasks during daily check-in
    - Refresh remaining suggestions based on what's done
    - Dynamic adjustment to avoid duplicate suggestions
- **Learning:**
  - Documentation serves dual purpose: guides AI planning and provides user reference
  - Specific task lists reduce ambiguity and improve execution consistency
  - Backlog items capture good ideas without derailing current work
- **Status:** Documentation complete. Prep tracking feature added to Phase 11 backlog.

### [2026-01-04] Prep Completion Tracking Implementation
- **Goal:** Enable users to track completed prep tasks with interactive checkboxes and smart filtering.
- **Implementation:**
  - **Backend (Python):**
    - Created `generate_granular_prep_tasks()` in workflow.py to generate ingredient-level tasks
    - Added `fuzzy_match_prep_task()` with 60% keyword overlap detection for smart filtering
    - Updated `generate_prep_section()` to accept week history and filter completed tasks
    - Enhanced `/api/status` to generate granular prep tasks and return completed tasks
    - Modified `/api/log-meal` to accept `prep_completed` array and store in `daily_feedback`
  - **Frontend (Next.js/React):**
    - Added interactive checkboxes to Prep Interface card on dashboard
    - Implemented `togglePrepTask()` for real-time task completion and backend sync
    - Added visual feedback (strikethrough, muted color) for completed tasks
    - Integrated checkbox state initialization from backend on page load
    - Added AM/PM time labels for Tuesday tasks
  - **Data Structure:**
    - Tasks stored in `history.yml` under `daily_feedback.{day}.prep_completed` as array of strings
    - Example: `["Chop carrots for Monday curry", "Prep rice for Monday lunch"]`
- **Technical Decisions:**
  1. **Granular tasks over generic**: "Chop carrots for Monday curry" instead of "Chop vegetables for Mon/Tue"
  2. **Fuzzy matching for intelligence**: Detects similar completed tasks to avoid duplication
  3. **Real-time sync**: Checkbox clicks save immediately to backend via `/api/log-meal`
  4. **Persistent state**: Frontend loads completed tasks from API on page load
  5. **Day-level storage**: Prep tasks stored at day level in `daily_feedback` for consistency
- **Challenges & Fixes:**
  - **Issue 1**: Duplicate Path import caused API 500 error → Removed nested import
  - **Issue 2**: UTC timezone showed Monday when it's Sunday in California → Added pytz for Pacific time
  - **Issue 3**: Checkboxes didn't stay checked → Added completed_prep to API response and initialized frontend state
  - **Issue 4**: Missing pytz module on Vercel → Added pytz==2024.1 to requirements.txt
- **Learning:**
  - Granular tasks provide better tracking and accountability than generic categories
  - Fuzzy matching creates intelligent automation without exact string matching requirements
  - Timezone handling is critical for serverless apps (Vercel uses UTC, users expect local time)
  - Persistent state requires both backend storage AND frontend initialization
- **Status:** Prep Completion Tracking fully implemented and deployed. Users can now check off tasks and see them persist across sessions.

---

## Session: 2026-01-04 (Late Night) - Vercel Read-Only Filesystem Fix (Create Week)

**Issue:** `/api/create-week` endpoint crashed with `[Errno 30] Read-only file system: 'inputs/2026-01-05.yml'` on Vercel deployment.

**Root Cause:**
- The endpoint was calling `create_new_week()` which writes files locally before syncing to GitHub
- Vercel's serverless environment has a read-only filesystem at runtime
- Local file writes fail with OSError, causing the API to crash

**Fix:** Refactored `/api/create-week` to follow the same pattern as `/api/confirm-veg`:
1. Generate YAML content in memory (no local file writes)
2. Push directly to GitHub using `commit_file_to_github()` API
3. Gracefully handle OSError for local development compatibility (try/except block)
4. Return enhanced response with proposed vegetables and rollover count

**Technical Changes:**
- Inlined the logic from `create_new_week()` directly in the API endpoint
- Replaced `sync_changes_to_github()` with `commit_file_to_github()` for direct content push
- Added try/except around local file write (works locally, skips on Vercel)
- Enhanced response payload with `proposed_veg` and `rollover_count` for better UX

**Learning:**
- **Serverless constraints require different patterns:** Functions that work locally may fail in read-only environments
- **GitHub API as database:** Using `commit_file_to_github()` with in-memory content bypasses filesystem entirely
- **Graceful degradation:** Try local write for dev convenience, catch OSError for production compatibility
- **Consistency matters:** Following the same pattern as `confirm_veg` made the fix straightforward

**Status:** Create week endpoint now works on Vercel. Users can start new weeks directly from the web UI without filesystem errors.

## Session: 2026-01-04 (Final) - Vercel State Sync and GitHub-Aware Data Loading

**Issue:** Dashboard was showing stale data after "Start New Week" or "Confirm Veg" because Vercel was reading from its local (stale) filesystem instead of the updated GitHub repository.

**Root Cause:**
- Vercel's local filesystem is snapshotted at deployment and doesn't sync with the repository at runtime.
- API endpoints were using `Path.exists()` and `open()` on local paths, missing changes pushed to GitHub.

**Fix:**
1. **GitHub as Source of Truth:** Implemented `get_yaml_data` which fetches the latest files directly from GitHub using the API before falling back to local files.
2. **Synchronization to `/tmp`:** Synchronized critical files (`history.yml`, `inventory.yml`, `inputs/`) to the writable `/tmp` directory on Vercel to support existing script logic.
3. **Workflow Prioritization:** Updated `get_status` to scan for incomplete weeks (`status != 'plan_complete'`) rather than strictly following the calendar date.
4. **UX Improvements:** Refactored `fetchStatus` to support background syncing, allowing the dashboard to remain visible while data is refreshed.

**Technical Changes:**
- **`api/index.py`**: Added `get_yaml_data` and implemented it across all GET/POST endpoints.
- **`api/index.py`**: Added background syncing of key files to `/tmp` during the status check.
- **`src/app/page.tsx`**: Updated `handleCreateWeek` and `fetchStatus` to provide continuous feedback without full-page reloads.

**Status:** Complete state consistency achieved on Vercel. Actions taken in the UI are reflected immediately on the dashboard.

---
### [2026-01-04] Correction / Needs Fix Workflow Implementation
- **Goal:** Allow users to correct logged meals (e.g., "Skipped dinner" → actually "Ate pizza") and log missed specific feedback.
- **Implementation:**
  - **Frontend (page.tsx):**
    - Enhanced `FeedbackButtons` (Snacks/Lunch): Added "🔧 Fix / Edit Details" button for items already marked as "Made".
    - Enhanced `DinnerLogging` (Dinner): Added "🔧 Fix / Edit Actual Meal" button for confirmed dinners.
    - Implemented text input overlay for entering correction details.
    - Updated Feedback Badge display to show `✓ Made (Actual: [Meal Name])` for overrides.
  - **Backend (api/index.py):**
    - Leveraged existing `actual_meal` field for dinner corrections.
    - Leveraged existing `*_feedback` fields for snack/lunch corrections.
    - Verified logic correctly processes updates while preserving "Made" status.
- **Outcome:** Users can now maintain an accurate history even if they initially logged something incorrectly, or want to add context later. This improves data quality for future analytics.
- **Status:** Complete. Feature live on dashboard.

---
### [2026-01-04] Reversion to Stable Build (d8519bb)
- **Reason:** A bug fix session attempting to address UI/UX issues (skip button, week view opacity, inline needs-fix input, recipe links) introduced cascading JSX structure errors that repeatedly broke Vercel builds.
- **Root Cause:** During refactoring of the `DinnerLogging` component, the IIFE structure (opening fragment `<>`, return statement, and closing `})()}`) became corrupted, causing "Expected '</', got 'div'" parser errors.
- **Action:** Reverted to commit `d8519bb` ("fix: restore FeedbackButtons component definition to resolve build error") which was the last known stable, deployable state.
- **Commits Lost:**
  - `715d62a` - Bug fix attempt (skip logic, week view, recipe links)
  - `cabe650`, `65bb8ed`, `8a0705e`, `dc15774` - Various syntax fix attempts
  - `a03a1d3` - Title change to "Sandhya's Meal Planner"
- **Next Steps:** Carefully re-implement the desired features with proper testing before pushing.
- **Lesson Learned:** Complex JSX refactoring (especially IIFEs with component definitions) requires incremental changes and verification of each deployment.

---
### [2026-01-04] Incremental Bug Fixes & Feature Re-implementation
- **Goal:** Safe re-implementation of UI/UX improvements after build failure recovery.
- **Batches Implemented:**
  - **Batch 1:** Removed "Chickpea Salad Wrap" recipe index and HTML; renamed button from "✓ Made as Planned" to "✓ Made".
  - **Batch 2:** Fixed Week View opacity logic (only grayscale when actually logged AND not marked for fix); created dynamic recipe viewer at `/recipes/[id]`.
  - **Batch 3: Fix Dashboard "Skip" Workflow:**
    - **Problem:** Clicking "Did Not Make" (Skip) would trigger a status refresh, causing the `DinnerLogging` component (previously an IIFE) to lose its local state and immediately close the alternatives popup.
    - **Solution:** Lifted all dinner logging UI states (`showAlternatives`, `selectedAlternative`, `otherMealText`, `selectedFreezerMeal`, `isDinnerEditing`, `dinnerEditInput`) to the parent `Dashboard` component.
    - **Result:** The skipping workflow (Freezer backup, outside meal, other) is now robust across re-renders.
  - **Batch 4: Week View Correction Workflow & Recipe Requests:**
    - **Inline Corrections:** Implemented `CorrectionInput` in `WeekView` for both mobile (card view) and desktop (table view), allowing quick fixes for any meal marked "Needs Fix".
    - **Meal Display Priority:** Updated `WeekView` to prioritize displaying the `actual_meal` or feedback text over the planned recipe name when a correction exists, providing a more accurate historical record.
    - **Recipe Index Integration:** Added a confirmation flow when saving corrections that prompts to add the new meal as an official recipe.
    - **Backend Automation:** The `/api/log-meal` endpoint now appends recipe requests to a new "Recipe Index changes" section in `docs/IMPLEMENTATION.md`.
- **Technical Improvements:**
  - State lifting in `Dashboard` to manage complex multi-step logging flows.
  - Refactored `handleLogDay` and `handleLogFeedback` in `src/app/page.tsx` to handle `needs_fix` flags and `request_recipe` triggers.
  - Updated `src/lib/api.ts` with explicit `needs_fix` properties to maintain type safety across the full stack.
- **Status:** Complete. The system is now significantly more resilient and provides better data quality for both week-view tracking and future recipe planning.

---

## Session: 2026-01-05 (Morning) - Bug Fix: Dinner Corrections Not Saving

**Issue:** Week View "Mark for Fix" workflow successfully updated Tuesday kids lunch but failed to save Monday dinner corrections.

**Root Cause:**
- Line 295-298 in `api/index.py` incorrectly included `dinner_needs_fix is not None` in the `is_feedback_only` calculation
- When correcting a dinner, frontend sends `{actual_meal: "...", dinner_needs_fix: false}`
- This triggered `is_feedback_only=True`, which blocked line 378 (`if actual_meal: target_dinner['actual_meal'] = actual_meal`) from executing
- The `needs_fix` flag was cleared, but the actual meal correction was never saved

**Fix Applied:**
1. **Line 295-297**: Removed `dinner_needs_fix is not None or` from `is_feedback_only` calculation
   - Ensures dinner corrections don't incorrectly trigger feedback-only mode
2. **Line 323**: Updated condition to `if not is_feedback_only or dinner_needs_fix is not None or actual_meal:`
   - Properly finds dinner when `actual_meal` is sent
3. **Lines 379-384**: Moved dinner correction logic outside `if not is_feedback_only:` block
   - Critical fix: `actual_meal` and `dinner_needs_fix` updates now happen regardless of feedback mode

**Impact:**
- Dinner corrections (all days, not just Monday) now save correctly
- Snack/lunch corrections continue to work as before (no regression)
- User can now properly track when planned meals were substituted

**Technical Learning:**
- Conditional logic bugs can appear as silent failures (API returns success, but data doesn't update)
- `is_feedback_only` flag should only apply to meal types that allow feedback without "made" status
- Moving field updates outside conditional blocks ensures they execute when the data is present

**Status:** Fix deployed and verified. Dinner corrections now persist correctly in `history.yml`.

---

## Session: 2026-01-05 (Evening) - Inventory-Aware Replanning & Web UI Integration

**Work Completed:**

### Part 1: Core Inventory Scoring System
- **Problem:** Replanning redistributes meals chronologically without considering what ingredients are actually available, potentially scheduling recipes requiring ingredients you don't have.
- **Solution:** Enhanced `replan_meal_plan()` in [scripts/workflow.py](../scripts/workflow.py) with inventory-aware scoring.

**Implementation Details:**

1. **Helper Functions Added (Lines 519-728):**
   - `_normalize_ingredient_name()` - Normalizes ingredient names for consistent matching
     - Handles plurals (tomatoes → tomato), aliases (black_bean → bean), noise removal
     - Example: "sweet potatoes" → "sweet_potato", "Green beans" → "bean"
   - `_calculate_ingredient_freshness()` - Tracks ingredient age from `added` dates
     - Returns `{item_name: days_old}` for priority scoring
   - `_load_inventory_data()` - Loads and structures [data/inventory.yml](../data/inventory.yml)
     - Returns: `{fridge_items: set, pantry_items: set, freezer_backups: list, freshness: dict}`
   - `score_recipe_by_inventory()` - Main scoring algorithm (0-100 points)
     - **Weighted scoring:**
       - Fridge items: +20 points each (perishable priority)
       - Pantry items: +5 points each (stable items)
       - Freshness bonus: +10 for items 5+ days old
     - Returns: `(score, details)` with match breakdown

2. **Enhanced Replan Flow (Lines 809-850):**
   - Automatically loads inventory on every replan
   - Scores all `to_be_planned` recipes by inventory match
   - Sorts recipes by score (highest inventory match first)
   - **Freezer backup suggestion:** If best score < 30/100, suggests using freezer meals instead
   - Console output shows detailed scores: `recipe_name: 45/100 (fridge: tomato, pantry: bean)`
   - Graceful fallback: Uses original order if inventory empty/unavailable

**Technical Decisions:**
1. **Soft constraint approach:** Scoring reorders meals but doesn't exclude valid recipes
2. **Perishable priority:** Fridge items weighted 4x higher than pantry (20 vs 5 points)
3. **Freshness awareness:** Older items get bonus points to reduce waste
4. **Zero configuration:** Runs automatically every replan, no flags needed
5. **Preserves all constraints:** History anti-repetition, busy days, rollover priority, lunch re-sync all maintained

### Part 2: Web UI Integration
- **Problem:** Inventory-aware replanning only accessible via CLI (`python3 scripts/workflow.py replan`), requiring terminal access.
- **Solution:** Added "Replan with Inventory" button to Week at a Glance page for one-click access.

**Implementation Details:**

1. **Backend API Endpoint ([api/index.py:821-874](../api/index.py#L821-L874)):**
   - New `/api/replan` POST endpoint
   - Calls `scripts/workflow.py replan` as subprocess with 60s timeout
   - Returns inventory scoring output and success status
   - Auto-syncs to GitHub on Vercel deployments

2. **Frontend API Function ([src/lib/api.ts:194-206](../src/lib/api.ts#L194-L206)):**
   - `replan()` async function for calling backend
   - Handles errors and returns structured response

3. **UI Button ([src/app/week-view/page.tsx](../src/app/week-view/page.tsx)):**
   - "📦 Replan with Inventory" button in page header
   - Confirmation dialog before execution
   - Loading spinner during processing (`⟳ Replanning...`)
   - Success alert with output message
   - Auto-refreshes week view after completion
   - Responsive design (icon-only on mobile)

**User Flow:**
1. Navigate to Week at a Glance page
2. Click "📦 Replan with Inventory"
3. Confirm action in dialog
4. Backend scores recipes by inventory (2-5 seconds)
5. Success message shows results
6. Page refreshes with updated meal plan

**Example Output:**
```
Recipe inventory scores:
  • easy_zucchini_pasta_sauce: 5/100 (fridge: none, pantry: bean)
  • black_bean_quinoa_salad: 25/100 (fridge: tomato, pantry: bean)
  • freezer_meal: 0/100 (no matches)

⚠️ Low inventory match (best: 25/100).
💡 Available freezer backups: Black Bean Soup, Vegetable Curry, ...
Continuing with current recipes. Use freezer backups manually if preferred.
```

**Testing & Validation:**
- ✅ API endpoint tested via curl - successful execution
- ✅ Inventory scoring correctly detects fridge/pantry items
- ✅ Low-match detection triggers freezer backup suggestions
- ✅ Bean aliasing works (`black_bean` → `bean` for matching)
- ✅ Week plan regenerated with sorted meals
- ✅ Lunches auto-refreshed to maintain pipelines

**Technical Learning:**
- **Token efficiency:** Pure Python logic (no LLM calls) makes feature cost-free to run repeatedly
- **Soft constraints create flexibility:** Scoring reorders but doesn't break plans when inventory is sparse
- **Progressive enhancement:** CLI still works, web UI adds convenience layer
- **Ingredient normalization is critical:** "black beans" vs "beans" vs "black bean" must all match
- **Freshness tracking adds intelligence:** System naturally prioritizes using older items first

**Files Modified:**
- [scripts/workflow.py](../scripts/workflow.py) - Added 4 helpers + modified replan logic (~215 new lines)
- [api/index.py](../api/index.py) - Added `/api/replan` endpoint (~54 lines)
- [src/lib/api.ts](../src/lib/api.ts) - Added `replan()` function (~13 lines)
- [src/app/week-view/page.tsx](../src/app/week-view/page.tsx) - Added button + handler (~40 lines)

**Architectural Insights:**
- **Inventory as context, not constraint:** Low inventory scores don't block meals, just reorder them
- **Automation without magic:** Clear console output shows exactly how decisions were made
- **Mobile-first UX:** Button prioritizes icon on small screens, full text on desktop
- **Vercel subprocess pattern:** Python scripts callable via API while maintaining GitHub as database

**Status:** Inventory-aware replanning complete and deployed. System now optimizes remaining week's meals based on actual available ingredients with zero manual intervention.

**Next Steps (Future Enhancements):**
- Consider extending inventory scoring to initial weekly plan generation (not just replanning)
- Add configuration for scoring weights in `config.yml` (fridge vs pantry priority)
- Track "saved from waste" metrics (how often high-freshness items got used)

---

### Phase 11 Block 1: Performance Optimization (Backend)
**Date:** 2026-01-06

**Objective:** Reduce backend overhead, improve response times, and reduce token usage for meal generation.

**Problem:**
- Monolithic `recipes.json` was being fully parsed on every request and every script execution.
- Redundant loading in `workflow.py` and `lunch_selector.py`.
- No API caching meant every dashboard refresh hit the filesystem.

**Solution:**
1.  **Data Structure:** Split the >2MB `recipes.json` into ~227 individual YAML files in `recipes/details/`.
2.  **Workflow Optimization:** Refactored `workflow.py` to load the lightweight `recipes/index.yml` once and pass it to `LunchSelector`.
3.  **API Caching:** Implemented in-memory caching in `api/index.py` for recipes, inventory, and history (5-minute TTL, invalidation on write).
4.  **On-Demand Loading:** Added `GET /api/recipes/<id>` to fetch detailed instructions only when needed.

**Changes:**
- [recipes/details/*.yaml](../recipes/details/) - Created individual recipe files (Splitting monolithic JSON)
- [scripts/split_recipes.py](../scripts/split_recipes.py) - Migration script
- [scripts/workflow.py](../scripts/workflow.py) - Optimization to avoid double-loading
- [scripts/lunch_selector.py](../scripts/lunch_selector.py) - Updated to accept pre-loaded data
- [api/index.py](../api/index.py) - Added `CACHE` global, `get_cached_data`, and new endpoints (~60 lines)
- [tests/test_api_perf.py](../tests/test_api_perf.py) - Verification suite

**Status:** Completed and verified. API response times for repeated calls are instant (<10ms).

## Session: 2026-01-06 - Meal Swap Feature

**Work Completed:**
- **Phase 11 Block 2 (Meal Swap):** Implemented a drag-and-drop style meal checking feature to swap dinners between days.
    - **Backend:** Created `POST /api/swap-meals` endpoint that:
        1. Swaps dinner entries in `inputs/{week}.yml` and `history.yml`.
        2. Regenerates prep tasks using `generate_granular_prep_tasks` to ensure veggies are chopped on the correct days (e.g., chopping Monday's ingredients on Sunday/Monday).
        3. Persists changes to GitHub.
    - **Frontend:**
        - Added "Swap Mode" toggle to `WeekView`.
        - Implemented `SwapConfirmationModal` component.
        - Verified logic with manual test scripts.

**Technical Decisions:**
- **State-Based Swapping:** Used a simple 2-click selection model (click Day A, click Day B -> Confirm) instead of complex drag-and-drop libraries, which simplifies mobile interaction.
- **Dynamic Prep Regeneration:** Crucial logic step - simply swapping meals isn't enough; the *prep instructions* must also move (e.g., moving a Monday meal to Friday means you don't need to chop for it on Sunday anymore).

**Status:** Phase 11 Block 2 Complete.

### 2026-01-06: Phase 11 Block 4 - Inventory Intelligence

**Goal:** Help users effectively use up their inventory by implementing "Smart Substitutions" and separating "Freezer Backups" (complete meals) from "Freezer Ingredients" (components).

**Changes:**
*   **Inventory Data Structure:** Updated `data/inventory.yml` to split `freezer` into `backups` (ready-to-eat) and `ingredients` (components like frozen peas).
    *   *Bug Fix:* Prevents ingredients from showing up in the "Skip Dinner -> Freezer Meal" dropdown, which is reserved for complete meals.
*   **Inventory Intelligence Engine:** Created `scripts/inventory_intelligence.py` to analyze existing inventory and suggest recipes.
    *   **Logic:** Scores recipes based on how many ingredients you already have in the Fridge/Pantry.
*   **API:** Added `/api/suggestions` endpoint to serve these smart recommendations.
*   **Frontend (Week View):**
    *   Added a **"Replace"** button to meal cards.
    *   Created **"Replacement Modal"** with 3 distinct tabs:
        1.  **Shop Your Fridge:** Suggests recipes using ingredients you have.
        2.  **Freezer Stash:** Lists available complete freezer meals.
        3.  **Quick Fix:** Shows 15-minute or low-effort recipes.
    *   This feature is designed to be complementary to "Swap" (moving planned days) and "Replan" (global reshuffle).

**Status:** Phase 11 Block 4 Complete.
---

## Session: 2026-01-06 - Recipe Format Migration (Block 5)

**Work Completed:**
- **Goal:** Improve token efficiency and readability by migrating recipes from HTML to Markdown with YAML frontmatter.
- **Implementation:**
    - Created `scripts/migrate_to_md.py` to batch convert 227 recipes from YAML details to Markdown.
    - Updated `scripts/parse_recipes.py` to natively output individual Markdown files with frontmatter instead of a monolithic JSON.
    - Modified `api/index.py` to read and parse the new Markdown files on demand, including frontmatter extraction.
    - overhauling the backend to point `recipes/index.yml` sources to `recipes/content/*.md`.
- **Frontend Enhancements:**
    - Updated `src/app/recipes/[id]/page.tsx` with a premium Recipe Viewer.
    - Integrated `react-markdown` and `gray-matter` for rich rendering.
    - Added Tailwind Typography (`@tailwindcss/typography`) for beautiful formatting.
    - Implemented a Solarpunk-themed metadata sidebar for quick scanning of cuisine, effort level, and appliances.

**Technical Decisions:**
1. **Markdown over HTML:** Markdown is significantly more token-efficient for LLMs and more ergonomic for humans to edit.
2. **YAML Frontmatter:** Keeps metadata structured and separate from the rich text content.
3. **Lazy Loading:** Frontend now fetches only the specific Markdown file needed, rather than loading a massive JSON blob.
4. **Typography Plugin:** Used `@plugin "@tailwindcss/typography"` for consistent, professional recipe rendering with minimal custom CSS.

**Status:** Block 5 Complete. All recipes are now in high-efficiency Markdown format.

**Learning:** Migrating to a simpler, text-based format like Markdown often reveals hidden data inconsistencies and provides an immediate boost to both system performance and developer experience.

---

## Session: 2026-01-07 - Inventory CRUD & Dashboard Optimizations

**Work Completed:**
- **Inventory CRUD (Block 7):**
    - Implemented `/api/inventory/delete` and `/api/inventory/update` endpoints for full item management.
    - Added Edit (✏️) and Delete (🗑️) controls to the Inventory UI.
    - Implemented a 5-second "Undo" toast for deletions to prevent accidental data loss.
- **Homepage Optimization (Block 6):**
    - Enhanced `/api/confirm-veg` to return the full application state for immediate UI updates.
    - Replaced global loading spinners with granular skeletons for better perceived performance.
- **Recipe Maintenance:**
    - Added "Cheese cubes" and "Avocado packs" to the recipe index and content library.

**Technical Decisions:**
1. **Full API Response on Write:** Having POST endpoints return the complete updated state prevents stale data issues in serverless environments where cache invalidation is tricky.
2. **Optimistic UI with Undo:** For inventory management, providing an "Undo" path is more user-friendly than a "Confirm" dialog for every deletion.
3. **Granular Skeletons:** Loading individual sections (System Status, Schedule) separately makes the app feel faster and more reliable.

**Status:** Blocks 6 and 7 complete.
