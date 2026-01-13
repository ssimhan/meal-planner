
import sys
import os
import yaml
import json
from pathlib import Path
from collections import defaultdict
from rapidfuzz import fuzz, process

# Adjust path
sys.path.append(os.getcwd())

def load_recipes():
    """Load recipes from index.yml (or recipes.json for more detail if needed)."""
    try:
        with open('recipes/index.yml', 'r') as f:
            return yaml.safe_load(f) or []
    except Exception as e:
        print(f"Error loading recipes: {e}")
        return []

def check_quality(recipes):
    """Check for low quality recipes (missing core metadata)."""
    issues = defaultdict(list)
    
    for r in recipes:
        rid = r.get('id')
        name = r.get('name', 'Unknown')
        
        # Check basic fields
        if not r.get('cuisine') or r.get('cuisine') == 'unknown':
            issues['missing_cuisine'].append(name)
        
        if not r.get('meal_type') or r.get('meal_type') == 'unknown':
            issues['missing_meal_type'].append(name)
            
        if not r.get('ingredients') and not r.get('main_veg'):
            # Note: index.yml might not have ingredients fully, usually just main_veg.
            # But let's check what we have.
            pass
            
    return issues

def find_duplicates(recipes, threshold=90):
    """Find potential duplicates based on name similarity."""
    names = [r['name'] for r in recipes]
    duplicates = []
    
    # Simple N^2 check is fine for < 1000 recipes
    # Using rapidfuzz for speed
    
    seen = set()
    
    for i, name1 in enumerate(names):
        if name1 in seen: continue
        
        matches = process.extract(name1, names, scorer=fuzz.ratio, limit=5)
        
        found_group = []
        for match_name, score, idx in matches:
            if idx == i: continue # Skip self
            if score >= threshold:
                found_group.append((match_name, score))
                seen.add(match_name)
        
        if found_group:
            duplicates.append({
                'original': name1,
                'matches': found_group
            })
            seen.add(name1)
            
    return duplicates

def generate_report():
    print("Starting Recipe Index Audit...")
    recipes = load_recipes()
    print(f"Loaded {len(recipes)} recipes.")
    
    print("\n--- Quality Check ---")
    quality_issues = check_quality(recipes)
    for issue, items in quality_issues.items():
        print(f"\n{issue.replace('_', ' ').title()} ({len(items)}):")
        # Print first 5
        for item in items[:5]:
            print(f" - {item}")
        if len(items) > 5:
            print(f" ... and {len(items)-5} more")

    print("\n--- Duplicate Check ---")
    dupes = find_duplicates(recipes)
    if not dupes:
        print("No high-confidence duplicates found.")
    else:
        print(f"Found {len(dupes)} potential duplicate groups:")
        for group in dupes:
            print(f"\n- {group['original']}")
            for match, score in group['matches']:
                print(f"  -> Possible Match: '{match}' (Score: {score:.1f})")

if __name__ == "__main__":
    generate_report()
