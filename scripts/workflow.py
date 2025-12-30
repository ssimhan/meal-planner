#!/usr/bin/env python3
"""
Streamlined Meal Planner Workflow - Single Entry Point
Automatically detects current state and guides through next steps.

Usage:
    python3 scripts/workflow.py           # Auto-detect next step
    python3 scripts/workflow.py --status  # Show current state
    python3 scripts/workflow.py --reset   # Start new week
"""

import sys
import yaml
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter
from lunch_selector import LunchSelector


# ============================================================================
# State Management
# ============================================================================

def get_next_monday():
    """Calculate the date of the next Monday (or current week's Monday if it's early in the week)."""
    today = datetime.now()
    days_ahead = 0 - today.weekday()  # Monday is 0

    # If today is Monday-Wednesday, use this week's Monday
    # If today is Thursday-Sunday, use next week's Monday
    if today.weekday() >= 3:  # Thursday (3) or later
        if days_ahead <= 0:
            days_ahead += 7

    next_monday = today + timedelta(days=days_ahead)
    return next_monday.date()


def find_current_week_file():
    """Find the input file for the current or next week.

    Priority:
    1. Look for incomplete weeks (not plan_complete)
    2. If all weeks are complete or no files exist, return next Monday
    """
    inputs_dir = Path('inputs')
    if not inputs_dir.exists():
        next_monday = get_next_monday()
        week_str = next_monday.strftime('%Y-%m-%d')
        return None, week_str

    # Get all input files and check their status
    input_files = sorted(inputs_dir.glob('*.yml'))

    for input_file in input_files:
        with open(input_file, 'r') as f:
            data = yaml.safe_load(f)

        # Check if this week is not yet complete
        status = data.get('workflow', {}).get('status', 'intake_complete')
        if status != 'plan_complete':
            week_str = data.get('week_of')
            return input_file, week_str

    # All weeks are complete, calculate next Monday
    next_monday = get_next_monday()

    # Make sure we're not proposing a week that already exists
    if input_files:
        # Get the most recent week
        last_file = input_files[-1]
        with open(last_file, 'r') as f:
            last_data = yaml.safe_load(f)
        last_week_str = last_data.get('week_of')
        last_week_date = datetime.strptime(last_week_str, '%Y-%m-%d').date()

        # Propose the week after the last one (always next Monday after last week)
        next_monday = last_week_date + timedelta(days=7)

    week_str = next_monday.strftime('%Y-%m-%d')
    return None, week_str


def get_workflow_state(input_file):
    """Determine current workflow state from input file."""
    if not input_file or not input_file.exists():
        return 'new_week', None

    with open(input_file, 'r') as f:
        data = yaml.safe_load(f)

    # Check workflow status
    status = data.get('workflow', {}).get('status', 'intake_complete')

    if status == 'intake_complete':
        # Check if farmers market is confirmed
        fm_status = data.get('farmers_market', {}).get('status')
        if fm_status == 'confirmed':
            return 'ready_to_plan', data
        else:
            return 'awaiting_farmers_market', data
    elif status == 'plan_complete':
        return 'week_complete', data
    else:
        return 'new_week', None


# ============================================================================
# Workflow Steps
# ============================================================================

