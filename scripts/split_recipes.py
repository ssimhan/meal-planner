#!/usr/bin/env python3
"""
Migrate monolithic recipes.json to individual YAML files for lazy loading.
"""

import json
import yaml
import os
from pathlib import Path

def main():
    source_path = Path('recipes/parsed/recipes.json')
    dest_dir = Path('recipes/details')
    
    if not source_path.exists():
        print(f"Error: {source_path} not found.")
        return
        
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    with open(source_path, 'r') as f:
        recipes = json.load(f)
        
    print(f"Found {len(recipes)} recipes in {source_path}")
    print(f"Migrating to {dest_dir}...")
    
    for recipe in recipes:
        r_id = recipe.get('id')
        if not r_id:
            print("Warning: Skipping recipe without ID")
            continue
            
        dest_file = dest_dir / f"{r_id}.yaml"
        
        # Write individual file
        with open(dest_file, 'w') as f:
            yaml.dump(recipe, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
            
    print(f"Successfully migrated {len(recipes)} recipes.")

if __name__ == '__main__':
    main()
