#!/usr/bin/env python3
"""
Manual verification script for BUG-001.
Re-calculates prep tasks for the current active week using the new heuristic engine.
"""

import sys
import os
from pathlib import Path

# Add root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.utils.storage import StorageEngine, supabase
from scripts.workflow.html_generator import extract_prep_tasks_for_db

class MockRequest:
    household_id = "00000000-0000-0000-0000-000000000001"

def force_refresh_prep_tasks():
    print("Force Refreshing Prep Tasks for Active Week...")
    
    # Mock Flask request context
    import flask
    app = flask.Flask(__name__)
    with app.test_request_context():
        from flask import request
        request.household_id = MockRequest.household_id
        
        plan = StorageEngine.get_active_week()
        if not plan:
            print("❌ No active plan found.")
            return

        week_of = plan['week_of']
        history_data = plan.get('history_data') or {}
        
        # We need structured dinners and lunches
        selected_dinners = {}
        for dinner in history_data.get('dinners', []):
            day = dinner.get('day')
            recipe_id = dinner.get('recipe_id')
            if day and recipe_id:
                details = StorageEngine.get_recipe_details(recipe_id)
                if details:
                    selected_dinners[day] = details['recipe']
                    selected_dinners[day]['content'] = details['markdown']

        selected_lunches = history_data.get('lunches', {})
        
        print(f"  🔍 Extracting tasks for {len(selected_dinners)} dinners...")
        new_prep_tasks = extract_prep_tasks_for_db(selected_dinners, selected_lunches)
        
        if new_prep_tasks:
            print(f"  ✅ Generated {len(new_prep_tasks)} tasks.")
            for t in new_prep_tasks:
                print(f"    - [{t['day']}] {t['task']}")
                
            history_data['prep_tasks'] = new_prep_tasks
            
            StorageEngine.update_meal_plan(week_of, history_data=history_data)
            print(f"\n  🚀 Successfully updated database for week {week_of}!")
            print("  Please refresh your dashboard to see the new prep tasks.")
        else:
            print("  ⚠️ No prep tasks generated. Check if recipes have ingredients/instructions.")

if __name__ == '__main__':
    force_refresh_prep_tasks()
