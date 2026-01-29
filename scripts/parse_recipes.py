#!/usr/bin/env python3
import os
import yaml
import glob
from pathlib import Path

def parse_frontmatter(content):
    if content.startswith('---'):
        try:
            parts = content.split('---', 2)
            if len(parts) >= 3:
                return yaml.safe_load(parts[1])
        except Exception as e:
            print(f"Error parsing yaml: {e}")
    return {}

def main():
    recipes = []
    recipe_dir = Path("recipes/content")
    
    if not recipe_dir.exists():
        print("No recipes/content directory found.")
        return

    for md_file in glob.glob(str(recipe_dir / "*.md")):
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            metadata = parse_frontmatter(content)
            if not metadata or 'name' not in metadata:
                print(f"Skipping {md_file}: Missing frontmatter or name")
                continue
                
            recipe_id = Path(md_file).stem
            recipe_data = {
                'id': recipe_id,
                'name': metadata.get('name', 'Unknown'),
                'cuisine': metadata.get('cuisine', 'unknown'),
                'meal_type': metadata.get('meal_type', 'dinner'),
                'effort_level': metadata.get('effort_level', 'normal'),
                'tags': metadata.get('tags', [])
            }
            # Optional fields
            for field in ['no_chop_compatible', 'leftover_potential', 'kid_favorite', 'main_veg', 'appliances', 'categories', 'image', 'source_url']:
                if field in metadata:
                    recipe_data[field] = metadata[field]

            recipes.append(recipe_data)
        except Exception as e:
            print(f"Error processing {md_file}: {e}")

    # Write index
    with open("recipes/index.yml", 'w', encoding='utf-8') as f:
        yaml.dump(recipes, f, default_flow_style=False, sort_keys=False)
        
    print(f"Successfully indexed {len(recipes)} recipes to recipes/index.yml")

if __name__ == "__main__":
    main()
