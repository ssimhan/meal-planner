#!/usr/bin/env python3
"""Log daily meal execution to history.yml."""

import argparse
import yaml
import sys
from pathlib import Path
from datetime import datetime

HISTORY_FILE = Path('data/history.yml')

def load_history():
    """Load history.yml or return empty structure."""
    if not HISTORY_FILE.exists():
        print(f"Error: {HISTORY_FILE} not found.")
        sys.exit(1)
    
    with open(HISTORY_FILE, 'r') as f:
        return yaml.safe_load(f) or {'weeks': []}

def save_history(history):
    """Save updated history to history.yml."""
    with open(HISTORY_FILE, 'w') as f:
        yaml.dump(history, f, default_flow_style=False, sort_keys=False)

def find_week(history, week_date):
    """Find the week entry in history."""
    for week in history.get('weeks', []):
        if week.get('week_of') == week_date:
            return week
    return None

def calculate_adherence(week):
    """Calculate and update plan_adherence_pct."""
    dinners = week.get('dinners', [])
    if not dinners:
        return
    
    logged_count = 0
    made_as_planned_count = 0
    
    for dinner in dinners:
        if 'made' in dinner:
            logged_count += 1
            # "made: true" or "made: yes" counts as adherence
            # "freezer_backup" or "false" does not (usually)
            # Implementation note: yaml loads 'yes' as True usually
            if dinner['made'] is True:
                made_as_planned_count += 1
            elif isinstance(dinner['made'], str) and dinner['made'].lower() in ('yes', 'true'):
                made_as_planned_count += 1
                
    if logged_count > 0:
        pct = int((made_as_planned_count / len(dinners)) * 100)
        week['plan_adherence_pct'] = pct

def update_inventory(week, args):
    """Update freezer and fridge inventory."""
    # Initialize containers if missing
    if 'freezer_inventory' not in week:
        week['freezer_inventory'] = []
    if 'fridge_vegetables' not in week:
        # We don't initialize valid values here (that's Phase 6.4), 
        # but we need a list to be able to remove things if it exists.
        # If it doesn't exist, we can't remove anything regardless.
        pass

    # Freezer Logic
    # 1. Made 2x -> Add to freezer
    if args.made_2x:
        # Find meal name - assuming recipe_id or need a lookup?
        # The prompt examples imply using the meal name. 
        # But history.yml has recipe_id. 
        # We might need to fetch the readable name or just use ID?
        # Example output shows "Bisi Bele Bath". 
        # Since we don't have easy access to the recipe title map here without parsing all recipes,
        # let's try to derive a reasonable name or use a placeholder if needed.
        # Check if we can find the dinner entry to get more info?
        # We are usually calling this WITH the dinner context.
        pass # Logic moved to main flow to have dinner context

    # 2. Used freezer -> Remove from freezer
    if args.made == 'freezer':
        meal_name = args.freezer_meal
        if not meal_name:
            print("Warning: --made freezer used but no --freezer-meal specified.")
        else:
            # simple string match removal
            # Find and remove first match
            found = False
            for i, item in enumerate(week['freezer_inventory']):
                if item['meal'].lower() == meal_name.lower():
                    week['freezer_inventory'].pop(i)
                    found = True
                    break
            if not found:
                print(f"Warning: Freezer meal '{meal_name}' not found in inventory.")

