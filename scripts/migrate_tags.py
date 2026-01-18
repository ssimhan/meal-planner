#!/usr/bin/env python3
import os
import yaml
from pathlib import Path

RECIPE_DIR = Path("recipes/details")
INDEX_FILE = Path("recipes/index.yml")

def migrate_tags():
    if not RECIPE_DIR.exists():
        print(f"Directory {RECIPE_DIR} not found.")
        return

    files = list(RECIPE_DIR.glob("*.yaml")) + list(RECIPE_DIR.glob("*.yml"))
    print(f"Found {len(files)} recipes to process.")

    updated_recipes = []

    for file_path in files:
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data = yaml.safe_load(f)
            except Exception as e:
                print(f"Error parsing {file_path}: {e}")
                continue
        
        if not data:
            continue

        existing_tags = set(data.get('tags', []))
        new_tags = set(existing_tags)

        # 1. Migrate from categories
        categories = data.get('categories', [])
        if isinstance(categories, list):
            for cat in categories:
                new_tags.add(cat.lower())
        
        # 2. Migrate from appliances
        appliances = data.get('appliances', [])
        if isinstance(appliances, list):
            for app in appliances:
                if app != 'none':
                    new_tags.add(app.lower())

        # 3. Check for keywords in title/id
        title = data.get('title', '').lower()
        id_str = data.get('id', '').lower()
        
        keywords = {
            'instant pot': 'instant pot',
            'ip': 'instant pot',
            'stovetop': 'stovetop',
            'air fryer': 'air fryer',
            'oven': 'oven',
            'slow cook': 'slow cooker',
            'crockpot': 'slow cooker'
        }

        for kw, tag in keywords.items():
            if kw in title or kw in id_str:
                new_tags.add(tag)

        # 4. Handle source names (heuristic: if it's in categories and capitalized/abbreviated)
        # We already added categories to tags. 
        
        # 5. Clean up tags
        # Remove redundant tags if any
        if 'none' in new_tags:
            new_tags.remove('none')
        
        # Filter out empty or null tags
        new_tags = {t for t in new_tags if t and isinstance(t, str)}

        # Update data if changed
        if new_tags != existing_tags:
            data['tags'] = sorted(list(new_tags))
            with open(file_path, 'w', encoding='utf-8') as f:
                yaml.dump(data, f, sort_keys=False, default_flow_style=False, allow_unicode=True)
            print(f"Updated tags for {file_path.name}: {data['tags']}")
        
        # Keep track for index.yml sync
        recipe_entry = {
            'id': data.get('id'),
            'name': data.get('name') or data.get('title'),
            'cuisine': data.get('cuisine'),
            'meal_type': data.get('meal_type'),
            'effort_level': data.get('effort_level'),
            'no_chop_compatible': data.get('no_chop_compatible', False),
            'tags': data.get('tags', [])
        }
        updated_recipes.append(recipe_entry)

    # Sync to index.yml if it exists
    if INDEX_FILE.exists():
        with open(INDEX_FILE, 'r', encoding='utf-8') as f:
            index_data = yaml.safe_load(f)
        
        if isinstance(index_data, list):
            # Create a map for quick lookup
            update_map = {r['id']: r for r in updated_recipes if r['id']}
            
            for entry in index_data:
                recipe_id = entry.get('id')
                if recipe_id in update_map:
                    entry['tags'] = update_map[recipe_id]['tags']
            
            with open(INDEX_FILE, 'w', encoding='utf-8') as f:
                yaml.dump(index_data, f, sort_keys=False, default_flow_style=False, allow_unicode=True)
            print(f"Synced tags to {INDEX_FILE}")

if __name__ == "__main__":
    migrate_tags()
