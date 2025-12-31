# Repository Structure

File organization reference for the meal-planner repository.

---

## Directory Structure

```
meal-planner/
├── README.md                    # Project overview
├── CLAUDE.md                    # AI assistant instructions
├── IMPLEMENTATION.md            # Implementation status
├── PROJECT_HISTORY.md           # Development journey
├── GITHUB_ACTIONS_SETUP.md      # GitHub Actions setup guide
├── mealplan                     # Main CLI tool
├── requirements.txt             # Python dependencies
│
├── .github/workflows/           # GitHub Actions automation
│   ├── deploy-pages.yml
│   ├── weekly-plan-start.yml
│   ├── weekly-plan-generate.yml
│   ├── daily-checkin-create.yml
│   └── daily-checkin-parse.yml
│
├── docs/                        # Documentation
│   ├── DESIGN_REFERENCE.md      # Original UX vision
│   ├── UPDATE_RECIPE_TEMPLATES.md
│   └── REPO_STRUCTURE.md (this file)
│
├── scripts/                     # Python automation
│   ├── workflow.py              # State-based workflow
│   ├── mealplan.py              # CLI commands
│   ├── lunch_selector.py        # Lunch recipe selection
│   ├── generate_landing_page.py # Landing page generator
│   ├── parse_recipes.py         # Recipe HTML parser
│   └── validate_plan.py         # Plan validator
│
├── recipes/                     # Recipe database
│   ├── index.yml                # 234 recipes with metadata
│   ├── taxonomy.yml             # Classification schema
│   └── raw_html/                # Source HTML files (234)
│
├── data/                        # Persistent data
│   ├── history.yml              # Meal plan tracking
│   ├── inventory.yml            # Freezer/pantry/fridge
│   └── logs.yml                 # Daily check-in logs
│
├── templates/                   # HTML templates
│   ├── weekly-plan-template.html
│   └── landing-page-template.html
│
├── inputs/                      # Weekly inputs (temporary)
│   └── YYYY-MM-DD.yml           # Week constraints
│
├── plans/                       # Generated meal plans
│   └── YYYY-MM-DD-weekly-plan.html
│
└── _site/                       # GitHub Pages deployment
    ├── index.html               # Landing page
    └── plans/                   # Deployed meal plans
```

---

## File Organization Principles

| Directory | Purpose | Persistence |
|-----------|---------|-------------|
| Root | Core docs, CLI tool, config | Permanent |
| `.github/workflows/` | Automation workflows | Permanent |
| `docs/` | User-facing documentation | Permanent |
| `scripts/` | Python automation | Permanent |
| `recipes/` | Recipe database | Permanent |
| `data/` | Historical tracking | Permanent |
| `templates/` | HTML templates | Permanent |
| `inputs/` | Weekly constraints | **Temporary** - delete after plan generated |
| `plans/` | Generated meal plans | Permanent (archive) |
| `_site/` | GitHub Pages build | Auto-generated |

---

## File Naming Conventions

**Weekly files:**
- Input: `YYYY-MM-DD.yml` (e.g., `2026-01-05.yml`)
- Plan: `YYYY-MM-DD-weekly-plan.html` (e.g., `2026-01-05-weekly-plan.html`)

**Recipe files:**
- Format: `Recipe Name.html`
- Example: `Chana Masala (IP).html`

---

## Maintenance

**After finalizing a meal plan:**
- Delete `inputs/YYYY-MM-DD.yml` (no longer needed)

**When adding new content:**
- Scripts → `scripts/`
- Documentation → `docs/`
- Templates → `templates/`
- Recipes → `recipes/raw_html/` + update `recipes/index.yml`
