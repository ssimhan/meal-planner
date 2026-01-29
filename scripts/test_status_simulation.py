import flask
import os
import sys
from pathlib import Path

# Add root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.utils.storage import StorageEngine

app = flask.Flask(__name__)
with app.test_request_context():
    from flask import request
    request.household_id = "00000000-0000-0000-0000-000000000001"
    
    try:
        print("Fetching status simulation...")
        # Simulating parts of _get_current_status
        plan = StorageEngine.get_active_week()
        if plan:
            print(f"Active week: {plan['week_of']}")
            state, data = StorageEngine.get_workflow_state(plan)
            print(f"State: {state}")
            
            # Check prep tasks
            today_tasks = plan.get('history_data', {}).get('prep_tasks', [])
            print(f"Prep tasks in history: {len(today_tasks)}")
            
        else:
            print("No active plan.")
            
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()
