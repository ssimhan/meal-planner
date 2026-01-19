#!/usr/bin/env python3
import os
import yaml
import argparse
import re
from pathlib import Path
import difflib
import sys

# Configuration
RECIPE_DIR = Path("recipes/details")
SCHEMA_REQUIRED_KEYS = ["title", "ingredients", "prep_steps", "cook_steps"]
KEY_ORDER = ["id", "title", "name", "categories", "cuisine", "meal_type", "effort_level", "prep_time_minutes", "cook_time_minutes", "appliances", "tags", "ingredients", "prep_steps", "cook_steps", "main_veg", "source_url", "source_file"]

# Ingredient Categories (Ordered by importance)
# Note: Fats and Spices should be checked EARLY to catch "Avocado Oil" before "Avocado"
CATEGORIES = {
    "grains": ["rice", "quinoa", "pasta", "bread", "tortilla", "chapathi", "roti", "oats", "flour", "semolina", "poha"],
    "aromatics": ["ginger", "garlic", "onion", "chili", "chilies", "curry leaves", "hing", "asafetida"],
    "fats": ["oil", "ghee", "butter", "fat"],
    "spices": ["masala", "powder", "turmeric", "cumin", "coriander", "garam masala", "salt", "pepper", "cinnamon", "clove", "cardamom", "amchur", "hing", "mustard seeds", "jeera", "cloves"],
    "produce": ["potato", "onion", "tomato", "carrot", "broccoli", "spinach", "cilantro", "ginger", "garlic", "chili", "corn", "avocado", "lemon", "lime", "bell pepper", "cucumber", "zucchini", "cauliflower", "beans", "peas"],
    "other": []
}

# Spices/Fats that shouldn't have quantities
RESTRICTED_QUANTITY_KEYWORDS = CATEGORIES["spices"] + CATEGORIES["fats"] + ["chili", "chilies"]

# Heuristics for splitting instructions
PREP_KEYWORDS = ["wash", "chop", "soak", "marinade", "pre-measure", "thaw", "peel", "quarter", "steam", "dice", "grind", "prep"]
COOK_KEYWORDS = ["saute", "tempering", "pressure cook", "blend", "finish", "serve", "heat", "boil", "fry", "simmer", "whistle", "mash", "grill", "roll", "combine", "sauteing"]

def get_category(ingredient):
    if not isinstance(ingredient, str):
        return "other"
    ing_lower = ingredient.lower()
    # Check these first as they are more specific
    for cat in ["grains", "fats", "spices", "aromatics", "produce"]:
        if any(kw in ing_lower for kw in CATEGORIES[cat]):
            return cat
    return "other"

def normalize_ingredient(ingredient):
    # Only normalize if it's a string
    if not isinstance(ingredient, str):
        return ingredient
        
    # Clean whitespace
    ing = ingredient.strip()
    
    # Check if it's a spice/fat that should have quantity stripped
    ing_lower = ing.lower()
    if any(kw in ing_lower for kw in RESTRICTED_QUANTITY_KEYWORDS):
        # Strip common quantity prefixes
        # Use word boundaries \b for units to avoid matching "green" as "g" unit
        ing = re.sub(r'^[\d\/\.\-\s]*(?:\b(?:tbsp|tsp|tspn|tablespoon|teaspoon|cup|g|oz|ml|large|small|medium)\b)?\s*', '', ing, flags=re.IGNORECASE)
    
    # Capitalize first letter if it's a common name
    return ing[0].upper() + ing[1:] if ing else ing

def split_instructions(instructions):
    """Splits a string of instructions into prep_steps and cook_steps."""
    if not isinstance(instructions, (str, list)):
        return [], [str(instructions)]
        
    if isinstance(instructions, list):
        # Already a list, try to categorize each step
        prep = []
        cook = []
        for step in instructions:
            step_lower = step.lower()
            if any(kw in step_lower for kw in PREP_KEYWORDS) and not any(kw in step_lower for kw in COOK_KEYWORDS):
                prep.append(step.strip())
            else:
                cook.append(step.strip())
        return prep, cook
    
    # If it's a string, try splitting by common separators
    # First priority: Newlines
    steps = [s.strip() for s in re.split(r'\n+', instructions) if s.strip()]
    if len(steps) == 1:
        # Second priority: Double spaces
        steps = [s.strip() for s in re.split(r'\s\s+', instructions) if s.strip()]
    if len(steps) == 1:
        # Third priority: Sentence boundaries (period followed by space and Capital)
        steps = [s.strip() for s in re.split(r'\.\s+(?=[A-Z])', instructions) if s.strip()]
        # Add back period if missing
        steps = [s if s.endswith('.') else s + '.' for s in steps]
    
    prep = []
    cook = []
    
    found_cook_step = False
    for step in steps:
        step_lower = step.lower()
        # Heuristic: Once we hit a "cook" keyword, assume the rest are cook steps unless clearly prep
        is_cook = any(kw in step_lower for kw in COOK_KEYWORDS)
        if is_cook:
            found_cook_step = True
            
        if found_cook_step:
            cook.append(step)
        elif any(kw in step_lower for kw in PREP_KEYWORDS):
            prep.append(step)
        else:
            # Default to cook if we haven't found prep either
            cook.append(step)
            
    return prep, cook

