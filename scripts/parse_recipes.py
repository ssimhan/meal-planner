#!/usr/bin/env python3
"""
Recipe Parser for Meal Planner System
Converts HTML recipe files into structured JSON and YAML indexes.

Usage: python scripts/parse_recipes.py
"""

import os
import json
import yaml
import re
from pathlib import Path
from bs4 import BeautifulSoup
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
    cuisine: str         # NEW: cultural/regional origin (indian, mexican, italian, etc.)
    meal_type: str       # NEW: structure/format (soup_stew, pasta_noodles, tacos_wraps, etc.)
    effort_level: str
    no_chop_compatible: bool
    prep_time_minutes: Optional[int]
    cook_time_minutes: Optional[int]
    appliances: List[str]
    ingredients: List[str]
    main_veg: List[str]
    avoid_contains: List[str]
    instructions: Optional[str]
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
# HTML Parsing
# ============================================================================

def parse_html_file(html_path: Path) -> Dict:
    """Extract structured data from HTML using schema.org microdata."""

    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'lxml')

    # Find the recipe div with schema.org itemtype
    recipe_div = soup.find('div', {'itemtype': 'http://schema.org/Recipe'})

    if not recipe_div:
        # Fallback: try to find any recipe-like content
        recipe_div = soup.find('div', class_='recipe') or soup

    data = {}

    # Extract name (required)
    name_elem = recipe_div.find(itemprop='name') or recipe_div.find('h1', class_='name')
    if name_elem:
        data['name'] = name_elem.get_text(strip=True)
    else:
        # Use filename as fallback
        data['name'] = html_path.stem.replace('_', ' ').replace('-', ' ').title()

    # Extract categories (optional, may be comma-separated)
    category_elem = recipe_div.find(itemprop='recipeCategory') or recipe_div.find('p', class_='categories')
    if category_elem:
        categories_text = category_elem.get_text(strip=True)
        data['categories'] = [cat.strip() for cat in categories_text.split(',')]
    else:
        data['categories'] = []

    # Extract ingredients (multiple <p itemprop="recipeIngredient">)
    ingredient_elems = recipe_div.find_all(itemprop='recipeIngredient')
    if not ingredient_elems:
        # Fallback: look for class="line" in ingredients section
        ingredient_elems = recipe_div.find_all('p', class_='line')

    data['ingredients'] = [
        elem.get_text(strip=True)
        for elem in ingredient_elems
        if elem.get_text(strip=True)
    ]

    # Extract instructions (optional)
    instructions_elem = recipe_div.find(itemprop='recipeInstructions')
    if instructions_elem:
        # Join all <p> tags with newlines
        paragraphs = instructions_elem.find_all('p', class_='line')
        if paragraphs:
            data['instructions'] = '\n'.join(p.get_text(strip=True) for p in paragraphs)
        else:
            data['instructions'] = instructions_elem.get_text(strip=True)
    else:
        data['instructions'] = None

    # Extract times (optional)
    prep_time = recipe_div.find(itemprop='prepTime')
    cook_time = recipe_div.find(itemprop='cookTime')

    data['prep_time_minutes'] = parse_time_to_minutes(prep_time.get_text()) if prep_time else None
    data['cook_time_minutes'] = parse_time_to_minutes(cook_time.get_text()) if cook_time else None

    # Extract source URL (optional)
    url_elem = recipe_div.find('a', itemprop='url')
    data['source_url'] = url_elem.get('href') if url_elem else None

    return data


def parse_time_to_minutes(time_str: str) -> Optional[int]:
    """Convert time strings like '20 min', '1 hr', '4 hours' to minutes."""
    if not time_str:
        return None

    time_str = time_str.lower().strip()
    total_minutes = 0

    # Handle hours
    hour_match = re.search(r'(\d+)\s*(?:hr|hour|hours)', time_str)
    if hour_match:
        total_minutes += int(hour_match.group(1)) * 60

    # Handle minutes
    min_match = re.search(r'(\d+)\s*(?:min|mins|minute|minutes)', time_str)
    if min_match:
        total_minutes += int(min_match.group(1))

    return total_minutes if total_minutes > 0 else None


# ============================================================================
# Classification and Tagging
# ============================================================================

