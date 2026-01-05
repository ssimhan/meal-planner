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
import re
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter
from lunch_selector import LunchSelector


# ============================================================================
# State Management
# ============================================================================

def get_next_monday():
    """Calculate the date of the upcoming Monday (next week if we're past Saturday)."""
    today = datetime.now()

    # Calculate days until next Monday
    # weekday: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    days_until_monday = (7 - today.weekday()) % 7

    # If today is already Monday, get next Monday (7 days ahead)
    if days_until_monday == 0:
        days_until_monday = 7

    next_monday = today + timedelta(days=days_until_monday)
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

    # Get all input files and check their status (newest first)
    input_files = sorted(inputs_dir.glob('*.yml'), reverse=True)

    for input_file in input_files:
        with open(input_file, 'r') as f:
            data = yaml.safe_load(f)

        # Check if this week is not yet complete (skip archived weeks)
        status = data.get('workflow', {}).get('status', 'intake_complete')
        if status not in ('plan_complete', 'archived'):
            week_str = data.get('week_of')
            return input_file, week_str

    # All weeks are complete, calculate next Monday
    next_monday = get_next_monday()
    week_str = next_monday.strftime('%Y-%m-%d')
    return None, week_str


def get_workflow_state(input_file):
    """Determine current workflow state from input file and time."""
    if not input_file or not input_file.exists():
        return 'new_week', None

    with open(input_file, 'r') as f:
        data = yaml.safe_load(f)

    week_of = data.get('week_of')
    status = data.get('workflow', {}).get('status', 'intake_complete')
    
    # 1. Check for Archiving (Past the week's end date)
    if week_of:
        try:
            week_start = datetime.strptime(week_of, '%Y-%m-%d')
            # Assuming a week lasts until Sunday night (6 days after Monday)
            week_end = week_start + timedelta(days=7)
            if datetime.now() >= week_end:
                return 'archived', data
        except ValueError:
            pass

    # 2. Base Workflow States
    if status == 'intake_complete':
        fm_status = data.get('farmers_market', {}).get('status')
        if fm_status == 'confirmed':
            # Check if we should be "active" (cooking) vs just "ready"
            if week_of and datetime.now().date() >= datetime.strptime(week_of, '%Y-%m-%d').date():
                return 'active', data # Plan not generated yet but it's already the week?
            return 'ready_to_plan', data
        else:
            return 'awaiting_farmers_market', data
            
    elif status == 'plan_complete':
        # 3. Check for "Waiting for Check-in" (After 8 PM on weeknights)
        now = datetime.now()
        # Mocking 8 PM check for America/Los_Angeles needs consideration if on server.
        # But let's assume local time or coordinated time.
        
        # Determine if it's the active week
        if week_of:
            week_start_date = datetime.strptime(week_of, '%Y-%m-%d').date()
            today = now.date()
            if week_start_date <= today < (week_start_date + timedelta(days=7)):
                # It's the active week.
                # Check for 8 PM weeknight
                if today.weekday() < 5 and now.hour >= 20: # Mon-Fri, 8 PM+
                    current_day_abbr = now.strftime('%a').lower()[:3]
                    
                    # Check history for today's check-in
                    history_path = Path('data/history.yml')
                    if history_path.exists():
                        with open(history_path, 'r') as hf:
                            history = yaml.safe_load(hf)
                            for week in history.get('weeks', []):
                                if week.get('week_of') == week_of:
                                    for dinner in week.get('dinners', []):
                                        if dinner.get('day') == current_day_abbr:
                                            if 'made' not in dinner:
                                                return 'waiting_for_checkin', data
                                            break
                                    break
        
        return 'active', data # 'week_complete' renamed to 'active'
    else:
        return 'new_week', None


