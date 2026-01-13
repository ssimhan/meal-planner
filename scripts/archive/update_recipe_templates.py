#!/usr/bin/env python3
"""
Batch update all recipe HTML files to use the new modern template design.

This script:
1. Reads all existing recipe HTML files from recipes/raw_html/
2. Extracts recipe data (name, ingredients, directions, metadata, images)
3. Applies the new modern template design
4. Writes updated HTML files back to recipes/raw_html/

Usage:
    python scripts/update_recipe_templates.py
    python scripts/update_recipe_templates.py --dry-run  # Preview changes without writing
    python scripts/update_recipe_templates.py --recipe "Chana Masala (IP)"  # Update single recipe
"""

import argparse
import os
import re
from pathlib import Path
from html.parser import HTMLParser
from typing import Dict, List, Optional


class RecipeHTMLParser(HTMLParser):
    """Parses old recipe HTML format to extract data."""

    def __init__(self):
        super().__init__()
        self.recipe_data = {
            'name': '',
            'categories': [],
            'rating': '',
            'prep_time': '',
            'cook_time': '',
            'difficulty': '',
            'servings': '',
            'source_url': '',
            'source_name': '',
            'ingredients': [],
            'directions': [],
            'nutrition': '',
            'image_src': '',
            'image_link': ''
        }
        self.current_section = None
        self.in_ingredient = False
        self.in_direction = False
        self.current_text = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        # Detect sections
        if tag == 'h1' and attrs_dict.get('itemprop') == 'name':
            self.current_section = 'name'
        elif tag == 'p' and attrs_dict.get('class') == 'categories':
            self.current_section = 'categories'
        elif tag == 'p' and attrs_dict.get('class') == 'rating':
            self.current_section = 'rating'
        elif tag == 'p' and attrs_dict.get('class') == 'line' and attrs_dict.get('itemprop') == 'recipeIngredient':
            self.in_ingredient = True
            self.current_text = []
        elif tag == 'p' and attrs_dict.get('class') == 'line' and not self.in_ingredient:
            # Direction line
            if 'directions' in str(self.get_starttag_text()):
                return
            self.in_direction = True
            self.current_text = []
        elif tag == 'span' and attrs_dict.get('itemprop') == 'prepTime':
            self.current_section = 'prep_time'
        elif tag == 'span' and attrs_dict.get('itemprop') == 'cookTime':
            self.current_section = 'cook_time'
        elif tag == 'span' and attrs_dict.get('itemprop') == 'difficulty':
            self.current_section = 'difficulty'
        elif tag == 'span' and attrs_dict.get('itemprop') == 'recipeYield':
            self.current_section = 'servings'
        elif tag == 'a' and attrs_dict.get('itemprop') == 'url':
            self.recipe_data['source_url'] = attrs_dict.get('href', '')
            self.current_section = 'source_name'
        elif tag == 'img' and attrs_dict.get('class') == 'photo':
            self.recipe_data['image_src'] = attrs_dict.get('src', '')
        elif tag == 'a' and self.recipe_data.get('image_src'):
            # Link wrapping the image
            self.recipe_data['image_link'] = attrs_dict.get('href', '')

    def handle_endtag(self, tag):
        if tag == 'p' and self.in_ingredient:
            ingredient_text = ''.join(self.current_text).strip()
            if ingredient_text:
                self.recipe_data['ingredients'].append(ingredient_text)
            self.in_ingredient = False
            self.current_text = []
        elif tag == 'p' and self.in_direction:
            direction_text = ''.join(self.current_text).strip()
            if direction_text:
                self.recipe_data['directions'].append(direction_text)
            self.in_direction = False
            self.current_text = []
        elif tag in ['h1', 'p', 'span']:
            self.current_section = None

    def handle_data(self, data):
        data = data.strip()
        if not data:
            return

        if self.in_ingredient or self.in_direction:
            self.current_text.append(data)
        elif self.current_section == 'name':
            self.recipe_data['name'] = data
        elif self.current_section == 'categories':
            self.recipe_data['categories'] = [cat.strip() for cat in data.split(',')]
        elif self.current_section == 'rating':
            self.recipe_data['rating'] = data
        elif self.current_section == 'prep_time':
            self.recipe_data['prep_time'] = data
        elif self.current_section == 'cook_time':
            self.recipe_data['cook_time'] = data
        elif self.current_section == 'difficulty':
            self.recipe_data['difficulty'] = data
        elif self.current_section == 'servings':
            self.recipe_data['servings'] = data
        elif self.current_section == 'source_name':
            self.recipe_data['source_name'] = data


