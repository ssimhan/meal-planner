# Claude Code Operating Manual

This document tells Claude Code what to read, write, and update when working with the meal planner system.

## Your Role

You are responsible for:
1. Generating farmers market vegetable proposals
2. Generating weekly meal plans as Markdown
3. Updating history.yml with completed plans
4. Selecting the weekly "from scratch" novelty recipe

## Files You Should Read

### Always Read First (Context)

- `README.md` - Understand the system architecture
- `recipes/index.yml` - Available recipes with tags (template, effort_level, appliances, vegetables, avoid_contains)
- `data/history.yml` - Past 3+ weeks of meal history
- `inputs/YYYY-MM-DD.yml` - Current week's constraints and schedule
- `recipes/taxonomy.yml` - Valid templates, effort levels, appliances

### Read for Specific Tasks

- `prompts/farmers_market.md` - When generating veggie lists
- `prompts/plan_generation.md` - When generating weekly plans
- `prompts/validation.md` - To understand validation rules

## Files You Should Write

### `plans/YYYY-MM-DD-weekly-plan.md`

**When:** After running `mealplan.py plan`

**Format:**
```markdown
# Weekly Meal Plan: [Date Range]

## Farmers Market Shopping List
- [vegetables based on confirmed_veg from inputs file]

## Monday
**Dinner:** [Recipe Name] ([Template])
- Main vegetables: [list]
- Prep notes: [if any]

**Lunch Prep:** [Recipe for 2 kids + 1 adult]

## Tuesday
**Dinner:** [Recipe Name] ([Template])
- Main vegetables: [list]
- Prep notes: [if any]

**Lunch Prep:** [Recipe for 2 kids + 1 adult]

## Heavy Snack (Tuesday - Late Class Day)
- [Substantial snack recipe]

## Wednesday
**Dinner:** [Recipe Name] ([Template])
- Main vegetables: [list]
- Prep notes: [if any]

**Lunch Prep:** [Recipe for 2 kids + 1 adult]

## Thursday
**Dinner:** [Recipe Name] ([Template])
- Main vegetables: [list]
- Prep notes: [if no_chop_compatible, state "Quick no-chop meal" OR if normal effort, state "Prep vegetables Wednesday evening"]

**Lunch Prep:** [Recipe for 2 kids + 1 adult]

## Friday
**Dinner:** [Recipe Name] ([Template])
- Main vegetables: [list]
- Prep notes: [if no_chop_compatible, state "Quick no-chop meal" OR if normal effort, state "Prep vegetables Wednesday evening"]

**Lunch Prep:** [Recipe for 2 kids + 1 adult]

## From Scratch Recipe This Week
**[Recipe Name]** - [Brief rationale for why this recipe was chosen, how it uses farmers market vegetables, what makes it interesting]

## Prep-Ahead Notes
- **Sunday:** [Grocery shopping, any Sunday prep tasks]
- **Wednesday evening:** [Prep vegetables for Thursday/Friday if needed]
```

### `data/history.yml`

**When:** After successfully generating a weekly plan

**Action:** Append new week's data

**Example:**
```yaml
weeks:
  - week_of: 2026-01-05
    dinners:
      - recipe_id: "lentil_tacos_001"
        template: "tacos"
        day: "mon"
      - recipe_id: "pasta_pesto_012"
        template: "pasta"
        day: "tue"
      - recipe_id: "chana_masala_ip"
        template: "curry"
        day: "wed"
      - recipe_id: "dump_chili_003"
        template: "dump_and_go"
        day: "thu"
      - recipe_id: "butternut_squash_mac_and_cheese"
        template: "pasta"
        day: "fri"
```

**Important:** Always append, never overwrite existing history.

## Critical Rules

### Anti-Repetition (MANDATORY)

1. **Recipe repetition:** Do NOT select any recipe used in the last 3 weeks (check `history.yml`)
   - Example: If "Lentil Tacos" appears in weeks 2025-12-15, 2025-12-22, or 2025-12-29, you CANNOT use it in week 2026-01-05

2. **Template repetition:** In one week, do NOT use the same template more than once
   - Example: If Monday is "tacos", no other day can be "tacos"
   - Exception: If absolutely necessary due to limited recipes, ask user for approval first

### Scheduling Constraints

- **Busy days (Thu/Fri):** Must be `no_chop_compatible: true` OR explicitly state "Prep vegetables Wednesday evening"
  - Check the `no_chop_compatible` field in recipes/index.yml
  - If using a normal-effort recipe, you MUST include prep notes

- **Late class days:** Include a heavy snack in addition to dinner
  - Check `inputs/YYYY-MM-DD.yml` for `late_class_days`
  - Heavy snack should be substantial (e.g., nachos, loaded toast, substantial wrap)

