import sys
from pathlib import Path
import yaml
import traceback

# Add root to path so we can import scripts
sys.path.append(str(Path.cwd()))

from scripts.workflow.actions import generate_meal_plan
from scripts.workflow.state import load_history

def run_repro():
    print("Running reproduction script for 500 error...")
    
    # Mock data based on inputs/2026-01-12.yml
    data = {
        'week_of': '2026-01-12',
        'confirmed_veg': ['lettuce', 'cauliflower', 'kale', 'carrots', 'corn', 'tomatoes'],
        'schedule': {
            'busy_days': ['thu', 'fri'],
            'late_class_days': [],
            'special_notes': "Monday needs easy dinner, but can prep after dinner"
        },
        'preferences': {}, 
        'meals_covered': {} 
    }
    
    # Load real history so we can inject a modular recipe to test that case
    history = load_history()
    
    # Inject a "Main + Side" modular recipe into the current week's history to simulate the crash condition
    # Find or create the week
    week_found = False
    for week in history.get('weeks', []):
        if week['week_of'] == '2026-01-12':
            week['dinners'] = [
                {
                    'day': 'mon',
                    'recipe_ids': ['dal_tadka', 'jeera_rice'], # Modular!
                    'recipe_id': 'dal_tadka' # Legacy
                }
            ]
            week_found = True
            break
            
    if not week_found:
        history.setdefault('weeks', []).append({
            'week_of': '2026-01-12',
            'dinners': [
                 {
                    'day': 'mon',
                    'recipe_ids': ['dal_tadka', 'jeera_rice'], # Modular!
                    'recipe_id': 'dal_tadka' # Legacy
                }
            ]
        })

    print("[DEBUG] Injected modular recipe into history for Mon: Dal Tadka + Jeera Rice")

    try:
        # Pass mocked history so we don't modify the real file on disk (actions.py writes to file if None is passed? No, update_history writes)
        # update_history writes if history_path is provided. 
        # actions.py: history = update_history(None if history_dict else history_path, ...)
        # So passing history_dict prevents writing to real history file. perfect.
        
        generate_meal_plan(None, data, recipes_list=None, history_dict=history)
        print("SUCCESS: Plan generated without error.")
    except Exception as e:
        print("\nCAUGHT EXCEPTION:")
        traceback.print_exc()

if __name__ == "__main__":
    run_repro()
