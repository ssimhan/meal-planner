#!/usr/bin/env python3
"""
Meal Planner CLI - Entry point for meal planning workflows

Usage:
    python scripts/mealplan.py intake    # Create weekly input file (Phase 2)
    python scripts/mealplan.py plan      # Generate meal plan (Phase 3)
"""

import sys
import yaml
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter


# ============================================================================
# Intake Command - Phase 2
# ============================================================================

def get_next_monday():
    """Calculate the date of the next Monday."""
    today = datetime.now()
    days_ahead = 0 - today.weekday()  # Monday is 0
    if days_ahead <= 0:  # Target day already happened this week
        days_ahead += 7
    next_monday = today + timedelta(days=days_ahead)
    return next_monday.date()


def prompt_week_start():
    """Prompt user for week start date with next Monday as default."""
    default_date = get_next_monday()

    print("\n" + "="*60)
    print("WEEK START DATE")
    print("="*60)
    print(f"Default: {default_date.strftime('%Y-%m-%d')} (next Monday)")

    while True:
        response = input("Week start date (YYYY-MM-DD) or press Enter for default: ").strip()

        if not response:
            return default_date

        try:
            date = datetime.strptime(response, '%Y-%m-%d').date()
            return date
        except ValueError:
            print("Invalid date format. Please use YYYY-MM-DD")


def prompt_days(prompt_text, default_days):
    """Prompt user for days of the week with defaults."""
    valid_days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    default_str = ', '.join(default_days)

    print(f"\n{prompt_text}")
    print(f"Default: {default_str}")
    print("Options: mon, tue, wed, thu, fri, sat, sun")
    print("Enter days separated by commas (or press Enter for default)")

    while True:
        response = input("> ").strip().lower()

        if not response:
            return default_days

        days = [d.strip() for d in response.split(',')]

        # Validate all days
        if all(d in valid_days for d in days):
            return days
        else:
            invalid = [d for d in days if d not in valid_days]
            print(f"Invalid days: {', '.join(invalid)}")
            print("Please use: mon, tue, wed, thu, fri, sat, sun")


def prompt_yes_no(prompt_text, default=None):
    """Prompt user for yes/no response."""
    if default is True:
        prompt_suffix = " (Y/n): "
    elif default is False:
        prompt_suffix = " (y/N): "
    else:
        prompt_suffix = " (y/n): "

    while True:
        response = input(prompt_text + prompt_suffix).strip().lower()

        if not response and default is not None:
            return default

        if response in ['y', 'yes']:
            return True
        elif response in ['n', 'no']:
            return False
        else:
            print("Please answer 'y' or 'n'")


def prompt_special_events():
    """Prompt user for special events (dinners out, travel, etc.)."""
    print("\n" + "="*60)
    print("SPECIAL EVENTS (optional)")
    print("="*60)
    print("Do you have any special events this week?")
    print("Examples: dinner out, traveling, guests, celebrations")

    events = []

    if prompt_yes_no("Add special events?", default=False):
        while True:
            day = input("\nDay (mon/tue/wed/thu/fri/sat/sun): ").strip().lower()
            if day not in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']:
                print("Invalid day")
                continue

            description = input("Event description: ").strip()
            if not description:
                print("Description required")
                continue

            events.append({'day': day, 'description': description})

            if not prompt_yes_no("Add another event?", default=False):
                break

    return events


