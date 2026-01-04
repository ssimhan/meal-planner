from flask import Flask, jsonify
import sys
import os
from pathlib import Path
from flask_cors import CORS

# Add the parent directory to sys.path so we can import from scripts/
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from scripts.workflow import find_current_week_file, get_workflow_state
except ImportError as e:
    # Fallback for local development
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../scripts")))
    from workflow import find_current_week_file, get_workflow_state

from api.generate_plan import generate_plan_api

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

@app.route("/api/status")
def get_status():
    try:
        input_file, week_str = find_current_week_file()
        state, data = get_workflow_state(input_file)
        
        return jsonify({
            "week_of": week_str,
            "state": state,
            "has_data": data is not None,
            "status": "success"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# Register plan generation route
generate_plan_api(app)

@app.route("/api/hello")
def hello_world():
    return jsonify({"message": "Hello from Python on Vercel!"})

# For local development
if __name__ == "__main__":
    app.run(port=5328, debug=True)
