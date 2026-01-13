#!/usr/bin/env python3
"""
Recipe Parser for Meal Planner System
Converts Markdown recipe files into structured JSON and YAML indexes.

Usage: python scripts/parse_recipes.py
"""

import os
import json
import yaml
import re
from pathlib import Path
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, asdict
from collections import Counter


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class Recipe:
    """Represents a fully parsed recipe with all metadata."""
    id: str
    name: str
    categories: List[str]
    cuisine: str         # cultural/regional origin (indian, mexican, italian, etc.)
    meal_type: str       # structure/format (soup_stew, pasta_noodles, tacos_wraps, etc.)
    effort_level: str
    no_chop_compatible: bool
    prep_time_minutes: Optional[int]
    cook_time_minutes: Optional[int]
    appliances: List[str]
    ingredients: List[str]
    main_veg: List[str]
    avoid_contains: List[str]
    instructions: Optional[str]
    prep_steps: Optional[List[str]] # NEW: Structured prep steps
    source_url: Optional[str]
    source_file: str


# ============================================================================
# Configuration
# ============================================================================

def load_taxonomy() -> Dict:
    """Load taxonomy.yml configuration."""
    with open('recipes/taxonomy.yml', 'r') as f:
        return yaml.safe_load(f)


# ============================================================================
# Markdown Parsing
# ============================================================================

def parse_markdown_file(md_path: Path) -> Dict:
    """Extract structured data from Markdown with Frontmatter."""
    
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    data = {}
    
    # Extract Frontmatter
    frontmatter_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if frontmatter_match:
        try:
            frontmatter = yaml.safe_load(frontmatter_match.group(1)) or {}
            data.update(frontmatter)
        except yaml.YAMLError as e:
            print(f"  ⚠️ Warning: YAML error in {md_path.name}: {e}")
            pass
    
    # Determine the start of the body content
    body_start_index = frontmatter_match.end() if frontmatter_match else 0
    body_content = content[body_start_index:]
    
    # Extract Ingredients
    ingredients = []
    # Search for Ingredients section
    ing_header_match = re.search(r'#{1,4}\s*Ingredients', body_content, re.IGNORECASE)
    if ing_header_match:
        # Get content from Ingredients header until next header
        rest_of_text = body_content[ing_header_match.end():]
        next_header_match = re.search(r'\n#{1,4}\s', rest_of_text)
        ing_section = rest_of_text[:next_header_match.start()] if next_header_match else rest_of_text
        
        # Parse list items
        for line in ing_section.split('\n'):
            line = line.strip()
            if line.startswith('- ') or line.startswith('* '):
                ingredients.append(line[2:].strip())
    
    data['ingredients'] = ingredients
    
    # Extract Instructions
    instructions_text = ""
    inst_header_match = re.search(r'#{1,4}\s*Instructions', body_content, re.IGNORECASE)
    if inst_header_match:
        rest_of_text = body_content[inst_header_match.end():]
        next_header_match = re.search(r'\n#{1,4}\s', rest_of_text)
        inst_section = rest_of_text[:next_header_match.start()] if next_header_match else rest_of_text
        
        # Clean up the instruction text
        clean_lines = []
        for line in inst_section.split('\n'):
            stripped = line.strip()
            if not stripped: continue
            # Keep numbering if present, otherwise just the text
            clean_lines.append(stripped)
        
        instructions_text = '\n'.join(clean_lines)

    data['instructions'] = instructions_text if instructions_text else None
    
    # Extract Prep Steps (if present)
    prep_steps = []
    prep_header_match = re.search(r'#{1,4}\s*Prep Steps', body_content, re.IGNORECASE)
    if prep_header_match:
        rest_of_text = body_content[prep_header_match.end():]
        next_header_match = re.search(r'\n#{1,4}\s', rest_of_text)
        prep_section = rest_of_text[:next_header_match.start()] if next_header_match else rest_of_text
        
        for line in prep_section.split('\n'):
            line = line.strip()
            if line.startswith('- ') or line.startswith('* '):
                prep_steps.append(line[2:].strip())
                
    data['prep_steps'] = prep_steps if prep_steps else None

    # Ensure ID exists (fallback to filename)
    if 'id' not in data:
        data['id'] = md_path.stem

    return data


