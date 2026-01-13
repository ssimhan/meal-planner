
from flask import Blueprint, jsonify
from api.utils.auth import require_auth
from scripts.reset_test_data import reset_test

testing_bp = Blueprint('testing', __name__)

@testing_bp.route("/api/test/reset/pending_recipe", methods=["POST"])
@require_auth
def reset_pending_recipe():
    try:
        # Re-use the logic from scripts/reset_test_data.py
        # We can call it directly as a function since we modularized it (mostly).
        # But wait, reset_test_data.py was a script. Let's adapt it or import safely.
        
        # The script prints to stdout. We want to capture that or just trust it works.
        # It's better to refactor the logic into a reusable function in the script 
        # but importing 'reset_test' from 'scripts.reset_test_data' works if it was defined as a function.
        
        reset_test()
        
        return jsonify({
            "status": "success",
            "message": "Reset 'Test Mystery Curry' test data."
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
