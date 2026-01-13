#!/usr/bin/env python3
import sys
import yaml
import re
from pathlib import Path

def sanitize_id(name):
    return re.sub(r'[^a-zA-Z0-9]', '_', name.lower()).strip('_')

def ingest_manual(name, ingredients, instructions, cuisine='unknown', meal_type='dinner'):
    recipe_id = sanitize_id(name)
    content_dir = Path('recipes/content')
    content_dir.mkdir(parents=True, exist_ok=True)
    
    md_path = content_dir / f"{recipe_id}.md"
    
    # Check if exists
    if md_path.exists():
        return False, f"Recipe {recipe_id} already exists"
        
    ing_list = [i.strip() for i in ingredients.split('\n') if i.strip()]
    
    md_content = f"""---
name: {name}
cuisine: {cuisine}
meal_type: {meal_type}
effort_level: normal
---

# {name}

## Ingredients
"""
    for ing in ing_list:
        md_content += f"- {ing}\n"
        
    md_content += f"\n## Instructions\n"
    steps = [s.strip() for s in instructions.split('\n') if s.strip()]
    for i, step in enumerate(steps, 1):
        if step[0].isdigit() and ('. ' in step[:4] or ') ' in step[:4]):
             md_content += f"{step}\n"
        else:
             md_content += f"{i}. {step}\n"
             
    # TODO: AI Generation of Prep Steps (Phase 19 Block 1 Chunk 3)
    # For now, we'll leave it empty for manual review/future auto-gen
    
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(md_content)
        
    return True, recipe_id

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: ingest_manual.py <name> <ingredients_file> <instructions_file>")
        sys.exit(1)
        
    name = sys.argv[1]
    with open(sys.argv[2], 'r') as f:
        ingredients = f.read()
    with open(sys.argv[3], 'r') as f:
        instructions = f.read()
        
    success, result = ingest_manual(name, ingredients, instructions)
    if success:
        print(f"Successfully ingested: {result}")
    else:
        print(f"Error: {result}")
        sys.exit(1)
