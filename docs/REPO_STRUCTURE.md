# Repository System architecture and file organization reference.

## Documentation
- `docs/USER_GUIDE.md`: Non-technical "How To" guide
- `docs/project_roadmap.md`: Automation setup and implementation status
- `docs/PROJECT_HISTORY.md`: Development journey and key decisions
- `docs/DEVELOPER_GUIDE.md`: Developer setup, deployment, and CI/CD
 for the meal-planner repository.

---

## Directory Structure

```
meal-planner/
├── README.md                    # Project overview
├── CLAUDE.md                    # AI assistant instructions
├── project_roadmap.md            # Implementation status
├── PROJECT_HISTORY.md           # Development journey
├── GITHUB_ACTIONS_SETUP.md      # GitHub Actions setup guide
├── mealplan                     # Main CLI tool
├── requirements.txt             # Python dependencies
│
├── .github/workflows/           # GitHub Actions automation
│   └── data-integrity.yml      # Data validation checks
│
├── docs/                        # Documentation
│   ├── DESIGN_REFERENCE.md      # Original UX vision
│   ├── project_roadmap.md        # Implementation details
│   ├── DEVELOPER_GUIDE.md       # Setup & Deployment guide
│   ├── PROJECT_HISTORY.md       # Project history
│   ├── REPO_STRUCTURE.md (this file)
│   ├── archive/                 # Archived/Outdated docs
│   └── UPDATE_RECIPE_TEMPLATES.md
│
├── scripts/                     # Python automation
│   ├── workflow.py              # State-based workflow
│   ├── mealplan.py              # CLI commands
│   ├── lunch_selector.py        # Lunch recipe selection
│   ├── parse_recipes.py         # Recipe HTML parser
│   ├── import_recipe.py         # Recipe importer
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
├── public/                      # Static assets for Vercel
│   └── plans/                   # Public meal plans
│
└── src/                         # Next.js frontend
    ├── app/                     # App router pages
    └── lib/                     # API client
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
| `public/` | Static assets for Vercel | Auto-generated |
| `src/` | Next.js frontend code | Permanent |
| `api/` | Vercel serverless functions | Permanent |

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
