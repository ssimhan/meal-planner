# Recipe Template Update Tool

This guide explains how to use the batch recipe template updater to modernize all recipe HTML files.

## What It Does

The `update_recipe_templates.py` script updates all recipe HTML files in [`recipes/raw_html/`](../recipes/raw_html/) to use the new modern template design (based on [Chana Masala (IP).html](../recipes/raw_html/Chana%20Masala%20(IP).html)).

**The new template features:**
- Modern, clean editorial design
- Warm color palette with accent colors
- Beautiful typography (Merriweather, Fira Code, Inter fonts)
- Numbered step directions
- Highlighted ingredient quantities
- Better mobile responsiveness
- Professional layout with proper spacing

## Prerequisites

- Python 3.6 or higher
- All recipe HTML files in [`recipes/raw_html/`](../recipes/raw_html/)

## Usage

### Step 1: Preview Changes (Dry Run)

**Always run a dry run first** to see what will be updated:

```bash
python scripts/update_recipe_templates.py --dry-run
```

This will:
- Show you which recipes will be updated
- Display extracted data (name, ingredient count, direction count)
- **Not write any files** (safe to run)

**Example output:**
```
🔍 DRY RUN MODE
Found 106 recipe(s) to process

  🔍 Would update: Chana Masala (IP).html
     Name: Chana Masala (IP)
     Ingredients: 13 items
     Directions: 14 steps
  🔍 Would update: Aloo Corn Tikki Roll.html
     Name: Aloo Corn Tikki Roll
     Ingredients: 21 items
     Directions: 15 steps
  ...

============================================================
✅ Successfully processed: 106
============================================================

💡 Run without --dry-run to apply changes
```

### Step 2: Test on a Single Recipe

Before updating all recipes, test on one recipe:

```bash
python scripts/update_recipe_templates.py --recipe "Aloo Corn Tikki Roll"
```

Then open [`recipes/raw_html/Aloo Corn Tikki Roll.html`](../recipes/raw_html/Aloo%20Corn%20Tikki%20Roll.html) in your browser to verify it looks good.

### Step 3: Update All Recipes

Once you're satisfied with the results, update all recipes:

```bash
python scripts/update_recipe_templates.py
```

**Example output:**
```
🚀 UPDATING RECIPES
Found 106 recipe(s) to process

  ✅ Updated: 3-Ingredient Cereal Bars.html
  ✅ Updated: Aloo Corn Tikki Roll.html
  ✅ Updated: Apple Cinnamon Carrot Muffin.html
  ...

============================================================
✅ Successfully processed: 106
============================================================
```

## Command Reference

### Preview all changes
```bash
python scripts/update_recipe_templates.py --dry-run
```

### Update a single recipe
```bash
python scripts/update_recipe_templates.py --recipe "Recipe Name"
```

### Update all recipes
```bash
python scripts/update_recipe_templates.py
```

## What Gets Extracted

The script extracts the following data from old HTML files:

- **Recipe name** - From `<h1 itemprop="name">`
- **Categories** - From `<p class="categories">`
- **Rating** - From `<p class="rating">`
- **Prep time** - From `<span itemprop="prepTime">`
- **Cook time** - From `<span itemprop="cookTime">`
- **Difficulty** - From `<span itemprop="difficulty">`
- **Servings** - From `<span itemprop="recipeYield">`
- **Source URL & name** - From `<a itemprop="url">`
- **Ingredients** - From `<p class="line" itemprop="recipeIngredient">`
- **Directions** - From `<p class="line">` in directions section
- **Images** - From `<img class="photo">`
- **Nutrition** - If present

## How It Works

1. **Parse old HTML**: Uses Python's `HTMLParser` to extract recipe data from the old HTML format
2. **Format ingredients**: Automatically wraps quantities in `<strong>` tags (e.g., "**1 cup** flour")
3. **Generate new HTML**: Applies the modern template with extracted data
4. **Write back**: Overwrites the original HTML file with the new version

## Troubleshooting

### Warning: Could not extract recipe name

If you see this warning:
```
⚠️  Warning: Could not extract recipe name from SomeRecipe.html
```

The script couldn't parse the HTML. Possible reasons:
- HTML format is different from expected
- File is corrupted
- Not a recipe file

**Solution**: Check the HTML file manually and ensure it follows the expected structure.

### Failed to update recipe

If you see:
```
❌ Error updating SomeRecipe.html: [error message]
```

**Solution**:
1. Check the error message for details
2. Verify the HTML file is valid
3. Try updating just that recipe with `--recipe "SomeRecipe"` to see detailed error

### Formatting issues

If the updated recipe doesn't look right:
1. Open the HTML file in a browser
2. Compare with [Chana Masala (IP).html](../recipes/raw_html/Chana%20Masala%20(IP).html)
3. Check if the old HTML had unusual formatting

## Safety Features

- **Dry run mode**: Preview changes before applying
- **Single recipe mode**: Test on one recipe first
- **Error handling**: Script continues if one recipe fails
- **Backup recommendation**: Consider backing up [`recipes/raw_html/`](../recipes/raw_html/) before running (optional but recommended)

## Backup (Optional but Recommended)

Before running the script, you can create a backup:

```bash
# From project root
cp -r recipes/raw_html recipes/raw_html_backup
```

If something goes wrong, restore from backup:

```bash
rm -rf recipes/raw_html
mv recipes/raw_html_backup recipes/raw_html
```

## After Updating

1. Open a few recipe HTML files in your browser to verify they look good
2. Check that all images, links, and formatting are correct
3. If everything looks good, you're done!

## Example Workflow

```bash
# 1. Preview what will change
python scripts/update_recipe_templates.py --dry-run

# 2. Test on one recipe
python scripts/update_recipe_templates.py --recipe "Chana Masala (IP)"

# 3. Open in browser and verify it looks good
open recipes/raw_html/Chana\ Masala\ \(IP\).html

# 4. Update all recipes
python scripts/update_recipe_templates.py

# 5. Spot check a few more recipes
open recipes/raw_html/Aloo\ Corn\ Tikki\ Roll.html
open recipes/raw_html/Bisi\ Bele\ Bath.html
```

## Questions?

If you encounter issues or have questions, check:
- The script source: [`scripts/update_recipe_templates.py`](../scripts/update_recipe_templates.py)
- Template example: [`recipes/raw_html/Chana Masala (IP).html`](../recipes/raw_html/Chana%20Masala%20(IP).html)