# ============================================================================
# Classification and Tagging
# ============================================================================

def normalize_terms(items: List[str], taxonomy: Dict) -> List[str]:
    """Normalize terms based on taxonomy mapping (e.g., tomatoe -> tomato)."""
    mapping = taxonomy.get('term_normalization', {})
    normalized_list = []
    
    for item in items:
        processed_item = item
        # Simple word replacement
        for wrong, right in mapping.items():
            # word boundary check to avoid partial replacements (e.g. "potatoes" -> "potato" is fine, but be careful)
            # For now, let's do simple case-insensitive substring replacement if it matches a full word
            
            # Case insensitive replacement
            if re.search(r'\b' + re.escape(wrong) + r'\b', item, re.IGNORECASE):
                 processed_item = re.sub(r'\b' + re.escape(wrong) + r'\b', right, processed_item, flags=re.IGNORECASE)
        
        normalized_list.append(processed_item)
    
    return normalized_list

def classify_cuisine(recipe_data: Dict, taxonomy: Dict) -> str:
    """Determine recipe cuisine using keyword heuristics."""
    # Check manual override first
    if 'cuisine' in recipe_data and recipe_data['cuisine'] and recipe_data['cuisine'] != 'unknown':
        return recipe_data['cuisine']

    # Check categories
    categories_lower = [cat.lower() for cat in recipe_data.get('categories', [])]

    for cuisine, keywords in taxonomy.get('cuisine_keywords', {}).items():
        for keyword in keywords:
            if any(keyword.lower() in cat for cat in categories_lower):
                return cuisine

    # Check recipe name
    name_lower = recipe_data.get('name', '').lower()
    for cuisine, keywords in taxonomy.get('cuisine_keywords', {}).items():
        for keyword in keywords:
            if keyword.lower() in name_lower:
                return cuisine

    # Check ingredients
    ingredients_text = ' '.join(recipe_data.get('ingredients', [])).lower()
    for cuisine, keywords in taxonomy.get('cuisine_keywords', {}).items():
        for keyword in keywords:
            if keyword.lower() in ingredients_text:
                return cuisine

    # Default: unknown
    return 'unknown'


def classify_meal_type(recipe_data: Dict, taxonomy: Dict) -> str:
    """Determine recipe meal type using keyword heuristics."""
    # Check manual override
    if 'meal_type' in recipe_data and recipe_data['meal_type'] and recipe_data['meal_type'] != 'unknown':
        return recipe_data['meal_type']

    # Check categories for direct matches
    categories_lower = [cat.lower() for cat in recipe_data.get('categories', [])]

    for meal_type, keywords in taxonomy.get('meal_type_keywords', {}).items():
        for keyword in keywords:
            if any(keyword.lower() in cat for cat in categories_lower):
                return meal_type

    # Check recipe name
    name_lower = recipe_data.get('name', '').lower()
    for meal_type, keywords in taxonomy.get('meal_type_keywords', {}).items():
        for keyword in keywords:
            # Support regex patterns in keywords
            if '.*' in keyword:
                if re.search(keyword.lower(), name_lower):
                    return meal_type
            elif keyword.lower() in name_lower:
                return meal_type

    # Check ingredients for strong signals
    ingredients_text = ' '.join(recipe_data.get('ingredients', [])).lower()
    for meal_type, keywords in taxonomy.get('meal_type_keywords', {}).items():
        for keyword in keywords:
            if '.*' in keyword:
                if re.search(keyword.lower(), ingredients_text):
                    return meal_type
            elif keyword.lower() in ingredients_text:
                return meal_type

    # Default: unknown (requires manual tagging)
    return 'unknown'