def generate_farmers_market_proposal(history_path, index_path):
    """Generate a proposed farmers market vegetable list."""

    # Load history to see what vegetables were used recently
    recent_veg = set()
    if history_path.exists():
        with open(history_path, 'r') as f:
            history = yaml.safe_load(f)
            if history and 'weeks' in history:
                # Get last 2 weeks of vegetables (if available)
                for week in history['weeks'][-2:]:
                    for dinner in week.get('dinners', []):
                        recent_veg.update(dinner.get('vegetables', []))

    # Load recipe index to see what vegetables are commonly used
    common_veg = Counter()
    if index_path.exists():
        with open(index_path, 'r') as f:
            recipes = yaml.safe_load(f)
            for recipe in recipes:
                main_veg = recipe.get('main_veg', [])
                common_veg.update(main_veg)

    # Get top vegetables from recipes (excluding recent ones)
    top_veg = [veg for veg, count in common_veg.most_common(20)
               if veg not in recent_veg and veg not in ['garlic', 'onion', 'ginger']]

    # Seasonal suggestions (simplified for v1)
    current_month = datetime.now().month

    # Winter (Dec-Feb): 12, 1, 2
    # Spring (Mar-May): 3, 4, 5
    # Summer (Jun-Aug): 6, 7, 8
    # Fall (Sep-Nov): 9, 10, 11

    seasonal = []
    if current_month in [12, 1, 2]:
        seasonal = ['broccoli', 'cauliflower', 'kale', 'sweet potato', 'carrot', 'brussels sprouts']
    elif current_month in [3, 4, 5]:
        seasonal = ['asparagus', 'spinach', 'peas', 'lettuce', 'radish', 'green beans']
    elif current_month in [6, 7, 8]:
        seasonal = ['tomato', 'zucchini', 'bell pepper', 'corn', 'cucumber', 'green beans']
    else:  # Fall
        seasonal = ['squash', 'sweet potato', 'kale', 'brussels sprouts', 'cauliflower', 'broccoli']

    # Combine seasonal and top vegetables
    proposed = []
    for veg in seasonal:
        if veg in top_veg:
            proposed.append(veg)
        if len(proposed) >= 5:
            break

    # Fill remaining spots with top vegetables
    for veg in top_veg:
        if veg not in proposed:
            proposed.append(veg)
        if len(proposed) >= 6:
            break

    # Always include staples
    staples = ['onion', 'garlic', 'cilantro']

    return proposed, staples


