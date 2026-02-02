## Claude Instructions
When responding, be concise. Use fewer filler words and minimal formatting when responding to user or creating documentation. 

## Workflows & Skills
Use the following slash commands for common tasks:
- `/add-bug`: Add a bug to the tracking table.
- `/add-feature`: Add a feature request to the roadmap.
- `/brainstorm`: Explore complex feature intent and constraints.
- `/plan`: Create TDD-first implementation plans.
- `/build`: Execute approved plans with subagents and TDD.
- `/code-review`: Review newly built code for debt/risks.
- `/closeout`: Update docs, commit, and push.

Specialized assistant skills are available in the `skills/` directory. Read `skills/*/SKILL.md` before use.

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
- `docs/project_roadmap.md` - Complete roadmap and phase status
- `recipes/index.yml` - 226 recipes with metadata (cuisine, meal_type, leftover_potential, kid_favorite)
- `data/history.yml` - Last 3+ weeks (anti-repetition)
- `inputs/YYYY-MM-DD.yml` - Current week constraints
- `recipes/taxonomy.yml` - Valid cuisines, meal types, effort levels
- `config.yml` - Kid profiles with allergy tracking

**After implementation:**
- Update `docs/project_roadmap.md` and `docs/PROJECT_HISTORY.md`
- `docs/project_roadmap.md` = single source of truth

**Task-specific:**
- `scripts/workflow.py` - Automated workflow
- `scripts/validate_plan.py` - Validation logic
- `scripts/reset_week.py` - Cascading delete tool (Dev/Test)

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
**Confirmation-Driven Fixes:**
Whenever ingredient normalization or prep-step ambiguity arises, ask for user confirmation, record the decision, and update `docs/project_roadmap.md` for a permanent fix.

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

## Testing & CI

**Automated Testing:**
- **Pre-commit hooks**: Run automatically on every commit (type check, lint, tests)
- **CI Pipeline**: Runs on all PRs with parallel jobs

**Quick Commands:**
| Command | Purpose | Speed |
|---------|---------|-------|
| `npm run check` | Fast local validation (TS + lint + Jest) | ~15s |
| `npm run check:full` | Full check including Python tests | ~20s |
| `npm run test:py` | Python unit tests only | ~3s |
| `npm run test:py:all` | All Python tests (including integration) | ~5s |

**CI Jobs (parallel):**
1. `lint-and-typecheck` - ESLint + TypeScript
2. `test-frontend` - Jest (15 tests)
3. `test-python` - pytest (37 unit tests)
4. `validate-yaml` - YAML syntax validation

**Pre-commit Hook:**
Runs before every commit:
```
→ Type checking...
→ Linting...
→ Frontend tests...
→ Python tests...
✓ All pre-commit checks passed!
```

**Test Organization:**
- Unit tests: `tests/test_*.py` (run in CI)
- Integration tests: `test_integration.py`, `test_shopping_api.py`, `test_api_perf.py` (require Supabase, run locally with `npm run test:py:all`)
- Frontend tests: `src/components/__tests__/*.test.tsx`

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
- **Error Handling**: return structured errors `{"status": "error", "code": "CODE", "message": "msg", "details": ...}` for easy frontend debugging.
- **Workflow & Git Standards**:
    - **Branching**: Create a new branch for every subphase (e.g., `feat/phase-18-block-1`). NEVER push directly to `main`.
    - **Testing**: Test changes locally first.
    - **Deployment**: Push to the feature branch to trigger Vercel preview deployment.
    - **Merging**: Only merge to `main` after local verification and successful Vercel preview.
    - **Testing Procedure**:
        - **Local**: Run `npm run dev:full`. Verify changes in browser at `localhost:3000`.
        - **Vercel Preview**:
            1. Push changes to the feature branch.
            2. Open the Vercel Preview URL (from GitHub PR).
            3. Verify functionality matches local behavior.
            4. ONLY merge to `main` if Vercel Preview is correct.

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


## Production Reliability Standards

Before merging any code, use the **`/code-review` workflow** which includes production reliability checks.

### P0 Requirements (Blocking)
1. **Timeouts** - All external calls have timeouts
2. **Idempotency** - Write operations can be safely retried
3. **Input validation** - API boundaries validate before processing
4. **Error logging** - Exceptions logged with context
5. **Resource cleanup** - Connections/files closed in `finally` blocks

**Rationale:** "Works fine until load or failure" bugs are the #1 production killer. These checks prevent 80% of outages.

See `.agent/workflows/code-review.md` for complete checklist with examples.
