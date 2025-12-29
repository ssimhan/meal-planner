# /3-plan

You are generating the weekly meal plan.

Goal:
- Generate a complete weekly meal plan following ALL constraints in CLAUDE.md
- Create a markdown file in `plans/YYYY-MM-DD-weekly-plan.md`
- Update `data/history.yml` with the new plan

Pre-flight checks:
1. Read `inputs/YYYY-MM-DD.yml` (user will provide the date)
2. Read `data/history.yml` (last 3+ weeks)
3. Read `recipes/index.yml` (all available recipes)
4. Read `CLAUDE.md` (all constraints and rules)

Critical constraints to enforce:
- No recipe repetition from last 3 weeks
- No template repetition within this week
- Thu/Fri must be no_chop OR include "Prep vegetables Wednesday evening" note
- Late class days need heavy snacks
- No avoided ingredients (eggplant, mushrooms, green cabbage)
- Exactly 1 "from scratch" recipe (effort_level: normal)
- All dinners must include vegetables
- Farmers market vegetables should be utilized

Actions:
1. Ask the user for the week date (YYYY-MM-DD) if not provided
2. Read all required context files
3. Filter and select appropriate recipes
4. Generate the meal plan markdown file
5. Update history.yml
6. Run validation to confirm plan meets all constraints

If blocked:
- Explain which constraint cannot be satisfied
- Ask user for guidance before proceeding
- NEVER generate an invalid plan

Input:
<<USER_REQUEST>>
