#!/usr/bin/env python3
"""Log daily meal execution to history.yml."""

import argparse
import yaml
import sys
from pathlib import Path
from datetime import datetime

HISTORY_FILE = Path('data/history.yml')
INVENTORY_FILE = Path('data/inventory.yml')

import os

def get_actual_path(rel_path):
    is_vercel = os.environ.get('VERCEL') == '1'
    if is_vercel:
        tmp_path = Path("/tmp") / rel_path
        # For writing, we need to ensure the directory exists in /tmp
        os.makedirs(tmp_path.parent, exist_ok=True)
        return tmp_path
    return Path(rel_path)

def load_history():
    """Load history.yml or return empty structure."""
    path = get_actual_path('data/history.yml')
    if not path.exists():
        # Fallback to local if /tmp doesn't have it yet
        path = Path('data/history.yml')
    
    if not path.exists():
        print(f"Error: {path} not found.")
        sys.exit(1)
    
    with open(path, 'r') as f:
        return yaml.safe_load(f) or {'weeks': []}

def save_history(history):
    """Save updated history to history.yml."""
    path = get_actual_path('data/history.yml')
    with open(path, 'w') as f:
        yaml.dump(history, f, default_flow_style=False, sort_keys=False)
    print(f"Saved history to {path}")

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

def update_inventory_file(args, used_veggies=None):
    """Update the master data/inventory.yml file."""
    path = get_actual_path('data/inventory.yml')
    if not path.exists():
        path = Path('data/inventory.yml')
        
    if not path.exists():
        return

    try:
        with open(path, 'r') as f:
            inventory = yaml.safe_load(f) or {}
        
        updated = False
        
        # 1. Used freezer backup -> Remove from inventory
        if args.made == 'freezer_backup' or args.made == 'freezer':
            meal_name = args.freezer_meal
            if meal_name and 'freezer' in inventory and 'backups' in inventory['freezer']:
                for i, item in enumerate(inventory['freezer']['backups']):
                    if item.get('meal', '').lower() == meal_name.lower():
                        inventory['freezer']['backups'].pop(i)
                        updated = True
                        print(f"  - Removed '{meal_name}' from master freezer inventory")
                        break

        # 2. Made 2x -> Add to inventory
        if args.made_2x:
            # Derive a readable name
            meal_name = args.actual_meal or "New Freezer Meal"
            if 'freezer' not in inventory: inventory['freezer'] = {}
            if 'backups' not in inventory['freezer']: inventory['freezer']['backups'] = []
            
            inventory['freezer']['backups'].append({
                'meal': meal_name,
                'servings': 4, # Default
                'frozen_date': datetime.now().strftime('%Y-%m-%d')
            })
            updated = True
            print(f"  - Added '{meal_name}' to master freezer inventory")

        # 3. Vegetables used -> Remove from fridge inventory
        if used_veggies and 'fridge' in inventory:
            def normalize_veg(n):
                return n.lower().strip().rstrip('s')

            norm_used = [normalize_veg(v) for v in used_veggies]
            new_fridge = []
            for item in inventory['fridge']:
                item_name = item.get('item', '')
                if normalize_veg(item_name) in norm_used:
                    updated = True
                    print(f"  - Removed '{item_name}' from master fridge inventory")
                    continue
                new_fridge.append(item)
            inventory['fridge'] = new_fridge

        if updated:
            inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')
            with open(path, 'w') as f:
                yaml.dump(inventory, f, default_flow_style=False, sort_keys=False)
                
    except Exception as e:
        print(f"Warning: Failed to update inventory.yml: {e}")

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
            
            def normalize_veg(n):
                """Normalize name for matching (lower, strip s)."""
                n = n.lower().strip()
                if n.endswith('s') and not n.endswith('ss'):
                    return n[:-1]
                return n

            used_temp = [normalize_veg(v) for v in veggies_list]
            new_fridge = []

            for veg in week['fridge_vegetables']:
                veg_norm = normalize_veg(veg)
                
                # Check for match (either exact norm match or partial)
                match_found = False
                
                if veg_norm in used_temp:
                    used_temp.remove(veg_norm)
                    match_found = True
                
                if not match_found:
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
        update_inventory_file(args) 

    # Final sync of master inventory for any other changes (veggies, made_2x)
    if args.vegetables or args.made_2x:
        used_veggies = [v.strip() for v in args.vegetables.split(',')] if args.vegetables else None
        update_inventory_file(args, used_veggies)

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
