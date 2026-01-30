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
        
        # Logic: Extract -> Normalize -> Save to DB (Stateless)
        result = extract_recipe_from_url(url)
        
        if not result.get('success'):
            return jsonify({"status": "error", "message": result.get('error', 'Extraction failed')}), 422
            
        import re
        recipe_id = re.sub(r'[^a-zA-Z0-9]', '_', result['name'].lower()).strip('_')
        
        # Prepare metadata
        metadata = {
            "name": result['name'],
            "cuisine": "unknown",
            "meal_type": "dinner",
            "effort_level": "normal",
            "source_url": url,
            "tags": ["imported"]
        }
        
        # Prepare markdown
        markdown_content = f"""---
name: {result['name']}
source_url: {url}
cuisine: unknown
meal_type: dinner
tags: ["imported"]
---

# {result['name']}

## Ingredients
"""
        for ing in result.get('ingredients', []):
            markdown_content += f"- {ing}\n"
            
        markdown_content += "\n## Instructions\n"
        for ins in result.get('instructions', []):
            markdown_content += f"{ins}\n"

        # Save to Supabase (Stateless)
        StorageEngine.save_recipe(recipe_id, result['name'], metadata, markdown_content)
        
        # Invalidate cache
        invalidate_cache('recipes')
        
        return jsonify({
            "status": "success", 
            "message": "Recipe imported and saved to database successfully",
            "recipe_id": recipe_id
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
            
            # TD-012 FIX: Auto-populate Prep Tasks using heuristic generator
            try:
                from scripts.generate_prep_steps import get_prep_tasks
                prep_tasks = get_prep_tasks(markdown_content)
                if prep_tasks:
                    markdown_content += "\n## Prep Steps\n"
                    for task in prep_tasks:
                        markdown_content += f"- {task}\n"
                    # Also store in metadata for direct DB access
                    metadata['prep_steps'] = prep_tasks
            except Exception as e:
                print(f"WARNING: Failed to auto-generate prep tasks: {e}")
                
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

        # Save to Supabase via StorageEngine
        # StorageEngine.save_recipe handles both metadata and content updates in the DB
        # We don't need markdown_content local files anymore.
        
        # Ensure we have some content to save
        save_markdown = markdown_content if markdown_content else f"# {meal_name}\n\nRecipe imported from {url if mode == 'url' else 'manual entry'}."

        StorageEngine.save_recipe(recipe_id, meal_name, metadata, save_markdown)

        # Invalidate cache
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


@recipes_bp.route("/api/recipes/bulk-update", methods=["POST"])
@require_auth
def bulk_update_recipes_route():
    try:
        data = request.json or {}
        updates = data.get('updates', [])
        
        if not updates or not isinstance(updates, list):
            return jsonify({"status": "error", "message": "List of updates required"}), 400
            
        prepared_updates = []
        for u in updates:
            recipe_id = u.get('id')
            if not recipe_id: continue
            
            # Fetch current details to preserve content/metadata not being changed
            existing = StorageEngine.get_recipe_details(recipe_id)
            if not existing: continue
            
            current_meta = existing['recipe']
            current_content = existing['markdown']
            
            # Merge name, metadata, and content
            new_name = u.get('name', current_meta.get('name'))
            
            # Metadata merge (excluding name/id)
            incoming_metadata = u.get('metadata', {})
            updates_filtered = {k: v for k, v in incoming_metadata.items() if k not in ['id', 'name']}
            
            # SMART TAG MERGE: Preserve system tags if incoming update has tags
            if 'tags' in updates_filtered:
                incoming_tags = set(updates_filtered['tags'] or [])
                current_tags = set(current_meta.get('tags') or [])
                
                # Define system tags that frequent the DB but might be hidden in UI
                # imported: From URL import
                # missing_*: specific audit tags
                # not meal: specific audit tag
                PROTECTED_TAGS = {'imported', 'not meal'}
                
                # Keep existing protected tags even if not in incoming
                preserved = current_tags & PROTECTED_TAGS
                
                # Final tags = Incoming user tags + Preserved system tags
                final_tags = list(incoming_tags | preserved)
                updates_filtered['tags'] = final_tags
            
            new_metadata = {**current_meta, **updates_filtered}
            new_metadata.pop('name', None)
            new_metadata.pop('id', None)
            
            new_content = u.get('content', current_content)
            
            prepared_updates.append({
                "id": recipe_id,
                "name": new_name,
                "metadata": new_metadata,
                "content": new_content
            })
            
        if prepared_updates:
            StorageEngine.bulk_update_recipes(prepared_updates)
            invalidate_cache('recipes')
            return jsonify({"status": "success", "message": f"Successfully updated {len(prepared_updates)} recipes"})
        else:
            return jsonify({"status": "error", "message": "No valid recipes found for update"}), 404
            
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
