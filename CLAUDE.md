# Claude Code Operating Manual

AI assistant instructions for meal planner system.

## Claude Instructions
When responding, be concise. Use fewer filler words and minimal formatting when responding to user or creating documentation. 

## Your Role

Generate weekly meal plans:
1. Propose farmers market vegetables
2. Create weekly HTML plans
3. Update history.yml
4. Select 1 "from scratch" novelty recipe/week
5. Protect evening time (5-9pm) - device-free, minimal assembly
6. Maintain 3 freezer backup meals
7. Follow energy-based prep: Monday (high) → Friday (zero)

## Files to Read

**Always read first:**
- `README.md` - System architecture and current status
- `docs/IMPLEMENTATION.md` - Complete roadmap and phase status
- `recipes/index.yml` - 226 recipes with metadata (cuisine, meal_type, leftover_potential, kid_favorite)
- `data/history.yml` - Last 3+ weeks (anti-repetition)
- `inputs/YYYY-MM-DD.yml` - Current week constraints
- `recipes/taxonomy.yml` - Valid cuisines, meal types, effort levels
- `config.yml` - Kid profiles with allergy tracking

**After implementation:**
- Update `docs/IMPLEMENTATION.md` and `docs/PROJECT_HISTORY.md`
- `docs/IMPLEMENTATION.md` = single source of truth

**Task-specific:**
- `scripts/workflow.py` - Automated workflow
- `scripts/validate_plan.py` - Validation logic

## Files to Write

**`plans/YYYY-MM-DD-weekly-plan.html`**
Template: `templates/weekly-plan-template.html`
Structure: 9 tabs (Overview, Mon-Fri, Sat, Sun, Groceries)

Daily sections (Mon-Fri):
1. AM Prep (Tue/Thu only)
2. Lunch (2 kids + 1 adult) with components
3. Snack (ONE, reuse ingredients)
4. Dinner with evening assembly notes
5. PM Prep (Mon/Tue/Wed only)

**`data/history.yml`**
Append new week's dinner data (recipe_id, template, day)
Never overwrite.

## Critical Rules

**Anti-Repetition:**
- No recipe repeats within 3 weeks
- No template repeats within same week (ask if necessary)

**Evening Protection (5-9pm):**
Device-free time - no cooking, chopping, multitasking
Dinner ready with minimal assembly only

**Energy-Based Prep:**
- Monday PM: Chop Mon/Tue/Wed veg, batch cook
- Tuesday AM+PM: Lunch/veg prep for Wed/Thu/Fri
- Wednesday PM: Finish ALL remaining prep
- Thursday AM: Light prep 8-9am only, NO chopping after noon, NO evening prep
- Friday: NO PREP - only reheating/assembly

**Busy Days (Thu/Fri):**
- Friday dinner MUST be `no_chop_compatible: true` (NO EXCEPTIONS)
- If unavailable, use freezer backup

**Late Class Days:**
Default: Thursday & Friday (check inputs file)
Include heavy snack: fruit + protein/fat

**Dietary:**
- Vegetarian only
- Avoid: eggplant, mushrooms, green cabbage
- Check `avoid_contains` field is empty

**Novelty:**
Exactly 1 "from scratch" recipe/week
Criteria: `effort_level: normal`, interesting cuisine, uses farmers market veg
Include 2-3 sentence rationale

**Farmers Market:**
Use `confirmed_veg` from inputs
Each dinner: 1+ vegetables (ideal: 2-3)

**Freezer Backup:**
Maintain 3 complete meals (<15 min reheat)
Identify batch opportunities (dal, curry, pasta sauce, soup)
Note: "Make 2x batch, freeze half"

**Smart Personalization:**
- Kid profiles in `config.yml` with individual allergies (e.g., Anya avoids nuts)
- School snacks automatically nut-free
- Lunch base meals synced across kids with personalized restrictions

