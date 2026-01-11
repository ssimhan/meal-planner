from flask import Flask, jsonify, request
import sys
import os
from flask_cors import CORS

# Load local environment variables if they exist
try:
    from dotenv import load_dotenv
    # Prioritize .env.local for Next.js compatibility
    for env_file in ['.env.local', '.env']:
        if os.path.exists(env_file):
            load_dotenv(env_file)
            break
except ImportError:
    pass

from api.utils import get_yaml_data, invalidate_cache, CACHE, get_cached_data
from api.utils.auth import require_auth

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# Import Blueprints
from api.routes.status import status_bp
from api.routes.meals import meals_bp
from api.routes.inventory import inventory_bp
from api.routes.recipes import recipes_bp
from api.routes.reviews import reviews_bp

# Register Blueprints
app.register_blueprint(status_bp)
app.register_blueprint(meals_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(recipes_bp)
app.register_blueprint(reviews_bp)

# Health Check
@app.route("/api/health")
def health_check():
    return jsonify({"status": "healthy", "version": "2.0.1"})

@app.route("/api/debug")
def debug_info():
    from api.utils.storage import SUPABASE_URL, SUPABASE_SERVICE_KEY, supabase, init_error
    return jsonify({
        "url_configured": bool(SUPABASE_URL),
        "key_configured": bool(SUPABASE_SERVICE_KEY),
        "client_initialized": bool(supabase),
        "init_error": init_error,
        "environment": os.environ.get('VERCEL_ENV', 'unknown'),
        "python_version": sys.version
    })





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

@app.route("/api/suggestions/waste-not")
@require_auth
def get_waste_not_suggestions_route():
    try:
        from scripts.inventory_intelligence import get_waste_not_suggestions
        suggestions = get_waste_not_suggestions(limit=4)
        return jsonify({
            "status": "success",
            "suggestions": suggestions
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5328))
    app.run(host='0.0.0.0', port=port)
