import os
import sys
import yaml
from pathlib import Path
from flask import Blueprint, jsonify, request
from api.utils import get_cached_data, get_yaml_data
from api.utils.auth import require_auth

recipes_bp = Blueprint('recipes', __name__)

@recipes_bp.route("/api/recipes")
@require_auth
def get_recipes():
    try:
        # Use Cached Recipes
        recipes = get_cached_data('recipes', 'recipes/index.yml')
        if recipes is None:
            return jsonify({"status": "error", "message": "Recipe index not found"}), 404
        return jsonify({"status": "success", "recipes": recipes})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@recipes_bp.route("/api/recipes/<recipe_id>")
@require_auth
def get_recipe_details(recipe_id):
    """Fetch full recipe details on demand from Markdown."""
    try:
        detail_path = Path(f'recipes/content/{recipe_id}.md')
        if detail_path.exists():
             with open(detail_path, 'r') as f:
                content = f.read()
                
                # Basic frontmatter parsing (assuming standard --- format)
                if content.startswith('---'):
                    try:
                        _, fm_text, body = content.split('---', 2)
                        metadata = yaml.safe_load(fm_text)
                        return jsonify({
                            "status": "success", 
                            "recipe": metadata,
                            "markdown": body.strip()
                        })
                    except Exception as e:
                        print(f"Error parsing frontmatter for {recipe_id}: {e}")
                        return jsonify({"status": "success", "markdown": content})
                
                return jsonify({"status": "success", "markdown": content})
        else:
             return jsonify({"status": "error", "message": f"Recipe details not found for {recipe_id}"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@recipes_bp.route("/api/recipes/import", methods=["POST"])
@require_auth
def import_recipe():
    try:
        data = request.json or {}
        url = data.get('url')
        if not url:
            return jsonify({"status": "error", "message": "URL is required"}), 400
            
        print(f"Starting import for URL: {url}")
        
        # We'll use the scripts/import_recipe.py functionality
        # Since it's a script designed to be run from CLI usually, we might need to subprocess it
        # OR better, if we can import the main function.
        # Checking scripts/import_recipe.py (Need to verify if it has a callable main)
        # As a fallback, we can use subprocess which is safer for isolation
        
        # However, we are in the same environment. Let's try subprocess for reliability as originally intended?
        # Or let's see if we can import.
        # Given potential complexity of imports in that script, let's stick to subprocess or just replicate logic if simple.
        # But wait, we want to Modularize. 
        
        # Let's assume we can subprocess it for now to avoid refactoring import_recipe.py in this step.
        import subprocess
        
        # Prepare command
        cmd = [sys.executable, "scripts/import_recipe.py", url]
        
        # Run properly
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd())
        
        if result.returncode != 0:
            print(f"Import failed: {result.stderr}")
            return jsonify({"status": "error", "message": f"Import script failed: {result.stderr}"}), 500
            
        # Parse output to find the new recipe ID or file
        # The script usually prints "Successfully imported/parsed recipe: [ID]"
        output = result.stdout
        print(f"Import Output: {output}")
        
        # Sync changes to GitHub if on Vercel
        # The script import_recipe.py writes to disk.
        # If on Vercel, we need to commit the new files.
        # scripts/import_recipe.py MIGHT already handle git commit if it uses github_helper?
        # Let's check import_recipe.py content if needed, but for now assuming it does local write.
        
        # Ideally, we should sync:
        # recipes/imported/*.html
        # recipes/content/*.md
        # recipes/index.yml
        
        from scripts.github_helper import sync_changes_to_github
        
        # We don't know the exact ID easily without parsing stdout.
        # Let's simple sync the directories.
        sync_changes_to_github(['recipes/index.yml', 'recipes/content/*.md', 'recipes/imported/*.html'])
        
        # Invalidate cache
        from api.utils import invalidate_cache
        invalidate_cache('recipes')
        
        return jsonify({
            "status": "success", 
            "message": "Recipe imported successfully",
            "details": output
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