def normalize_recipe(data):
    # 1. Map name -> title
    if "name" in data and "title" not in data:
        data["title"] = data["name"]
    
    # 2. Normalize Ingredients
    ingredients = data.get("ingredients", [])
    if ingredients:
        # Normalize individual strings
        normalized = [normalize_ingredient(i) for i in ingredients]
        # Sort by category importance
        cat_order = list(CATEGORIES.keys())
        normalized.sort(key=lambda x: (cat_order.index(get_category(x)), x.lower() if isinstance(x, str) else str(x)))
        data["ingredients"] = normalized
        
    # 3. Handle Instructions -> Prep/Cook Steps
    if "instructions" in data and (not data.get("prep_steps") and not data.get("cook_steps")):
        prep, cook = split_instructions(data["instructions"])
        data["prep_steps"] = prep
        data["cook_steps"] = cook
        # We keep instructions for now but move to steps
    
    # Ensure lists for steps
    if "prep_steps" not in data: data["prep_steps"] = []
    if "cook_steps" not in data: data["cook_steps"] = []
    
    # Sort keys for deterministic output
    new_data = {}
    # First, existing keys in KEY_ORDER
    for k in KEY_ORDER:
        if k in data:
            new_data[k] = data[k]
    # Then any remaining keys
    for k in sorted(data.keys()):
        if k not in new_data:
            new_data[k] = data[k]
            
    return new_data

def process_file(file_path, check_only=False):
    with open(file_path, 'r') as f:
        try:
            original_content = f.read()
            data = yaml.safe_load(original_content)
        except Exception as e:
            return False, f"Error parsing {file_path}: {e}"
            
    if not data:
        return False, f"Empty file: {file_path}"
        
    normalized_data = normalize_recipe(data)
    
    # Deterministic Dumper
    class OrderedDumper(yaml.SafeDumper):
        pass
    
    new_content = yaml.dump(normalized_data, Dumper=OrderedDumper, sort_keys=False, default_flow_style=False, allow_unicode=True)
    
    if original_content.strip() == new_content.strip():
        return True, None
        
    if check_only:
        # Show diff if check fails?
        # diff = difflib.unified_diff(original_content.splitlines(), new_content.splitlines())
        return False, f"File {file_path} needs normalization"
        
    # Safe Write
    temp_path = file_path.with_suffix(".tmp")
    with open(temp_path, 'w') as f:
        f.write(new_content)
    os.replace(temp_path, file_path)
    
    return False, f"Normalized {file_path.name}"

def main():
    parser = argparse.ArgumentParser(description="Normalize recipe YAML files")
    parser.add_argument("--all", action="store_true", help="Process all recipes")
    parser.add_argument("--check", action="store_true", help="Check only mode (CI)")
    parser.add_argument("--file", help="Process specific file")
    
    args = parser.parse_args()
    
    files = []
    if args.file:
        files = [Path(args.file)]
    elif args.all or args.check:
        files = list(RECIPE_DIR.glob("*.yaml")) + list(RECIPE_DIR.glob("*.yml"))
        
    if not files:
        print("No files to process. Use --all or --file PATH")
        sys.exit(0)
        
    changed_count = 0
    error_count = 0
    
    for f in files:
        success, msg = process_file(f, check_only=args.check)
        if not success:
            if args.check:
                print(f"FAILED: {msg}")
                error_count += 1
            else:
                print(msg)
                changed_count += 1
        elif msg: # Some warning or info
            print(msg)
            
    if args.check:
        if error_count > 0:
            print(f"\n{error_count} files failed check.")
            sys.exit(1)
        else:
            print("\nAll files comply with normalization rules.")
    else:
        print(f"\nProcessed {len(files)} files. {changed_count} changed.")

if __name__ == "__main__":
    main()
