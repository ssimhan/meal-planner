# Meal Planner Repo + Claude Code — Full Implementation Plan (Manual v1)

## Goal
Create a GitHub repo that, each week, produces **one** `weekly-plan.md` file and **prevents over-repetition** of dishes, using:
- A **two-step CLI workflow**: `intake` → farmers market list → `plan`
- A **recipe index sourced from HTML**, parsed into categories/templates
- Claude Code integrated for narrative + plan generation
- Manual-first execution, with a clean upgrade path to GitHub Actions later

## Core product requirements
- Output artifact: **single Markdown file** per week in `plans/`
- Anti-repetition rules (**both**):
  - **No repeating the same recipe within the last 3 weeks**
  - **No repeating the same template more than 1× per week**
- Recipe source:
  - Recipes exist as **HTML files**, must be parsed + tagged into templates (dump-and-go, tacos, etc.)
- Novelty rule:
  - Up to **1 “from scratch” recipe/week**, auto-chosen by the system
- Constraints:
  - Vegetarian
  - Avoid ingredients: **eggplant, mushrooms, green cabbage**
  - Respect busy-day logic, including **no-chop Thu/Fri** unless explicitly prepped earlier
  - Late-class day adds a heavy snack

---

## Repo structure (v1)
```
meal-planner/
  README.md
  CLAUDE.md

  prompts/
    system_prompt.md
    farmers_market.md
    plan_generation.md
    validation.md

  recipes/
    raw_html/
      *.html
    parsed/
      recipes.json
    taxonomy.yml
    index.yml

  data/
    history.yml
    pantry.yml

  inputs/
    2026-01-05.yml

  plans/
    2026-01-05-weekly-plan.md

  scripts/
    mealplan.py
    parse_recipes.py
    validate_plan.py
```

---

## Data contracts (schemas)

### `inputs/YYYY-MM-DD.yml`
```yaml
week_of: 2026-01-05
timezone: America/Los_Angeles

schedule:
  office_days: [mon, wed, fri]
  busy_days: [thu, fri]
  late_class_days: [tue]

preferences:
  vegetarian: true
  avoid_ingredients: [eggplant, mushrooms, green_cabbage]
  novelty_recipe_limit: 1

farmers_market:
  status: proposed            # proposed -> confirmed
  proposed_veg: [broccoli, kale, carrots]
  confirmed_veg: []
```

### `recipes/taxonomy.yml`
```yaml
templates:
  - tacos
  - pasta
  - soup
  - curry
  - grain_bowl
  - dump_and_go

effort_levels:
  - no_chop
  - minimal_chop
  - normal

appliances:
  - instant_pot
  - slow_cooker
  - stovetop
  - oven
```

### `recipes/index.yml` (generated, planning source of truth)
```yaml
- id: "lentil_tacos_001"
  name: "Lentil Tacos"
  template: "tacos"
  effort_level: "minimal_chop"
  no_chop_compatible: false
  appliances: ["stovetop"]
  main_veg: ["tomato", "onion", "lettuce"]
  avoid_contains: []
  source:
    type: "html"
    file: "recipes/raw_html/tacos.html"
```

### `data/history.yml`
```yaml
weeks:
  - week_of: 2025-12-15
    dinners:
      - recipe_id: "dump_chili_003"
        template: "dump_and_go"
      - recipe_id: "pasta_pesto_012"
        template: "pasta"
```

---

## CLI workflow (v1 manual)

### Command A — `intake`
**Purpose:** Gather week-specific constraints and produce a **proposed** farmers market veggie list.

**User experience:**
- Prompts for:
  - Week start date (default: next Monday)
  - Office days (default Mon/Wed/Fri)
  - Busy days
  - Late-class days
  - Optional: dinners out / travel / special events
- Writes `inputs/YYYY-MM-DD.yml`
- Generates a **proposed** farmers market veggie list and saves to `farmers_market.proposed_veg`

**Confirmation step:**
- Option 1 (simple): user edits `confirmed_veg` and sets `status: confirmed`
- Option 2 (nice-to-have): `mealplan confirm inputs/YYYY-MM-DD.yml` moves proposed → confirmed

