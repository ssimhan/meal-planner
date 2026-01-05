# Claude Code Operating Manual

Instructions for AI assistant working with the meal planner system.

## Your Role

Generate weekly meal plans following these responsibilities:
1. Generate farmers market vegetable proposals
2. Create weekly meal plans as HTML
3. Update history.yml with completed plans
4. Select weekly "from scratch" novelty recipe
5. **Protect evening time (5-9pm)** - device-free, minimal assembly only
6. **Maintain 3 freezer backup meals**
7. **Follow energy-based prep model** - Monday (high energy) → Friday (zero prep)

---

## Files to Read

### Always Read First
- `README.md` - System architecture
- `recipes/index.yml` - 234 recipes with metadata
- `data/history.yml` - Last 3+ weeks of meals (anti-repetition)
- `inputs/YYYY-MM-DD.yml` - Current week constraints/schedule
- `recipes/taxonomy.yml` - Valid cuisines, meal types, effort levels
- After feature implementation, update [docs/IMPLEMENTATION.md](file:///docs/IMPLEMENTATION.md) and [docs/PROJECT_HISTORY.md](file:///docs/PROJECT_HISTORY.md)
- Keep [docs/IMPLEMENTATION.md](file:///docs/IMPLEMENTATION.md) as single source of truth for planning

### For Specific Tasks
- `scripts/workflow.py` - Automated workflow with state tracking
- `scripts/validate_plan.py` - Validation logic

---

## Files to Write

### `plans/YYYY-MM-DD-weekly-plan.html`
**Template:** `templates/weekly-plan-template.html`

**Structure (9 tabs):** Overview, Mon-Fri, Sat, Sun, Groceries

**Daily sections (Mon-Fri):**
1. AM Prep (Tue/Thu only)
2. Lunch (2 kids + 1 adult) with components
3. Snack (ONE, reusing ingredients)
4. Dinner with evening assembly notes
5. PM Prep (Mon/Tue/Wed only)

### `data/history.yml`
**Action:** Append new week's dinner data (recipe_id, template, day)

**Important:** Always append, never overwrite.

---

## Critical Rules

### Anti-Repetition (MANDATORY)
1. **No recipe repeats** - Check last 3 weeks in history.yml
2. **No template repeats** - Same template cannot appear twice in one week
   - Exception: Ask user approval if absolutely necessary

### Scheduling Constraints

**Evening Protection (5-9pm):**
- Device-free time - no active cooking, chopping, multitasking
- Dinner must be ready with minimal assembly only

**Energy-Based Prep Model:**
- **Monday PM:** Start prep, batch cook, chop Mon/Tue/Wed vegetables
- **Tuesday AM+PM:** Continue lunch/veg prep for Wed/Thu/Fri
- **Wednesday PM:** Finish ALL remaining prep for Thu/Fri
- **Thursday AM:** Light prep allowed 8-9am, NO chopping after noon, NO evening prep
- **Friday:** NO PREP DAY - only reheating/assembly (must use pre-prepped ingredients)

**Busy Days (Thu/Fri):**
- Friday dinner MUST be `no_chop_compatible: true` (NO EXCEPTIONS)
- If no no-chop recipe available, use freezer backup

**Late Class Days:**
- Default: Thursday & Friday (check inputs file)
- Include heavy snack: fruit + protein/fat (e.g., apple + peanut butter)

**Office Days:** No special constraints

### Dietary Constraints
- **Vegetarian only** (enforced by recipe index)
- **Avoid:** eggplant, mushrooms, green cabbage
  - Check `avoid_contains` field is empty

### Novelty Rule
- Select exactly **1 "from scratch" recipe** per week
- Criteria: `effort_level: normal`, interesting cuisine/technique, uses farmers market vegetables
- Include 2-3 sentence rationale

### Farmers Market Integration
- Use `confirmed_veg` from inputs file
- Each dinner should have 1+ vegetables (ideal: 2-3)

### Freezer Backup Strategy (MANDATORY)
- **Maintain 3 complete backup meals** (<15 min to reheat)
- Identify batch cooking opportunities (dal, curry, pasta sauce, soup)
- Explicitly note: "Make 2x batch, freeze half for backup"

---

## Validation Checklist

Before finalizing, verify:

**Meal Planning:**
- [ ] All 5 dinners specified
- [ ] Lunch suggestions include variety + repeatable defaults
- [ ] ONE snack per day (not 3-4)
- [ ] No recipe from last 3 weeks
- [ ] No template repetition
- [ ] No avoided ingredients
- [ ] Exactly 1 from-scratch recipe
- [ ] Each dinner has 1+ vegetables
- [ ] Farmers market vegetables utilized

**Evening Protection:**
- [ ] Thu/Fri dinners are no-chop compatible
- [ ] Every dinner has "Evening assembly" note (minimal 5-9pm tasks)
- [ ] Late class days have heavy snack

**Energy-Based Prep:**
- [ ] Monday PM: Chop Mon/Tue/Wed vegetables, batch cook
- [ ] Tuesday AM+PM: Lunch components, Thu/Fri vegetables
- [ ] Wednesday PM: Finish ALL remaining prep
- [ ] Thursday: Morning prep OK (8-9am), NO chopping after noon
- [ ] Friday: ZERO prep at any time
- [ ] All Thu/Fri lunch components prepped by Wednesday

**Freezer Backup:**
- [ ] Status section included (3 current meals)
- [ ] At least one dinner for batch cooking (2x, freeze half)

---

## Error Handling

If blocked, explain which constraint cannot be satisfied:
1. **Not enough recipes** → Suggest relaxing 3-week lookback to 2 weeks
2. **Template conflict** → Ask which template to repeat
3. **No-chop conflict** → Suggest prep-ahead or freezer backup
4. **Missing vegetables** → Suggest alternative recipes

**NEVER** proceed with invalid plan. Always ask for guidance.

---

## Workflow

**Web Dashboard Workflow (Primary):**
- Access the **Web Dashboard** on Vercel.
- Use interactive buttons for "Start New Week", "Confirm Veg", and "Generate Plan".
- Logic is handled by Python Serverless Functions in `/api`.
- Daily logging and feedback are performed on the dashboard "Check-in" card.
- Inventory "Brain Dump" is available for rapid data entry.

**CLI Workflow (Local/Maintenance):**
- System runs via `./mealplan next` command or `python3 scripts/workflow.py`.
- Detects state from input files.
- Useful for local debugging and manual data fixes.
- Updates history.yml and generates HTML plans.

**Your tasks:**
- Review/refine generated plans
- Add lunch prep details
- Expand from-scratch rationales
- Handle edge cases

**Manual workflow (if needed):**
1. Read inputs (YYYY-MM-DD.yml, history.yml, index.yml)
2. Filter recipes (remove last 3 weeks, avoided ingredients)
3. Select dinners (Mon-Wed: any, Thu-Fri: no-chop, 1 from-scratch)
4. Generate plan HTML
5. Update history.yml
6. Validate checklist

---

## Quick Reference

**Repeatable Lunch Defaults (Kids):**
PBJ, egg sandwich, toad-in-a-hole, ravioli, chapati rolls, quesadilla, burrito

**Adult Lunch Defaults:**
Leftovers (preferred), grain bowl, salad with dinner components

**Snack Format:**
ONE per day, reuse ingredients (e.g., apple + peanut butter, cheese + crackers)

**Heavy Snack Format:**
Fruit + protein/fat (apple + peanut butter, banana + almond butter)

**Groceries:**
Organized by aisle: Fresh Produce, Frozen, Dairy, Grains, Canned, Spices, Snacks, Condiments
