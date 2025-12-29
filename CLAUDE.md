# Claude Code Operating Manual

This document tells Claude Code what to read, write, and update when working with the meal planner system.

## Your Role

You are responsible for:
1. Generating farmers market vegetable proposals
2. Generating weekly meal plans as Markdown
3. Updating history.yml with completed plans
4. Selecting the weekly "from scratch" novelty recipe
5. **Protecting evening time (5-9pm) and bedtime routines**
6. **Maintaining freezer backup strategy (3 complete backup meals)**
7. **Following energy-based prep model (Monday=high, Friday=minimal)**

## Files You Should Read

### Always Read First (Context)

- `README.md` - Understand the system architecture
- `recipes/index.yml` - Available recipes with tags (template, effort_level, appliances, vegetables, avoid_contains)
- `data/history.yml` - Past 3+ weeks of meal history
- `inputs/YYYY-MM-DD.yml` - Current week's constraints and schedule
- `recipes/taxonomy.yml` - Valid templates, effort levels, appliances

### Read for Specific Tasks

- `scripts/workflow.py` - Automated workflow implementation with state tracking
- `scripts/validate_plan.py` - Validation logic and rules

## Files You Should Write

### `plans/YYYY-MM-DD-weekly-plan.html`

**When:** After generating a weekly plan

**Format:** Tabbed HTML interface with Solarpunk design aesthetic

**Template Location:** `templates/weekly-plan-template.html`

**Tab Structure (9 tabs total):**
1. **Overview** - Freezer backup status, From Scratch recipe, Week at a glance
2. **Monday-Friday** - Weekday meal plans
3. **Saturday** - Weekend day 1
4. **Sunday** - Grocery shopping day
5. **Groceries** - Comprehensive list organized by aisle

**Daily Flow (Monday-Friday):**
Each day follows this exact order:
1. **AM Prep** block with specific tasks
2. **Lunch** plan (2 kids + 1 adult) with components
3. **Snack** suggestion (ONE only, reusing meal ingredients)
4. **Dinner** with evening assembly notes
5. **PM Prep** block (where applicable)

