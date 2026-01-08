import sys
import traceback
from flask import Flask, jsonify
from api.routes.status import status_bp

app = Flask(__name__)
app.register_blueprint(status_bp)

@app.errorhandler(Exception)
def handle_error(e):
    traceback.print_exc()
    return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

if __name__ == "__main__":
    print("Testing status endpoint...")
    with app.test_request_context('/api/status'):
        try:
            from api.routes.status import get_status
            res = get_status()
            print("Status OK")
        except Exception:
            traceback.print_exc()

    print("\nTesting recipes endpoint...")
    with app.test_request_context('/api/recipes'):
        try:
            from api.routes.recipes import get_recipes
            res = get_recipes()
            print("Recipes OK")
        except Exception:
            traceback.print_exc()