def detect_avoided_ingredients(ingredients: List[str], avoided: List[str]) -> List[str]:
    """Check if recipe contains any avoided ingredients."""
    found = []
    ingredients_text = ' '.join(ingredients).lower()

    for avoided_item in avoided:
        # Use word boundaries to avoid false positives
        pattern = r'\b' + re.escape(avoided_item.lower()) + r'\b'
        if re.search(pattern, ingredients_text):
            found.append(avoided_item)

    return found


def extract_main_vegetables(ingredients: List[str], taxonomy: Dict) -> List[str]:
    """Extract vegetable names from ingredient list and normalize them."""
    
    # Normalize the ingredients list first for better detection
    normalized_ingredients = normalize_terms(ingredients, taxonomy)

    # Common vegetables to detect
    vegetables = [
        'tomato', 'onion', 'garlic', 'bell pepper', 'pepper',
        'carrot', 'celery', 'broccoli', 'cauliflower', 'spinach', 'kale',
        'lettuce', 'cucumber', 'zucchini', 'squash', 'potato',
        'sweet potato', 'corn', 'peas', 'green beans', 'beans', 'asparagus',
        'brussels sprouts', 'cabbage', 'bok choy', 'cilantro', 'parsley', 'basil',
        'jalapeno', 'serrano', 'poblano', 'avocado', 'lime', 'lemon', 'ginger',
        'scallions', 'green onions', 'chives', 'arugula', 'chard', 'collard greens',
        'butternut squash', 'acorn squash', 'pumpkin', 'beet', 'radish'
    ]

    found = set()
    ingredients_text = ' '.join(normalized_ingredients).lower()

    for veg in vegetables:
        if veg in ingredients_text:
             found.add(veg)

    return sorted(list(found))


def estimate_effort_level(recipe_data: Dict, taxonomy: Dict) -> tuple[str, bool]:
    """Determine effort level and no-chop compatibility."""
    
    # Check manual override
    if 'effort_level' in recipe_data and recipe_data['effort_level'] and recipe_data['effort_level'] != 'normal':
         return recipe_data['effort_level'], recipe_data.get('no_chop_compatible', False)

    prep_time = recipe_data.get('prep_time_minutes')
    cook_time = recipe_data.get('cook_time_minutes')

    # Check no-chop criteria based on times
    is_no_chop = False
    if prep_time is not None and cook_time is not None:
        is_no_chop = (prep_time <= 10 and cook_time <= 15)

    # Check for no-chop keywords in name/categories
    name_and_cats = (recipe_data.get('name','') + ' ' + ' '.join(recipe_data.get('categories', []))).lower()
    no_chop_keywords = taxonomy['effort_heuristics']['no_chop']['keywords']
    if any(keyword in name_and_cats for keyword in no_chop_keywords):
        is_no_chop = True

    # Determine effort level
    if is_no_chop:
        effort_level = 'no_chop'
    elif prep_time is not None and cook_time is not None:
        if prep_time <= 20 and cook_time <= 30:
            effort_level = 'minimal_chop'
        else:
            effort_level = 'normal'
    else:
        # Default to normal if no time info
        effort_level = 'normal'

    return effort_level, is_no_chop


def detect_appliances(recipe_data: Dict, taxonomy: Dict) -> List[str]:
    """Detect required appliances from categories and instructions."""
    
    if 'appliances' in recipe_data and recipe_data['appliances']:
        return recipe_data['appliances']

    appliances = set()

    # Combine name, categories, and instructions
    text = ' '.join([
        recipe_data.get('name', ''),
        ' '.join(recipe_data.get('categories', [])),
        recipe_data.get('instructions', '') or ''
    ]).lower()

    for appliance, keywords in taxonomy['appliance_keywords'].items():
        for keyword in keywords:
            if keyword.lower() in text:
                appliances.add(appliance)
                break

    # Default: assume stovetop if nothing else detected
    if not appliances:
        appliances.add('stovetop')

    return sorted(list(appliances))