**Example Monday Structure:**
```
AM Prep (MAIN PREP DAY):
- CHOP ALL VEGETABLES FOR ENTIRE WEEK
- BATCH COOKING (2x meals to freeze)
- ALL LUNCH PREP for Tue/Wed/Thu/Fri
- SNACKS (portion for entire week)

Lunch:
- Kids (2): [Specific recipe]
- Adult (1): [Option]
- Components: [list]
- Prep: [instructions]

Snack:
- ONE snack only, reusing ingredients (e.g., "Apple slices with peanut butter")

Dinner:
- [Recipe Name] ([Template])
- Vegetables: [list]
- Prep Notes: [batch cooking if applicable]
- Evening Assembly (5-9pm): [minimal tasks only]

PM Prep: (if applicable)

## Tuesday
**Dinner:** [Recipe Name] ([Template])
- Main vegetables: [list - ALL prepped Monday]
- Prep notes: [Batch cooking note if applicable]
- **Evening assembly:** [Minimal tasks only 5-9pm]

**Lunch:** [Specific lunch recipe with components - 2 kids + 1 adult]
- Or use: [Repeatable default option from rotation]
- Components: [list - ALL prepped Monday]
- Prep: Assemble only - components prepped Monday

**Snack Ideas:** [3-4 specific snack suggestions]

**Tuesday Prep Tasks (MILD PREP DAY):**
- NO chopping - all vegetables already prepped Monday
- Assemble Tuesday lunch in morning
- Portion already-cooked items if needed
- Check freezer backup inventory - do we have 3 meals?

## Heavy Snack (Tuesday - Late Class Day)
- [Substantial snack recipe with specific ingredients]
- Format: Fruit + protein/fat (e.g., apple slices + cheese, banana + peanut butter)

## Wednesday
**Dinner:** [Recipe Name] ([Template])
- Main vegetables: [list - ALL prepped Monday]
- Prep notes: [Easy meal using Monday prep]
- **Evening assembly:** [Minimal: "Reheat" or "Assemble bowls"]

**Lunch:** [Specific lunch recipe with components - 2 kids + 1 adult]
- Or use: [Repeatable default option from rotation]
- Components: [list - ALL prepped Monday]
- Prep: Assemble only - components prepped Monday

**Snack Ideas:** [3-4 specific snack suggestions]

**Wednesday Prep Tasks (MILD PREP DAY):**
- NO chopping - all vegetables already prepped Monday
- Portion already-cooked food if needed
- Load Instant Pot if using for Thursday
- Verify all Thu/Fri lunch components are ready

## Thursday
**Dinner:** [Recipe Name] ([Template]) - **NO-CHOP MEAL**
- Main vegetables: [list]
- Prep notes: "NO CHOPPING - using pre-prepped ingredients from Monday/Tuesday"
- **Evening assembly:** [Minimal: "Reheat and serve" or "Dump ingredients and heat"]

**Lunch:** [Specific lunch recipe with components - 2 kids + 1 adult]
- Or use: [Repeatable default option: PBJ, ravioli, chapati roll]
- Components: [ALL prepped on Monday]
- Prep: "All components prepped Monday - assemble only"

**Snack Ideas:** [3-4 specific snack suggestions]

**Thursday Prep Tasks (MORNING PREP OK):**
- Morning (8-9am): Light prep allowed if needed - chop 1-2 vegetables, cook components
- NO chopping after noon
- NO evening prep allowed
- Evening: Only reheating, simple assembly, or grabbing pre-prepped items
- Fallback: Use freezer backup if needed

## Friday
**Dinner:** [Recipe Name] ([Template]) - **NO-PREP MEAL**
- Main vegetables: [list - ALL prepped Monday or Thursday morning]
- Prep notes: "NO PREP - using pre-prepped ingredients from Monday (or Thursday AM)"
- **Evening assembly:** [Minimal: "Reheat and serve" or "Assemble and bake"]

**Lunch:** [Specific lunch recipe with components - 2 kids + 1 adult]
- Or use: [Repeatable default option: egg sandwich, toad-in-a-hole, burrito]
- Components: [ALL prepped on Monday]
- Prep: "All components prepped Monday - assemble only"

**Snack Ideas:** [3-4 specific snack suggestions]

**Friday Prep Tasks (NO PREP DAY - STRICT):**
- NO chopping allowed at any time
- NO cooking allowed - only reheating
- Only reheating and simple assembly
- Fallback: Use freezer backup if needed

## From Scratch Recipe This Week
**[Recipe Name]** - [Brief rationale for why this recipe was chosen, how it uses farmers market vegetables, what makes it interesting]

**Weekend Structure:**

**Saturday:**
- Morning: No prep required (rest day)
- Lunch: Flexible (leftovers, eating out)
- Snack: ONE snack (fresh fruit or remaining prepped snacks)
- Dinner: Flexible weekend meal
- Afternoon Prep (Optional): Review next week's plan, make grocery list, clean fridge/freezer

**Sunday:**
- AM Prep: Grocery shopping (farmers market + regular groceries)
  - Put away groceries
  - Organize fridge for upcoming week
  - Reminder to check Groceries tab for complete list
- Lunch: Simple meal (keep light to save energy)
- Snack: ONE snack (simple fruit or crackers)
- Dinner: Flexible weekend meal
- Afternoon/Evening: No prep (rest day) - reminder that Monday is main prep day

**Snack Guidelines:**
- **ONE snack suggestion per day** (not 3-4)
- Reuse ingredients from main meals where possible
- Examples:
  - Monday: Apple slices with peanut butter
  - Tuesday: Cheese and crackers (from quesadilla ingredients)
  - Wednesday: Cucumber rounds with cream cheese (from salad ingredients)
  - Thursday: Grapes (simple fruit)
  - Friday: Crackers with hummus (from lunch components)
  - Saturday/Sunday: Fresh fruit or simple options

**Heavy Snacks (Late Class Days - Default Thu/Fri):**
- Format: Fruit + protein/fat for sustained energy
- Thursday: Apple slices with peanut butter
- Friday: Banana with almond butter

**Groceries Tab:**
- Comprehensive shopping list organized by aisle
- Categories: Fresh Produce, Frozen, Dairy & Refrigerated, Grains & Pasta, Canned & Jarred, Spices & Seasonings, Snacks, Condiments & Misc
- Include quantities for all items
- Should cover entire week (Monday-Sunday)

## Repeatable Lunch Defaults (Kids)
These can be rotated and repeated - no need for variety every week:
- PBJ (whole wheat bread, natural peanut butter, fruit-only jam)
- Egg sandwich or scrambled egg sandwich
- Toad-in-a-hole (egg cooked in bread slice)
- Ravioli with brown butter or simple tomato sauce
- Chapati or dosa rolls with fruit
- Veggie burrito or pizza roll
- Quesadilla with cheese and beans

**Adult Lunch Defaults:**
- Leftovers from previous night's dinner (preferred)
- Grain bowl: prepped grain + roasted vegetables + protein (eggs, beans, paneer)
- Salad with dinner components

## Prep-Ahead Schedule

### Sunday (Grocery Day)
- Farmers market shopping
- Regular grocery shopping
- Put away groceries
- **No cooking** - rest day

### Monday (MAIN PREP DAY)
**Vegetable Prep:**
- Chop vegetables for ENTIRE WEEK (Monday through Friday dinners)
- Large batches: onions, carrots, beans, bell peppers, cauliflower, broccoli, potatoes
- Wash, dry, and chop greens
- Store in airtight containers labeled by day/recipe

**Batch Cooking:**
- [Specific dinner that should be doubled for freezer]
- Pre-cook components: dal, beans, sauces, grains, rice
- Roast vegetables that can be reused
- Cook any components needed for Thu/Fri no-prep dinners

**Lunch Prep:**
- Prep ALL lunch components for Tuesday, Wednesday, Thursday, Friday
- Cook pasta, grains, boil eggs, etc.
- Portion snacks into grab-and-go containers for entire week

**Goal:** Do ALL prep work for the entire week. Nothing should require chopping after Monday.

### Tuesday (MILD PREP DAY)
**Light Tasks Only:**
- NO chopping allowed - everything already prepped Monday
- Assemble Tuesday lunch in morning
- Portion already-cooked items if needed
- Check freezer backup inventory - do we have 3 meals?

**Goal:** Minimal effort. Just assembly and organization.

### Wednesday (MILD PREP DAY)
**Light Tasks Only:**
- NO chopping allowed - everything already prepped Monday
- Portion already-cooked food if needed
- Load Instant Pot or slow cooker for Thursday if needed
- Verify all Thursday/Friday lunch components are ready

**Goal:** Minimal effort. Verify everything is ready for Thu/Fri.

### Thursday (MORNING PREP OK)
**Morning Prep Window (8-9am):**
- Light prep allowed: chop 1-2 vegetables if needed, cook simple components
- Can prepare components for Thursday dinner
- Can do light batch cooking for Friday

**After Noon:**
- NO chopping allowed after 12pm
- NO cooking allowed after preparing Thursday dinner

**Evening (5-9pm):**
- Device-free time
- Dinner must be ready with minimal assembly: reheat and serve
- Only actions: reheating, simple assembly

**Goal:** Use morning energy if needed, but protect evening. Rely mostly on Monday prep.

### Friday (NO PREP DAY - STRICT)
**ALL DAY RULES:**
- NO chopping allowed at any time (morning, afternoon, evening)
- NO cooking allowed - only reheating
- Only actions: reheating, simple assembly, using pre-prepped ingredients from Monday or Thursday AM
- Use freezer backup meal if energy is depleted

**Evening (5-9pm):**
- Device-free time
- Dinner must be ready with minimal assembly

**Goal:** Zero prep at any time. Survive to the weekend. Rely entirely on Monday/Thursday AM prep.
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

- **Evening Protection (CRITICAL):**
  - **5-9pm is device-free time** - meals must reduce chaos, not create it
  - Dinner complexity must NEVER spill into bedtime routines
  - No active cooking, chopping, or multitasking required during 5-9pm window
  - All meals must be ready to serve with minimal assembly only

- **Energy-Based Prep Model:**
  - **Monday (MAIN PREP DAY):** Primary prep day - do ALL chopping and batch cooking for entire week
  - **Tuesday (MILD PREP DAY):** Light tasks only - assemble, portion, check inventory
  - **Wednesday (MILD PREP DAY):** Light tasks only - verify components ready, load Instant Pot if needed
  - **Thursday (MORNING PREP OK):** Light prep allowed in morning only (8-9am) - NO evening prep, NO chopping after noon
  - **Friday (NO PREP DAY):** NO chopping allowed at any time - only reheating, assembly, or pre-prepped ingredients

- **Busy days (Thu/Fri) - STRICT RULES:**
  - **Thursday:** Can do light prep in morning (8-9am window) if needed, but NO chopping after noon, NO evening prep
  - **Friday:** Must be `no_chop_compatible: true` (NO EXCEPTIONS) - no prep at any time
  - Remove the "prep vegetables Wednesday evening" escape hatch
  - If no suitable no-chop recipe available for Friday, use freezer backup meal
  - Evening (5-9pm): Only permitted actions for both days: reheating, simple assembly

- **Late class days:** Include a heavy snack in addition to dinner
  - **DEFAULT:** Assume Thursday and Friday are late class days UNLESS explicitly told otherwise
  - Check `inputs/YYYY-MM-DD.yml` for `late_class_days` field - if empty, default to [thu, fri]
  - Heavy snack should be substantial (e.g., nachos, loaded toast, substantial wrap)
  - Approved formats: fruit + protein/fat (cheese, yogurt, peanut butter)
  - Thursday heavy snack: Apple slices with peanut butter (or similar fruit + protein/fat combo)
  - Friday heavy snack: Banana with almond butter (or similar fruit + protein/fat combo)

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
  - Ideal: 2-3 vegetables per meal

- **Heavy snacks should ideally include vegetables too**

### Freezer Backup Strategy (MANDATORY)

- **Maintain 3 complete backup meals** in the freezer at all times
  - Backup meals must be ready to serve in <15 minutes (just reheat)
  - When generating meal plan, identify which recipes should be doubled and frozen

- **Batch Cooking Opportunities:**
  - When planning dal, beans, chole, sambar, curry, pasta sauce, or soup
  - Explicitly state: "Make 2x batch and freeze half for backup"
  - Freezer-friendly recipes should be prioritized for Monday/Tuesday cooking

- **Backup Meal Examples:**
  - Dal + rice (cooked dal freezes perfectly)
  - Chole or rajma (freeze cooked beans in sauce)
  - Pasta with marinara sauce
  - Soup or stew
  - Any curry-based dish

## Validation Checks (Before Finalizing)

Before writing a plan, verify ALL of these:

**Meal Planning:**
- [ ] All 5 dinners (Mon-Fri) are specified
- [ ] Each dinner has specific lunch suggestions with components and prep instructions (2 kids + 1 adult)
- [ ] Lunch suggestions include both variety options AND repeatable defaults
- [ ] Each day has 3-4 specific snack suggestions
- [ ] No recipe appears in last 3 weeks of history
- [ ] No template appears more than once this week
- [ ] No avoided ingredients (check avoid_contains field is empty)
- [ ] Exactly 1 from-scratch recipe selected (effort_level: normal)
- [ ] Each dinner has at least 1 vegetable (ideally 2-3)
- [ ] Farmers market vegetables are utilized in multiple recipes

**Evening Protection:**
- [ ] Thu/Fri dinners are STRICTLY no-chop compatible (no exceptions)
- [ ] Every dinner has "Evening assembly" note stating minimal 5-9pm tasks
- [ ] No dinner requires active cooking, chopping, or multitasking during 5-9pm
- [ ] Late class day has heavy snack with fruit + protein/fat (check inputs file for late_class_days)

**Energy-Based Prep:**
- [ ] Monday prep tasks are comprehensive and specific (chop ALL vegetables for entire week, batch cooking, ALL lunch prep)
- [ ] Tuesday prep tasks are light (NO chopping - only assembly and portioning)
- [ ] Wednesday prep tasks are light (NO chopping - only verification and loading Instant Pot)
- [ ] Thursday allows morning prep (8-9am) if needed, but NO chopping after noon, NO evening prep
- [ ] Friday is STRICTLY no-prep at any time - must use pre-prepped ingredients from Monday or Thursday AM
- [ ] Tuesday/Wednesday/Thursday/Friday lunch components ALL prepped on Monday

**Freezer Backup:**
- [ ] Freezer backup status section included (3 current backup meals listed)
- [ ] At least one dinner identified for batch cooking (make 2x, freeze half)
- [ ] Batch cooking opportunities noted in Monday or Tuesday prep tasks

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

## Automated Workflow

**The workflow is now fully automated via `./mealplan next` command.**

The system automatically:
- Detects current state from input files
- Creates new weeks when previous week is complete
- Generates farmers market vegetable proposals
- Generates meal plans with all constraints
- Updates history.yml
- **Input file cleanup:** Once a meal plan is successfully created and finalized, the corresponding `inputs/YYYY-MM-DD.yml` file can be deleted as it's no longer needed

You may be asked to:
- Review and refine generated meal plans
- Add specific lunch prep suggestions
- Expand on from-scratch recipe rationales
- Handle edge cases or constraint conflicts

## Manual Workflow (If Needed)

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
