from flask import Flask, jsonify, request
import sys
import os
from flask_cors import CORS
from api.utils import get_yaml_data, invalidate_cache, CACHE, get_cached_data

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

if __name__ == "__main__":
    app.run(port=5328, debug=True)




@app.route("/api/recipes/import", methods=["POST"])
def import_recipe():
    try:
        data = request.json or {}
        url = data.get('url')
        if not url:
            return jsonify({"status": "error", "message": "URL is required"}), 400
            
        import sys
        import subprocess
        from pathlib import Path
        
        # Call the standalone script
        # Note: In production (Vercel), we might need to handle this differently
        # since we can't write to recipes/raw_html/ easily.
        # But for local or GitHub-synced setups, this works.
        
        script_path = Path(__file__).parent.parent / 'scripts' / 'import_recipe.py'
        result = subprocess.run([sys.executable, str(script_path), url], capture_output=True, text=True)
        
        if result.returncode == 0:
            # Sync the new files to GitHub
            from scripts.github_helper import sync_changes_to_github
            # Get latest recipe ID from the output or just sync index.yml
            sync_changes_to_github(['recipes/index.yml', 'recipes/parsed/recipes.json'])
            
            return jsonify({
                "status": "success", 
                "message": "Recipe imported and index updated!",
                "output": result.stdout
            })
        else:
            return jsonify({
                "status": "error", 
                "message": "Failed to import recipe",
                "details": result.stderr or result.stdout
            }), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# For local development
@app.route("/api/suggestions")
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