# ============================================================================
# Main Parser
# ============================================================================

def parse_recipe_from_md(md_file: Path, taxonomy: Dict) -> Recipe:
    """Parse a single Markdown recipe file into a Recipe object."""

    # 1. Extract raw data from Markdown
    data = parse_markdown_file(md_file)
    
    # 2. Use ID from frontmatter or filename
    recipe_id = data.get('id', md_file.stem)

    # 3. Filter out metadata categories
    categories = [
        cat for cat in data.get('categories', [])
        if cat.lower() not in ['to edit', 'to try out', 'favorites', 'favorite']
    ]
    data['categories'] = categories # Update for classifier usage

    # 4. Classify cuisine and meal_type
    cuisine = classify_cuisine(data, taxonomy)
    meal_type = classify_meal_type(data, taxonomy)

    # 5. Estimate effort
    effort_level, no_chop = estimate_effort_level(data, taxonomy)

    # 6. Detect appliances
    appliances = detect_appliances(data, taxonomy)

    # 7. Analyze ingredients
    ingredients = data.get('ingredients', [])
    
    # Apply Term Normalization to ingredients text
    # Note: We don't overwrite the original ingredient line (to keep quantity/units),
    # but we use normalized text for tagging.
    # However, if we want to fix typos in the output, we might want to be aggressive 
    # but that risks breaking formatting. 
    # Let's keep extraction heuristics powered by normalization.
    
    main_veg = extract_main_vegetables(ingredients, taxonomy)
    avoid_contains = detect_avoided_ingredients(
        ingredients,
        taxonomy['avoided_ingredients']
    )

    # 8. Construct Recipe object
    return Recipe(
        id=recipe_id,
        name=data.get('name', 'Untitled Recipe'),
        categories=categories,
        cuisine=cuisine,
        meal_type=meal_type,
        effort_level=effort_level,
        no_chop_compatible=no_chop,
        prep_time_minutes=data.get('prep_time_minutes'),
        cook_time_minutes=data.get('cook_time_minutes'),
        appliances=appliances,
        ingredients=ingredients,
        main_veg=main_veg,
        avoid_contains=avoid_contains,
        instructions=data.get('instructions'),
        prep_steps=data.get('prep_steps'),
        source_url=data.get('source_url'),
        source_file=md_file.name
    )


# ============================================================================
# Output Generation
# ============================================================================

def write_recipes_json(recipes: List[Recipe], output_path: Path):
    """Write full recipe data to JSON."""
    data = [asdict(r) for r in recipes]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def write_index_yml(recipes: List[Recipe], output_path: Path):
    """Write curated recipe index for planning."""
    
    # We no longer need to merge diligently because the Markdown file IS the source of truth.
    # The Frontmatter contains the manual edits.
    # However, we should still respect the output format.

    index_data = []
    for r in recipes:
        recipe_dict = {
            'id': r.id,
            'name': r.name,
            'cuisine': r.cuisine,
            'meal_type': r.meal_type,
            'effort_level': r.effort_level,
            'no_chop_compatible': r.no_chop_compatible,
            'appliances': r.appliances,
            'main_veg': r.main_veg,
            'avoid_contains': r.avoid_contains,
            'source': {
                'type': 'markdown',
                'file': f'recipes/content/{r.id}.md'
            }
        }
        
        # Add optional fields if they exist in the recipe object (populated from Frontmatter)
        # Note: 'categories' were filtered, but we might want to keep relevant tags?
        # The Recipe object stores filtered categories.
        
        index_data.append(recipe_dict)

    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(index_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)


