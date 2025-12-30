# Meal Planner Project History

**Project Goal:** Build an automated meal planning system that respects energy levels throughout the week, protects evening family time, and integrates farmers market shopping.

**Target Audience:** Busy parents who want nutritious home-cooked meals without cooking stress interfering with bedtime routines.

## Core Philosophy

### The Problem This Solves
Traditional meal planning assumes consistent energy and time throughout the week. Reality: energy depletes as the week progresses, and evenings (5-9pm) need to be sacred family time, not cooking chaos.

### The Solution
- **Energy-based prep model:** Heavy prep Monday-Wednesday when energy is high, minimal/zero prep Thursday-Friday
- **Evening protection:** All dinners designed for minimal assembly during 5-9pm window
- **Freezer backup strategy:** Always maintain 3 complete backup meals for when life happens
- **Farmers market integration:** Use seasonal vegetables from weekend market shopping

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

**The Problem:** Meal fatigue from eating the same things too often.

**The Solution:**
- Track 3+ weeks of meal history in `history.yml`
- No recipe can repeat within 3 weeks
- No template can repeat within the same week
- One "from scratch" novelty recipe per week

**Technical implementation:**
```yaml
weeks:
  - week_of: 2025-12-23
    dinners:
      - recipe_id: "lentil_tacos_001"
        template: "tacos"
        day: "mon"
```

**What I learned:** Simple data structures (list of weeks) make complex logic (anti-repetition) possible.

### 5. Recipe Tagging System

**The Problem:** How do you know which recipes fit which constraints?

**The Solution:** Rich metadata in `recipes/index.yml`:

```yaml
lentil_tacos_001:
  name: "Lentil Tacos"
  template: "tacos"
  effort_level: "normal"
  no_chop_compatible: false
  main_veg: ["bell peppers", "onions", "tomatoes"]
  avoid_contains: []  # Empty = safe to use
  appliances: ["stovetop"]
  source: "Budget Bytes"
  novelty: "Easy weeknight Mexican"
```

**Key fields:**
- `effort_level`: normal | minimal_chop | no_chop
- `no_chop_compatible`: Can this be made with zero chopping? (boolean)
- `main_veg`: Which vegetables does it feature?
- `avoid_contains`: Does it have eggplant/mushrooms/cabbage?
- `template`: Tacos, pasta, curry, dump_and_go, etc.

**What I learned:** Good metadata is the foundation of automation. Tag once, query forever.

### 6. Farmers Market Integration

**The Problem:** Farmers market vegetables sit unused because they don't fit the meal plan.

**The Solution:**
- Sunday: Farmers market shopping
- Input file includes `confirmed_veg` list for the week
- Meal selection algorithm prioritizes recipes using those vegetables
- Each dinner should include 2-3 vegetables

**What I learned:** Systems should support existing habits (farmers market shopping), not replace them.

### 7. Lunch Strategy: Repeatability > Variety

**The Problem:** Creating variety for 5 different lunches every week is exhausting.

**The Solution:** Repeatable defaults kids actually eat:
- PBJ, egg sandwich, toad-in-a-hole, ravioli, chapati rolls, quesadillas, burritos
- Adult lunch: Leftovers from previous dinner (preferred)
- Components can be prepped ahead and assembled day-of

**What I learned:** Kids don't want lunch variety. They want familiar foods. Stop fighting this.

### 8. One Snack Per Day (Not Three)

**The Problem:** Original plan suggested 3-4 snacks per day. Overwhelming.

**The Solution:**
- ONE snack suggestion per day
- Reuse ingredients from main meals
- Examples: "Apple slices with peanut butter" or "Cucumber with cream cheese"
- Heavy snack on late class days (Thu/Fri): fruit + protein/fat

**What I learned:** More options ≠ better. Decision fatigue is real. One good option beats four mediocre ones.

### 9. Solarpunk Design Aesthetic

**The Problem:** Meal plans are functional but boring.

**The Solution:** HTML template with:
- Warm, earthy color palette (browns, greens, oranges)
- Tabbed interface for easy navigation
- Print-friendly design
- Visually beautiful but still practical

**What I learned:** Make tools delightful to use. Good design reduces friction.

## Technical Decisions

### Why Python for Automation?

**Decision:** Use Python scripts for workflow automation (`scripts/workflow.py`).