def classify_cuisine(recipe_data: Dict, taxonomy: Dict) -> str:
    """Determine recipe cuisine using keyword heuristics."""

    # Check categories
    categories_lower = [cat.lower() for cat in recipe_data.get('categories', [])]

    for cuisine, keywords in taxonomy.get('cuisine_keywords', {}).items():
        for keyword in keywords:
            if any(keyword.lower() in cat for cat in categories_lower):
                return cuisine

    # Check recipe name
    name_lower = recipe_data['name'].lower()
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

    # Check categories for direct matches
    categories_lower = [cat.lower() for cat in recipe_data.get('categories', [])]

    for meal_type, keywords in taxonomy.get('meal_type_keywords', {}).items():
        for keyword in keywords:
            if any(keyword.lower() in cat for cat in categories_lower):
                return meal_type

    # Check recipe name
    name_lower = recipe_data['name'].lower()
    for meal_type, keywords in taxonomy.get('meal_type_keywords', {}).items():
        for keyword in keywords:
            # Support regex patterns in keywords
            if '.*' in keyword:
                import re
                if re.search(keyword.lower(), name_lower):
                    return meal_type
            elif keyword.lower() in name_lower:
                return meal_type

    # Check ingredients for strong signals
    ingredients_text = ' '.join(recipe_data.get('ingredients', [])).lower()
    for meal_type, keywords in taxonomy.get('meal_type_keywords', {}).items():
        for keyword in keywords:
            if '.*' in keyword:
                import re
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


def extract_main_vegetables(ingredients: List[str]) -> List[str]:
    """Extract vegetable names from ingredient list."""

    # Common vegetables to detect
    vegetables = [
        'tomato', 'tomatoes', 'onion', 'onions', 'garlic', 'bell pepper', 'peppers',
        'carrot', 'carrots', 'celery', 'broccoli', 'cauliflower', 'spinach', 'kale',
        'lettuce', 'cucumber', 'zucchini', 'squash', 'potato', 'potatoes',
        'sweet potato', 'corn', 'peas', 'green beans', 'beans', 'asparagus',
        'brussels sprouts', 'cabbage', 'bok choy', 'cilantro', 'parsley', 'basil',
        'jalapeno', 'serrano', 'poblano', 'avocado', 'lime', 'lemon', 'ginger',
        'scallions', 'green onions', 'chives', 'arugula', 'chard', 'collard greens',
        'butternut squash', 'acorn squash', 'pumpkin', 'beet', 'beets', 'radish'
    ]

    found = set()
    ingredients_text = ' '.join(ingredients).lower()

    for veg in vegetables:
        if veg in ingredients_text:
            # Normalize to singular form for consistency
            normalized = veg.rstrip('s') if veg.endswith('s') and veg not in ['beans', 'peas'] else veg
            found.add(normalized)

    return sorted(list(found))