### Command B — `plan`
**Purpose:** Generate the weekly plan Markdown and update history.

**Reads:**
- `inputs/week.yml`
- `recipes/index.yml`
- `data/history.yml`
- prompts in `prompts/`

**Writes:**
- `plans/YYYY-MM-DD-weekly-plan.md`

**Updates:**
- Appends selected dinners/templates into `data/history.yml`

---

## Recipe parsing pipeline (HTML → index)

### Inputs
- HTML recipe files placed in: `recipes/raw_html/*.html`

### Script: `scripts/parse_recipes.py`
**Responsibilities:**
1) Load all `.html` files
2) Extract per recipe (best-effort):
   - `name/title`
   - ingredients list (if structured)
   - instructions (optional for v1)
   - section/category headings (if present)
3) Normalize into `recipes/parsed/recipes.json`
4) Enrich with tags for planning:
   - `template` (dump-and-go, tacos, etc.)
   - `effort_level`
   - `no_chop_compatible`
   - `appliances`
   - `main_veg`
   - `avoid_contains` (detect eggplant/mushrooms/green cabbage)
5) Output:
   - `recipes/parsed/recipes.json` (raw normalized)
   - `recipes/index.yml` (curated for planning)

### Tagging strategy
- **Primary:** use HTML section headers (e.g., “Tacos”, “Soup”, “Dump and Go”) → map to `template`
- **Fallback heuristics:** keyword mapping
  - tortilla/taco seasoning → `tacos`
  - pasta/penne/spaghetti → `pasta`
  - broth/simmer → `soup`
  - slow cooker/instant pot → `dump_and_go` + appliance
- Anything ambiguous becomes `template: unknown` and can be manually corrected in `recipes/index.yml`.

---

## Meal selection logic

### Anti-repetition constraints
- **Hard rule A:** Exclude recipes used in the last **3 weeks** (`data/history.yml`)
- **Hard rule B:** In one week, do not repeat any `template` more than **1×**

### Scheduling constraints
- Busy days: prioritize low effort
- Thu/Fri: must be **no-chop** OR explicitly “prepped earlier”
- Late-class days: add a **heavy snack**

### Preference constraints
- Vegetarian only
- Avoid: eggplant, mushrooms, green cabbage

### Farmers market alignment
- Prefer dinners that consume `farmers_market.confirmed_veg`

### Novelty rule
- Select up to **1** from-scratch recipe/week
- The system chooses it automatically and writes it into the plan

---

## Validation (success criteria)

### Script: `scripts/validate_plan.py`
Checks (must pass):
- Vegetarian only
- Excludes eggplant/mushrooms/green cabbage
- Dinners Mon–Fri present
- Lunch plan for **2 kids + 1 adult**
- Thu/Fri dinners are no-chop (or “prepped earlier” stated)
- Heavy snack included on late-class days
- At least 1 vegetable per dinner
- Novelty/from-scratch recipes ≤ 1/week

**Failure behavior:**
- If validation fails, `plan` re-runs selection and/or asks Claude to revise until it passes.

---

## Claude Code integration

### Claude responsibilities (v1)
- Generate farmers market veggie list (proposal text + rationale)
- Generate final weekly plan Markdown in the required structure
- Choose and write up 1 “from scratch” recipe (≤ 1/week)
- Update `data/history.yml` accurately

### Script responsibilities
- Collect structured inputs
- Parse recipes into a deterministic index
- Provide deterministic selection constraints and candidates
- Validate outputs

### Key files
- `CLAUDE.md`: operating manual for Claude Code (what to read, what to write, update rules)
- `prompts/*`: explicit generation + validation instructions

---

## Workback plan (turn into GitHub issues)

### Phase 0 — Repo scaffolding (setup) ✅ COMPLETE
1. ✅ Initialize repo + folder structure
2. ✅ Add `README.md` (how to run locally)
3. ✅ Add starter `CLAUDE.md` (how Claude should operate)
4. ✅ Add starter `taxonomy.yml` + empty `history.yml`