**Rationale:**
- Easy to read and modify (even for non-programmers)
- Excellent YAML parsing libraries
- Can be run from command line: `./mealplan next`
- No compilation step - just edit and run

### Why Claude Code as the "Brain"?

**Decision:** Let Claude Code handle meal selection logic, constraint satisfaction, plan generation.

**Rationale:**
- Complex constraint satisfaction (anti-repetition + dietary + scheduling + energy levels)
- Natural language reasoning ("which recipe best uses these farmers market vegetables?")
- Can explain decisions ("I chose this recipe because...")
- Handles edge cases gracefully

**What I learned:** AI excels at constraint satisfaction and decision-making. Use it for the hard parts.

### The CLAUDE.md Operating Manual

**Decision:** Create a detailed instruction manual (`CLAUDE.md`) that tells Claude Code exactly what to read, write, and update.

**Why this matters:**
- Makes AI behavior predictable and consistent
- Documents system rules in one place
- Easy to modify behavior by editing instructions
- Other users can understand and adapt the system

**Key sections:**
- Files to read (context)
- Files to write (outputs)
- Critical rules (constraints)
- Validation checks (quality control)
- Error handling (what to do when stuck)

**What I learned:** AI needs clear instructions just like humans do. The better your documentation, the better the results.

## Development Timeline: How It Was Built

This section documents the chronological journey from concept to working system, with git commit references for each major phase.

---

### Phase 0-1: Scaffolding & Recipe Parsing
**Commit:** `c4aa6f8` - Phase 0-1: Scaffolding and recipe parsing

**What We Built:**
- Project structure (`recipes/`, `data/`, `inputs/`, `plans/`, `scripts/`)
- Recipe taxonomy defining templates (tacos, pasta, curry, soup, etc.)
- `scripts/parse_recipes.py` - HTML recipe parser
- `recipes/index.yml` - Structured recipe index with metadata

**The Challenge:**
234 recipes stored as HTML files from various recipe websites. Needed to extract structured data (ingredients, instructions, cooking time) without manual data entry.

**The Solution:**
Built a parser using schema.org microdata that automatically extracts:
- Recipe name and cuisine
- Ingredients (for detecting vegetables and avoided items)
- Cooking instructions (for detecting effort level)
- Automatic categorization (template, appliances, effort level)

**Key Learning:** *Start with the data format you already have.* HTML recipes with microdata were already structured - building a parser was faster than manual entry for 234 recipes.

---

### Phase 2: CLI Intake + Farmers Market Integration
**Commit:** `4952578` - Phase 2: CLI intake + farmers market proposal

**What We Built:**
- `scripts/mealplan.py intake` command - Interactive weekly setup
- Farmers market vegetable proposal generator
- Input file structure (`inputs/YYYY-MM-DD.yml`)

**The Innovation:**
Two-step workflow that matches real-world behavior:
1. **Sunday:** System proposes vegetables based on seasonality + recipe needs + recent usage
2. **After farmers market:** User confirms which vegetables were actually available
3. **Plan generation:** Uses confirmed vegetables to select recipes

**Why This Matters:**
Farmers markets are unpredictable. Planning before shopping meant finding recipes we couldn't cook. Planning after shopping meant using what we actually bought.

**Key Learning:** *Design workflows around real-world constraints, not ideal scenarios.*

---

### Phase 3: Meal Plan Generation & Validation
**Commit:** `b319a46` - Phase 3: Implement plan generation and validation

**What We Built:**
- Constraint satisfaction algorithm for dinner selection
- Anti-repetition logic (3-week lookback for recipes, no template repetition in same week)
- Dietary constraint enforcement (`avoid_contains` check)
- Markdown meal plan generation
- `scripts/validate_plan.py` - Quality control

**The Algorithm:**
1. Load 3 weeks of history from `data/history.yml`
2. Filter out recently used recipes
3. Filter out recipes with avoided ingredients (eggplant, mushrooms, green cabbage)
4. For each day (Mon-Fri):
   - Select from remaining recipes
   - Ensure template hasn't been used this week
   - Match busy days (Thu/Fri) with no-chop recipes
   - Prioritize farmers market vegetables
5. Select one "from scratch" normal-effort recipe