def estimate_effort_level(recipe_data: Dict, taxonomy: Dict) -> tuple[str, bool]:
    """Determine effort level and no-chop compatibility."""

    prep_time = recipe_data.get('prep_time_minutes')
    cook_time = recipe_data.get('cook_time_minutes')

    # Check no-chop criteria based on times
    is_no_chop = False
    if prep_time is not None and cook_time is not None:
        is_no_chop = (prep_time <= 10 and cook_time <= 15)

    # Check for no-chop keywords in name/categories
    name_and_cats = (recipe_data['name'] + ' ' + ' '.join(recipe_data.get('categories', []))).lower()
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

    appliances = set()

    # Combine name, categories, and instructions
    text = ' '.join([
        recipe_data['name'],
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


def generate_recipe_id(filename: str) -> str:
    """Generate a unique recipe ID from filename."""
    # Remove .html extension
    name = Path(filename).stem
    # Convert to lowercase and replace spaces/special chars with underscores
    recipe_id = re.sub(r'[^a-z0-9]+', '_', name.lower())
    # Remove leading/trailing underscores
    return recipe_id.strip('_')


# ============================================================================
# Main Parser
# ============================================================================

def parse_recipe(html_file: Path, taxonomy: Dict) -> Recipe:
    """Parse a single HTML recipe file into a Recipe object."""

    # 1. Extract raw data from HTML
    data = parse_html_file(html_file)

    # 2. Generate unique ID
    recipe_id = generate_recipe_id(html_file.name)

    # 3. Filter out metadata categories
    categories = [
        cat for cat in data.get('categories', [])
        if cat.lower() not in ['to edit', 'to try out', 'favorites', 'favorite']
    ]

    # 4. Classify cuisine and meal_type
    cuisine = classify_cuisine(data, taxonomy)
    meal_type = classify_meal_type(data, taxonomy)

    # 5. Estimate effort
    effort_level, no_chop = estimate_effort_level(data, taxonomy)

    # 6. Detect appliances
    appliances = detect_appliances(data, taxonomy)

    # 7. Analyze ingredients
    ingredients = data.get('ingredients', [])
    main_veg = extract_main_vegetables(ingredients)
    avoid_contains = detect_avoided_ingredients(
        ingredients,
        taxonomy['avoided_ingredients']
    )

    # 8. Construct Recipe object
    return Recipe(
        id=recipe_id,
        name=data['name'],
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
        source_url=data.get('source_url'),
        source_file=html_file.name
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
    index_data = [
        {
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
                'type': 'html',
                'file': f'recipes/raw_html/{r.source_file}'
            }
        }
        for r in recipes
    ]

    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(index_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)


def print_summary(recipes: List[Recipe]):
    """Print parsing summary statistics."""

    print("\n" + "="*60)
    print("RECIPE PARSING SUMMARY")
    print("="*60)

    print(f"\nTotal recipes parsed: {len(recipes)}")

    # Cuisine distribution
    cuisines = Counter(r.cuisine for r in recipes)
    print("\nCuisine distribution:")
    for cuisine, count in cuisines.most_common():
        print(f"  {cuisine:15s}: {count:3d}")

    # Meal type distribution
    meal_types = Counter(r.meal_type for r in recipes)
    print("\nMeal type distribution:")
    for meal_type, count in meal_types.most_common():
        print(f"  {meal_type:20s}: {count:3d}")

    # Effort distribution
    efforts = Counter(r.effort_level for r in recipes)
    print("\nEffort level distribution:")
    for effort, count in efforts.items():
        print(f"  {effort:15s}: {count:3d}")

    # No-chop count
    no_chop_count = sum(1 for r in recipes if r.no_chop_compatible)
    print(f"\nNo-chop compatible: {no_chop_count}")

    # Avoided ingredients
    avoided = [r for r in recipes if r.avoid_contains]
    print(f"\nRecipes with avoided ingredients: {len(avoided)}")
    if avoided:
        print("  WARNING: The following recipes contain avoided ingredients:")
        for r in avoided[:10]:  # Show first 10
            print(f"    - {r.name}: {', '.join(r.avoid_contains)}")
        if len(avoided) > 10:
            print(f"    ... and {len(avoided) - 10} more")

    # Appliances
    all_appliances = Counter()
    for r in recipes:
        all_appliances.update(r.appliances)
    print("\nAppliance usage:")
    for appliance, count in all_appliances.most_common():
        print(f"  {appliance:15s}: {count:3d}")

    # Recipes without vegetables (warning)
    no_veg = [r for r in recipes if not r.main_veg]
    if no_veg:
        print(f"\nWARNING: {len(no_veg)} recipes have no detected vegetables:")
        for r in no_veg[:5]:
            print(f"  - {r.name}")
        if len(no_veg) > 5:
            print(f"  ... and {len(no_veg) - 5} more")


# ============================================================================
# Main Execution
# ============================================================================

def main():
    """Main execution flow."""
    print("Recipe Parser - Meal Planner System")
    print("="*60)

    # 1. Load configuration
    print("\nLoading taxonomy...")
    try:
        taxonomy = load_taxonomy()
        print("  ✓ Loaded taxonomy.yml")
    except Exception as e:
        print(f"  ✗ ERROR loading taxonomy.yml: {e}")
        return

    # 2. Find all HTML files
    html_dir = Path('recipes/raw_html')
    if not html_dir.exists():
        print(f"\n✗ ERROR: Directory not found: {html_dir}")
        print("  Make sure you've moved HTML files to recipes/raw_html/")
        return

    html_files = sorted(html_dir.glob('*.html'))
    print(f"\nFound {len(html_files)} HTML recipe files")

    if len(html_files) == 0:
        print("  ✗ No HTML files found. Please add recipes to recipes/raw_html/")
        return

    # 3. Parse each recipe
    recipes = []
    errors = []

    print("\nParsing recipes...")
    for i, html_file in enumerate(html_files, 1):
        try:
            recipe = parse_recipe(html_file, taxonomy)
            recipes.append(recipe)
            if i % 50 == 0:
                print(f"  Processed {i}/{len(html_files)} recipes...")
        except Exception as e:
            errors.append((html_file.name, str(e)))
            print(f"  ✗ ERROR parsing {html_file.name}: {e}")

    print(f"\n✓ Successfully parsed {len(recipes)} recipes")
    if errors:
        print(f"✗ Errors encountered: {len(errors)}")
        print("\nFailed recipes:")
        for filename, error in errors:
            print(f"  - {filename}: {error}")

    # 4. Generate outputs
    print("\nGenerating output files...")
    try:
        output_dir = Path('recipes/parsed')

        write_recipes_json(recipes, output_dir / 'recipes.json')
        print(f"  ✓ Wrote: {output_dir / 'recipes.json'}")

        write_index_yml(recipes, Path('recipes/index.yml'))
        print(f"  ✓ Wrote: recipes/index.yml")
    except Exception as e:
        print(f"  ✗ ERROR writing output files: {e}")
        return

    # 5. Print summary statistics
    print_summary(recipes)

    print("\n" + "="*60)
    print("PARSING COMPLETE")
    print("="*60)
    print("\nNext steps:")
    print("1. Review recipes/index.yml for correctness")
    print("2. Manually edit any recipes with cuisine/meal_type: unknown")
    print("3. Check recipes with avoided ingredients (eggplant/mushrooms/cabbage)")
    print("4. Proceed to Phase 2: CLI intake implementation")


if __name__ == "__main__":
    main()