def archive_expired_weeks():
    """Find weeks that have passed their end date and handle rollover."""
    from scripts.log_execution import load_history, save_history
    history = load_history()
    dirty = False
    
    # Process inputs to find what needs archiving
    input_dir = Path('inputs')
    for input_file in input_dir.glob('*.yml'):
        if input_file.name == '.gitkeep': continue
        
        state, data = get_workflow_state(input_file)
        if state == 'archived' and data.get('workflow', {}).get('status') != 'archived':
            print(f"Archiving week {data.get('week_of')}...")
            week_of = data.get('week_of')
            
            # Find the week in history to get leftovers
            history_week = None
            for w in history.get('weeks', []):
                if w.get('week_of') == week_of:
                    history_week = w
                    break
            
            if history_week:
                # 1. Get unused vegetables from fridge
                fridge_veg = history_week.get('fridge_vegetables', [])
                
                # 2. Get unmade meals
                unmade_meals = []
                for dinner in history_week.get('dinners', []):
                    if not dinner.get('made'):
                        unmade_meals.append({
                            'recipe_id': dinner.get('recipe_id'),
                            'day': dinner.get('day'),
                            'reason': dinner.get('reason', 'Skipped')
                        })
                
                # 3. Find NEXT week's input file to add rollover
                next_monday = datetime.strptime(week_of, '%Y-%m-%d') + timedelta(days=7)
                next_week_str = next_monday.strftime('%Y-%m-%d')
                next_input_path = Path(f'inputs/{next_week_str}.yml')
                
                if next_input_path.exists():
                    with open(next_input_path, 'r') as nf:
                        next_data = yaml.safe_load(nf)
                    
                    if 'rollover' not in next_data: next_data['rollover'] = []
                    
                    # Add unmade meals to rollover
                    for meal in unmade_meals:
                        if not any(r.get('recipe_id') == meal['recipe_id'] for r in next_data['rollover']):
                            next_data['rollover'].append({
                                'recipe_id': meal['recipe_id'],
                                'source_week': week_of
                            })
                    
                    # Add vegetables to proposed_veg if not already there
                    if 'farmers_market' in next_data:
                        if 'proposed_veg' not in next_data['farmers_market']:
                            next_data['farmers_market']['proposed_veg'] = []
                        for veg in fridge_veg:
                            if veg not in next_data['farmers_market']['proposed_veg']:
                                next_data['farmers_market']['proposed_veg'].append(veg)
                    
                    with open(next_input_path, 'w') as nf:
                        yaml.dump(next_data, nf, sort_keys=False)
                
            # Mark the input file as archived
            if 'workflow' not in data: data['workflow'] = {}
            data['workflow']['status'] = 'archived'
            with open(input_file, 'w') as f:
                yaml.dump(data, f, sort_keys=False)
            dirty = True

    if dirty:
        save_history(history)
        # Sync to GitHub
        try:
            from scripts.github_helper import sync_changes_to_github
            sync_changes_to_github(['data/history.yml'] + [str(p) for p in input_dir.glob('*.yml')])
        except Exception as e:
            print(f"Sync failed: {e}")

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

    # Load configuration
    config_path = Path('config.yml')
    if config_path.exists():
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
    else:
        # Fallback defaults
        config = {
            'timezone': 'America/Los_Angeles',
            'schedule': {
                'office_days': ['mon', 'wed', 'fri'],
                'busy_days': ['thu', 'fri'],
                'late_class_days': [],
            },
            'preferences': {
                'vegetarian': True,
                'avoid_ingredients': ['eggplant', 'mushrooms', 'green_cabbage'],
                'novelty_recipe_limit': 1,
            }
        }

    # Create input file
    input_data = {
        'week_of': week_str,
        'timezone': config.get('timezone', 'America/Los_Angeles'),
        'workflow': {
            'status': 'intake_complete',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
        },
        'schedule': config.get('schedule', {}),
        'preferences': config.get('preferences', {}),
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

    # Check for rollover from previous week
    rollover_recipes = []
    prev_monday = datetime.strptime(week_str, '%Y-%m-%d') - timedelta(days=7)
    prev_monday_str = prev_monday.strftime('%Y-%m-%d')
    if history_path.exists():
        with open(history_path, 'r') as f:
            history = yaml.safe_load(f)
            if history:
                for week in history.get('weeks', []):
                    if week.get('week_of') == prev_monday_str:
                        rollover_recipes = week.get('rollover', [])
                        break

    if rollover_recipes:
        print(f"📦 Found {len(rollover_recipes)} rollover recipes from last week.")
        input_data['rollover'] = rollover_recipes

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

    try:
        if not index_path.exists():
            raise ValueError(f"Recipe index not found: {index_path}")

        with open(index_path, 'r') as f:
            recipes = yaml.safe_load(f)

        if not recipes:
            raise ValueError(f"Recipe index is empty: {index_path}")

        print(f"  ✓ Loaded {len(recipes)} recipes")
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML in {index_path}: {e}")
    except Exception as e:
        raise ValueError(f"Failed to load recipe index: {e}")

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

    # Find current week in history to check for overrides
    current_week_history = None
    for week in history.get('weeks', []):
        if week.get('week_of') == week_of:
            current_week_history = week
            break

    # Select dinners (respecting existing choices if any)
    selected_dinners = select_dinners(filtered, data, current_week_history, recipes)

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

    # Add weekend defaults (Sat/Sun)
    weekend_days = ['sat', 'sun']
    from lunch_selector import LunchSuggestion # Import specifically if not available
    
    for day in weekend_days:
        # Default Dinner
        selected_dinners[day] = {
            'name': 'Make at home',
            'id': 'make_at_home',
            'cuisine': 'various', 
            'meal_type': 'weekend_meal',
            'main_veg': []
        }
        
        # Default Lunch
        selected_lunches[day] = LunchSuggestion(
            recipe_id=f'weekend_lunch_{day}',
            recipe_name='Make at home',
            kid_friendly=True,
            prep_style='fresh',
            prep_components=[],
            storage_days=0,
            prep_day=day,
            assembly_notes='Weekend flexibility',
            reuses_ingredients=[],
            default_option=None,
            kid_profiles=None
        )

    # Generate plan file
    print("\n[5/5] Writing plan file...")
    plans_dir = Path('public/plans')
    plans_dir.mkdir(exist_ok=True)

    history = load_history(history_path)

    plan_file = plans_dir / f'{week_of}-weekly-plan.html'
    from_scratch_recipe = selected_dinners.get(from_scratch_day) if from_scratch_day else None
    plan_content = generate_html_plan(data, history, selected_dinners, from_scratch_recipe, selected_lunches)

    with open(plan_file, 'w') as f:
        f.write(plan_content)

    print(f"  ✓ Created: {plan_file}")

    # Update history
    print("\nUpdating history...")
    update_history(history_path, data, selected_dinners, selected_lunches)
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
    print(f"\n📄 View your plan locally: {plan_file}")

    # Generate GitHub Pages URL
    gh_pages_url = f"https://ssimhan.github.io/meal-planner/plans/{week_of}-weekly-plan.html"
    print(f"\n🌐 View on any device: {gh_pages_url}")

    print(f"\n📋 NEXT STEPS:")
    print(f"   1. Push to GitHub to deploy the plan to GitHub Pages")
    print(f"   2. Access the plan from your phone using the URL above")
    print(f"   3. When you're ready for next week, run: python3 scripts/workflow.py")


def show_week_complete(input_file, data):
    """Show completion status and prompt for next week."""
    week_of = data['week_of']
    plan_file = Path(f'plans/{week_of}-weekly-plan.html')

    print("\n" + "="*60)
    print(f"✅ WEEK {week_of} ACTIVE")
    print("="*60)

    if plan_file.exists():
        print(f"\n📄 Plan: {plan_file}")

    print(f"\n💡 Tip: Run 'python3 scripts/workflow.py replan' to update for remaining days.")


def replan_meal_plan(input_file, data):
    """
    Re-distribute remaining and skipped meals across the rest of the week.
    Handles rollover to next week if needed.
    """
    # 1. Get current date and identify the Monday of the current week
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    monday_str = monday.strftime('%Y-%m-%d')
    today_abbr = today.strftime('%a').lower()[:3] # mon, tue, wed...

    # robust data loading for replan (handles cases where find_current_week_file skips active weeks)
    if data is None:
        if not input_file:
            input_file = Path(f'inputs/{monday_str}.yml')
        
        if input_file.exists():
            with open(input_file, 'r') as f:
                data = yaml.safe_load(f)
        else:
            print(f"Error: No input file found for active week {monday_str} at {input_file}")
            return

    history_path = Path('data/history.yml')
    history = load_history(history_path)

    days_list = ['mon', 'tue', 'wed', 'thu', 'fri']
    if today_abbr not in days_list:
        print(f"Today is {today.strftime('%A')}. Re-planning is optimized for Mon-Fri.")
        return

    # 2. Find current week in history
    week_entry = None
    for week in history.get('weeks', []):
        if week.get('week_of') == monday_str:
            week_entry = week
            break

    if not week_entry:
        print(f"Error: No history entry found for week of {monday_str}")
        return

    # 3. Categorize meals
    print(f"\n[Re-plan] Analyzing week of {monday_str} (Today is {today_abbr.upper()})")
    
    successful_dinners = [] # Already made
    to_be_planned = []       # Not yet made, or skipped in the past

    current_day_idx = days_list.index(today_abbr)

    # We iterate through days_list to preserve chronological intent
    planned_dinners = {d['day']: d for d in week_entry.get('dinners', [])}

    for day in days_list:
        dinner = planned_dinners.get(day)
        if not dinner:
            continue

        day_idx = days_list.index(day)
        # A meal is "done" if made is True/yes/freezer
        is_done = dinner.get('made') in [True, 'yes', 'freezer_backup']

        if is_done:
            successful_dinners.append(dinner)
        elif day_idx < current_day_idx:
            # Skipped past meal
            print(f"   ↺ Found skipped meal from {day}: {dinner.get('recipe_id')}")
            # Reset metadata for re-planning
            dinner.pop('made', None)
            to_be_planned.append(dinner)
        else:
            # Future (or today's) planned meal
            to_be_planned.append(dinner)

    # 4. Identify remaining days
    remaining_days = days_list[current_day_idx:]
    print(f"   📅 Remaining days: {', '.join(remaining_days).upper()}")

    # 5. Distribute recipes
    new_dinners = list(successful_dinners)
    rollover_recipes = []

    idx = 0
    for day in remaining_days:
        if idx < len(to_be_planned):
            recipe_entry = to_be_planned[idx]
            recipe_entry['day'] = day
            new_dinners.append(recipe_entry)
            idx += 1

    # Manage Overflow
    if idx < len(to_be_planned):
        rollover_recipes = to_be_planned[idx:]
        week_entry['rollover'] = []
        for r in rollover_recipes:
             week_entry['rollover'].append({
                 'recipe_id': r.get('recipe_id'),
                 'cuisine': r.get('cuisine'),
                 'meal_type': r.get('meal_type'),
                 'vegetables': r.get('vegetables', [])
             })
        print(f"   📦 {len(rollover_recipes)} recipes moved to rollover (will be added to next week's plan).")
    else:
        # Clear rollover if we caught up
        week_entry.pop('rollover', None)

    # Sort new_dinners by day
    new_dinners.sort(key=lambda d: days_list.index(d['day']) if d['day'] in days_list else 99)

    # 6. Update history
    week_entry['dinners'] = new_dinners

    with open(history_path, 'w') as f:
        yaml.dump(history, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    # 7. Update input file (to keep dashboard in sync)
    if input_file and input_file.exists():
        data['dinners'] = []
        for d in new_dinners:
            # We want to store just the necessary info in input file for consistency
            data['dinners'].append({
                'day': d.get('day'),
                'recipe_id': d.get('recipe_id')
            })
        
        # Mark workflow status if needed
        if 'workflow' in data:
            data['workflow']['updated_at'] = datetime.now().isoformat()
            
        with open(input_file, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
        print(f"   ✓ Updated: {input_file}")

    # 8. Refresh Lunches based on updated dinner sequence
    print("   🍱 Refreshing lunch plans to maintain pipelines...")
    from scripts.lunch_selector import LunchSelector
    
    # Need to format dinners for LunchSelector (list of dicts with 'day' and 'recipe_id')
    formatted_dinners = []
    for d in new_dinners:
        formatted_dinners.append({
            'day': d.get('day'),
            'recipe_id': d.get('recipe_id'),
            'recipe_name': d.get('recipe_id').replace('_', ' ').title() # Fallback name
        })
    
    selector = LunchSelector()
    selected_lunches = selector.select_weekly_lunches(formatted_dinners, monday_str)

    # 9. Regenerate HTML
    all_recipes = []
    index_path = Path('recipes/index.yml')
    if index_path.exists():
        with open(index_path, 'r') as f:
            all_recipes = yaml.safe_load(f) or []

    selected_dinners_objs = {}
    for d in new_dinners:
        r_id = d.get('recipe_id')
        day = d.get('day')
        if r_id == 'freezer_meal':
             selected_dinners_objs[day] = {
                        'id': 'freezer_meal',
                        'name': 'Freezer Backup Meal',
                        'main_veg': [],
                        'meal_type': 'freezer',
                        'cuisine': 'various'
                    }
        else:
            recipe = next((r for r in all_recipes if r.get('id') == r_id), None)
            if recipe:
                selected_dinners_objs[day] = recipe

    # Add a notice for the UI
    data['replan_notice'] = f"Plan updated on {datetime.now().strftime('%a at %-I:%M %p')} due to skips/shifts."

    print(f"   📄 Regenerating HTML plan for week of {monday_str}...")
    plan_content = generate_html_plan(data, history, selected_dinners_objs, selected_lunches=selected_lunches)
    
    plans_dir = Path('public/plans')
    plans_dir.mkdir(exist_ok=True)
    plan_file = plans_dir / f'{monday_str}-weekly-plan.html'
    with open(plan_file, 'w') as f:
        f.write(plan_content)

    print(f"✅ Re-plan complete! Remaining days updated.")

    print(f"\n📋 NEXT STEPS:")
    print(f"   • When you're ready to plan next week, run:")
    print(f"     python3 scripts/workflow.py --reset")


# ============================================================================
# Helper Functions (from mealplan.py)
# ============================================================================

def generate_farmers_market_proposal(history_path, index_path):
    """Generate a proposed farmers market vegetable list.

    Now considers inventory to:
    - Skip vegetables already in fridge
    - Prioritize low/missing items
    - Check freezer backup count
    """
    # Load inventory if available
    inventory_path = Path('data/inventory.yml')
    current_fridge_items = set()
    freezer_backup_count = 0

    if inventory_path.exists():
        try:
            with open(inventory_path, 'r') as f:
                inventory = yaml.safe_load(f)
                if inventory:
                    # Extract items currently in fridge
                    if 'fridge' in inventory:
                        for item in inventory['fridge']:
                            current_fridge_items.add(item['item'].lower())

                    # Count freezer backups
                    if 'freezer' in inventory and 'backups' in inventory['freezer']:
                        freezer_backup_count = len(inventory['freezer']['backups'])
        except (yaml.YAMLError, KeyError, TypeError) as e:
            print(f"⚠️  WARNING: Failed to load inventory from {inventory_path}: {e}")
            print(f"   Continuing without inventory data")

    # Load recent vegetables from history
    recent_veg = set()
    if history_path.exists():
        try:
            with open(history_path, 'r') as f:
                history = yaml.safe_load(f)
                if history and 'weeks' in history:
                    for week in history['weeks'][-2:]:
                        for dinner in week.get('dinners', []):
                            recent_veg.update(dinner.get('vegetables', []))
        except (yaml.YAMLError, KeyError, TypeError) as e:
            print(f"⚠️  WARNING: Failed to load history from {history_path}: {e}")
            print(f"   Continuing without recent vegetable data")

    # Get common vegetables from recipes
    common_veg = Counter()
    if index_path.exists():
        try:
            with open(index_path, 'r') as f:
                recipes = yaml.safe_load(f)
                if recipes:
                    for recipe in recipes:
                        main_veg = recipe.get('main_veg', [])
                        common_veg.update(main_veg)
        except (yaml.YAMLError, KeyError, TypeError) as e:
            print(f"⚠️  WARNING: Failed to load recipes from {index_path}: {e}")
            print(f"   Using default vegetable list")

    # Filter out vegetables already in fridge, recently used, and staples
    top_veg = [veg for veg, count in common_veg.most_common(20)
               if veg not in recent_veg
               and veg not in ['garlic', 'onion', 'ginger']
               and veg not in current_fridge_items]

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

    # Add note about freezer backups (informational)
    if freezer_backup_count < 3:
        print(f"\n⚠️  Freezer backup status: {freezer_backup_count}/3 meals")
        print(f"   Consider batch cooking this week to maintain 3 backups")

    return proposed, staples


def load_history(history_path):
    """Load the meal plan history."""
    if not history_path.exists():
        return {'weeks': []}

    try:
        with open(history_path, 'r') as f:
            history = yaml.safe_load(f)

        if not history or 'weeks' not in history:
            return {'weeks': []}

        return history
    except yaml.YAMLError as e:
        print(f"⚠️  WARNING: Invalid YAML in {history_path}: {e}")
        print(f"   Returning empty history - please fix the file")
        return {'weeks': []}
    except Exception as e:
        print(f"⚠️  WARNING: Failed to load {history_path}: {e}")
        print(f"   Returning empty history")
        return {'weeks': []}


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


def select_dinners(filtered_recipes, inputs, current_week_history=None, all_recipes=None):
    """Select 5 dinners for Mon-Fri based on constraints."""
    busy_days = set(inputs.get('schedule', {}).get('busy_days', []))
    rollover_data = inputs.get('rollover', [])

    no_chop_recipes = [r for r in filtered_recipes if r.get('no_chop_compatible', False)]
    normal_recipes = [r for r in filtered_recipes if r.get('effort_level') == 'normal']
    all_other_recipes = [r for r in filtered_recipes
                         if not r.get('no_chop_compatible', False)
                         and r.get('effort_level') != 'normal']

    used_meal_types = set()
    selected = {}
    days = ['mon', 'tue', 'wed', 'thu', 'fri']

    # 1. Pre-fill from history (for substitutions/sticky selection)
    if current_week_history and 'dinners' in current_week_history:
        for dh in current_week_history['dinners']:
            day = dh.get('day')
            recipe_id = dh.get('recipe_id')
            if day in days:
                if recipe_id == 'freezer_meal':
                    # Special dummy recipe for freezer meals
                    selected[day] = {
                        'id': 'freezer_meal',
                        'name': 'Freezer Backup Meal',
                        'main_veg': [],
                        'meal_type': 'freezer',
                        'cuisine': 'various'
                    }
                elif all_recipes:
                    # Look up recipe in full index
                    recipe = next((r for r in all_recipes if r.get('id') == recipe_id), None)
                    if recipe:
                        selected[day] = recipe
                        used_meal_types.add(recipe.get('meal_type'))

    # 2. Handle Rollover (Priority over new selections)
    if rollover_data and all_recipes:
        for r_meta in rollover_data:
            r_id = r_meta.get('recipe_id')
            recipe = next((r for r in all_recipes if r.get('id') == r_id), None)
            if recipe and recipe.get('meal_type') not in used_meal_types:
                # Find first empty day
                for day in days:
                    if day not in selected:
                        selected[day] = recipe
                        used_meal_types.add(recipe.get('meal_type'))
                        # Remove from availability lists if it was there
                        if recipe in no_chop_recipes: no_chop_recipes.remove(recipe)
                        if recipe in normal_recipes: normal_recipes.remove(recipe)
                        if recipe in all_other_recipes: all_other_recipes.remove(recipe)
                        break

    # Select from scratch recipe
    non_busy_days = [d for d in days if d not in busy_days]

    if non_busy_days:
        for r in normal_recipes:
            meal_type = r.get('meal_type')
            if meal_type not in used_meal_types:
                from_scratch_day = non_busy_days[0]
                if from_scratch_day not in selected:
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


def generate_lunch_html(lunch_suggestion, day_name):
    """
    Generate HTML markup for a lunch section.

    Args:
        lunch_suggestion: LunchSuggestion object from lunch_selector.py
        day_name: Day name (e.g., "Monday", "Tuesday")

    Returns:
        HTML string for the lunch section
    """
    html = []
    html.append('            <div class="lunch-section">')
    if lunch_suggestion.recipe_id.startswith('pipeline_'):
        html.append('                <span class="energy-level energy-morning-ok" style="float: right; font-size: 0.7rem;">PLANNED PIPELINE</span>')
    html.append('                <h4>🥪 Lunch</h4>')

    # 1. Kids Section
    if hasattr(lunch_suggestion, 'kid_profiles') and lunch_suggestion.kid_profiles:
        # Per-profile display
        for name, desc in lunch_suggestion.kid_profiles.items():
            html.append(f'                <p><strong>{name}:</strong> {desc}</p>')
    elif lunch_suggestion.default_option:
        # Using default repeatable option
        html.append(f'                <p><strong>Kids (2):</strong> {lunch_suggestion.recipe_name}</p>')
    else:
        # Using actual recipe
        html.append(f'                <p><strong>Kids (2):</strong> {lunch_suggestion.recipe_name}')
        if lunch_suggestion.kid_friendly:
            html.append(' 👶')
        html.append('</p>')

    # 2. Adult Section
    if lunch_suggestion.default_option:
        html.append(f'                <p><strong>Adult (1):</strong> Leftovers or grain bowl</p>')
    else:
        html.append(f'                <p><strong>Adult (1):</strong> Leftovers or grain bowl with dinner components</p>')

    # 3. Components (Non-default only)
    if not lunch_suggestion.default_option:
        if lunch_suggestion.prep_components:
            components_str = ', '.join(lunch_suggestion.prep_components)
            html.append(f'                <p><strong>Components:</strong> {components_str}')
        else:
            html.append(f'                <p><strong>Components:</strong> Fresh ingredients')
        
        if lunch_suggestion.reuses_ingredients:
            reused_str = ', '.join(lunch_suggestion.reuses_ingredients)
            html.append(f' <span style="color: var(--accent-sage);">♻️ Reuses: {reused_str}</span>')
        html.append('</p>')

    # 4. Prep (Always)
    html.append(f'                <p><strong>Prep:</strong> {lunch_suggestion.assembly_notes}</p>')

    # 5. Storage (Non-default only)
    if not lunch_suggestion.default_option and lunch_suggestion.prep_style == 'component_based' and lunch_suggestion.storage_days > 0:
        html.append(f'                <p style="font-size: var(--text-xs); color: var(--text-muted);"><em>Components last {lunch_suggestion.storage_days} days refrigerated</em></p>')

    html.append('            </div>')
    return '\n'.join(html)


def generate_html_plan(inputs, history, selected_dinners, from_scratch_recipe=None, selected_lunches=None):
    """Generate the weekly plan as HTML."""
    # Read the HTML template
    template_path = Path('templates/weekly-plan-template.html')
    with open(template_path, 'r') as f:
        template_content = f.read()

    week_of = inputs['week_of']
    week_start = datetime.strptime(week_of, '%Y-%m-%d').date()
    week_end = week_start + timedelta(days=4)
    week_range = f"{week_start.strftime('%b %d, %Y')} - {week_end.strftime('%b %d, %Y')}"

    # Extract template styles (everything before </head>)
    styles_end = template_content.find('</head>')
    html_head = template_content[:styles_end]

    # Replace title
    html_head = html_head.replace('{WEEK_START_DATE}', week_start.strftime('%b %d, %Y'))
    html_head = html_head.replace('{WEEK_END_DATE}', week_end.strftime('%b %d, %Y'))

    # Start building the HTML content
    html = []
    html.append(html_head)
    html.append('</head>')
    html.append('<body>')
    html.append('    <div class="container">')
    html.append(f'        <h1>📅 Weekly Meal Plan: {week_range}</h1>')
    
    # Add Re-plan Notice if present
    if inputs.get('replan_notice'):
        html.append(f'        <div style="background: var(--accent-gold); color: black; padding: 10px; margin-bottom: 20px; text-align: center; border-radius: 4px; font-weight: bold; font-size: 0.9rem;">🔄 {inputs["replan_notice"]}</div>')
    
    html.append('')
    html.append('        <!-- Tab Navigation -->')
    html.append('        <div class="tab-nav">')
    html.append('            <button class="tab-button active" onclick="showTab(\'overview\')">Overview</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'monday\')">Monday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'tuesday\')">Tuesday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'wednesday\')">Wednesday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'thursday\')">Thursday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'friday\')">Friday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'saturday\')">Saturday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'sunday\')">Sunday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'groceries\')">Groceries</button>')
    html.append('        </div>')
    html.append('')

    # Extract current week's history data for prep tracking
    week_history = None
    if history and 'weeks' in history:
        for week_data in history['weeks']:
            if week_data.get('week_of') == week_of:
                week_history = week_data
                break

    # Generate overview tab
    html.extend(generate_overview_tab(inputs, history, selected_dinners, from_scratch_recipe, selected_lunches or {}))

    # Generate weekday tabs with lunch data and week history for prep tracking
    html.extend(generate_weekday_tabs(inputs, selected_dinners, selected_lunches or {}, week_history))

    # Generate weekend tabs
    html.extend(generate_weekend_tabs())

    # Generate groceries tab
    html.extend(generate_groceries_tab(inputs, selected_dinners, selected_lunches or {}))

    # Close container and add JavaScript
    html.append('    </div>')
    html.append('')
    html.append('    <script>')
    html.append('        function showTab(tabName) {')
    html.append('            const tabContents = document.querySelectorAll(\'.tab-content\');')
    html.append('            tabContents.forEach(content => {')
    html.append('                content.classList.remove(\'active\');')
    html.append('            });')
    html.append('')
    html.append('            const tabButtons = document.querySelectorAll(\'.tab-button\');')
    html.append('            tabButtons.forEach(button => {')
    html.append('                button.classList.remove(\'active\');')
    html.append('            });')
    html.append('')
    html.append('            document.getElementById(tabName).classList.add(\'active\');')
    html.append('            event.target.classList.add(\'active\');')
    html.append('        }')
    html.append('    </script>')
    html.append('</body>')
    html.append('</html>')

    return '\n'.join(html)


def generate_overview_tab(inputs, history, selected_dinners, from_scratch_recipe, selected_lunches=None):
    """Generate the Overview tab content."""
    html = []
    html.append('        <!-- Overview Tab -->')
    html.append('        <div id="overview" class="tab-content active">')
    html.append('            <div class="freezer-backup">')
    html.append('                <h3>🧊 Freezer Backup Status</h3>')
    
    # Get freezer inventory from data/inventory.yml (single source of truth)
    freezer_meals = []
    inventory_path = Path('data/inventory.yml')
    if inventory_path.exists():
        try:
            with open(inventory_path, 'r') as f:
                inventory = yaml.safe_load(f)
                if inventory and 'freezer' in inventory and 'backups' in inventory['freezer']:
                    freezer_meals = inventory['freezer']['backups']
        except Exception as e:
            print(f"Warning: Failed to load freezer inventory from {inventory_path}: {e}")
    
    if freezer_meals:
        html.append(f'                <p style="margin-bottom: 15px;">You have <strong>{len(freezer_meals)}/3</strong> backup meals in stock:</p>')
        html.append('                <ul>')
        for item in freezer_meals:
            meal = item.get('meal', 'Unknown Meal')
            date = item.get('frozen_date', 'Unknown Date')
            html.append(f'                    <li>{meal} - (Frozen {date})</li>')
        html.append('                </ul>')
    else:
        html.append('                <p style="margin-bottom: 15px; color: var(--accent-terracotta);">⚠️ <strong>Freezer Empty!</strong> No backup meals found.</p>')
        html.append('                <p style="font-size: var(--text-sm);">Maintaining 3 backup meals is highly recommended for busy days.</p>')

    # Identify batch cooking suggestion
    batch_suggestion = "[None identified yet]"
    days_of_week = ['mon', 'tue', 'wed', 'thu', 'fri']
    
    # Priority 1: Check for planned pipelines
    if selected_lunches:
        for day, suggestion in selected_lunches.items():
            if suggestion.recipe_id.startswith('pipeline_'):
                # Extract dinner name e.g. "Leftovers: Dal Tadka" -> "Dal Tadka"
                recipe_n = suggestion.recipe_name.replace("Leftovers: ", "")
                # Find previous day
                day_order = ['mon', 'tue', 'wed', 'thu', 'fri']
                try:
                    curr_idx = day_order.index(day)
                    prev_day = day_order[curr_idx - 1]
                    batch_suggestion = f"Double the <strong>{recipe_n}</strong> on {prev_day.capitalize()} (Planned for {day.capitalize()} lunch)"
                    break
                except (ValueError, IndexError):
                    continue

    # Priority 2: Fallback to meal type check if no pipeline found
    if batch_suggestion == "[None identified yet]":
        for day, recipe in selected_dinners.items():
             if day in days_of_week and recipe.get('meal_type') in ['soup_stew', 'curry', 'pasta_noodles']:
                 batch_suggestion = f"Double the <strong>{recipe.get('name')}</strong> on {day.capitalize()}"
                 break
             
    html.append(f'                <p style="margin-top: 15px;"><strong>This week\'s suggestion:</strong> {batch_suggestion}</p>')
    html.append('            </div>')
    html.append('')

    if from_scratch_recipe:
        html.append('            <div class="from-scratch">')
        html.append('                <h3>🌟 From Scratch Recipe This Week</h3>')
        html.append(f'                <p><strong>{from_scratch_recipe.get("name")}</strong></p>')
        
        # Pull rationale if exists, else provide template
        rationale = from_scratch_recipe.get('rationale', "This recipe selected for its unique technique or use of seasonal vegetables.")
        html.append(f'                <p>{rationale}</p>')
        html.append('            </div>')
    html.append('')

    # Week at a glance - Table format
    html.append('            <div class="week-glance">')
    html.append('                <h3>📋 Week at a Glance</h3>')
    html.append('                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">')
    html.append('                    <thead>')
    html.append('                        <tr style="background: var(--bg-secondary); border-bottom: 2px solid var(--accent-green);">')
    html.append('                            <th style="padding: 12px; text-align: left; font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Day</th>')
    html.append('                            <th style="padding: 12px; text-align: left; font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Kids Lunch</th>')
    html.append('                            <th style="padding: 12px; text-align: left; font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Adult Lunch</th>')
    html.append('                            <th style="padding: 12px; text-align: left; font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Dinner</th>')
    html.append('                        </tr>')
    html.append('                    </thead>')
    html.append('                    <tbody>')

    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    day_abbr = ['mon', 'tue', 'wed', 'thu', 'fri']

    for i, (day_name, day_key) in enumerate(zip(days, day_abbr)):
        # Get lunch details
        kids_lunch = '-'
        adult_lunch = '-'
        
        if selected_lunches and day_key in selected_lunches:
            lunch = selected_lunches[day_key]
            
            if hasattr(lunch, 'kid_profiles') and lunch.kid_profiles:
                 # Create summary line e.g. "Akira: PBJ / Anya: Sunbutter"
                 # Simplify descriptions if they are long
                 parts = []
                 for n, d in lunch.kid_profiles.items():
                     # If description is same as recipe name, just show name? 
                     # Or just show "Name: Desc"
                     parts.append(f"{n}: {d}")
                 kids_lunch = " <br> ".join(parts)
            else:
                kids_lunch = lunch.recipe_name
            if lunch.default_option:
                adult_lunch = 'Leftovers or grain bowl'
            else:
                adult_lunch = 'Leftovers or dinner components'

        # Get dinner
        dinner_text = ''
        if day_key in selected_dinners:
            recipe = selected_dinners[day_key]
            dinner_text = recipe.get("name", '[Dinner]')
        else:
            dinner_text = '[Dinner]'

        # Alternating row background
        row_bg = 'transparent' if i % 2 == 0 else 'rgba(0,0,0,0.02)'

        html.append(f'                        <tr style="border-bottom: 1px solid var(--border-subtle); background: {row_bg};">')
        html.append(f'                            <td style="padding: 12px; font-weight: 500;"><strong>{day_name}</strong></td>')
        html.append(f'                            <td style="padding: 12px; color: var(--text-muted); font-size: 0.9rem;">{kids_lunch}</td>')
        html.append(f'                            <td style="padding: 12px; color: var(--text-muted); font-size: 0.9rem;"><em>{adult_lunch}</em></td>')
        html.append(f'                            <td style="padding: 12px; font-weight: 500;">{dinner_text}</td>')
        html.append(f'                        </tr>')

    html.append('                    </tbody>')
    html.append('                </table>')
    html.append('            </div>')
    html.append('        </div>')
    html.append('')

    return html


def generate_weekday_tabs(inputs, selected_dinners, selected_lunches, week_history=None):
    """Generate tabs for Monday through Friday.

    Args:
        inputs: Input data for the week
        selected_dinners: Dict of selected dinner recipes
        selected_lunches: Dict of selected lunch data
        week_history: Optional dict containing week execution data from history.yml
    """
    html = []

    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    day_abbr = ['mon', 'tue', 'wed', 'thu', 'fri']
    late_class_days = inputs.get('schedule', {}).get('late_class_days', ['thu', 'fri'])
    busy_days = set(inputs.get('schedule', {}).get('busy_days', ['thu', 'fri']))

    energy_labels = {
        'mon': ('PM PREP ONLY', 'energy-high'),
        'tue': ('AM + PM PREP', 'energy-mild'),
        'wed': ('PM PREP ONLY', 'energy-mild'),
        'thu': ('MORNING PREP OK', 'energy-morning-ok'),
        'fri': ('NO PREP DAY', 'energy-none')
    }

    for day_name, day_key in zip(days, day_abbr):
        label, energy_class = energy_labels[day_key]

        html.append(f'        <!-- {day_name} Tab -->')
        html.append(f'        <div id="{day_name.lower()}" class="tab-content">')
        html.append(f'            <div class="day-header">')
        html.append(f'                {day_name} <span class="energy-level {energy_class}">{label}</span>')
        html.append(f'            </div>')
        html.append('')

        # Add lunch section
        if day_key in selected_lunches:
            html.append(generate_lunch_html(selected_lunches[day_key], day_name))
            html.append('')

        # Add snack section
        html.extend(generate_snack_section(day_key, late_class_days))
        html.append('')

        # Add dinner section
        if day_key in selected_dinners:
            html.extend(generate_dinner_section(selected_dinners[day_key], day_key, busy_days))
            html.append('')

        # Add prep tasks
        html.extend(generate_prep_section(day_key, day_name, selected_dinners, selected_lunches, week_history))
        html.append('')

        html.append('        </div>')
        html.append('')

    return html


def generate_snack_section(day_key, late_class_days):
    """Generate snack section for a day."""
    html = []

    # Default snacks
    default_snacks = {
        'mon': 'Apple slices with peanut butter',
        'tue': 'Cheese and crackers',
        'wed': 'Cucumber rounds with cream cheese',
        'thu': 'Grapes',
        'fri': 'Crackers with hummus'
    }

    is_late_class = day_key in late_class_days

    def make_school_safe(snack_name):
        """Substitute nut ingredients for school safety."""
        safety_map = {
            'peanut butter': 'Sunbutter',
            'almond butter': 'Sunbutter',
            'cashew': 'seeds',
            'walnut': 'seeds',
            'pecan': 'seeds',
            'almond': 'seeds',
            'nut': 'seed'
        }
        
        safe_name = snack_name
        changed = False
        
        for restricted, sub in safety_map.items():
            if restricted in safe_name.lower():
                safe_name = re.sub(re.escape(restricted), sub, safe_name, flags=re.IGNORECASE)
                changed = True
                
        return safe_name, changed

    html.append('            <div class="snacks">')
    
    # 1. School Snack
    original_snack = default_snacks.get(day_key, "Simple snack")
    safe_snack, changed = make_school_safe(original_snack)
    html.append(f'                <h4>🏫 School Snack</h4>')
    html.append(f'                <p style="font-size: var(--text-sm); margin-top: 4px;">{safe_snack}</p>')

    # 2. Home Snack
    # Only show if different OR if it's the weekend/after school context (but here we just show both for clarity)
    # Actually, let's show "Home Snack" only if we had to change it? 
    # Or just always show "After School Snack" separately?
    # The prompt implies differentiation. "School Snack" vs "Home Snack".
    
    if changed:
        html.append(f'                <h4 style="margin-top: 12px; color: var(--text-default);">🏠 Home Snack</h4>')
        html.append(f'                <p style="font-size: var(--text-sm); margin-top: 4px;">{original_snack} (Nuts OK)</p>')
    
    html.append('            </div>')

    if is_late_class:
        html.append('            <div class="heavy-snack">')
        html.append('                <h4>🍎 Heavy Snack (Late Class Day)</h4>')
        heavy_snack_original = 'Apple slices with peanut butter' if day_key == 'thu' else 'Banana with almond butter'
        heavy_snack_safe, changed = make_school_safe(heavy_snack_original)
        
        html.append(f'                <p style="font-size: var(--text-sm);">Format: Fruit + protein/fat for sustained energy</p>')
        html.append(f'                <p><strong>{heavy_snack_safe}</strong></p>')
        if changed:
             html.append(f'                <p style="font-size: var(--text-xs); color: var(--text-muted);">(Home: {heavy_snack_original} ok)</p>')
        html.append('            </div>')

    return html


def generate_dinner_section(recipe, day_key, busy_days):
    """Generate dinner section for a day."""
    html = []

    html.append('            <div class="meal-card">')
    html.append('                <h3>🍽️ Dinner</h3>')

    # Recipe name with link
    recipe_name = recipe.get('name', '')
    recipe_file = f"{recipe_name}.html"
    cuisine = recipe.get('cuisine', 'unknown')
    meal_type = recipe.get('meal_type', 'unknown')

    html.append(f'                <div class="meal-type"><a href="../recipes/raw_html/{recipe_file}">{recipe_name}</a> - {cuisine.title()} {meal_type.replace("_", " ").title()}</div>')

    # Vegetables (Deduplicated)
    main_veg = recipe.get('main_veg', [])
    if main_veg:
        # Use a list to preserve order but set to deduplicate
        unique_veg = []
        for v in main_veg:
            if v not in unique_veg:
                unique_veg.append(v)
        veg_str = ', '.join(unique_veg)
        html.append(f'                <div class="vegetables">Main vegetables: {veg_str}</div>')

    # Prep notes
    html.append('                <div class="prep-notes">')
    if day_key == 'mon':
        html.append('                    <strong>Prep notes:</strong> Consider making 2x batch and freeze half for backup')
    elif day_key in ['tue', 'wed']:
        html.append('                    <strong>Prep notes:</strong> All vegetables prepped Monday - just cook and assemble')
    elif day_key == 'thu':
        if recipe.get('no_chop_compatible', False):
            html.append('                    <strong>Prep notes:</strong> NO CHOPPING - using pre-prepped ingredients from Monday')
        else:
            html.append('                    <strong>Prep notes:</strong> Can prep in morning (8-9am) if needed - NO chopping after noon, NO evening prep')
    elif day_key == 'fri':
        if recipe.get('no_chop_compatible', False):
            html.append('                    <strong>Prep notes:</strong> NO PREP - using pre-prepped ingredients from Monday or Thursday AM')
        else:
            html.append('                    <strong>Prep notes:</strong> ⚠️ WARNING: This recipe requires chopping but Friday is strictly no-prep!')
    html.append('                </div>')

    # Evening assembly
    html.append('                <div class="evening-assembly">')
    if day_key in busy_days:
        html.append('                    <strong>Evening assembly (5-9pm):</strong> Reheat and serve only')
    else:
        html.append('                    <strong>Evening assembly (5-9pm):</strong> Minimal tasks - assemble, heat, serve')
    html.append('                </div>')

    html.append('            </div>')

    return html


def fuzzy_match_prep_task(task, completed_tasks):
    """Check if a task has been completed using fuzzy matching.

    Args:
        task: Task string to check
        completed_tasks: List of completed task strings

    Returns:
        bool: True if task matches any completed task
    """
    task_lower = task.lower()

    # Extract key components from task
    task_keywords = set(task_lower.split())

    for completed in completed_tasks:
        completed_lower = completed.lower()
        completed_keywords = set(completed_lower.split())

        # Simple fuzzy match: if 60%+ keywords match, consider it completed
        common_keywords = task_keywords & completed_keywords
        if len(common_keywords) >= max(2, len(task_keywords) * 0.6):
            return True

    return False


def generate_granular_prep_tasks(selected_dinners, selected_lunches, day_keys, task_context="", completed_tasks=None):
    """Generate granular, ingredient-level prep tasks for specified days.

    Args:
        selected_dinners: Dict of {day: recipe_data}
        selected_lunches: Dict of {day: lunch_data}
        day_keys: List of day keys to generate tasks for (e.g., ['mon', 'tue'])
        task_context: Description for grouping (e.g., "Mon/Tue", "Wed-Fri")
        completed_tasks: List of already completed task strings (for filtering)

    Returns:
        List of granular task strings (e.g., "Chop 2 carrots for Monday curry")
    """
    tasks = []
    completed_tasks = completed_tasks or []

    # Track vegetables by recipe for more specific instructions
    veg_by_recipe = {}
    for day_key in day_keys:
        if day_key in selected_dinners:
            recipe = selected_dinners[day_key]
            recipe_name = recipe.get('name', 'dinner')
            main_vegs = recipe.get('main_veg', [])

            for veg in main_vegs:
                veg_clean = veg.replace('_', ' ')
                day_name = day_key.capitalize()
                task = f"Chop {veg_clean} for {day_name} {recipe_name}"

                # Skip if already completed
                if not fuzzy_match_prep_task(task, completed_tasks):
                    tasks.append(task)

    # Add lunch component prep tasks
    for day_key in day_keys:
        if day_key in selected_lunches:
            lunch = selected_lunches[day_key]
            for component in lunch.prep_components:
                component_clean = component.replace('_', ' ')
                day_name = day_key.capitalize()
                task = f"Prep {component_clean} for {day_name} lunch"

                # Skip if already completed
                if not fuzzy_match_prep_task(task, completed_tasks):
                    tasks.append(task)

    return tasks


def generate_prep_section(day_key, day_name, selected_dinners, selected_lunches, week_history=None):
    """Generate prep tasks section for a day.

    Args:
        day_key: Day abbreviation (mon, tue, etc.)
        day_name: Full day name (Monday, Tuesday, etc.)
        selected_dinners: Dict of selected dinner recipes
        selected_lunches: Dict of selected lunch data
        week_history: Optional dict containing completed prep tasks from history
    """
    html = []

    # Extract completed prep tasks from history for smart filtering
    completed_prep = []
    if week_history and 'daily_feedback' in week_history:
        for day, feedback in week_history['daily_feedback'].items():
            if 'prep_completed' in feedback:
                completed_prep.extend(feedback['prep_completed'])

    # Default snacks for reference
    default_snacks = {
        'mon': 'Apple slices with peanut butter',
        'tue': 'Cheese and crackers',
        'wed': 'Cucumber rounds with cream cheese',
        'thu': 'Grapes',
        'fri': 'Crackers with hummus'
    }

    # Helper to clean up names
    def format_item(s):
        return s.replace('_', ' ').title()

    if day_key == 'mon':
        # Monday: CHOP FOR MON/TUE
        granular_tasks = generate_granular_prep_tasks(selected_dinners, selected_lunches, ['mon', 'tue'], "Mon/Tue", completed_prep)

        # Specific snack prep
        if default_snacks.get('tue') == 'Cheese and crackers':
            granular_tasks.append('Cube cheese brick for Tuesday snack')

        # General prep tasks
        general_tasks = [
            'Portion snacks into grab-and-go containers for early week',
            'Identify freezer-friendly dinner to double (batch cook)'
        ]

        if 'tue' in selected_lunches and selected_lunches['tue'].recipe_id.startswith('pipeline_'):
            general_tasks.append(f"Pack leftovers for tomorrow's lunch: {selected_lunches['tue'].recipe_name}")

        html.append('            <div class="prep-tasks">')
        html.append(f'                <h4>{day_name} Prep Tasks (MON-TUE PREP)</h4>')
        html.append('                <ul>')

        # Render granular tasks with data attributes for tracking
        for task in granular_tasks:
            html.append(f'                    <li data-prep-task="{task}">{task}</li>')

        # Render general tasks
        for task in general_tasks:
            html.append(f'                    <li data-prep-task="{task}">{task}</li>')

        html.append('                </ul>')
        html.append('            </div>')

    elif day_key == 'tue':
        # Tuesday: AM/PM split
        html.append('            <div class="prep-tasks">')
        html.append(f'                <h4>{day_name} Prep Tasks (WED-FRI PREP)</h4>')

        # AM Section
        am_tasks = []
        if 'tue' in selected_lunches:
            lunch = selected_lunches['tue']
            am_tasks.append(f'Assemble Tuesday lunch: {lunch.recipe_name}')
        am_tasks.extend([
            "Portion Monday's batch-cooked items",
            'Check freezer backup inventory (verify 3 meals)'
        ])

        html.append('                <div style="margin-top: 15px;">')
        html.append('                    <strong>☀️ AM Prep (Morning):</strong>')
        html.append('                    <ul>')
        for task in am_tasks:
            html.append(f'                        <li data-prep-task="{task}" data-prep-time="am">{task}</li>')
        html.append('                    </ul>')
        html.append('                </div>')

        # PM Section: CHOP FOR WED/THU/FRI
        pm_granular_tasks = generate_granular_prep_tasks(selected_dinners, selected_lunches, ['wed', 'thu', 'fri'], "Wed-Fri", completed_prep)

        pm_general_tasks = ['Portion snacks for rest of week']
        if 'wed' in selected_lunches and selected_lunches['wed'].recipe_id.startswith('pipeline_'):
            pm_general_tasks.append(f"Pack leftovers for tomorrow's lunch: {selected_lunches['wed'].recipe_name}")

        html.append('                <div style="margin-top: 15px;">')
        html.append('                    <strong>🌙 PM Prep (Evening 5-9pm):</strong>')
        html.append('                    <ul>')

        # Render granular PM tasks
        for task in pm_granular_tasks:
            html.append(f'                        <li data-prep-task="{task}" data-prep-time="pm">{task}</li>')

        # Render general PM tasks
        for task in pm_general_tasks:
            html.append(f'                        <li data-prep-task="{task}" data-prep-time="pm">{task}</li>')

        html.append('                    </ul>')
        html.append('                </div>')
        html.append('            </div>')

    elif day_key == 'wed':
        # Wednesday: Backup prep day
        wed_tasks = [
            'Finish any remaining veg/lunch prep for Thu/Fri',
            'Load Instant Pot or slow cooker for Thursday if needed',
            'Final check: All Thu/Fri components ready'
        ]

        if 'thu' in selected_lunches and selected_lunches['thu'].recipe_id.startswith('pipeline_'):
            wed_tasks.append(f"Pack leftovers for tomorrow's lunch: {selected_lunches['thu'].recipe_name}")

        html.append('            <div class="prep-tasks">')
        html.append(f'                <h4>{day_name} Prep Tasks (BACKUP PREP)</h4>')
        html.append('                <ul>')
        for task in wed_tasks:
            html.append(f'                    <li data-prep-task="{task}">{task}</li>')
        html.append('                </ul>')
        html.append('            </div>')

    elif day_key == 'thu':
        # Thursday morning prep
        thu_tasks = ['Light prep allowed (8-9am) if needed']

        if 'thu' in selected_dinners:
            recipe = selected_dinners['thu']
            if recipe.get('effort_level') == 'normal':
                thu_tasks.append(f"Start initial steps for {recipe.get('name')} if time allows")

        thu_tasks.extend([
            'NO chopping after noon',
            'NO evening prep - only reheating/assembly',
            'Fallback: Use freezer backup if energy is depleted'
        ])

        if 'fri' in selected_lunches and selected_lunches['fri'].recipe_id.startswith('pipeline_'):
            thu_tasks.append(f"Pack leftovers for tomorrow's lunch: {selected_lunches['fri'].recipe_name}")

        html.append('            <div class="prep-tasks">')
        html.append(f'                <h4>{day_name} Prep Tasks (MORNING PREP OK)</h4>')
        html.append('                <ul>')
        for task in thu_tasks:
            html.append(f'                    <li data-prep-task="{task}" data-prep-time="am">{task}</li>')
        html.append('                </ul>')
        html.append('            </div>')

    elif day_key == 'fri':
        # Friday: No prep day
        fri_tasks = [
            'ALL DAY: NO chopping allowed',
            'ALL DAY: NO cooking allowed - only reheating',
            'Only actions: reheating, simple assembly',
            'Fallback: Use freezer backup if energy is depleted'
        ]

        html.append('            <div class="prep-tasks">')
        html.append(f'                <h4>{day_name} Prep Tasks (NO PREP DAY - STRICT)</h4>')
        html.append('                <ul>')
        for task in fri_tasks:
            html.append(f'                    <li data-prep-task="{task}">{task}</li>')
        html.append('                </ul>')
        html.append('            </div>')

    return html


def generate_weekend_tabs():
    """Generate Saturday and Sunday tabs."""
    html = []

    # Saturday
    html.append('        <!-- Saturday Tab -->')
    html.append('        <div id="saturday" class="tab-content">')
    html.append('            <div class="day-header">')
    html.append('                Saturday <span class="energy-level energy-mild">WEEKEND - FLEXIBLE</span>')
    html.append('            </div>')
    html.append('')
    html.append('            <div class="section" style="background: rgba(212, 165, 116, 0.08); padding: 20px; border-radius: 2px; margin: 20px 0;">')
    html.append('                <h4 style="color: var(--accent-terracotta); margin-bottom: 10px;">🏠 Weekend Meals</h4>')
    html.append('                <p style="font-size: var(--text-sm); color: var(--text-muted);">Meals for Saturday are set to "Make at home" by default. Check the dashboard to update what you actually made and identify any leftovers.</p>')
    html.append('            </div>')
    html.append('')
    html.append('            <div class="lunch-section">')
    html.append('                <h4>🥪 Kids Lunch</h4>')
    html.append('                <p><strong>Plan:</strong> Make at home</p>')
    html.append('            </div>')
    html.append('')
    html.append('            <div class="meal-card">')
    html.append('                <h3>🍽️ Dinner</h3>')
    html.append('                <div class="meal-type">Make at home</div>')
    html.append('            </div>')
    html.append('')
    html.append('            <div class="prep-tasks">')
    html.append('                <h4>🌙 Afternoon Prep (Optional)</h4>')
    html.append('                <ul>')
    html.append('                    <li>Review next week\'s meal plan</li>')
    html.append('                    <li>Make grocery list (see Groceries tab)</li>')
    html.append('                    <li>Clean out fridge and freezer</li>')
    html.append('                </ul>')
    html.append('            </div>')
    html.append('        </div>')
    html.append('')

    # Sunday
    html.append('        <!-- Sunday Tab -->')
    html.append('        <div id="sunday" class="tab-content">')
    html.append('            <div class="day-header">')
    html.append('                Sunday <span class="energy-level energy-mild">GROCERY SHOPPING DAY</span>')
    html.append('            </div>')
    html.append('')
    html.append('            <div class="prep-tasks">')
    html.append('                <h4>☀️ AM Prep (Morning - Grocery Shopping)</h4>')
    html.append('                <ul style="list-style: none; margin-left: 0;">')
    html.append('                    <li style="margin: 8px 0; padding-left: 0;">✓ Farmers market shopping (fresh produce for next week)</li>')
    html.append('                    <li style="margin: 8px 0; padding-left: 0;">✓ Regular grocery shopping (use Groceries tab for full list)</li>')
    html.append('                    <li style="margin: 8px 0; padding-left: 0;">✓ Put away all groceries</li>')
    html.append('                </ul>')
    html.append('                <p style="margin-top: 15px; padding: 12px; background: rgba(212, 165, 116, 0.1); border-radius: 5px; border-left: 3px solid var(--accent-gold);"><strong>Note:</strong> Refer to the Groceries tab for the complete shopping list for next week.</p>')
    html.append('            </div>')
    html.append('')
    html.append('            <div class="lunch-section">')
    html.append('                <h4>🥪 Kids Lunch</h4>')
    html.append('                <p><strong>Plan:</strong> Make at home</p>')
    html.append('            </div>')
    html.append('')
    html.append('            <div class="meal-card">')
    html.append('                <h3>🍽️ Dinner</h3>')
    html.append('                <div class="meal-type">Make at home</div>')
    html.append('            </div>')
    html.append('                <p style="padding: 0 16px 16px 16px; font-size: var(--text-sm);">Rest day - no cooking or prep in the evening. Save your energy for Monday prep!</p>')
    html.append('            </div>')
    html.append('')
    html.append('            <div class="section" style="background: rgba(212, 165, 116, 0.08);">')
    html.append('                <h4 style="color: var(--accent-terracotta);">🌙 Evening - Rest Day</h4>')
    html.append('                <p style="font-size: var(--text-sm); color: var(--text-muted);">No prep today. Monday is the main prep day.</p>')
    html.append('            </div>')
    html.append('        </div>')
    html.append('')

    return html


def generate_groceries_tab(inputs, selected_dinners, selected_lunches):
    """Generate the Groceries tab."""
    html = []

    html.append('        <!-- Groceries Tab -->')
    html.append('        <div id="groceries" class="tab-content">')
    html.append('            <h2>🛒 Comprehensive Shopping List</h2>')
    html.append('            <p style="margin-bottom: 20px; color: var(--text-muted);">Organized by aisle for efficient shopping</p>')
    html.append('')

    # Aggregators
    produce = []
    dairy = []
    grains = []
    shelf = []
    canned = []
    frozen = []
    misc = []

    # Get and split snacks
    default_snacks = {
        'mon': 'Apple slices with peanut butter',
        'tue': 'Cheese and crackers',
        'wed': 'Cucumber rounds with cream cheese',
        'thu': 'Grapes',
        'fri': 'Crackers with hummus'
    }
    
    snack_items = []
    for snack in default_snacks.values():
        # Split into components (e.g., "Cheese and crackers" -> ["Cheese", "crackers"])
        parts = re.split(r' with | and |, ', snack, flags=re.IGNORECASE)
        for part in parts:
            clean_part = part.strip().lower()
            # Remove modifiers for shopping list
            clean_part = clean_part.replace('slices', '').replace('rounds', '').strip()
            if clean_part:
                snack_items.append(clean_part)

    def categorize_ingredient(item, target_lists):
        """Helper to categorize an ingredient into the correct list."""
        c = item.lower().replace('_', ' ')
        
        # Shelf Stable keywords (check first for peanut/almond butter)
        if any(k in c for k in ['peanut butter', 'almond butter', 'cracker', 'pretzel', 'popcorn', 'pitted dates', 'nut', 'trail mix', 'granola', 'rice cake']):
            target_lists['shelf'].append(c)
        # Produce keywords
        elif any(k in c for k in ['apple', 'banana', 'grape', 'cucumber', 'carrot', 'tomato', 'pepper', 'onion', 'garlic', 'vegetable', 'fruit', 'lemon', 'lime', 'ginger']):
            target_lists['produce'].append(c)
        # Dairy keywords
        elif any(k in c for k in ['cheese', 'yogurt', 'cream cheese', 'hummus', 'milk', 'butter', 'paneer']):
            target_lists['dairy'].append(c)
        # Grains keywords
        elif any(k in c for k in ['rice', 'quinoa', 'pasta', 'bread', 'tortilla', 'roll', 'bagel', 'couscous']):
            target_lists['grains'].append(c)
        # Canned keywords
        elif any(k in c for k in ['canned', 'beans', 'chickpea', 'tomato sauce', 'soup base', 'chana']):
            target_lists['canned'].append(c)
        else:
            target_lists['misc'].append(c)

    # Categorizers mapping
    lists = {
        'produce': produce,
        'dairy': dairy,
        'grains': grains,
        'shelf': shelf,
        'canned': canned,
        'frozen': frozen,
        'misc': misc
    }

    # Process snacks
    for item in snack_items:
        categorize_ingredient(item, lists)

    # Process dinners
    days_of_week = ['mon', 'tue', 'wed', 'thu', 'fri']
    for day, recipe in selected_dinners.items():
        if day in days_of_week and recipe:
            # Add main veg to produce
            produce.extend(recipe.get('main_veg', []))
            
            # Use name and meal type for categorization
            name = recipe.get('name', '').lower()
            categorize_ingredient(name, lists)

    # Process lunches
    for day, lunch in selected_lunches.items():
        if lunch:
            # Add lunch components
            for comp in lunch.prep_components:
                categorize_ingredient(comp, lists)

    # Clean up and deduplicate
    def clean(items):
        return sorted(list(set([i.replace('_', ' ').title() for i in items if i])))

    # Categories
    cat_data = [
        ('Fresh Produce (Include Mon/Tue/Wed shopping)', clean(produce)),
        ('Dairy & Refrigerated', clean(dairy)),
        ('Shelf Stable', clean(shelf)),
        ('Grains, Pasta & Bread', clean(grains)),
        ('Canned, Jarred & Dry Goods', clean(canned)),
        ('Frozen', clean(frozen) if frozen else ['N/A for this plan']),
        ('Condiments & Miscellaneous', clean(misc) if misc else ['Staples only'])
    ]

    for category, items in cat_data:
        html.append('            <div class="grocery-section">')
        html.append(f'                <h4>{category}</h4>')
        html.append('                <ul>')
        if not items or items == ['']:
            html.append('                    <li>Check staples</li>')
        else:
            for item in items:
                html.append(f'                    <li>{item}</li>')
        html.append('                </ul>')
        html.append('            </div>')
        html.append('')

    html.append('        </div>')
    return html


def generate_plan_content(inputs, selected_dinners, from_scratch_recipe=None, selected_lunches=None):
    """Generate the weekly plan markdown content.

    LEGACY FUNCTION - Used by scripts/mealplan.py (legacy workflow commands).
    New workflow uses generate_html_plan() instead.
    DO NOT DELETE - still required for backward compatibility with mealplan wrapper.
    """
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


def update_history(history_path, inputs, selected_dinners, selected_lunches=None):
    """Update history.yml with the new week's dinners and lunches."""
    history = load_history(history_path)

    week_of = inputs['week_of']
    new_week = {
        'week_of': week_of,
        'dinners': [],
        'lunches': {}
    }

    days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
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
        
        if selected_lunches and day in selected_lunches:
            lunch = selected_lunches[day]
            new_week['lunches'][day] = {
                'recipe_id': getattr(lunch, 'recipe_id', None),
                'recipe_name': getattr(lunch, 'recipe_name', 'Unknown'),
                'prep_style': getattr(lunch, 'prep_style', 'quick_fresh'),
                'assembly_notes': getattr(lunch, 'assembly_notes', '')
            }

    # Find or update existing week entry
    week_entry = None
    for week in history.get('weeks', []):
        if week.get('week_of') == week_of:
            week_entry = week
            break

    if week_entry:
        # Update dinners and lunches
        week_entry['dinners'] = new_week['dinners']
        week_entry['lunches'] = new_week['lunches']
    else:
        # Append new week
        history.setdefault('weeks', []).append(new_week)

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
        plan_file = Path(f'public/plans/{week_str}-weekly-plan.html')
        if plan_file.exists():
            print(f"📄 Plan: {plan_file}")


def main():
    """Main workflow orchestrator."""
    # Check for command arguments
    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == '--status':
            show_status()
            return

        if command == '--reset':
            # Force create new week
            _, week_str = find_current_week_file()
            create_new_week(week_str)
            return

        if command == 'start-week':
            # GitHub Actions mode: Create new week without prompts
            _, week_str = find_current_week_file()
            create_new_week(week_str)
            return

        if command == 'generate-plan':
            # GitHub Actions mode: Generate plan from latest confirmed input
            input_file, week_str = find_current_week_file()
            state, data = get_workflow_state(input_file)

            if state == 'ready_to_plan':
                generate_meal_plan(input_file, data)
            else:
                print(f"ERROR: Cannot generate plan. Current state: {state}")
                print(f"Expected state: ready_to_plan (farmers market must be confirmed)")
                sys.exit(1)
            return

        if command == 'replan':
            # Trigger smart re-planning
            input_file, week_str = find_current_week_file()
            state, data = get_workflow_state(input_file)
            replan_meal_plan(input_file, data)
            return

    # Auto-detect state and execute next step (default behavior)
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
