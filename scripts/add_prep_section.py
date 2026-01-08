#!/usr/bin/env python3
"""
Add Prep Steps Section to Markdown Recipes
Iterates through all recipes in recipes/content/ and adds a '### Prep Steps' section
before '### Ingredients' if it doesn't already exist.
"""

import os
from pathlib import Path

def add_prep_section():
    content_dir = Path('recipes/content')
    if not content_dir.exists():
        print(f"Error: {content_dir} not found.")
        return

    files = list(content_dir.glob('*.md'))
    print(f"Found {len(files)} markdown recipes.")
    
    updated_count = 0
    
    for file_path in files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if '### Prep Steps' in content:
            continue
            
        # Find insertion point (before Ingredients)
        if '### Ingredients' in content:
            parts = content.split('### Ingredients')
            new_content = parts[0] + '### Prep Steps\n\n<!-- List prep tasks here -->\n\n### Ingredients' + parts[1]
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            updated_count += 1
            print(f"Updated: {file_path.name}")
        else:
            print(f"Skipped (No Ingredients section): {file_path.name}")

    print(f"\nSuccessfully added Prep Steps section to {updated_count} recipes.")

if __name__ == "__main__":
    add_prep_section()