**Validation Rules:**
- ✅ All 5 dinners present
- ✅ No avoided ingredients
- ✅ Busy days have no-chop meals
- ✅ No template repetition
- ✅ At least one vegetable per dinner
- ✅ Late class days include heavy snacks

**Key Learning:** *Validation scripts are like spell-check for automation - they catch mistakes before you see them.*

---

### Phase 4: Template Classification Overhaul
**Commits:**
- `8cdb627` - Phase 4: Improve template classification and recipe selection
- `c118137` - Complete recipe classification - 100% recipes now categorized

**The Problem:**
Initial parser classified only 114/234 recipes (49%). 120 recipes were "unknown" template, making meal variety impossible.

**What We Did:**
1. **Separated cuisine from meal_type:**
   - Before: Recipe was "indian" OR "soup" (confusing)
   - After: Recipe can be cuisine="indian" AND meal_type="soup_stew" (clear)

2. **Added 8 new meal type categories:**
   - `breakfast` - Pancakes, waffles, toast
   - `snack_bar` - Protein bars, energy bites
   - `baked_goods` - Muffins, cookies
   - `appetizer` - Samosas, pakoras, dips
   - `casserole` - Baked pasta, layered dishes
   - `frozen_treat` - Ice cream, popsicles
   - `dip_spread` - Hummus, salsa, pesto
   - `beverage` - Smoothies, lassi, juices

3. **Expanded keyword matching with 50+ new terms**

4. **Manually classified remaining unknowns**

**Results:**
- Before: 120 unknown recipes (51%)
- After: 0 unknown recipes (0%)
- Meal planner could now ensure true template variety

**Key Learning:** *Data quality determines system quality. Fix your data model early - it's harder to change later.*

---

### Phase 5: CLI Workflow Improvements
**Commits:**
- `9332bb9` - Add easy-to-use CLI wrapper script
- `08ad54e` - Reorganize CLI commands with numbered workflow

**The Problem:**
Commands were verbose and hard to remember:
```bash
python3 scripts/mealplan.py intake --week 2026-01-05 --office-days mon wed fri
python3 scripts/mealplan.py plan inputs/2026-01-05.yml
```

**The Solution:**
Created `./mealplan` wrapper with numbered workflow:
- `./mealplan 1-start` - Start new week (interactive)
- `./mealplan 2-update` - Update after farmers market
- `./mealplan 3-plan` - Generate meal plan
- `./mealplan 4-view` - View specific plan
- `./mealplan 5-latest` - View most recent plan

**Why Numbers:**
Removes cognitive load - workflow is always the same order. Step 1 is always "start", Step 3 is always "plan".

**Key Learning:** *Good UX is about removing friction. Numbered commands = less to remember.*

---

### Phase 6: Streamlined Workflow with State Tracking
**Commit:** `20ea458` - Add streamlined workflow with state tracking and cleanup repo

**The Breakthrough:**
What if the system just *knew* what to do next?

**What We Built:**
- `./mealplan next` - Single command for entire workflow
- State tracking in input files:
  - `intake_complete` + `status: proposed` → "Awaiting farmers market"
  - `intake_complete` + `status: confirmed` → "Ready to generate plan"
  - `plan_complete` → "Week done, start next week"
- Auto-cleanup (delete input files after plan generated)

**How It Works:**
```
./mealplan next
↓
Check: Are there incomplete weeks?
  → Yes, status="proposed" → "Go shop at farmers market, then run again"
  → Yes, status="confirmed" → Generate meal plan
  → No incomplete weeks → Create next week's input file
```

**Before:** 5 commands to remember
**After:** 1 command that knows what to do

**Key Learning:** *State machines sound fancy, but they're just "remember where you left off" - computers are excellent at this.*

---

### Phase 7: Energy-Based Prep Model ⚡ CRITICAL PIVOT
**Commit:** `43b0ded` - Implement hybrid meal planning approach with energy-based prep model

**The Crisis:**
After 3 weeks of using the system, the original plan (cook fresh every night) was creating stress, not reducing it. Thursday/Friday cooking became survival mode. Evening time (5-9pm) was consumed by chopping and cooking, bleeding into bedtime routines.

**The Realization:**
Energy is NOT constant throughout the week. Traditional meal plans assume equal energy Monday-Friday. Reality: energy depletes progressively.