- **Office days:** No special constraints (user handles lunch at office)

### Dietary Constraints

- **Vegetarian only:** All recipes must be vegetarian
  - This is already enforced by the recipe index

- **Avoid ingredients:** eggplant, mushrooms, green cabbage
  - Check `avoid_contains` field in recipes/index.yml
  - NEVER select recipes containing these ingredients
  - If a recipe has non-empty `avoid_contains`, skip it

### Novelty Rule

- Select exactly **1 "from scratch" recipe per week**

- **Criteria for "from scratch":**
  - `effort_level: normal` (not minimal_chop or no_chop)
  - Interesting/new cuisine or technique
  - Should consume farmers market vegetables when possible
  - Should be something the user hasn't made recently (check history)

- **Include rationale:** Write 2-3 sentences explaining why you chose this recipe:
  - What makes it interesting
  - How it uses farmers market vegetables
  - What new technique or flavor profile it introduces

### Farmers Market Integration

- Prefer recipes that use `confirmed_veg` from the input file
  - Check `farmers_market.confirmed_veg` in inputs/YYYY-MM-DD.yml
  - Cross-reference with `main_veg` field in recipes/index.yml

- **Each dinner should include at least 1 vegetable**
  - Check the `main_veg` field in the recipe index
  - If a recipe has empty `main_veg`, consider adding a side vegetable

- **Heavy snacks should ideally include vegetables too**

## Validation Checks (Before Finalizing)

Before writing a plan, verify ALL of these:

- [ ] All 5 dinners (Mon-Fri) are specified
- [ ] Lunch prep plan exists for each day (2 kids + 1 adult)
- [ ] No recipe appears in last 3 weeks of history
- [ ] No template appears more than once this week
- [ ] Thu/Fri are no-chop OR have explicit "Prep vegetables Wednesday evening" notes
- [ ] Late class day has heavy snack (check inputs file for late_class_days)
- [ ] No avoided ingredients (check avoid_contains field is empty)
- [ ] Exactly 1 from-scratch recipe selected (effort_level: normal)
- [ ] Each dinner has at least 1 vegetable
- [ ] Farmers market vegetables are utilized in multiple recipes

## Error Handling

If you cannot generate a valid plan, explain which constraint cannot be satisfied:

1. **Not enough recipes:** If anti-repetition rules eliminate too many options
   - Suggest relaxing the 3-week lookback to 2 weeks
   - Ask user for approval before proceeding

2. **Template conflict:** If you must repeat a template
   - Explain which templates are exhausted
   - Suggest allowing one template repetition
   - Ask user which template to repeat

3. **No-chop conflict:** If not enough no-chop recipes available
   - List available no-chop options
   - Suggest using prep-ahead approach
   - Ask user to confirm prep-ahead plan

4. **Missing vegetables:** If farmers market vegetables can't be incorporated
   - Suggest alternative recipes that use those vegetables
   - Ask user if they want to modify the farmers market list

**NEVER** proceed with an invalid plan. Always ask for user guidance when blocked.

## Phase-Specific Notes

### Phase 0-1 (Current)

- Recipe parsing is automated via `parse_recipes.py`
- You are NOT yet responsible for plan generation
- Focus on understanding the recipe index structure
- No action required from you at this phase

### Phase 2 (Future)

- You will help generate farmers market vegetable proposals
- Read past history to suggest vegetables that work well
- Consider seasonal availability (user will provide season info)

### Phase 3+ (Future)

- You will be invoked via `mealplan.py plan` command
- Read all context files before generating plans
- Update history.yml atomically after successful plan generation
- If validation fails, regenerate the plan with adjustments

## Example Workflow (Phase 3+)

1. **Read inputs:**
   - inputs/YYYY-MM-DD.yml (schedule, farmers market)
   - data/history.yml (last 3+ weeks)
   - recipes/index.yml (all available recipes)

2. **Filter recipes:**
   - Remove recipes used in last 3 weeks
   - Remove recipes with avoided ingredients
   - Separate into no_chop vs. normal effort

3. **Select dinners:**
   - Mon/Tue/Wed: Any template (prefer farmers market vegetables)
   - Thu/Fri: no_chop OR plan to prep ahead
   - Ensure no template repetition
   - Select 1 normal-effort recipe as "from scratch"

4. **Generate plan:**
   - Write plans/YYYY-MM-DD-weekly-plan.md
   - Include all required sections
   - Add farmers market shopping list
   - Explain from-scratch recipe choice

5. **Update history:**
   - Append to data/history.yml
   - Include recipe_id, template, day for each dinner

6. **Validate:**
   - Run through validation checklist
   - If any check fails, regenerate or ask user