def main():
    parser = argparse.ArgumentParser(description='Log meal execution.')
    parser.add_argument('--week', required=True, help='Week start date (YYYY-MM-DD)')
    parser.add_argument('--day', required=True, help='Day of week (mon, tue, ...)')
    parser.add_argument('--made', required=True, help='yes, no, freezer')
    parser.add_argument('--vegetables', help='Comma-separated list of vegetables used')
    parser.add_argument('--kids-feedback', dest='kids_feedback', help='Kids feedback')
    
    # Optional flags
    parser.add_argument('--made-2x', action='store_true', help='Made 2x batch for freezer')
    parser.add_argument('--actual-meal', dest='actual_meal', help='What was actually made (if not planned)')
    parser.add_argument('--freezer-meal', dest='freezer_meal', help='Name of freezer meal used')
    parser.add_argument('--reason', help='Reason for deviation')
    parser.add_argument('--kids-complaints', dest='kids_complaints', help='Specific complaints')

    args = parser.parse_args()

    history = load_history()
    week = find_week(history, args.week)
    
    if not week:
        print(f"Error: Week {args.week} not found in history.yml")
        sys.exit(1)

    # Normalized day
    target_day = args.day.lower()[:3] # mon, tue, wed...
    
    # Find dinner
    target_dinner = None
    for dinner in week.get('dinners', []):
        if dinner.get('day') == target_day:
            target_dinner = dinner
            break
            
    if not target_dinner:
        print(f"Error: No dinner found for {target_day} in week {args.week}")
        sys.exit(1)

    # --- Update Execution Data ---
    
    # Handle 'made' status
    if args.made.lower() in ('yes', 'true', '1'):
        target_dinner['made'] = True
    elif args.made.lower() in ('no', 'false', '0'):
        target_dinner['made'] = False
    elif args.made.lower() in ('freezer', 'backup'):
        target_dinner['made'] = 'freezer_backup'
    else:
        target_dinner['made'] = args.made # Fallback

    # Vegetables
    if args.vegetables:
        veggies_list = [v.strip() for v in args.vegetables.split(',')]
        target_dinner['vegetables_used'] = veggies_list
        
        # Remove from fridge inventory if exists
        if 'fridge_vegetables' in week:
            # We iterate a copy to modify the original
            current_fridge = [v.lower() for v in week['fridge_vegetables']]
            
            # Simple removal logic: try to remove matching items
            # This is tricky because vegetables_used might match multiple items or none.
            # We'll just try to remove one instance for each used veg.
            new_fridge = []
            used_temp = [v.lower() for v in veggies_list]
            
            # Reconstruct fridge list by "using up" items
            # This logic assumes simple string matching
            # It might be safer to just remove strict matches
             
            # Better approach:
            # 1. Count frequency in fridge
            # 2. Subtract usage
            # 3. Rebuild
            
            # Simplest approach for now: list remove
            for veg in week['fridge_vegetables']:
                veg_lower = veg.lower()
                if veg_lower in used_temp:
                    used_temp.remove(veg_lower) # Removed one instance
                    # Don't add to new list (it's used)
                else:
                    new_fridge.append(veg)
            
            week['fridge_vegetables'] = new_fridge
            
    else:
        # Default: if made=true and no veggies specified, assume planned veggies used?
        # IMPLEMENTATION.md says: "If vegetables not specified: Defaults to planned vegetables"
        if target_dinner['made'] is True and 'vegetables' in target_dinner:
             target_dinner['vegetables_used'] = list(target_dinner['vegetables'])

    # Kids Feedback
    if args.kids_feedback:
        target_dinner['kids_feedback'] = args.kids_feedback

    # Optional Fields
    if args.made_2x:
        target_dinner['made_2x_for_freezer'] = True
        
        # Add to freezer inventory
        if 'freezer_inventory' not in week:
            week['freezer_inventory'] = []
            
        # We need a name. history.yml uses recipe_id.
        # Let's try to format the recipe_id nicely for the inventory name
        # e.g. bisi_bele_bath -> Bisi Bele Bath
        meal_name = target_dinner.get('recipe_id', 'Unknown Meal').replace('_', ' ').title()
        
        # Add entry
        week['freezer_inventory'].append({
            'meal': meal_name,
            'frozen_date': datetime.now().strftime('%Y-%m-%d')
        })

    if args.kids_complaints:
        target_dinner['kids_complaints'] = args.kids_complaints
        
        # Add to global/weekly dislikes list
        # IMPLEMENTATION.md structure: included in the week object
        if 'kids_dislikes' not in week:
            week['kids_dislikes'] = []
            
        week['kids_dislikes'].append({
            'complaint': args.kids_complaints,
            'date': datetime.now().strftime('%Y-%m-%d'),
            'recipe': target_dinner.get('recipe_id')
        })

    if args.actual_meal:
        target_dinner['actual_meal'] = args.actual_meal

    if args.reason:
        target_dinner['reason'] = args.reason
        
    if args.freezer_meal and target_dinner['made'] == 'freezer_backup':
        target_dinner['freezer_used'] = {
            'meal': args.freezer_meal,
            'frozen_date': 'Unknown' # We don't verify date on command line usage usually
        }
        
        # Remove from freezer inventory
        update_inventory(week, args) # Call the helper for removals

    # Recalculate stats
    calculate_adherence(week)
    
    # Save
    save_history(history)
    
    # Summary Output
    print(f"✅ Logged execution for {args.week} {target_day.capitalize()}")
    print(f"Dinner: {target_dinner.get('recipe_id', 'Unknown')}")
    print(f"Made: {target_dinner.get('made')}")
    if 'vegetables_used' in target_dinner:
        print(f"Vegetables used: {', '.join(target_dinner['vegetables_used'])}")
    if 'kids_feedback' in target_dinner:
        print(f"Kids: {target_dinner['kids_feedback']}")
        
    if 'freezer_inventory' in week:
        print(f"\nFreezer inventory: {len(week['freezer_inventory'])} meals")
        for item in week['freezer_inventory']:
            print(f"  - {item['meal']} (frozen {item['frozen_date']})")
            
    if 'fridge_vegetables' in week:
        print(f"\nFridge vegetables remaining: {len(week['fridge_vegetables'])}")
        # print first few?
        print(f"  {', '.join(week['fridge_vegetables'][:5])}...")

if __name__ == '__main__':
    main()
