import os
import sys
import yaml
from pathlib import Path
from flask import Blueprint, jsonify, request
from api.utils import get_cached_data, get_yaml_data, invalidate_cache
from api.utils.auth import require_auth
from api.utils.storage import StorageEngine

recipes_bp = Blueprint('recipes', __name__)

@recipes_bp.route("/api/recipes")
@require_auth
def get_recipes():
    try:
        recipes = StorageEngine.get_recipes()
        return jsonify({"status": "success", "recipes": recipes})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@recipes_bp.route("/api/recipes/<recipe_id>")
@require_auth
def get_recipe_details(recipe_id):
    """Fetch full recipe details on demand from Markdown."""
    try:
        details = StorageEngine.get_recipe_details(recipe_id)
        if details:
            return jsonify({
                "status": "success",
                "recipe": details['recipe'],
                "markdown": details['markdown']
            })
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
        
        # After import, we should migrate the new data to the DB.
        try:
            subprocess.run([sys.executable, "scripts/migrate_to_db.py"], capture_output=True)
        except Exception as e:
            print(f"Post-import migration failed: {e}")
            
        # Invalidate cache
        invalidate_cache('recipes')
        
        return jsonify({
            "status": "success", 
            "message": "Recipe imported successfully",
            "details": output
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@recipes_bp.route("/api/recipes/capture", methods=["POST"])
@require_auth
def capture_recipe():
    try:
        data = request.json or {}
        meal_name = data.get('name')
        mode = data.get('mode') # 'url' or 'manual'
        
        if not meal_name:
            return jsonify({"status": "error", "message": "Meal name is required"}), 400
            
        import re
        recipe_id = re.sub(r'[^a-zA-Z0-9]', '_', meal_name.lower()).strip('_')
        
        # Check if already exists in DB
        from api.utils import storage
        h_id = storage.get_household_id()
        existing = StorageEngine.get_recipe_details(recipe_id)
        if existing:
            return jsonify({"status": "error", "message": f"Recipe '{meal_name}' already exists"}), 400

        markdown_content = ""
        metadata = {
            "name": meal_name,
            "cuisine": "unknown",
            "meal_type": "dinner",
            "effort_level": "normal"
        }

        if mode == 'manual':
            ingredients = data.get('ingredients', '')
            instructions = data.get('instructions', '')
            
            # Format as list if newline separated
            ing_list = [i.strip() for i in ingredients.split('\n') if i.strip()]
            
            markdown_content = f"""---
name: {meal_name}
cuisine: unknown
meal_type: dinner
effort_level: normal
---

# {meal_name}

## Ingredients
"""
            for ing in ing_list:
                markdown_content += f"- {ing}\n"
                
            markdown_content += f"\n## Instructions\n{instructions}\n"
            
        elif mode == 'url':
            url = data.get('url')
            if not url:
                return jsonify({"status": "error", "message": "URL is required"}), 400
            
            # For URL mode, we'll use the existing import_recipe logic to start
            # But we want to return a better result.
            import subprocess
            cmd = [sys.executable, "scripts/import_recipe.py", url]
            import_res = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd())
            if import_res.returncode != 0:
                print(f"URL Import failed: {import_res.stderr}")
            
            md_path = Path(f'recipes/content/{recipe_id}.md')
            if not md_path.exists():
                markdown_content = f"""---
name: {meal_name}
source_url: {url}
---

# {meal_name}

Added from URL: {url}
"""

        # Save MD to disk if we generated content
        if markdown_content:
            md_path = Path(f'recipes/content/{recipe_id}.md')
            md_path.parent.mkdir(parents=True, exist_ok=True)
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(markdown_content)

        import subprocess
        md_file_path = Path(f'recipes/content/{recipe_id}.md')
        if md_file_path.exists():
            subprocess.run([sys.executable, "scripts/generate_prep_steps.py", str(md_file_path)], capture_output=True)

        # Run parser to update local index.yml
        parse_res = subprocess.run([sys.executable, "scripts/parse_recipes.py"], capture_output=True, text=True)
        if parse_res.returncode != 0:
            print(f"Recipe parsing failed: {parse_res.stderr}")
            return jsonify({"status": "error", "message": f"Parsing failed: {parse_res.stderr}"}), 500
        
        # Targeted Sync to DB instead of full migration
        try:
            with open('recipes/index.yml', 'r') as f:
                index = yaml.safe_load(f)
            
            entry = next((e for e in index if e['id'] == recipe_id), None)
            if entry:
                with open(md_file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                StorageEngine.save_recipe(recipe_id, entry['name'], entry, content)
            else:
                # If for some reason parser didn't pick it up, sync what we have
                content = ""
                with open(md_file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                StorageEngine.save_recipe(recipe_id, meal_name, {"name": meal_name}, content)
        except Exception as e:
            print(f"Targeted DB sync failed: {e}")
            # Non-fatal for the user, but it means DB and local files are out of sync

        invalidate_cache('recipes')
        
        return jsonify({
            "status": "success",
            "message": f"Successfully captured recipe for {meal_name}",
            "recipe_id": recipe_id
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500