**The Complete Redesign:**
Created a prep schedule aligned with actual energy cycles:

**Monday PM Prep (5-9pm):**
- Start vegetable prep (chop for Mon/Tue/Wed dinners)
- Batch cook Monday dinner (2x if freezer-friendly)
- Pre-cook components (grains, beans, dal)

**Tuesday AM + PM Prep:**
- AM: Prep lunch components, portion batch-cooked items, check freezer inventory
- PM: Chop vegetables for Thu/Fri dinners, prep lunch components for rest of week

**Wednesday PM Prep (5-9pm):**
- FINISH remaining Thu/Fri vegetable prep
- Prep all remaining lunch components for Thu/Fri
- Load Instant Pot for Thursday if needed
- Final verification: All Thu/Fri components ready

**Thursday (Morning Prep ONLY):**
- 8-9am: Light prep allowed (chop 1-2 vegetables, cook simple components)
- **After noon:** NO chopping, NO cooking
- **Evening (5-9pm):** Device-free time - only reheating and assembly

**Friday (NO PREP DAY - STRICT):**
- **All day:** NO chopping at any time, NO cooking
- Only permitted actions: Reheating, simple assembly
- Fallback: Use freezer backup meal if energy is depleted

**The "5-9pm Evening Protection Rule":**
Every dinner plan now includes "Evening assembly (5-9pm)" notes:
- Monday: "Serve hot from batch cooking"
- Tuesday: "Reheat and assemble bowls"
- Wednesday: "Quick stovetop assembly using prepped vegetables"
- Thursday: "Reheat and serve - no chopping"
- Friday: "Instant Pot served or freezer backup - no prep"

**Freezer Backup Strategy:**
- Maintain 3 complete backup meals at all times
- When making dal, curry, soup, or beans → make 2x batch, freeze half
- Backup meals must reheat in <15 minutes
- Track inventory in weekly plan overview

**Impact:**
This change transformed the system from "ambitious but stressful" to "actually sustainable". Thursday/Friday are now genuinely restful. Evening time is protected. The system works *with* human energy patterns, not against them.

**Key Learning:** *Design systems for your worst day, not your best day. The best plan includes failure modes.*

---

### Phase 8: HTML Plan Format with Solarpunk Design
**Commits:**
- `bc64c8c` - Update meal planning workflow with default heavy snack days and HTML viewer
- `72e3aae` - Update meal plan HTML template with distinctive Solarpunk design
- `aceb75a` - Reorganize meal plan with tabbed interface and simplified snacks

**The Problem:**
Markdown plans were functional but hard to scan. Wall of text, no visual hierarchy, couldn't easily jump between days.

**The Solution:**
Beautiful HTML interface with:
- **Tabbed navigation:** 9 tabs (Overview, Mon-Fri, Sat, Sun, Groceries)
- **Solarpunk aesthetic:** Earth tones, warm gradients, sustainable vibes
- **Color-coded sections:** Lunch (gold), Snack (green), Dinner (orange), Prep (purple)
- **Responsive design:** Works on phone, tablet, desktop
- **Monospace fonts for components:** Makes ingredient lists scannable

**Design Philosophy:**
Solarpunk = optimistic, sustainable, community-focused. Reflects the farmers-market integration and energy-conscious approach.

**Information Architecture:**
Organize by **use case**, not chronology:
- Morning: Check today's tab (what's for lunch/dinner?)
- Evening: Check today's prep tasks
- Sunday: Focus on Groceries tab for shopping

**Key Learning:** *Make tools delightful to use. Good design reduces friction and increases adoption.*

---

### Phase 9: Snack Simplification
**Commit:** `aceb75a` - Reorganize meal plan with tabbed interface and simplified snacks

**The Problem:**
Original plan: 3-4 snack suggestions per day = decision fatigue.

**The Data:**
After 2 weeks, most snack suggestions went unused. Too many choices, low stakes decision.

**The Solution:**
- **ONE snack suggestion per day** (not 3-4)
- Reuse ingredients from main meals:
  - Monday: Apple slices with peanut butter
  - Tuesday: Cheese and crackers (from quesadilla ingredients)
  - Wednesday: Cucumber with cream cheese (from salad ingredients)
