
import sys
from pathlib import Path
# Add current dir to path
sys.path.append(str(Path.cwd()))

from scripts.workflow.html_generator import extract_prep_tasks_for_db

selected_dinners = {
    'mon': {'id': 'tacos', 'name': 'Tacos', 'main_veg': ['Onion']},
    'tue': {'id': 'curry', 'name': 'Curry', 'main_veg': ['Potato']}
}
selected_lunches = {}

try:
    tasks = extract_prep_tasks_for_db(selected_dinners, selected_lunches)
    print(f"Extracted {len(tasks)} tasks")
    for t in tasks:
        print(f"- {t['day']}: {t['task']}")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Error: {e}")