def create_new_week(week_str):
    """Create a new weekly input file with default values."""
    print("\n" + "="*60)
    print(f"CREATING NEW WEEK: {week_str}")
    print("="*60)

    # Generate farmers market proposal
    history_path = Path('data/history.yml')
    index_path = Path('recipes/index.yml')

    proposed_veg, staples = generate_farmers_market_proposal(history_path, index_path)

    # Create input file
    input_data = {
        'week_of': week_str,
        'timezone': 'America/Los_Angeles',
        'workflow': {
            'status': 'intake_complete',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
        },
        'schedule': {
            'office_days': ['mon', 'wed', 'fri'],
            'busy_days': ['thu', 'fri'],
            'late_class_days': [],
        },
        'preferences': {
            'vegetarian': True,
            'avoid_ingredients': ['eggplant', 'mushrooms', 'green_cabbage'],
            'novelty_recipe_limit': 1,
        },
        'farmers_market': {
            'status': 'proposed',
            'proposed_veg': proposed_veg + staples,
            'confirmed_veg': [],
        }
    }

    # Write file
    inputs_dir = Path('inputs')
    inputs_dir.mkdir(exist_ok=True)
    output_file = inputs_dir / f'{week_str}.yml'

    with open(output_file, 'w') as f:
        yaml.dump(input_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print(f"\n✓ Created: {output_file}")
    print(f"\n📝 Proposed Farmers Market List:")
    for veg in proposed_veg + staples:
        print(f"   • {veg}")

    print(f"\n📋 NEXT STEPS:")
    print(f"   1. Review the proposed vegetables in: {output_file}")
    print(f"   2. Go to farmers market and shop")
    print(f"   3. Update 'confirmed_veg' with what you actually bought")
    print(f"   4. Change 'status' from 'proposed' to 'confirmed'")
    print(f"   5. Run this script again: python3 scripts/workflow.py")


def prompt_farmers_market_update(input_file, data):
    """Guide user to update farmers market confirmation."""
    print("\n" + "="*60)
    print(f"AWAITING FARMERS MARKET CONFIRMATION")
    print("="*60)

    proposed = data.get('farmers_market', {}).get('proposed_veg', [])

    print(f"\n📝 Proposed vegetables:")
    for veg in proposed:
        print(f"   • {veg}")

    print(f"\n📋 NEXT STEPS:")
    print(f"   1. Go to farmers market and shop")
    print(f"   2. Open: {input_file}")
    print(f"   3. Update 'confirmed_veg' with vegetables you bought")
    print(f"   4. Change 'status: proposed' to 'status: confirmed'")
    print(f"   5. Run this script again: python3 scripts/workflow.py")
    print(f"\n💡 TIP: You can copy the proposed list and remove items you didn't get")


def generate_meal_plan(input_file, data):
    """Generate the weekly meal plan."""
    print("\n" + "="*60)
    print(f"GENERATING MEAL PLAN")
    print("="*60)

    week_of = data['week_of']

    # Load recipes
    print("\n[1/5] Loading recipe index...")
    index_path = Path('recipes/index.yml')
    with open(index_path, 'r') as f:
        recipes = yaml.safe_load(f)
    print(f"  ✓ Loaded {len(recipes)} recipes")

    # Load history
    print("\n[2/5] Loading meal history...")
    history_path = Path('data/history.yml')
    history = load_history(history_path)
    recent_recipes = get_recent_recipes(history, lookback_weeks=3)
    print(f"  ✓ {len(recent_recipes)} recipes used in last 3 weeks")

    # Filter recipes
    print("\n[3/5] Filtering recipes...")
    filtered = filter_recipes(recipes, data, recent_recipes)
    print(f"  ✓ {len(filtered)} recipes available")

    # Select dinners
    print("\n[4/5] Selecting dinners...")
    selected_dinners = select_dinners(filtered, data)

    days = ['mon', 'tue', 'wed', 'thu', 'fri']
    from_scratch_day = selected_dinners.get('from_scratch_day')

    for day in days:
        if day in selected_dinners:
            recipe = selected_dinners[day]
            marker = " 🌟 FROM SCRATCH" if from_scratch_day == day else ""
            print(f"  {day.upper()}: {recipe['name']}{marker}")

    # Select lunches based on dinner plan
    print("\n[4.5/5] Selecting lunches...")
    lunch_selector = LunchSelector(index_path)

    # Build dinner plan list for lunch selector
    dinner_plan_list = []
    for day in days:
        if day in selected_dinners:
            recipe = selected_dinners[day]
            dinner_plan_list.append({
                'recipe_id': recipe.get('id'),
                'recipe_name': recipe.get('name'),
                'day': day,
                'vegetables': recipe.get('main_veg', [])
            })

    selected_lunches = lunch_selector.select_weekly_lunches(
        dinner_plan=dinner_plan_list,
        week_of=week_of
    )

    for day in days:
        if day in selected_lunches:
            lunch = selected_lunches[day]
            print(f"  {day.upper()}: {lunch.recipe_name} ({lunch.prep_style})")

    # Generate plan file
    print("\n[5/5] Writing plan file...")
    plans_dir = Path('plans')
    plans_dir.mkdir(exist_ok=True)

    plan_file = plans_dir / f'{week_of}-weekly-plan.md'
    from_scratch_recipe = selected_dinners.get(from_scratch_day) if from_scratch_day else None
    plan_content = generate_plan_content(data, selected_dinners, from_scratch_recipe, selected_lunches)

    with open(plan_file, 'w') as f:
        f.write(plan_content)

    print(f"  ✓ Created: {plan_file}")

    # Update history
    print("\nUpdating history...")
    update_history(history_path, data, selected_dinners)
    print(f"  ✓ Updated: {history_path}")

    # Update workflow status (create if doesn't exist - for legacy files)
    if 'workflow' not in data:
        data['workflow'] = {
            'status': 'plan_complete',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
        }
    else:
        data['workflow']['status'] = 'plan_complete'
        data['workflow']['updated_at'] = datetime.now().isoformat()

    with open(input_file, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print(f"\n✅ PLAN COMPLETE!")
    print(f"\n📄 View your plan: {plan_file}")
    print(f"\n📋 NEXT STEPS:")
    print(f"   1. Review and refine the meal plan")
    print(f"   2. When you're ready for next week, run: python3 scripts/workflow.py")


def show_week_complete(input_file, data):
    """Show completion status and prompt for next week."""
    week_of = data['week_of']
    plan_file = Path(f'plans/{week_of}-weekly-plan.md')

    print("\n" + "="*60)
    print(f"✅ WEEK {week_of} COMPLETE")
    print("="*60)

    if plan_file.exists():
        print(f"\n📄 Plan: {plan_file}")

    print(f"\n📋 NEXT STEPS:")
    print(f"   • When you're ready to plan next week, run:")
    print(f"     python3 scripts/workflow.py --reset")


# ============================================================================
# Helper Functions (from mealplan.py)
# ============================================================================

def generate_farmers_market_proposal(history_path, index_path):
    """Generate a proposed farmers market vegetable list."""
    recent_veg = set()
    if history_path.exists():
        with open(history_path, 'r') as f:
            history = yaml.safe_load(f)
            if history and 'weeks' in history:
                for week in history['weeks'][-2:]:
                    for dinner in week.get('dinners', []):
                        recent_veg.update(dinner.get('vegetables', []))

    common_veg = Counter()
    if index_path.exists():
        with open(index_path, 'r') as f:
            recipes = yaml.safe_load(f)
            for recipe in recipes:
                main_veg = recipe.get('main_veg', [])
                common_veg.update(main_veg)

    top_veg = [veg for veg, count in common_veg.most_common(20)
               if veg not in recent_veg and veg not in ['garlic', 'onion', 'ginger']]

    current_month = datetime.now().month

    seasonal = []
    if current_month in [12, 1, 2]:
        seasonal = ['broccoli', 'cauliflower', 'kale', 'sweet potato', 'carrot', 'brussels sprouts']
    elif current_month in [3, 4, 5]:
        seasonal = ['asparagus', 'spinach', 'peas', 'lettuce', 'radish', 'green beans']
    elif current_month in [6, 7, 8]:
        seasonal = ['tomato', 'zucchini', 'bell pepper', 'corn', 'cucumber', 'green beans']
    else:
        seasonal = ['squash', 'sweet potato', 'kale', 'brussels sprouts', 'cauliflower', 'broccoli']

    proposed = []
    for veg in seasonal:
        if veg in top_veg:
            proposed.append(veg)
        if len(proposed) >= 5:
            break

    for veg in top_veg:
        if veg not in proposed:
            proposed.append(veg)
        if len(proposed) >= 6:
            break

    staples = ['onion', 'garlic', 'cilantro']
    return proposed, staples


def load_history(history_path):
    """Load the meal plan history."""
    if not history_path.exists():
        return {'weeks': []}

    with open(history_path, 'r') as f:
        history = yaml.safe_load(f)

    if not history or 'weeks' not in history:
        return {'weeks': []}

    return history


def get_recent_recipes(history, lookback_weeks=3):
    """Get recipe IDs used in the last N weeks."""
    recent = set()
    if not history or 'weeks' not in history:
        return recent

    for week in history['weeks'][-lookback_weeks:]:
        for dinner in week.get('dinners', []):
            if 'recipe_id' in dinner:
                recent.add(dinner['recipe_id'])

    return recent


def filter_recipes(recipes, inputs, recent_recipes):
    """Filter recipes for dinner."""
    filtered = []
    avoid_ingredients = set(inputs.get('preferences', {}).get('avoid_ingredients', []))

    dinner_meal_types = {
        'tacos_wraps', 'pasta_noodles', 'soup_stew', 'grain_bowl',
        'sandwich', 'salad', 'stir_fry', 'pizza', 'casserole', 'appetizer'
    }

    for recipe in recipes:
        if recipe['id'] in recent_recipes:
            continue

        if any(ing in avoid_ingredients for ing in recipe.get('avoid_contains', [])):
            continue

        recipe_meal_type = recipe.get('meal_type')
        if recipe_meal_type == 'unknown' or recipe_meal_type not in dinner_meal_types:
            continue

        filtered.append(recipe)

    return filtered


def select_dinners(filtered_recipes, inputs):
    """Select 5 dinners for Mon-Fri based on constraints."""
    busy_days = set(inputs.get('schedule', {}).get('busy_days', []))

    no_chop_recipes = [r for r in filtered_recipes if r.get('no_chop_compatible', False)]
    normal_recipes = [r for r in filtered_recipes if r.get('effort_level') == 'normal']
    all_other_recipes = [r for r in filtered_recipes
                         if not r.get('no_chop_compatible', False)
                         and r.get('effort_level') != 'normal']

    used_meal_types = set()
    selected = {}
    days = ['mon', 'tue', 'wed', 'thu', 'fri']

    # Select from scratch recipe
    non_busy_days = [d for d in days if d not in busy_days]

    if non_busy_days:
        for r in normal_recipes:
            meal_type = r.get('meal_type')
            if meal_type not in used_meal_types:
                from_scratch_day = non_busy_days[0]
                used_meal_types.add(meal_type)
                normal_recipes.remove(r)
                selected[from_scratch_day] = r
                selected['from_scratch_day'] = from_scratch_day
                break

    # Handle busy days
    for day in days:
        if day in busy_days and day not in selected:
            recipe = None
            for r in no_chop_recipes:
                meal_type = r.get('meal_type')
                if meal_type not in used_meal_types:
                    recipe = r
                    used_meal_types.add(meal_type)
                    no_chop_recipes.remove(r)
                    break

            if recipe:
                selected[day] = recipe

    # Fill remaining days
    remaining_days = [d for d in days if d not in selected]
    all_available = normal_recipes + all_other_recipes + no_chop_recipes

    for day in remaining_days:
        recipe = None
        for r in all_available:
            meal_type = r.get('meal_type')
            if meal_type not in used_meal_types:
                recipe = r
                used_meal_types.add(meal_type)
                all_available.remove(r)
                break

        if recipe:
            selected[day] = recipe

    return selected


def generate_plan_content(inputs, selected_dinners, from_scratch_recipe=None, selected_lunches=None):
    """Generate the weekly plan markdown content."""
    week_of = inputs['week_of']
    confirmed_veg = inputs.get('farmers_market', {}).get('confirmed_veg', [])
    late_class_days = inputs.get('schedule', {}).get('late_class_days', [])
    busy_days = set(inputs.get('schedule', {}).get('busy_days', []))

    # Handle legacy calls without selected_lunches
    if selected_lunches is None:
        selected_lunches = {}

    week_start = datetime.strptime(week_of, '%Y-%m-%d').date()
    week_end = week_start + timedelta(days=4)
    date_range = f"{week_start.strftime('%B %d')} - {week_end.strftime('%B %d, %Y')}"

    lines = []
    lines.append(f"# Weekly Meal Plan: {date_range}\n")

    lines.append("## Farmers Market Shopping List\n")
    for veg in confirmed_veg:
        lines.append(f"- {veg}")
    lines.append("")

    # Freezer backup section
    lines.append("## Freezer Backup Status\n")
    lines.append("Current backup meals in freezer:")
    lines.append("1. [Update with current backup meal 1] - [Date frozen]")
    lines.append("2. [Update with current backup meal 2] - [Date frozen]")
    lines.append("3. [Update with current backup meal 3] - [Date frozen]")
    lines.append("")
    lines.append("**This week's batch cooking:** [Identify which dinner to double and freeze]\n")

    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    day_abbr = ['mon', 'tue', 'wed', 'thu', 'fri']

    # Lunch templates with variety and repeatable defaults
    lunch_templates = [
        "Veggie quesadillas with cheese and beans",
        "Pasta salad with vegetables and Italian dressing",
        "Grilled cheese sandwiches with tomato soup",
        "Mini bagels with cream cheese and veggie sticks",
        "Peanut butter and jelly sandwiches with veggie straws"
    ]

    # Repeatable lunch defaults (kids)
    lunch_defaults = [
        "PBJ on whole wheat",
        "Egg sandwich",
        "Ravioli with butter",
        "Chapati roll with fruit",
        "Veggie burrito"
    ]

    snack_templates = [
        "Apple slices with peanut butter, cheese sticks, crackers",
        "Carrot sticks with hummus, pretzels, fruit cups",
        "Yogurt with granola, banana, trail mix",
        "String cheese, graham crackers, grapes",
        "Popcorn, orange slices, rice cakes with almond butter"
    ]

    # Energy levels for each day
    energy_levels = {
        'mon': 'MAIN PREP DAY',
        'tue': 'MILD PREP DAY',
        'wed': 'MILD PREP DAY',
        'thu': 'MORNING PREP OK',
        'fri': 'NO PREP DAY'
    }

    for i, (day_name, day_key) in enumerate(zip(days, day_abbr)):
        # Add day header with markers
        if day_key == 'fri':
            lines.append(f"## {day_name} - **NO-PREP DAY**\n")
        elif day_key == 'thu':
            lines.append(f"## {day_name} - **MORNING PREP OK**\n")
        else:
            lines.append(f"## {day_name}\n")

        if day_key in selected_dinners:
            recipe = selected_dinners[day_key]
            cuisine = recipe.get('cuisine', 'unknown')
            meal_type = recipe.get('meal_type', 'unknown')
            main_veg = recipe.get('main_veg', [])

            lines.append(f"**Dinner:** {recipe['name']} ({cuisine} {meal_type})")
            lines.append(f"- Main vegetables: {', '.join(main_veg) if main_veg else 'none'}")

            # Add prep notes with batch cooking opportunities
            if day_key == 'mon' and meal_type in ['curry', 'soup_stew', 'pasta_noodles']:
                lines.append("- Prep notes: Consider making 2x batch and freeze half for backup")
            elif day_key in ['tue', 'wed']:
                lines.append("- Prep notes: All vegetables prepped Monday - just cook and assemble")
            elif day_key == 'thu':
                if recipe.get('no_chop_compatible', False):
                    lines.append("- Prep notes: NO CHOPPING - using pre-prepped ingredients from Monday")
                else:
                    lines.append("- Prep notes: Can prep in morning (8-9am) if needed - NO chopping after noon, NO evening prep")
            elif day_key == 'fri':
                if recipe.get('no_chop_compatible', False):
                    lines.append("- Prep notes: NO PREP - using pre-prepped ingredients from Monday or Thursday AM")
                else:
                    lines.append("- Prep notes: ⚠️ WARNING: This recipe requires chopping but Friday is strictly no-prep!")

            # Add evening assembly note
            if day_key in busy_days:
                lines.append("- **Evening assembly (5-9pm):** Reheat and serve only")
            else:
                lines.append("- **Evening assembly (5-9pm):** [Minimal tasks - assemble, heat, serve]")

            lines.append("")

        # Add lunch suggestions
        if day_key in selected_lunches:
            lunch = selected_lunches[day_key]

            if lunch.default_option:
                # Using default option
                lines.append(f"**Lunch:** {lunch.recipe_name} (2 kids + 1 adult)")
                lines.append(f"- **Repeatable default** - no recipe needed")
                lines.append(f"- Prep: {lunch.assembly_notes}")
            else:
                # Using actual recipe
                lines.append(f"**Lunch:** {lunch.recipe_name} (2 kids + 1 adult)")
                if lunch.kid_friendly:
                    lines.append(f"- 👶 Kid-friendly")

                if lunch.prep_components:
                    lines.append(f"- Components: {', '.join(lunch.prep_components)}")
                else:
                    lines.append(f"- Components: Fresh ingredients")

                lines.append(f"- Prep: {lunch.assembly_notes}")

                if lunch.reuses_ingredients:
                    lines.append(f"- ♻️  Reuses dinner ingredients: {', '.join(lunch.reuses_ingredients)}")

                # Add suggested default fallback
                fallback = lunch_defaults[i % len(lunch_defaults)]
                lines.append(f"- Or use repeatable default: **{fallback}**")
        else:
            # Fallback to old template if no lunch selected
            lunch_variety = lunch_templates[i % len(lunch_templates)]
            lunch_default = lunch_defaults[i % len(lunch_defaults)]
            lines.append(f"**Lunch:** {lunch_variety} (2 kids + 1 adult)")
            lines.append(f"- Or use repeatable default: **{lunch_default}**")
            lines.append("- Components: [List specific ingredients needed]")
            if i >= 3:  # Thursday/Friday
                lines.append("- Prep: **ALL components prepped Monday** - assemble only")
            else:
                lines.append("- Prep: Prepare fresh or day-of")

        lines.append("")

        # Add snack ideas
        snacks = snack_templates[i % len(snack_templates)]
        lines.append(f"**Snack Ideas:** {snacks}\n")

        # Add daily prep tasks
        if day_key == 'mon':
            lines.append(f"**{day_name} Prep Tasks ({energy_levels[day_key]}):**")
            lines.append("- Chop ALL vegetables for entire week (Mon-Fri dinners): [List specific vegetables from recipes]")
            lines.append("- Batch cooking: [Identify freezer-friendly dinner to double]")
            lines.append("- Prep ALL lunch components for Tue/Wed/Thu/Fri: [Cook pasta, boil eggs, etc.]")
            lines.append("- Pre-cook any components needed for Thu/Fri no-prep dinners")
            lines.append("- Portion snacks into grab-and-go containers for entire week\n")
        elif day_key == 'tue':
            lines.append(f"**{day_name} Prep Tasks ({energy_levels[day_key]}):**")
            lines.append("- NO chopping - all vegetables already prepped Monday")
            lines.append("- Assemble Tuesday lunch in morning")
            lines.append("- Portion already-cooked items if needed")
            lines.append("- Check freezer backup inventory - do we have 3 meals?\n")
        elif day_key == 'wed':
            lines.append(f"**{day_name} Prep Tasks ({energy_levels[day_key]}):**")
            lines.append("- NO chopping - all vegetables already prepped Monday")
            lines.append("- Portion already-cooked food if needed")
            lines.append("- Load Instant Pot if using for Thursday")
            lines.append("- Verify all Thursday/Friday lunch components are ready\n")
        elif day_key == 'thu':
            lines.append(f"**{day_name} Prep Tasks ({energy_levels[day_key]}):**")
            lines.append("- Morning (8-9am): Light prep allowed if needed - chop 1-2 vegetables, cook components")
            lines.append("- **NO chopping after noon**")
            lines.append("- **NO evening prep** - only reheating, simple assembly")
            lines.append("- Fallback: Use freezer backup if needed\n")
        elif day_key == 'fri':
            lines.append(f"**{day_name} Prep Tasks ({energy_levels[day_key]}):**")
            lines.append("- **NO chopping allowed at any time**")
            lines.append("- **NO cooking allowed** - only reheating")
            lines.append("- Only reheating and simple assembly using Monday or Thursday AM prep")
            lines.append("- Fallback: Use freezer backup if needed\n")

        if day_key in late_class_days:
            lines.append(f"### Heavy Snack ({day_name} - Late Class Day)\n")
            lines.append("- Format: Fruit + protein/fat")
            lines.append("- Examples: Apple slices + cheese, banana + peanut butter, crackers + cheese\n")

    if from_scratch_recipe:
        lines.append("## From Scratch Recipe This Week\n")
        lines.append(f"**{from_scratch_recipe['name']}** - [Brief rationale for why this recipe was chosen]\n")

    # Add repeatable lunch defaults section
    lines.append("## Repeatable Lunch Defaults (Kids)\n")
    lines.append("These can be rotated and repeated - no need for variety every week:")
    lines.append("- PBJ (whole wheat bread, natural peanut butter, fruit-only jam)")
    lines.append("- Egg sandwich or scrambled egg sandwich")
    lines.append("- Toad-in-a-hole (egg cooked in bread slice)")
    lines.append("- Ravioli with brown butter or simple tomato sauce")
    lines.append("- Chapati or dosa rolls with fruit")
    lines.append("- Veggie burrito or pizza roll")
    lines.append("- Quesadilla with cheese and beans\n")
    lines.append("**Adult Lunch Defaults:**")
    lines.append("- Leftovers from previous night's dinner (preferred)")
    lines.append("- Grain bowl: prepped grain + roasted vegetables + protein (eggs, beans, paneer)")
    lines.append("- Salad with dinner components\n")

    lines.append("## Energy-Based Prep Summary\n")
    lines.append("### Sunday (Grocery Day)")
    lines.append("- Farmers market shopping")
    lines.append("- Regular grocery shopping")
    lines.append("- Put away groceries")
    lines.append("- **No cooking** - rest day\n")
    lines.append("### Monday (MAIN PREP DAY)")
    lines.append("**Goal:** Do ALL prep work for the entire week")
    lines.append("- Chop ALL vegetables for Mon-Fri dinners (nothing should require chopping after Monday)")
    lines.append("- Batch cook freezer-friendly dinner (make 2x, freeze half)")
    lines.append("- Prep ALL lunch components for Tue/Wed/Thu/Fri")
    lines.append("- Pre-cook any components needed for Thu/Fri no-prep dinners")
    lines.append("- Portion snacks into containers for entire week\n")
    lines.append("### Tuesday (MILD PREP DAY)")
    lines.append("**Goal:** Minimal effort - just assembly and organization")
    lines.append("- NO chopping - everything already prepped Monday")
    lines.append("- Assemble Tuesday lunch in morning")
    lines.append("- Check freezer backup inventory (3 meals?)\n")
    lines.append("### Wednesday (MILD PREP DAY)")
    lines.append("**Goal:** Minimal effort - verify everything ready for Thu/Fri")
    lines.append("- NO chopping - everything already prepped Monday")
    lines.append("- Load Instant Pot if using for Thursday")
    lines.append("- Verify Thu/Fri lunch components are ready\n")
    lines.append("### Thursday (MORNING PREP OK)")
    lines.append("**Goal:** Use morning energy if needed, protect evening")
    lines.append("- Morning (8-9am): Light prep allowed - chop 1-2 vegetables, cook components")
    lines.append("- **NO chopping after noon**")
    lines.append("- **NO evening prep** - only reheating and assembly")
    lines.append("- Evening (5-9pm): Device-free, dinner ready with minimal assembly")
    lines.append("- Fallback: Use freezer backup\n")
    lines.append("### Friday (NO PREP DAY - STRICT)")
    lines.append("**Goal:** Zero prep at any time - survive to the weekend")
    lines.append("- **NO chopping allowed at any time** (morning, afternoon, evening)")
    lines.append("- **NO cooking allowed** - only reheating")
    lines.append("- Only reheating and assembly using Monday or Thursday AM prep")
    lines.append("- Evening (5-9pm): Device-free, dinner ready with minimal assembly")
    lines.append("- Fallback: Use freezer backup")

    return '\n'.join(lines)


def update_history(history_path, inputs, selected_dinners):
    """Update history.yml with the new week's dinners."""
    history = load_history(history_path)

    week_of = inputs['week_of']
    new_week = {
        'week_of': week_of,
        'dinners': []
    }

    days = ['mon', 'tue', 'wed', 'thu', 'fri']
    for day in days:
        if day in selected_dinners:
            recipe = selected_dinners[day]
            new_week['dinners'].append({
                'recipe_id': recipe['id'],
                'cuisine': recipe.get('cuisine'),
                'meal_type': recipe.get('meal_type'),
                'day': day,
                'vegetables': recipe.get('main_veg', [])
            })

    history['weeks'].append(new_week)

    with open(history_path, 'w') as f:
        yaml.dump(history, f, default_flow_style=False, sort_keys=False, allow_unicode=True)


# ============================================================================
# Main Entry Point
# ============================================================================

def show_status():
    """Show current workflow status."""
    input_file, week_str = find_current_week_file()
    state, data = get_workflow_state(input_file)

    print("\n" + "="*60)
    print("MEAL PLANNER WORKFLOW STATUS")
    print("="*60)

    if state == 'new_week':
        print(f"\n📅 Next week starts: {week_str}")
        print(f"📝 Status: Ready to create new week")
    elif state == 'awaiting_farmers_market':
        print(f"\n📅 Week: {week_str}")
        print(f"📝 Status: Awaiting farmers market confirmation")
        print(f"📄 File: {input_file}")
    elif state == 'ready_to_plan':
        print(f"\n📅 Week: {week_str}")
        print(f"📝 Status: Ready to generate meal plan")
        print(f"📄 File: {input_file}")
    elif state == 'week_complete':
        print(f"\n📅 Week: {week_str}")
        print(f"📝 Status: ✅ Complete")
        print(f"📄 File: {input_file}")
        plan_file = Path(f'plans/{week_str}-weekly-plan.md')
        if plan_file.exists():
            print(f"📄 Plan: {plan_file}")


def main():
    """Main workflow orchestrator."""
    # Check for flags
    if '--status' in sys.argv:
        show_status()
        return

    if '--reset' in sys.argv:
        # Force create new week
        _, week_str = find_current_week_file()
        create_new_week(week_str)
        return

    # Auto-detect state and execute next step
    input_file, week_str = find_current_week_file()
    state, data = get_workflow_state(input_file)

    if state == 'new_week':
        create_new_week(week_str)
    elif state == 'awaiting_farmers_market':
        prompt_farmers_market_update(input_file, data)
    elif state == 'ready_to_plan':
        generate_meal_plan(input_file, data)
    elif state == 'week_complete':
        show_week_complete(input_file, data)


if __name__ == "__main__":
    main()
