import os
import sys
import yaml
from pathlib import Path
from flask import Blueprint, jsonify, request
from api.utils import get_cached_data, get_yaml_data, invalidate_cache
from api.utils.auth import require_auth
from api.utils.storage import StorageEngine
from api.utils.scrapers import extract_recipe_from_url

recipes_bp = Blueprint('recipes', __name__)

@recipes_bp.route("/api/recipes/extract", methods=["POST"])
@require_auth
def extract_recipe_route():
    try:
        data = request.json or {}
        url = data.get('url')
        if not url:
            return jsonify({"status": "error", "message": "URL is required"}), 400
            
        # print(f"DEBUG: Extracting from {url}", flush=True)
        result = extract_recipe_from_url(url)
        # print(f"DEBUG: Extraction result success: {result.get('success')}", flush=True)
        
        if result.get('success'):
            return jsonify({"status": "success", "data": result})
        else:
            # Return 422 Unprocessable Entity for scraper failures, not 500
            return jsonify({"status": "error", "message": result.get('error', 'Unknown extraction error')}), 422
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@recipes_bp.route("/api/recipes")
@require_auth
def get_recipes():
    try:
        recipes = StorageEngine.get_recipes()
        return jsonify({"status": "success", "recipes": recipes})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@recipes_bp.route("/api/recipes/search")
@require_auth
def search_recipes():
    try:
        query = request.args.get('q', '').lower().strip()
        if not query:
            return jsonify({"status": "success", "recipes": []})
            
        recipes = StorageEngine.get_recipes()
        # Simple string matching for similarity
        matches = [r for r in recipes if query in r['name'].lower() or r['id'].lower().startswith(query)]
        
        return jsonify({"status": "success", "matches": matches[:10]})
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

@recipes_bp.route("/api/recipes/ignore", methods=["POST"])
@require_auth
def ignore_recipe_route():
    try:
        data = request.json or {}
        name = data.get('name')
        if not name:
            return jsonify({"status": "error", "message": "Name is required"}), 400
            
        success = StorageEngine.ignore_recipe(name)
        if success:
             return jsonify({"status": "success", "message": f"Ignored {name}"})
        else:
             return jsonify({"status": "error", "message": "Failed to ignore recipe"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@recipes_bp.route("/api/settings/preference", methods=["POST"])
@require_auth
def save_preference_route():
    try:
        data = request.json or {}
        ingredient = data.get('ingredient')
        brand = data.get('brand') # or 'note'
        
        if not ingredient:
            return jsonify({"status": "error", "message": "Ingredient is required"}), 400
            
        success = StorageEngine.save_preference(ingredient, brand)
        if success:
             return jsonify({"status": "success", "message": f"Saved preference for {ingredient}"})
        else:
             return jsonify({"status": "error", "message": "Failed to save preference"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@recipes_bp.route("/api/recipes/capture", methods=["POST"])
@require_auth
def capture_recipe():
    try:
        data = request.json or {}
        meal_name = data.get('name')
        mode = data.get('mode') # 'url' or 'manual'
        is_snack_only = data.get('is_snack_only', False)
        
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
        categories = ["snack"] if is_snack_only else []
        
        metadata = {
            "name": meal_name,
            "cuisine": "unknown",
            "meal_type": "snack" if is_snack_only else "dinner", 
            "effort_level": "normal",
            "categories": categories,
            "tags": ["not meal", "missing ingredients", "missing instructions"]
        }

        if mode == 'manual':
            ingredients = data.get('ingredients', '')
            instructions = data.get('instructions', '')
            
            # Format as list if newline separated
            ing_list = [i.strip() for i in ingredients.split('\n') if i.strip()]
            
            markdown_categories = f"\ncategories: {categories}" if categories else ""
            
            markdown_content = f"""---
name: {meal_name}
cuisine: unknown
meal_type: {"snack" if is_snack_only else "dinner"}
effort_level: normal{markdown_categories}
tags: ["not meal", "missing ingredients", "missing instructions"]
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
                markdown_categories = f"\ncategories: {categories}" if categories else ""
                markdown_content = f"""---
name: {meal_name}
source_url: {url}
meal_type: {"snack" if is_snack_only else "dinner"}{markdown_categories}
tags: ["not meal", "missing ingredients", "missing instructions"]
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


@recipes_bp.route("/api/recipes/<recipe_id>", methods=["PATCH"])
@require_auth
def update_recipe_metadata(recipe_id):
    try:
        data = request.json or {}
        
        # 1. Fetch current details
        existing = StorageEngine.get_recipe_details(recipe_id)
        if not existing:
            return jsonify({"status": "error", "message": "Recipe not found"}), 404
            
        current_metadata = existing['recipe']
        current_content = existing['markdown']
        
        # 2. Merge metadata
        # Remove fields that are directly on the table (id, name) from the metadata blob if present
        updates = {k: v for k, v in data.items() if k not in ['id', 'name']}
        new_metadata = {**current_metadata, **updates}
        
        # Clean up name/id from metadata as they are top-level columns
        new_metadata.pop('name', None)
        new_metadata.pop('id', None)
        
        # 3. Save back
        StorageEngine.save_recipe(
            recipe_id, 
            data.get('name', current_metadata.get('name')), 
            new_metadata, 
            current_content
        )
        
        invalidate_cache('recipes')
        
        return jsonify({"status": "success", "message": f"Updated metadata for {recipe_id}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@recipes_bp.route("/api/recipes/<recipe_id>", methods=["DELETE"])
@require_auth
def delete_recipe_route(recipe_id):
    try:
        StorageEngine.delete_recipe(recipe_id)
        invalidate_cache('recipes')
        return jsonify({"status": "success", "message": f"Deleted recipe {recipe_id}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@recipes_bp.route("/api/recipes/<recipe_id>/content")
@require_auth
def get_recipe_content(recipe_id):
    try:
        content = StorageEngine.get_recipe_content(recipe_id)
        
        # Also get basic recipe info
        details = StorageEngine.get_recipe_details(recipe_id)
        recipe_info = details['recipe'] if details else {}
        
        return jsonify({
            "status": "success",
            "recipe": {
                "id": recipe_id,
                "name": recipe_info.get('name', ''),
                "ingredients": content['ingredients'],
                "instructions": content['instructions']
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@recipes_bp.route("/api/recipes/<recipe_id>/content", methods=["PATCH"])
@require_auth
def update_recipe_content(recipe_id):
    try:
        data = request.json or {}
        ingredients = data.get('ingredients')
        instructions = data.get('instructions')
        prep_steps = data.get('prep_steps')
        name = data.get('name')
        cuisine = data.get('cuisine')
        effort_level = data.get('effort_level')
        tags = data.get('tags')
        
        StorageEngine.update_recipe_content(
            recipe_id, 
            ingredients=ingredients,
            prep_steps=prep_steps,
            instructions=instructions,
            name=name,
            cuisine=cuisine,
            effort_level=effort_level,
            tags=tags
        )
        invalidate_cache('recipes')
        
        return jsonify({"status": "success", "message": f"Updated local content for {recipe_id}"})
    except FileNotFoundError as e:
        return jsonify({"status": "error", "message": str(e)}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
