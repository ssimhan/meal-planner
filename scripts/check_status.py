
from flask import Flask, request
from api.routes.status import status_bp, _get_current_status
from api.utils import storage
import os
import json

app = Flask(__name__)
app.register_blueprint(status_bp)

# Check storage init
print(f"Storage init? {storage.supabase is not None}")
print(f"Household ID: 00000000-0000-0000-0000-000000000001")

with app.test_request_context():
    # Inject household_id
    request.household_id = "00000000-0000-0000-0000-000000000001"
    
    try:
        response = _get_current_status(skip_sync=False)
        print("--- Status Response ---")
        if hasattr(response, 'get_json'):
            print(json.dumps(response.get_json(), indent=2))
        else:
            print(response)
    except Exception as e:
        import traceback
        traceback.print_exc()
