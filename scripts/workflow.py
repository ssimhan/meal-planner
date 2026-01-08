#!/usr/bin/env python3
"""
Streamlined Meal Planner Workflow - Refactored Wrapper
"""

import sys
import yaml
from pathlib import Path
from datetime import datetime
import os

# Add parent directory to path to allow importing scripts.workflow
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scripts.workflow import (
    find_current_week_file, get_workflow_state, 
    generate_meal_plan, replan_meal_plan, create_new_week
)

def prompt_farmers_market_update(input_file, data):
    """Guide user to update farmers market confirmation."""
    print("\n" + "="*60)
    print(f"AWAITING FARMERS MARKET CONFIRMATION")
    print("="*60)
    proposed = data.get('farmers_market', {}).get('proposed_veg', [])
    print(f"\n📝 Proposed vegetables:")
    for veg in proposed: print(f"   • {veg}")
    print(f"\n📋 NEXT STEPS: Update 'confirmed_veg' and change status to 'confirmed' in {input_file}")

def show_week_complete(input_file, data):
    """Show completion status."""
    week_of = data['week_of']
    print(f"\n✅ WEEK {week_of} ACTIVE")

def show_status():
    """Show current workflow status."""
    input_file, week_str = find_current_week_file()
    state, data = get_workflow_state(input_file)
    print("\n" + "="*60 + "\nMEAL PLANNER WORKFLOW STATUS\n" + "="*60)
    print(f"Week: {week_str}\nStatus: {state}\nFile: {input_file}")

def main():
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == '--status':
            show_status()
            return
        if command == '--reset' or command == 'start-week':
            _, week_str = find_current_week_file()
            create_new_week(week_str)
            return
        if command == 'generate-plan':
            input_file, week_str = find_current_week_file()
            state, data = get_workflow_state(input_file)
            if state == 'ready_to_plan': generate_meal_plan(input_file, data)
            else: print(f"ERROR: Cannot generate plan in state: {state}"); sys.exit(1)
            return
        if command == 'replan':
            input_file, week_str = find_current_week_file()
            state, data = get_workflow_state(input_file)
            replan_meal_plan(input_file, data)
            return

    input_file, week_str = find_current_week_file()
    state, data = get_workflow_state(input_file)
    if state == 'new_week': create_new_week(week_str)
    elif state == 'awaiting_farmers_market': prompt_farmers_market_update(input_file, data)
    elif state == 'ready_to_plan': generate_meal_plan(input_file, data)
    elif state == 'active': show_week_complete(input_file, data)

if __name__ == "__main__":
    main()