def print_summary(recipes: List[Recipe]):
    """Print parsing summary statistics."""

    print("\\n" + "="*60)
    print("RECIPE PARSING SUMMARY")
    print("="*60)

    print(f"\\nTotal recipes parsed: {len(recipes)}")

    # Cuisine distribution
    cuisines = Counter(r.cuisine for r in recipes)
    print("\\nCuisine distribution:")
    for cuisine, count in cuisines.most_common():
        print(f"  {cuisine:15s}: {count:3d}")

    # Meal type distribution
    meal_types = Counter(r.meal_type for r in recipes)
    print("\\nMeal type distribution:")
    for meal_type, count in meal_types.most_common():
        print(f"  {meal_type:20s}: {count:3d}")

    # Effort distribution
    efforts = Counter(r.effort_level for r in recipes)
    print("\\nEffort level distribution:")
    for effort, count in efforts.items():
        print(f"  {effort:15s}: {count:3d}")

    # No-chop count
    no_chop_count = sum(1 for r in recipes if r.no_chop_compatible)
    print(f"\\nNo-chop compatible: {no_chop_count}")
    
    # Prep Steps count
    prep_steps_count = sum(1 for r in recipes if r.prep_steps)
    print(f"\\nRecipes with Prep Steps: {prep_steps_count}")

    # Avoided ingredients
    avoided = [r for r in recipes if r.avoid_contains]
    print(f"\\nRecipes with avoided ingredients: {len(avoided)}")
    
    # Recipes without vegetables (warning)
    no_veg = [r for r in recipes if not r.main_veg]
    if no_veg:
        print(f"\\nWARNING: {len(no_veg)} recipes have no detected vegetables.")


# ============================================================================
# Main Execution
# ============================================================================

def main():
    """Main execution flow."""
    print("Recipe Parser - Meal Planner System (Markdown Source)")
    print("="*60)

    # 1. Load configuration
    print("\\nLoading taxonomy...")
    try:
        taxonomy = load_taxonomy()
        print("  ✓ Loaded taxonomy.yml")
    except Exception as e:
        print(f"  ✗ ERROR loading taxonomy.yml: {e}")
        return

    # 2. Find all Markdown files
    md_dir = Path('recipes/content')
    if not md_dir.exists():
        print(f"\\n✗ ERROR: Directory not found: {md_dir}")
        return

    md_files = sorted(md_dir.glob('*.md'))
    print(f"\\nFound {len(md_files)} Markdown recipe files")

    if len(md_files) == 0:
        print("  ✗ No Markdown files found. Please populate recipes/content/")
        return

    # 3. Parse each recipe
    recipes = []
    errors = []

    print("\\nParsing recipes...")
    for i, md_file in enumerate(md_files, 1):
        try:
            recipe = parse_recipe_from_md(md_file, taxonomy)
            recipes.append(recipe)
            if i % 50 == 0:
                print(f"  Processed {i}/{len(md_files)} recipes...")
        except Exception as e:
            errors.append((md_file.name, str(e)))
            print(f"  ✗ ERROR parsing {md_file.name}: {e}")

    print(f"\\n✓ Successfully parsed {len(recipes)} recipes")
    if errors:
        print(f"✗ Errors encountered: {len(errors)}")
        for filename, error in errors:
            print(f"  - {filename}: {error}")

    # 4. Generate outputs
    print("\\nGenerating output files...")
    try:
        output_dir = Path('recipes/parsed')
        output_dir.mkdir(parents=True, exist_ok=True)

        write_recipes_json(recipes, output_dir / 'recipes.json')
        print(f"  ✓ Wrote: {output_dir / 'recipes.json'}")

        write_index_yml(recipes, Path('recipes/index.yml'))
        print(f"  ✓ Wrote: recipes/index.yml")
        
    except Exception as e:
        print(f"  ✗ ERROR writing output files: {e}")
        return

    # 5. Print summary statistics
    print_summary(recipes)

    print("\\n" + "="*60)
    print("PARSING COMPLETE")
    print("="*60)


if __name__ == "__main__":
    main()
