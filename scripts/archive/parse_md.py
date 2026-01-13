#!/usr/bin/env python3
"""
Markdown Recipe Parser
Parses recipes/content/*.md and updates the recipe index with metadata and prep steps.
"""

import os
import re
import yaml
import json
from pathlib import Path

def parse_md_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract Frontmatter
    frontmatter_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not frontmatter_match:
        print(f"Error: No frontmatter found in {file_path.name}")
        return None

    try:
        data = yaml.safe_load(frontmatter_match.group(1))
    except yaml.YAMLError as e:
        print(f"Error parsing YAML in {file_path.name}: {e}")
        return None
        
    # Extract Prep Steps
    prep_steps = []
    prep_match = re.search(r'### Prep Steps\s*\n(.*?)(?=\n### |$)', content, re.DOTALL)
    if prep_match:
        raw_steps = prep_match.group(1).strip()
        # Extract list items (bullets or numbers)
        items = re.findall(r'^[-\*]\s+(.*)$', raw_steps, re.MULTILINE)
        # Filter out comments and empty lines
        prep_steps = [item.strip() for item in items if item.strip() and not item.strip().startswith('<!--')]
        
        # If no regex match for list items, try line by line cleanup
        if not prep_steps and raw_steps:
             lines = raw_steps.split('\n')
             for line in lines:
                 l = line.strip()
                 if l and not l.startswith('<!--') and not l.startswith('-->'):
                     prep_steps.append(l.lstrip('-*').strip())

    data['prep_steps'] = prep_steps
    data['source'] = {
        'type': 'markdown',
        'file': str(Path('recipes/content') / file_path.name)
    }
    
    # Ensure ID exists
    if 'id' not in data:
        data['id'] = file_path.stem
        
    return data

def main():
    content_dir = Path('recipes/content')
    recipes = []
    
    print("Parsing Markdown recipes...")
    for file_path in sorted(content_dir.glob('*.md')):
        data = parse_md_file(file_path)
        if data:
            recipes.append(data)
            
    print(f"Parsed {len(recipes)} recipes.")
    
    # Update index.yml
    index_path = Path('recipes/index.yml')
    with open(index_path, 'r', encoding='utf-8') as f:
        # Load existing to preserve any manual extra fields if necessary?
        # Actually in the new system, MD frontmatter IS the source of truth.
        pass
        
    with open(index_path, 'w', encoding='utf-8') as f:
        yaml.dump(recipes, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    print(f"Updated {index_path}")
    
    # Update recipes.json for legacy compat if needed
    json_path = Path('recipes/parsed/recipes.json')
    json_path.parent.mkdir(exist_ok=True)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)
    print(f"Updated {json_path}")

if __name__ == "__main__":
    main()