- Heavy snacks for late class days (Thu/Fri default):
  - Format: Fruit + protein/fat for sustained energy
  - Thursday: Apple slices with peanut butter
  - Friday: Banana with almond butter

**Key Learning:** *More options ≠ better experience. One good option beats four mediocre ones.*

---

### Phase 10: Weekend Tabs + Grocery Organization
**Commits:**
- `fa5dcfb` - Add Saturday and Sunday tabs to meal plan
- `18affe9` - Update documentation and add HTML template for new meal plan format

**What We Added:**

**Saturday Tab:**
- Morning: Rest day (no prep required)
- Flexible lunch/dinner (leftovers or eating out)
- Optional afternoon prep: Review next week's plan, clean fridge/freezer

**Sunday Tab:**
- AM Prep: Grocery shopping (farmers market + regular groceries)
- Put away groceries, organize fridge for upcoming week
- Light lunch (save energy for week ahead)
- Reminder: Monday is main prep day

**Groceries Tab:**
Comprehensive shopping list organized by aisle:
- Fresh Produce
- Frozen
- Dairy & Refrigerated
- Grains & Pasta
- Canned & Jarred
- Spices & Seasonings
- Snacks
- Condiments & Misc

Quantities included for all items needed for full week (Monday-Sunday).

**Key Learning:** *Separate tabs for weekend vs weekdays - different mindsets. Don't force structure where flexibility is the goal.*

---

### Phase 11: Prep Schedule Refinement
**Commits:**
- `216394f` - Update workflow: split prep across Mon PM, Tue AM/PM, Wed AM/PM
- `506cd19` - Remove AM prep from Wednesday - PM prep only

**The Problem:**
Initial energy-based model had too much morning prep. Every day started with cooking tasks, which interfered with getting kids ready for school.

**The Refinement:**
- **Monday:** PM prep ONLY (no morning disruption)
- **Tuesday:** AM prep (light - portioning already-cooked food) + PM prep
- **Wednesday:** PM prep ONLY (removed morning prep)
- **Thursday:** Morning prep OK (8-9am window for light tasks), NO evening prep
- **Friday:** NO PREP at any time

**Rationale:**
Tuesday/Thursday mornings are exceptions because they follow batch cooking days - "prep" is just portioning food that's already cooked, not active cooking.

**Key Learning:** *Every prep session adds cognitive load. Consolidate where possible.*

---

### Phase 12: Recipe Linking & HTML Recipe Cards
**Commit:** `6c8d0c3` - Add recipe linking to meal plans and redesign recipe HTML template

**What We Built:**
- Clickable recipe links in meal plans
- Beautiful HTML recipe cards matching Solarpunk design
- Recipe cards include:
  - Full ingredient lists
  - Step-by-step instructions
  - Cooking time and servings
  - Appliances needed
  - Template and effort level tags

**The User Experience:**
**Before:**
1. See recipe name in meal plan
2. Copy name to clipboard
3. Search in browser
4. Open recipe website
5. Start cooking

**After:**
1. Click recipe name in meal plan
2. Recipe card opens in new tab
3. Start cooking

**Small Convenience, Big Impact:**
Saves 30 seconds × 5 dinners/week = 2.5 minutes/week. But more importantly: **zero cognitive friction**. No context switching, no searching, no decision making.

**Key Learning:** *Links are powerful. Connecting related information reduces mental load more than time saved suggests.*

---

### Current State (Phase 13+): Repository Cleanup & Documentation
**Commits:**
- `2a28162` - Remove old Markdown meal plan files
- `418c44f` - Clean up redundant and duplicate files
- `b57f384` - Organize repository structure and rename recipe file
- `39640a7` - Add batch recipe template updater and update all recipes to modern design

**What We Did:**
- Removed old Markdown meal plans (replaced by HTML)
- Cleaned up redundant files from experimentation
- Organized repository structure for clarity
- Updated all 234 recipe HTML files to match new template design
- Created batch updater for future template changes

**Repository Health:**
- Clean commit history
- No duplicate files
- Clear README and documentation
- All recipes use consistent template
- Ready for future features

---

## Evolution Summary

### Phase 1: Manual Planning (Spreadsheets)
- Handwritten meal plans in Google Sheets
- Frequent repetition (forgot what we ate last week)
- Didn't account for energy levels
- Evenings often chaotic

