from flask import Flask, jsonify, request
import sys
import os
from flask_cors import CORS
from api.utils import get_yaml_data, invalidate_cache, CACHE, get_cached_data
from api.utils.auth import require_auth

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# Import Blueprints
from api.routes.status import status_bp
from api.routes.meals import meals_bp
from api.routes.inventory import inventory_bp
from api.routes.recipes import recipes_bp

# Register Blueprints
app.register_blueprint(status_bp)
app.register_blueprint(meals_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(recipes_bp)

# Health Check
@app.route("/api/health")
def health_check():
    return jsonify({"status": "healthy", "version": "2.0.0"})





@app.route("/api/suggestions")
@require_auth
def get_meal_suggestions():
    try:
        from scripts.inventory_intelligence import get_substitutions
        suggestions = get_substitutions(limit=5)
        return jsonify({
            "status": "success",
            "suggestions": suggestions
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5328))
    app.run(host='0.0.0.0', port=port)
