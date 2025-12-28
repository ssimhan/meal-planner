# Meal Planner System

An automated meal planning system that generates weekly meal plans with anti-repetition logic, farmers market integration, and constraint satisfaction.

## Features

- Parses 234+ vegetarian recipes from HTML files
- Prevents recipe repetition within 3 weeks
- Prevents template repetition more than once per week
- Respects dietary constraints (avoid: eggplant, mushrooms, green cabbage)
- Two-step workflow: intake → farmers market → plan generation
- Supports busy-day logic with no-chop requirements
- Automatically selects one "from scratch" novelty recipe per week

## Prerequisites

- Python 3.10 or higher
- pip (Python package manager)

## Installation

1. Clone this repository:
```bash
git clone <your-repo-url>
cd meal-planner
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage (Phase 0-1)

### Parse Recipes

Convert HTML recipes into structured JSON and YAML indexes:

```bash
python scripts/parse_recipes.py
```

This will:
- Read all HTML files from `recipes/raw_html/`
- Extract recipe metadata (name, ingredients, instructions, categories)
- Apply tagging heuristics (template, effort level, appliances)
- Generate `recipes/parsed/recipes.json` and `recipes/index.yml`

### View Recipe Index

After parsing, view the curated recipe index:

```bash
cat recipes/index.yml
```

Or explore the full parsed data:

```bash
python -m json.tool recipes/parsed/recipes.json | less
```

## Project Structure

```
meal-planner/
├── prompts/              # Prompt templates for Claude Code
├── recipes/
│   ├── raw_html/         # Original HTML recipe files (234 files)
│   ├── parsed/           # Generated JSON output
│   ├── taxonomy.yml      # Template and tag definitions
│   └── index.yml         # Curated recipe index for planning
├── data/
│   ├── history.yml       # Historical meal plan tracking
│   └── pantry.yml        # Pantry inventory (future)
├── inputs/               # Weekly input files with schedule/preferences
├── plans/                # Generated weekly meal plans
└── scripts/              # Python scripts for parsing and planning
    ├── parse_recipes.py  # Recipe HTML parser
    ├── mealplan.py       # CLI entry point (future)
    └── validate_plan.py  # Plan validator (future)
```

## Recipe Management

### Adding New Recipes

1. Export recipes as HTML files (with schema.org microdata)
2. Place in `recipes/raw_html/`
3. Run `python scripts/parse_recipes.py`

### Editing Recipe Tags

After parsing, manually edit `recipes/index.yml` to correct:
- Template categorization
- Effort levels
- Appliances
- Ingredient lists

The parser will preserve manual edits on subsequent runs (future enhancement).

## Recipe Taxonomy

### Templates
- **tacos** - Tacos, enchiladas, flautas, quesadillas
- **pasta** - Pasta dishes, mac and cheese, noodles
- **soup** - Soups, stews, broths
- **curry** - Curries, masalas, dal
- **grain_bowl** - Rice bowls, quinoa bowls, buddha bowls
- **dump_and_go** - Instant Pot, slow cooker recipes
- **sandwich** - Sandwiches, wraps, paninis
- **salad** - Salads
- **stir_fry** - Stir-fries, pad thai
- **pizza** - Pizza
- **burrito_bowl** - Burrito bowls
- **unknown** - Unclassified (requires manual tagging)

### Effort Levels
- **no_chop** - Ready in <15min, minimal/no chopping
- **minimal_chop** - 15-30min, light prep
- **normal** - 30-60min, standard cooking

### Appliances
- instant_pot, slow_cooker, stovetop, oven, air_fryer, blender, food_processor

## Development Status

- [x] Phase 0: Scaffolding
- [x] Phase 1: Recipe Parsing
- [ ] Phase 2: CLI Intake + Farmers Market
- [ ] Phase 3: Plan Generation
- [ ] Phase 4: Polish + Examples

## Future Features (Phase 2+)

- Interactive intake CLI for weekly scheduling
- Farmers market vegetable proposal generation
- AI-powered meal plan generation with Claude Code
- Automatic history updates
- Plan validation with retry logic
- GitHub Actions automation for weekly plans

## License

Private use only.