**Leftover Optimizer:**
- Recipes with `leftover_potential: high` trigger planned pipelines
- Dinner → next day lunch for entire family
- Batch suggestions coordinated with lunch plan
- Dynamic "Pack leftovers" prep tasks

**Recipe Importing:**
- Use `python3 scripts/import_recipe.py <URL>` to add new recipes
- Parser preserves manual metadata (`leftover_potential`, `kid_favorite`)
- API endpoint: `/api/recipes/import` for web UI

## Validation Checklist

**Meal Planning:**
- All 5 dinners specified
- Lunch variety + repeatable defaults
- ONE snack/day (not 3-4)
- No recipe from last 3 weeks
- No template repetition
- No avoided ingredients
- Exactly 1 from-scratch recipe
- Each dinner has 1+ vegetables
- Farmers market veg utilized

**Evening Protection:**
- Thu/Fri dinners no-chop compatible
- Every dinner has "Evening assembly" note
- Late class days have heavy snack

**Energy-Based Prep:**
- Monday PM: Chop Mon/Tue/Wed veg, batch cook
- Tuesday AM+PM: Lunch components, Thu/Fri veg
- Wednesday PM: Finish ALL prep
- Thursday: Morning OK (8-9am), NO chopping after noon
- Friday: ZERO prep
- Thu/Fri lunch prepped by Wednesday

**Freezer Backup:**
- Status section (3 current meals)
- At least 1 dinner for batch cooking (2x, freeze half)

## Error Handling

If blocked, explain which constraint failed:
- Not enough recipes → Suggest 2-week lookback
- Template conflict → Ask which to repeat
- No-chop conflict → Suggest prep-ahead or freezer
- Missing veg → Suggest alternatives

NEVER proceed with invalid plan. Ask for guidance.

## Engineering Standards

**Dependency Management:**
- **Pin Every Version**: Use `==` for all Python dependencies in `requirements.txt` to prevent breaking updates (e.g., `httpx==0.27.2`).
- **Check Stable Versions**: In `package.json`, use current stable versions (e.g., Next.js 15.x, React 19.x). Avoid typos or "future" versions (e.g., `^16.x`).

**Frontend Patterns:**
- **Next.js 15 Async Props**: Always `await props.searchParams` and `await props.params` in Server Components.
- **Client Components**: Mark with `'use client';` only when interaction is required. Keep logic in Server Components where possible.

**Production Readiness:**
- **Environment Variables**: Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are in Vercel before deployment.
- **Debug Endpoints**: Keep `/api/debug` updated to expose connection/init errors.
- **Workflow & Git Standards**:
    - **Branching**: Create a new branch for every subphase (e.g., `feat/phase-18-block-1`). NEVER push directly to `main`.
    - **Testing**: Test changes locally first.
    - **Deployment**: Push to the feature branch to trigger Vercel preview deployment.
    - **Merging**: Only merge to `main` after local verification and successful Vercel preview.

## Workflow

**Web Dashboard (Primary):**
Access Vercel dashboard
Buttons: "Start New Week", "Confirm Veg", "Generate Plan"
Python Serverless Functions in `/api`
Daily logging via dashboard
Inventory "Brain Dump" available

**CLI (Local/Maintenance):**
`./mealplan next` or `python3 scripts/workflow.py`
Detects state from input files
For debugging and manual fixes

**Your tasks:**
- Review/refine plans
- Add lunch prep details
- Expand from-scratch rationales
- Handle edge cases

## Quick Reference

**Kids Lunch Defaults:**
PBJ, egg sandwich, toad-in-a-hole, ravioli, chapati rolls, quesadilla, burrito

**Adult Lunch Defaults:**
Leftovers (preferred), grain bowl, salad with dinner components

**Snack Format:**
ONE/day, reuse ingredients (apple + peanut butter, cheese + crackers)

**Heavy Snack:**
Fruit + protein/fat (apple + peanut butter, banana + almond butter)

**Groceries:**
By aisle: Fresh Produce, Frozen, Dairy, Grains, Canned, Spices, Snacks, Condiments
