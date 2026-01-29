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
        print("Fetching inventory...")
        inventory = StorageEngine.get_inventory()
        print(f"Success! Found categories: {list(inventory.keys())}")
        for cat, items in inventory.items():
            if isinstance(items, list):
                print(f"  {cat}: {len(items)} items")
            else:
                print(f"  {cat}: {len(items.get('backups', []))} backups, {len(items.get('ingredients', []))} ingredients")
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()
