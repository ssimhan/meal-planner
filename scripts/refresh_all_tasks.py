
import os
import sys
from pathlib import Path
# Add current dir to path
sys.path.append(str(Path.cwd()))

from api.utils.storage import supabase, execute_with_retry, StorageEngine
from scripts.workflow.html_generator import extract_prep_tasks_for_db

def refresh_all_households():
    print("Fetching active households for week 2026-01-26...")
    week_of = "2026-01-26"
    
    # Use the imported supabase client
    query = supabase.table("meal_plans").select("*").eq("week_of", week_of)
    res = execute_with_retry(query)
    
    if not res.data:
        print("No plans found for this week.")
        return

    for plan in res.data:
        h_id = plan['household_id']
        print(f"\nProcessing Household: {h_id}")
        
        history_data = plan.get('history_data') or {}
        
        history_dinners = history_data.get('dinners', [])
        selected_dinners = {d['day']: d for d in history_dinners if d.get('day')}
        
        history_lunches = history_data.get('lunches', {})
        selected_lunches = history_lunches
        
        if not selected_dinners and not selected_lunches:
            print(f"Skipping {h_id}: No dinners or lunches found in history_data.")
            continue
            
        print(f"Generating tasks for {len(selected_dinners)} dinners and {len(selected_lunches)} lunches...")
        new_prep_tasks = extract_prep_tasks_for_db(selected_dinners, selected_lunches)
        
        if new_prep_tasks:
            print(f"Found {len(new_prep_tasks)} tasks. Updating DB...")
            history_data['prep_tasks'] = new_prep_tasks
            
            supabase.table("meal_plans").update({"history_data": history_data}).eq("id", plan['id']).execute()
            print("✓ Updated.")
        else:
            print("No tasks generated.")

if __name__ == "__main__":
    refresh_all_households()
