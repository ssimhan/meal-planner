# Repository Structure

This document describes the organization of the meal-planner repository.

## Current Structure (Organized)

```
meal-planner/
├── README.md                    # Project overview and quick start
├── CLAUDE.md                    # Claude Code operating instructions
├── .clauderc                    # Claude Code slash commands configuration
├── .gitignore                   # Git ignore patterns
├── mealplan                     # Main CLI tool (bash script)
├── requirements.txt             # Python dependencies
│
├── docs/                        # Documentation
│   ├── UPDATE_RECIPE_TEMPLATES.md
│   └── REPO_STRUCTURE.md (this file)
│
├── scripts/                     # Python automation scripts
│   ├── __init__.py             # Python package marker
│   ├── workflow.py             # Automated workflow orchestration
│   ├── mealplan.py             # Meal plan generation
│   ├── parse_recipes.py        # Recipe HTML parser
│   ├── validate_plan.py        # Plan validation logic
│   └── update_recipe_templates.py  # Batch recipe updater
│
├── recipes/                     # Recipe data
│   ├── index.yml               # Master recipe index (106 recipes)
│   ├── taxonomy.yml            # Recipe classification schema
│   └── raw_html/               # Recipe HTML files (106 files)
│
├── data/                        # Historical data
│   └── history.yml             # Past meal plan history
│
├── templates/                   # HTML templates
│   └── weekly-plan-template.html
│
├── inputs/                      # Weekly input files
│   ├── .gitkeep
│   └── YYYY-MM-DD.yml          # Week-specific constraints
│
└── plans/                       # Generated meal plans
    ├── .gitkeep
    └── YYYY-MM-DD-weekly-plan.html
```

## File Organization Principles

### Root Level
**Keep minimal** - Only essential files:
- Core documentation (README, CLAUDE.md)
- Configuration files (.clauderc, .gitignore)
- Main CLI tool (mealplan)
- Dependencies (requirements.txt)

### Documentation (`docs/`)
All user-facing documentation and guides.

### Scripts (`scripts/`)
All Python automation scripts and tools.

### Recipes (`recipes/`)
- `index.yml` - Structured recipe metadata
- `taxonomy.yml` - Classification schema
- `raw_html/` - Source recipe HTML files

### Data (`data/`)
Persistent historical data (meal plan history).

### Templates (`templates/`)
HTML templates for generating output files.

### Inputs (`inputs/`)
**Temporary working directory** - Week-specific input files.
These are deleted after meal plan is finalized.

### Plans (`plans/`)
Generated meal plan HTML files (output).

## File Naming Conventions

### Recipe Files
- Format: `Recipe Name.html`
- Examples:
  - ✅ `Chana Masala (IP).html`
  - ✅ `Sunflower Seed Cream Cheese (Dairy-Free).html`
  - ❌ `Petra A. | Sunglow Kitchen | Comment CHEESE...html` (too verbose)

### Weekly Files
- Input: `YYYY-MM-DD.yml` (week start date)
- Plan: `YYYY-MM-DD-weekly-plan.html`
- Example: `2025-12-29.yml` → `2025-12-29-weekly-plan.html`

## Clean-up Notes

The following files/folders can be safely removed:
- `.DS_Store` - macOS system file (already in .gitignore)
- None currently - repo is well-organized!

## Maintenance

### When Adding New Files
- **Scripts** → `scripts/` directory
- **Documentation** → `docs/` directory
- **Templates** → `templates/` directory
- **Recipes** → `recipes/raw_html/` + update `recipes/index.yml`

### Periodic Cleanup
- **Inputs folder**: Delete old `.yml` files after meal plans are finalized
- **Plans folder**: Archive old plans if needed (optional)