def run_intake():
    """Run the intake command to create a weekly input file."""
    print("\n" + "="*60)
    print("MEAL PLANNER - WEEKLY INTAKE")
    print("="*60)
    print("This will create a new weekly input file with your schedule")
    print("and generate a farmers market vegetable proposal.")

    # 1. Get week start date
    week_start = prompt_week_start()
    week_str = week_start.strftime('%Y-%m-%d')

    # 2. Get schedule information
    print("\n" + "="*60)
    print("WEEKLY SCHEDULE")
    print("="*60)

    office_days = prompt_days("Office days (in-person work):", ['mon', 'wed', 'fri'])
    busy_days = prompt_days("Busy days (need quick/easy meals):", ['thu', 'fri'])
    late_class_days = prompt_days("Late class days (need heavy snack):", [])

    # 3. Get special events
    special_events = prompt_special_events()

    # 4. Generate farmers market proposal
    print("\n" + "="*60)
    print("FARMERS MARKET PROPOSAL")
    print("="*60)
    print("Generating vegetable suggestions based on:")
    print("  - Seasonal availability")
    print("  - Recipe requirements")
    print("  - Recent usage (avoiding repetition)")

    history_path = Path('data/history.yml')
    index_path = Path('recipes/index.yml')

    proposed_veg, staples = generate_farmers_market_proposal(history_path, index_path)

    print("\nProposed vegetables:")
    for veg in proposed_veg:
        print(f"  • {veg}")

    print("\nStaple ingredients (always get):")
    for veg in staples:
        print(f"  • {veg}")

    # 5. Load config.yml for preferences and timezone
    config_path = Path('config.yml')
    if not config_path.exists():
        print(f"\n❌ Error: config.yml not found at {config_path.absolute()}")
        print("Please create config.yml based on config.example.yml")
        sys.exit(1)

    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)

    # 6. Create input file data structure
    input_data = {
        'week_of': week_str,
        'timezone': config.get('timezone', 'America/Los_Angeles'),
        'schedule': {
            'office_days': office_days,
            'busy_days': busy_days,
            'late_class_days': late_class_days,
        },
        'preferences': config.get('preferences', {}),
        'farmers_market': {
            'status': 'proposed',
            'proposed_veg': proposed_veg + staples,
            'confirmed_veg': [],
        }
    }

    # Add special events if any
    if special_events:
        input_data['special_events'] = special_events

    # 6. Write to file
    inputs_dir = Path('inputs')
    inputs_dir.mkdir(exist_ok=True)

    output_file = inputs_dir / f'{week_str}.yml'

    with open(output_file, 'w') as f:
        yaml.dump(input_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print("\n" + "="*60)
    print("INTAKE COMPLETE")
    print("="*60)
    print(f"Created: {output_file}")
    print("\nNext steps:")
    print("1. Review and edit the proposed vegetables in the input file")
    print("2. Update 'confirmed_veg' list after farmers market shopping")
    print("3. Change status from 'proposed' to 'confirmed'")
    print(f"4. Run: python scripts/mealplan.py plan inputs/{week_str}.yml")
    print("\nOr manually edit the file and confirm vegetables:")
    print(f"  vim {output_file}")


# ============================================================================
# Plan Command - Phase 3
# ============================================================================

def load_input_file(input_path):
    """Load and validate the input file."""
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    with open(input_path, 'r') as f:
        data = yaml.safe_load(f)

    # Validate required fields
    if 'week_of' not in data:
        print("Error: Input file missing 'week_of' field")
        sys.exit(1)

    # Check if farmers market is confirmed
    if data.get('farmers_market', {}).get('status') != 'confirmed':
        print("\nWarning: Farmers market status is not 'confirmed'")
        print("Please update 'confirmed_veg' and set status to 'confirmed' before generating plan")

        if not prompt_yes_no("Continue anyway?", default=False):
            sys.exit(0)

    return data


def load_recipes(index_path):
    """Load the recipe index."""
    if not index_path.exists():
        print(f"Error: Recipe index not found: {index_path}")
        print("Run 'python scripts/parse_recipes.py' first")
        sys.exit(1)

    with open(index_path, 'r') as f:
        recipes = yaml.safe_load(f)

    return recipes


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

    # Get last N weeks
    for week in history['weeks'][-lookback_weeks:]:
        for dinner in week.get('dinners', []):
            if 'recipe_ids' in dinner:
                recent.update(dinner['recipe_ids'])
            elif 'recipe_id' in dinner:
                recent.add(dinner['recipe_id'])

    return recent


def filter_recipes_by_meal_type(recipes, inputs, recent_recipes, meal_type='dinner'):
    """Filter recipes based on meal type (dinner, lunch, snack)."""
    filtered = []
    avoid_ingredients = set(inputs.get('preferences', {}).get('avoid_ingredients', []))

    # Define meal_types suitable for each context
    meal_type_categories = {
        'dinner': {
            'tacos_wraps', 'pasta_noodles', 'soup_stew', 'grain_bowl',
            'sandwich', 'salad', 'stir_fry', 'pizza', 'casserole', 'appetizer'
        },
        'lunch': {
            'sandwich', 'salad', 'grain_bowl', 'soup_stew', 'pasta_noodles', 'tacos_wraps'
        },
        'snack': {
            'snack_bar', 'baked_goods', 'frozen_treat', 'simple_snack', 'appetizer',
            'sauce_dip'
        },
        'breakfast': {
            'breakfast', 'baked_goods', 'snack_bar'
        }
    }

    allowed_meal_types = meal_type_categories.get(meal_type, set())

    for recipe in recipes:
        # Skip if used recently
        if recipe['id'] in recent_recipes:
            continue

        # Skip if contains avoided ingredients
        if any(ing in avoid_ingredients for ing in recipe.get('avoid_contains', [])):
            continue

        # Skip if meal_type is unknown (not categorized yet)
        recipe_meal_type = recipe.get('meal_type')
        if recipe_meal_type == 'unknown':
            continue

        # Check if meal_type matches context
        if recipe_meal_type not in allowed_meal_types:
            continue

        filtered.append(recipe)

    return filtered


def filter_recipes(recipes, inputs, recent_recipes):
    """Filter recipes for dinner (backward compatibility)."""
    return filter_recipes_by_meal_type(recipes, inputs, recent_recipes, meal_type='dinner')


def select_dinners(filtered_recipes, inputs):
    """Select 5 dinners for Mon-Fri based on constraints."""
    busy_days = set(inputs.get('schedule', {}).get('busy_days', []))
    confirmed_veg = set(inputs.get('farmers_market', {}).get('confirmed_veg', []))

    # Separate recipes into categories
    no_chop_recipes = [r for r in filtered_recipes if r.get('no_chop_compatible', False)]
    normal_recipes = [r for r in filtered_recipes if r.get('effort_level') == 'normal']
    all_other_recipes = [r for r in filtered_recipes
                         if not r.get('no_chop_compatible', False)
                         and r.get('effort_level') != 'normal']

    # Track used meal_types to avoid repetition (not cuisine!)
    used_meal_types = set()
    selected = {}
    days = ['mon', 'tue', 'wed', 'thu', 'fri']

    # Step 1: Select one "from scratch" recipe (normal effort) for a non-busy day
    from_scratch_recipe = None
    from_scratch_day = None
    non_busy_days = [d for d in days if d not in busy_days]

    if non_busy_days:
        for r in normal_recipes:
            meal_type = r.get('meal_type')
            if meal_type not in used_meal_types:
                from_scratch_recipe = r
                from_scratch_day = non_busy_days[0]  # Assign to first available non-busy day
                used_meal_types.add(meal_type)
                normal_recipes.remove(r)
                selected[from_scratch_day] = r
                selected['from_scratch_day'] = from_scratch_day
                break

    # Step 2: Handle busy days (Thu/Fri) - must be no_chop
    for day in days:
        if day in busy_days and day not in selected:
            # Try to find a no-chop recipe with unused meal_type
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
            else:
                print(f"Warning: Could not find no-chop recipe for {day}")

    # Step 3: Fill remaining days with other recipes
    remaining_days = [d for d in days if d not in selected]
    all_available = normal_recipes + all_other_recipes + no_chop_recipes

    for day in remaining_days:
        recipe = None

        # Try to find recipe with unused meal_type
        for r in all_available:
            meal_type = r.get('meal_type')
            if meal_type not in used_meal_types:
                recipe = r
                used_meal_types.add(meal_type)
                all_available.remove(r)
                break

        if recipe:
            selected[day] = recipe
        else:
            print(f"Warning: Could not find recipe for {day}")

    return selected


def generate_plan_content(inputs, selected_dinners, from_scratch_recipe=None):
    """Generate the weekly plan markdown content."""
    week_of = inputs['week_of']
    confirmed_veg = inputs.get('farmers_market', {}).get('confirmed_veg', [])
    late_class_days = inputs.get('schedule', {}).get('late_class_days', [])
    busy_days = set(inputs.get('schedule', {}).get('busy_days', []))

    # Calculate date range
    week_start = datetime.strptime(week_of, '%Y-%m-%d').date()
    week_end = week_start + timedelta(days=4)  # Mon-Fri
    date_range = f"{week_start.strftime('%B %d')} - {week_end.strftime('%B %d, %Y')}"

    lines = []
    lines.append(f"# Weekly Meal Plan: {date_range}\n")

    # Farmers market shopping list
    lines.append("## Farmers Market Shopping List\n")
    for veg in confirmed_veg:
        lines.append(f"- {veg}")
    lines.append("")

    # Days
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    day_abbr = ['mon', 'tue', 'wed', 'thu', 'fri']

    for i, (day_name, day_key) in enumerate(zip(days, day_abbr)):
        lines.append(f"## {day_name}\n")

        # Dinner
        if day_key in selected_dinners:
            recipe = selected_dinners[day_key]
            cuisine = recipe.get('cuisine', 'unknown')
            meal_type = recipe.get('meal_type', 'unknown')
            main_veg = recipe.get('main_veg', [])

            lines.append(f"**Dinner:** {recipe['name']} ({cuisine} {meal_type})")
            lines.append(f"- Main vegetables: {', '.join(main_veg) if main_veg else 'none'}")

            # Add prep notes for busy days
            if day_key in busy_days:
                if recipe.get('no_chop_compatible', False):
                    lines.append("- Prep notes: Quick no-chop meal")
                else:
                    lines.append("- Prep notes: Prep vegetables Wednesday evening")

            lines.append("")

        # Lunch prep
        lines.append("**Lunch Prep:** [Recipe for 2 kids + 1 adult]\n")

        # Heavy snack for late class days
        if day_key in late_class_days:
            lines.append(f"## Heavy Snack ({day_name} - Late Class Day)\n")
            lines.append("- [Substantial snack recipe]\n")

    # From scratch recipe section
    if from_scratch_recipe:
        lines.append("## From Scratch Recipe This Week\n")
        lines.append(f"**{from_scratch_recipe['name']}** - [Brief rationale for why this recipe was chosen]\n")

    # Prep-ahead notes
    lines.append("## Prep-Ahead Notes\n")
    lines.append("- **Sunday:** Grocery shopping, any Sunday prep tasks")
    lines.append("- **Wednesday evening:** Prep vegetables for Thursday/Friday if needed")

    return '\n'.join(lines)


def update_history(history_path, inputs, selected_dinners):
    """Update history.yml with the new week's dinners."""
    # Load existing history
    history = load_history(history_path)

    # Create new week entry
    week_of = inputs['week_of']
    new_week = {
        'week_of': week_of,
        'dinners': []
    }

    # Add dinners
    days = ['mon', 'tue', 'wed', 'thu', 'fri']
    for day in days:
        if day in selected_dinners:
            recipe = selected_dinners[day]
            new_week['dinners'].append({
                'recipe_ids': [recipe['id']],
                'cuisine': recipe.get('cuisine'),
                'meal_type': recipe.get('meal_type'),
                'day': day,
                'vegetables': recipe.get('main_veg', [])
            })

    # Append to history
    history['weeks'].append(new_week)

    # Write back to file
    with open(history_path, 'w') as f:
        yaml.dump(history, f, default_flow_style=False, sort_keys=False, allow_unicode=True)


def run_plan():
    """Run the plan command to generate a weekly meal plan."""
    # Parse command line arguments
    if len(sys.argv) < 3:
        print("Error: Input file required")
        print("\nUsage: python scripts/mealplan.py plan inputs/YYYY-MM-DD.yml")
        sys.exit(1)

    input_file = Path(sys.argv[2])

    print("\n" + "="*60)
    print("MEAL PLANNER - GENERATING WEEKLY PLAN")
    print("="*60)

    # 1. Load inputs
    print("\n[1/6] Loading input file...")
    inputs = load_input_file(input_file)
    week_of = inputs['week_of']
    print(f"  Week of: {week_of}")

    # 2. Load recipes
    print("\n[2/6] Loading recipe index...")
    index_path = Path('recipes/index.yml')
    recipes = load_recipes(index_path)
    print(f"  Loaded {len(recipes)} recipes")

    # 3. Load history
    print("\n[3/6] Loading meal history...")
    history_path = Path('data/history.yml')
    history = load_history(history_path)
    recent_recipes = get_recent_recipes(history, lookback_weeks=3)
    print(f"  {len(recent_recipes)} recipes used in last 3 weeks")

    # 4. Filter recipes
    print("\n[4/6] Filtering recipes based on constraints...")
    filtered = filter_recipes(recipes, inputs, recent_recipes)
    print(f"  {len(filtered)} recipes available after filtering")

    # 5. Select dinners
    print("\n[5/6] Selecting dinners for the week...")
    selected_dinners = select_dinners(filtered, inputs)

    # Identify from_scratch recipe
    from_scratch_recipe = None
    from_scratch_day = selected_dinners.get('from_scratch_day')
    if from_scratch_day:
        from_scratch_recipe = selected_dinners[from_scratch_day]

    # Display selections
    days = ['mon', 'tue', 'wed', 'thu', 'fri']
    for day in days:
        if day in selected_dinners:
            recipe = selected_dinners[day]
            marker = " [FROM SCRATCH]" if from_scratch_day == day else ""
            print(f"  {day.upper()}: {recipe['name']}{marker}")

    # 6. Generate plan file
    print("\n[6/6] Generating plan file...")
    plans_dir = Path('plans')
    plans_dir.mkdir(exist_ok=True)

    plan_file = plans_dir / f'{week_of}-weekly-plan.md'
    plan_content = generate_plan_content(inputs, selected_dinners, from_scratch_recipe)

    with open(plan_file, 'w') as f:
        f.write(plan_content)

    print(f"  Created: {plan_file}")

    # Update history
    print("\nUpdating history...")
    update_history(history_path, inputs, selected_dinners)
    print(f"  Updated: {history_path}")

    print("\n" + "="*60)
    print("PLAN GENERATION COMPLETE")
    print("="*60)
    print(f"\nView your plan: {plan_file}")
    print("\nNext steps:")
    print("  1. Review the generated plan")
    print("  2. Manually add lunch prep recipes")
    print("  3. Add heavy snack recipes if needed")
    print("  4. Refine the from-scratch recipe rationale")


# ============================================================================
# Main CLI
# ============================================================================

def main():
    """Main CLI entry point."""
    if len(sys.argv) < 2:
        print("Meal Planner CLI")
        print("\nUsage:")
        print("  python scripts/mealplan.py [command]")
        print("\nCommands:")
        print("  intake    Create weekly input file with schedule and preferences")
        print("  plan      Generate weekly meal plan from input file")
        print("\nCurrent Status:")
        print("  Phase 0-1: ✓ Complete (scaffolding + recipe parsing)")
        print("  Phase 2:   ✓ Complete (intake command)")
        print("  Phase 3:   ✓ Complete (plan command)")
        print("\nExample workflow:")
        print("  1. python scripts/mealplan.py intake")
        print("  2. Edit inputs/YYYY-MM-DD.yml to confirm vegetables")
        print("  3. python scripts/mealplan.py plan inputs/YYYY-MM-DD.yml")
        print("  4. python scripts/validate_plan.py plans/YYYY-MM-DD-weekly-plan.md inputs/YYYY-MM-DD.yml")
        sys.exit(1)

    command = sys.argv[1]

    if command == "intake":
        run_intake()
    elif command == "plan":
        run_plan()
    else:
        print(f"Unknown command: {command}")
        print("\nRun 'python scripts/mealplan.py' for usage information")
        sys.exit(1)


if __name__ == "__main__":
    main()