### Phase 2: Recipe Database (Phases 0-4)
- Created `recipes/index.yml` to track all recipes
- Added tags for effort level, vegetables, templates
- Could search recipes, but still manual planning
- **Achievement:** 100% recipe classification

### Phase 3: History Tracking & Automation (Phases 5-6)
- Created `data/history.yml` to prevent repetition
- Built automated plan generation
- One command workflow: `./mealplan next`
- **Achievement:** End-to-end automation

### Phase 4: Human-Centered Refinement (Phases 7-12)
- Energy-based prep model (THE BREAKTHROUGH)
- Evening protection rule (5-9pm sacred)
- Freezer backup strategy
- Beautiful Solarpunk HTML design
- Recipe linking and UX polish
- **Achievement:** Sustainable, joyful system

**What I learned:** Build incrementally. Each phase solved one problem and revealed the next. The technical implementation (Phases 0-6) was necessary but insufficient. The human-centered refinement (Phases 7-12) made the system actually usable.

## Lessons for Non-Coders Using Claude Code

### 1. Start with Manual Process First
Don't automate until you understand the problem deeply. I manually planned meals for weeks before building this system. That experience informed every design decision.

### 2. Write Instructions Like You're Teaching a Smart Intern
Claude Code is powerful but needs clear instructions. The `CLAUDE.md` file is my "how to do your job" manual. Be specific about:
- What files to read
- What files to write
- What rules must never be broken
- What to do when stuck

### 3. Plain Text Files > Complex Databases
YAML files are:
- Human-readable
- Version-controllable
- Easy to edit manually
- Future-proof

Don't overcomplicate with databases until you need them.

### 4. Design for Failure Modes
The freezer backup strategy exists because perfect adherence is impossible. Build escape hatches into your systems.

### 5. Constraints Create Freedom
Limiting Thursday/Friday to no-prep meals paradoxically makes the system more usable. Don't try to do everything—do the right things.

### 6. Iterate in Public (Git)
Every change is tracked in Git. I can see how the system evolved, revert mistakes, and learn from past decisions.

### 7. Metadata is Magic
Tagging recipes with `effort_level`, `no_chop_compatible`, `main_veg`, etc. makes intelligent automation possible. Tag once, query forever.

### 8. Let AI Handle Complex Logic
Constraint satisfaction (no repetition + dietary restrictions + scheduling + energy levels) is hard for humans, easy for AI. Lean into AI strengths.

## Metrics of Success

How do I know this works?

1. **Reduced evening stress:** Dinners no longer interfere with bedtime routines
2. **No more "what's for dinner?" paralysis:** The plan just exists
3. **Farmers market vegetables actually get used:** Not wilting in the fridge
4. **Meal variety without mental effort:** Anti-repetition rules enforce diversity
5. **Sustainable energy management:** Friday doesn't feel like survival mode

## Future Improvements (Maybe)

- **Seasonal recipe suggestions:** Highlight recipes using in-season vegetables
- **Leftover tracking:** Explicitly plan leftover usage for lunches
- **Nutrition tracking:** Ensure balanced macros across the week
- **Shopping list optimization:** Group by store layout
- **Mobile-friendly HTML:** Better phone/tablet viewing

## Final Thoughts

This project taught me that **systems should serve human needs, not idealized behavior**. The energy-based prep model works because it acknowledges that energy depletes throughout the week. The freezer backup works because it acknowledges that plans fail.

The best tools are the ones you actually use. This system works because it reduces cognitive load (meal decision fatigue), respects constraints (evening time, energy levels), and builds in flexibility (freezer backups, repeatable lunches).

For other non-coders: You can build complex, useful systems with Claude Code. Start small, iterate based on real use, write clear instructions, and design for how humans actually behave.

---

---

## Session: 2025-12-30 (Continued) - Feature Planning & Implementation

### What We Analyzed
- Reviewed all future features listed in README
- Analyzed actual implementation vs documentation claims
- Discovered critical gaps between what's documented and what actually works

### Critical Findings
1. **Lunch prep is placeholder text** - Documentation claims "infrastructure in place" but workflow.py generates generic placeholders, not actual lunch plans
2. **Grocery list not generated** - HTML tab exists but content is not populated from recipes
3. **Freezer inventory is manual** - Placeholder text in plans, not automated tracking
4. **No plan iteration** - One-shot generation with no refinement workflow