### Phase 1 — HTML parsing → recipe index (core data) ✅ COMPLETE
5. ✅ Implement `scripts/parse_recipes.py` (BeautifulSoup)
6. ✅ Generate `recipes/parsed/recipes.json` + `recipes/index.yml`
7. ✅ Spot-check: template tags, avoid-ingredient detection
   - Result: 234 recipes parsed, 114 classified, 120 marked unknown for manual review

### Phase 2 — CLI intake + farmers market proposal ✅ COMPLETE
8. ✅ Implement `scripts/mealplan.py intake` to create `inputs/week.yml`
   - Interactive prompts for week start, office/busy/late-class days
   - Optional special events tracking
9. ✅ Implement farmers market proposal generation
   - Seasonal vegetables by month (winter/spring/summer/fall)
   - Recipe requirements from index.yml
   - Recent usage from history.yml (avoids repetition)
   - Staple ingredients always included
10. ✅ Confirmation workflow (manual edit of YAML file)
   - User edits `proposed_veg` → `confirmed_veg`
   - Changes `status: proposed` → `status: confirmed`

### Phase 3 — Plan generation + validation + history updates
11. Implement `scripts/mealplan.py plan`:
    - load inputs/index/history
    - select candidate dinners under constraints
    - call Claude Code to write `plans/week.md`
    - update `history.yml`
12. Implement `scripts/validate_plan.py` and wire into `plan`
13. Add retry loop on validation failures

### Phase 4 — Polish + example week
14. Add an example input + example plan in repo
15. Add docs: “How to add recipes (HTML)”, “How to correct tags”, “How repetition works”
16. Optional: add a `Makefile` or shell wrapper for ergonomic commands

---

## Weekly operating procedure (v1)
1) Drop/maintain recipes under `recipes/raw_html/`
2) If recipes changed: run `python scripts/parse_recipes.py`
3) Each week:
   - `python scripts/mealplan.py intake`
   - confirm farmers market veggies (edit YAML or `confirm`)
   - `python scripts/mealplan.py plan inputs/YYYY-MM-DD.yml`
4) Use `plans/YYYY-MM-DD-weekly-plan.md`

---

## v2 Upgrade path (future)
- GitHub Action scheduled weekly (e.g., Sundays)
- Creates `inputs/next-week.yml` in a PR
- Optionally generates `plans/` in PR for review
- Manual review/merge keeps you in control

---

## Post-v1 Improvements (backlog)

### Recipe Parser Enhancement
**Priority:** After v1 is complete and system is working end-to-end

**Issue:** Current parser marks ~120/234 recipes (51%) as "unknown" template. The heuristics work well for obvious categories (tacos, pasta, curry) but miss many recipes that have more nuanced cuisines or don't fit standard templates.

**Proposed improvements:**
1. **Better cuisine/category mapping:**
   - Add more natural cuisine categories beyond templates (Indian, Mexican, Mediterranean, etc.)
   - Map HTML categories more intelligently (e.g., "REW", "School Snacks", "Dinner" are metadata, not templates)
   - Consider recipe name patterns more thoroughly

2. **Enhanced tagging strategy:**
   - Add `cuisine` field separate from `template` (e.g., template: grain_bowl, cuisine: Indian)
   - Support multiple secondary tags (breakfast, snack, appetizer, side)
   - Detect meal type from categories (breakfast, lunch, dinner, snack)

3. **Manual override workflow:**
   - Create utility script to review and bulk-edit unknown recipes
   - Add comments in index.yml to track manual changes
   - Parser should preserve manual edits on re-runs

4. **Improved vegetable detection:**
   - 71 recipes currently show no vegetables (many are snacks, but parser should distinguish)
   - Add `meal_type` detection (snack, dessert, side, main)
   - Better handling of processed ingredients vs. whole vegetables

**Implementation notes:**
- Don't block v1 on this - current parser is "good enough" to get started
- After using the system for 2-3 weeks, patterns will emerge about what categories matter most
- Can manually edit `recipes/index.yml` in the meantime for critical recipes