def parse_old_recipe_html(html_content: str) -> Dict:
    """Parse old recipe HTML and extract data."""
    parser = RecipeHTMLParser()
    parser.feed(html_content)
    return parser.recipe_data


def generate_new_recipe_html(recipe_data: Dict) -> str:
    """Generate new recipe HTML using modern template."""

    # Prepare categories
    categories_html = '\n                '.join([
        f'<span>{cat}</span>' for cat in recipe_data['categories']
    ])

    # Prepare metadata items
    metadata_items = []
    if recipe_data['prep_time']:
        metadata_items.append(f'''<div class="metadata-item">
                    <strong>Prep Time</strong>
                    <span>{recipe_data['prep_time']}</span>
                </div>''')
    if recipe_data['cook_time']:
        metadata_items.append(f'''<div class="metadata-item">
                    <strong>Cook Time</strong>
                    <span>{recipe_data['cook_time']}</span>
                </div>''')
    if recipe_data['servings']:
        metadata_items.append(f'''<div class="metadata-item">
                    <strong>Servings</strong>
                    <span>{recipe_data['servings']}</span>
                </div>''')
    if recipe_data['difficulty']:
        metadata_items.append(f'''<div class="metadata-item">
                    <strong>Difficulty</strong>
                    <span>{recipe_data['difficulty']}</span>
                </div>''')

    metadata_html = '\n                '.join(metadata_items)

    # Prepare image section
    image_html = ''
    if recipe_data['image_src']:
        img_tag = f'<img src="{recipe_data["image_src"]}" alt="{recipe_data["name"]}"/>'
        if recipe_data['image_link']:
            img_tag = f'<a href="{recipe_data["image_link"]}" target="_blank">\n                    {img_tag}\n                </a>'
        image_html = f'''<div class="recipe-image">
                {img_tag}
            </div>

            '''

    # Prepare source link
    source_html = ''
    if recipe_data['source_url'] or recipe_data['source_name']:
        source_text = recipe_data['source_name'] or recipe_data['source_url']
        source_url = recipe_data['source_url'] or '#'
        source_html = f'''
            <div class="source-link">
                <strong>Source: </strong>
                <a href="{source_url}" target="_blank">{source_text}</a>
            </div>'''

    # Prepare ingredients
    ingredients_html = '\n                    '.join([
        format_ingredient_html(ing) for ing in recipe_data['ingredients']
    ])

    # Prepare directions
    directions_html = '\n                    '.join([
        f'<p>{direction}</p>' for direction in recipe_data['directions']
    ])

    # Prepare nutrition (if exists)
    nutrition_html = ''
    if recipe_data.get('nutrition'):
        nutrition_html = f'''
            <!-- Nutrition Section -->
            <div class="nutrition-box">
                <h2>Nutrition</h2>
                <p>{recipe_data['nutrition']}</p>
            </div>'''

    # Generate full HTML
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{recipe_data['name']} - Recipe</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;700;900&family=Fira+Code:wght@400;600&family=Inter:wght@300;500&display=swap" rel="stylesheet">
    <style>
        :root {{
            /* Warm Editorial Palette */
            --bg-primary: #fffef9;
            --bg-secondary: #faf7f0;
            --bg-card: #ffffff;
            --accent-warm: #d97706;
            --accent-deep: #92400e;
            --accent-sage: #059669;
            --accent-muted: #6b7280;
            --text-primary: #1f2937;
            --text-muted: #6b7280;
            --border: rgba(120, 113, 108, 0.2);

            /* Typography */
            --text-xs: 0.75rem;
            --text-sm: 0.875rem;
            --text-base: 1rem;
            --text-lg: 1.125rem;
            --text-xl: 1.5rem;
            --text-2xl: 2.5rem;
            --text-3xl: 3.5rem;
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Inter', sans-serif;
            font-weight: 300;
            line-height: 1.7;
            color: var(--text-primary);
            background: var(--bg-primary);
            background-image:
                repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(120, 113, 108, 0.02) 2px,
                    rgba(120, 113, 108, 0.02) 4px
                );
            padding: 40px 20px;
        }}

        .container {{
            max-width: 900px;
            margin: 0 auto;
            background: var(--bg-card);
            border-radius: 2px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
            border: 1px solid var(--border);
            overflow: hidden;
        }}

        /* Header with Image */
        .recipe-header {{
            position: relative;
            background: linear-gradient(135deg, var(--bg-secondary) 0%, #f5f1e8 100%);
            padding: 50px 40px;
            border-bottom: 3px solid var(--accent-warm);
        }}

        .recipe-image {{
            float: left;
            margin-right: 30px;
            margin-bottom: 20px;
            border-radius: 2px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 3px solid var(--accent-deep);
        }}

        .recipe-image img {{
            max-width: 200px;
            max-height: 200px;
            width: auto;
            height: auto;
            display: block;
        }}

        h1 {{
            font-family: 'Merriweather', serif;
            font-weight: 900;
            font-size: var(--text-3xl);
            color: var(--accent-deep);
            margin-bottom: 15px;
            line-height: 1.1;
            letter-spacing: -0.02em;
        }}

        .categories {{
            font-family: 'Fira Code', monospace;
            font-weight: 400;
            font-size: var(--text-xs);
            color: var(--accent-warm);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 20px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }}

        .categories span {{
            background: rgba(217, 119, 6, 0.1);
            padding: 4px 10px;
            border-radius: 2px;
            border: 1px solid rgba(217, 119, 6, 0.3);
        }}

        .metadata {{
            font-family: 'Fira Code', monospace;
            font-weight: 400;
            font-size: var(--text-sm);
            color: var(--text-muted);
            margin-top: 15px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
        }}

        .metadata-item {{
            background: white;
            padding: 10px 15px;
            border-radius: 2px;
            border-left: 3px solid var(--accent-sage);
        }}

        .metadata-item strong {{
            color: var(--accent-deep);
            display: block;
            font-size: var(--text-xs);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }}

        .source-link {{
            margin-top: 20px;
            padding: 15px;
            background: rgba(5, 150, 105, 0.08);
            border-radius: 2px;
            border-left: 3px solid var(--accent-sage);
        }}

        .source-link strong {{
            font-family: 'Fira Code', monospace;
            font-size: var(--text-xs);
            text-transform: uppercase;
            color: var(--accent-sage);
            letter-spacing: 0.1em;
        }}

        .source-link a {{
            color: var(--accent-sage);
            text-decoration: none;
            border-bottom: 2px solid transparent;
            transition: border-bottom-color 0.3s ease;
            font-weight: 500;
        }}

        .source-link a:hover {{
            border-bottom-color: var(--accent-sage);
        }}

        .clear {{
            clear: both;
        }}

        /* Main Content */
        .recipe-content {{
            padding: 40px;
        }}

        .section {{
            margin-bottom: 40px;
        }}

        h2 {{
            font-family: 'Merriweather', serif;
            font-weight: 700;
            font-size: var(--text-2xl);
            color: var(--accent-deep);
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--accent-warm);
        }}

        /* Ingredients */
        .ingredients-list {{
            background: var(--bg-secondary);
            padding: 25px;
            border-radius: 2px;
            border-left: 4px solid var(--accent-warm);
        }}

        .ingredients-list p {{
            margin: 10px 0;
            font-size: var(--text-base);
            padding-left: 25px;
            position: relative;
        }}

        .ingredients-list p::before {{
            content: "→";
            position: absolute;
            left: 0;
            color: var(--accent-warm);
            font-weight: 600;
        }}

        .ingredients-list strong {{
            font-family: 'Fira Code', monospace;
            font-weight: 600;
            color: var(--accent-deep);
            background: rgba(146, 64, 14, 0.1);
            padding: 2px 6px;
            border-radius: 2px;
        }}

        /* Directions */
        .directions-list {{
            counter-reset: step-counter;
        }}

        .directions-list p {{
            margin: 20px 0;
            padding-left: 60px;
            position: relative;
            line-height: 1.8;
            font-size: var(--text-base);
        }}

        .directions-list p::before {{
            counter-increment: step-counter;
            content: counter(step-counter);
            position: absolute;
            left: 0;
            top: 0;
            font-family: 'Fira Code', monospace;
            font-weight: 600;
            font-size: var(--text-xl);
            color: var(--accent-warm);
            background: rgba(217, 119, 6, 0.1);
            width: 45px;
            height: 45px;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--accent-warm);
        }}

        /* Nutrition */
        .nutrition-box {{
            background: linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%);
            padding: 25px;
            border-radius: 2px;
            border: 2px solid var(--accent-sage);
            margin-top: 30px;
        }}

        .nutrition-box h2 {{
            border-bottom-color: var(--accent-sage);
            color: var(--accent-sage);
        }}

        .nutrition-box p {{
            font-family: 'Fira Code', monospace;
            font-size: var(--text-sm);
            line-height: 2;
            color: var(--text-muted);
        }}

        /* Responsive */
        @media (max-width: 768px) {{
            body {{
                padding: 20px 10px;
            }}

            .recipe-header {{
                padding: 30px 20px;
            }}

            .recipe-image {{
                float: none;
                margin: 0 auto 20px;
                display: block;
            }}

            h1 {{
                font-size: var(--text-2xl);
            }}

            .recipe-content {{
                padding: 20px;
            }}

            .directions-list p {{
                padding-left: 55px;
            }}

            .directions-list p::before {{
                width: 40px;
                height: 40px;
                font-size: var(--text-lg);
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- Recipe Header -->
        <div class="recipe-header">
            {image_html}<h1>{recipe_data['name']}</h1>

            <div class="categories">
                {categories_html}
            </div>

            <div class="metadata">
                {metadata_html}
            </div>{source_html}

            <div class="clear"></div>
        </div>

        <!-- Recipe Content -->
        <div class="recipe-content">
            <!-- Ingredients Section -->
            <div class="section">
                <h2>Ingredients</h2>
                <div class="ingredients-list">
                    {ingredients_html}
                </div>
            </div>

            <!-- Directions Section -->
            <div class="section">
                <h2>Directions</h2>
                <div class="directions-list">
                    {directions_html}
                </div>
            </div>{nutrition_html}
        </div>
    </div>
</body>
</html>
'''

    return html


def format_ingredient_html(ingredient: str) -> str:
    """Format ingredient text to wrap quantities in <strong> tags."""
    # Pattern to match quantities like "1", "2 tbsp", "1/2 cup", "1-2", etc.
    # Match numbers, fractions, and common measurement units
    pattern = r'^(\d+(?:[\/-]\d+)?(?:\s*(?:tbsp|tsp|cup|cups|oz|lb|g|kg|ml|l|can|cans|large|small|medium|bunch|clove|cloves|piece|pieces))?)\s+'

    match = re.match(pattern, ingredient, re.IGNORECASE)
    if match:
        quantity = match.group(1)
        rest = ingredient[len(quantity):].strip()
        return f'<p><strong>{quantity}</strong> {rest}</p>'
    else:
        return f'<p>{ingredient}</p>'


def update_recipe(recipe_path: Path, dry_run: bool = False) -> bool:
    """Update a single recipe HTML file."""
    try:
        # Read old HTML
        with open(recipe_path, 'r', encoding='utf-8') as f:
            old_html = f.read()

        # Parse recipe data
        recipe_data = parse_old_recipe_html(old_html)

        # Validate we got the essential data
        if not recipe_data['name']:
            print(f"  ⚠️  Warning: Could not extract recipe name from {recipe_path.name}")
            return False

        # Generate new HTML
        new_html = generate_new_recipe_html(recipe_data)

        # Write back (unless dry run)
        if not dry_run:
            with open(recipe_path, 'w', encoding='utf-8') as f:
                f.write(new_html)
            print(f"  ✅ Updated: {recipe_path.name}")
        else:
            print(f"  🔍 Would update: {recipe_path.name}")
            print(f"     Name: {recipe_data['name']}")
            print(f"     Ingredients: {len(recipe_data['ingredients'])} items")
            print(f"     Directions: {len(recipe_data['directions'])} steps")

        return True

    except Exception as e:
        print(f"  ❌ Error updating {recipe_path.name}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Batch update recipe HTML files to new template'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without writing files'
    )
    parser.add_argument(
        '--recipe',
        type=str,
        help='Update only a specific recipe by name (e.g., "Chana Masala (IP)")'
    )

    args = parser.parse_args()

    # Find project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    recipes_dir = project_root / 'recipes' / 'raw_html'

    if not recipes_dir.exists():
        print(f"❌ Recipes directory not found: {recipes_dir}")
        return

    # Get all recipe HTML files
    if args.recipe:
        # Update single recipe
        recipe_file = recipes_dir / f"{args.recipe}.html"
        if not recipe_file.exists():
            print(f"❌ Recipe not found: {recipe_file}")
            return
        recipe_files = [recipe_file]
    else:
        # Update all recipes
        recipe_files = sorted(recipes_dir.glob('*.html'))

    print(f"\n{'🔍 DRY RUN MODE' if args.dry_run else '🚀 UPDATING RECIPES'}")
    print(f"Found {len(recipe_files)} recipe(s) to process\n")

    success_count = 0
    fail_count = 0

    for recipe_path in recipe_files:
        if update_recipe(recipe_path, dry_run=args.dry_run):
            success_count += 1
        else:
            fail_count += 1

    print(f"\n{'=' * 60}")
    print(f"✅ Successfully processed: {success_count}")
    if fail_count > 0:
        print(f"❌ Failed: {fail_count}")
    print(f"{'=' * 60}\n")

    if args.dry_run:
        print("💡 Run without --dry-run to apply changes")


if __name__ == '__main__':
    main()