### Key Decisions Made

**Revised Future Feature Priorities:**
1. ✅ **Lunch prep recipe suggestions** (CRITICAL - falsely documented as working)
2. ✅ **Automated grocery list generation** (HIGH VALUE - low effort, high impact)
3. ✅ **Interactive plan refinement** (HIGH VALUE - enables iteration)
4. ⏸️ **Freezer inventory tracking** (MODERATE VALUE)
5. ❌ **Heavy snack variety** (SKIP - working as designed, intentional decision fatigue reduction)
6. ❌ **GitHub Actions automation** (SKIP - unnecessary complexity)

**Rationale:** Focus on completing half-done features before adding new ones. The system is production-ready; gaps are in automation polish, not core functionality.

### Implementation Started: Lunch Prep Recipe Suggestions

**Phase 1 Progress (Recipe Index Schema):**
- ✅ Added lunch_attributes section to taxonomy.yml
  - `lunch_suitable`, `kid_friendly`, `prep_style`, `storage_days`
- ✅ Added lunch_meal_keywords to taxonomy.yml
- ✅ Created update_lunch_fields.py script to tag 5 initial recipes:
  - cheesy_veggie_quesadilla
  - greek_quesadillas
  - sheet_pan_black_bean_quesadillas
  - curried_egg_salad_sandwich
  - refried_bean_burrito

**Phase 2 Progress (Lunch Selection Algorithm):**
- ✅ Created lunch_selector.py with intelligent selection algorithm
  - `LunchSelector` class with recipe filtering and ranking
  - Considers ingredient reuse from dinner plans
  - Respects energy-based prep model (Thu/Fri assembly-only)
  - Scores candidates by overlap, kid-friendliness, prep style
  - Falls back to repeatable defaults when no matches
  - Determines optimal prep days (Mon/Tue for Thu/Fri lunches)

**Phase 3 Progress (Workflow Integration):**
- ✅ Integrated lunch selector into workflow.py
  - Added import for LunchSelector
  - Modified generate_meal_plan() to call lunch selector after dinner selection
  - Builds dinner_plan_list with recipe IDs, names, days, vegetables
  - Passes selected lunches to generate_plan_content()
  - Updated plan generation to display lunch details:
    - Recipe name, kid-friendly indicator
    - Component lists with reuse indicators
    - Assembly notes based on prep day
    - Repeatable default fallbacks

**Phase 4 Progress (HTML Generation):**
- ✅ Updated workflow.py to generate HTML instead of Markdown
  - Created generate_html_plan() function with full HTML structure
  - generate_lunch_html() displays lunch suggestions with proper styling
  - Integrated lunch selector data into HTML weekday tabs
  - Component lists, reuse indicators, kid-friendly markers
  - Storage days for component-based prep
  - Assembly notes based on prep schedule
- ✅ HTML generation includes all features:
  - Overview tab (freezer backup, from scratch recipe, week at glance)
  - Monday-Friday tabs with lunch sections using lunch selector
  - Saturday/Sunday weekend tabs
  - Groceries tab (placeholder for future automation)
  - Full Solarpunk styling from template
  - Tab navigation and JavaScript

**Implementation Status:**
- ✅ Phase 1: Lunch schema (taxonomy.yml + update script)
- ✅ Phase 2: Selection algorithm (lunch_selector.py)
- ✅ Phase 3: Workflow integration (workflow.py)
- ✅ Phase 4: HTML generation with lunch selector data
- ⏸️ Phase 5: Validation rules (pending)
- ⏸️ Phase 6: Testing and verification (in progress)

**Next Steps:**
- Run update_lunch_fields.py to tag recipes in index.yml
- Test workflow.py to generate an HTML plan with lunch selections
- Add validation rules for lunch completeness

### Lessons Learned
- **Documentation debt is real** - Features can be partially implemented but documented as complete
- **Use it before building more** - Real usage reveals actual gaps vs speculative needs
- **Half-done features > new features** - Completing what's started delivers more value than adding new things

---

**Last Updated:** 2025-12-30
**Status:** Active development - implementing lunch prep feature
**Next Steps:** Complete lunch prep implementation, then evaluate if grocery list or plan refinement should follow
