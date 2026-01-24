# Meal Planner System

An intelligent, hybrid serverless meal planning system that generates personalized weekly meal plans, manages inventory, tracks execution, and optimizes for family preferences and constraints.

## 🌟 Features

### Core Planning
- **Smart Dinner Selection**: Automatically selects 5 dinners per week based on schedule constraints, recent history, and available ingredients
- **Lunch Optimization**: Intelligent lunch planning with leftover pipelines and kid-friendly options
- **Snack Intelligence**: School vs. home snack logic with automatic allergy substitutions
- **Grocery List Generation**: Auto-generated shopping lists organized by store section

### Smart Personalization
- **Kid Profiles**: Individual profiles with allergy tracking and preferences
- **Leftover Optimizer**: Planned dinner → lunch pipelines for high-value meals
- **Batch Cooking Suggestions**: Coordinated suggestions based on actual lunch plans
- **Dynamic Prep Tasks**: Context-aware prep lists including "pack leftovers" reminders

### Workflow Management
- **Interactive Dashboard**: Web UI for managing the entire meal planning workflow
- **Mid-Week Re-planning**: Smart re-plan that maintains leftover pipelines when meals shift
- **Execution Tracking**: Log meals, track adherence, and capture feedback
- **Inventory Management**: Track fridge, pantry, and freezer inventory

### Recipe Management
- **Recipe Importer**: Import recipes from URLs with automatic parsing
- **Metadata Preservation**: Manual recipe metadata (leftover potential, kid favorites) preserved across re-parses
- **226+ Recipes**: Curated collection with Indian, Mexican, Italian, and American cuisines

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/ssimhan/meal-planner.git
cd meal-planner

# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies
npm install

# Configure for your household (choose one):

# Option 1: Interactive setup wizard (recommended)
python3 scripts/setup.py

# Option 2: Manual configuration
cp config.example.yml config.yml
# Edit config.yml manually, then validate:
python3 scripts/validate_yaml.py --config

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

### First-Time Configuration

Before using the meal planner, customize `config.yml` for your household:

1. **Set your timezone** (e.g., `America/New_York`, `Europe/London`)
2. **Define your schedule** (office days, busy days, late class days)
3. **Add dietary preferences** (vegetarian, avoid ingredients)
4. **Create kid profiles** (names and individual allergies)
5. **Customize lunch/snack defaults** for your family

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for complete configuration guide.

### CLI Usage

The system supports both a **web dashboard** (recommended) and **CLI** for local development.

#### Recommended: Web Dashboard
```bash
npm run dev
# Open http://localhost:3000
# Use the interactive wizard for weekly planning
```

#### CLI (Local/Maintenance)
```bash
# Streamlined workflow (auto-detects next step)
./mealplan next      # Auto-run next workflow step
./mealplan status    # Show current workflow status
./mealplan reset     # Start planning next week

# Legacy numbered workflow
./mealplan 1-start           # Start new week (interactive prompts)
./mealplan 2-update 2026-01-20  # Edit vegetables after farmers market
./mealplan 3-plan 2026-01-20    # Generate meal plan
./mealplan 4-view 2026-01-20    # View a specific plan
./mealplan 5-latest          # View most recent plan

# Utility commands
./mealplan parse      # Parse HTML recipes into index
./mealplan validate 2026-01-20  # Validate a meal plan
```

## 📁 Project Structure

```
meal-planner/
├── api/                    # Vercel serverless functions
├── scripts/                # Core Python logic
│   ├── workflow.py        # Main workflow orchestration
│   ├── lunch_selector.py  # Lunch planning logic
│   ├── parse_recipes.py   # Recipe parser
│   └── import_recipe.py   # Recipe importer
├── src/                    # Next.js web UI
│   ├── app/               # App router pages
│   └── lib/               # API client
├── recipes/                # Recipe database
│   ├── index.yml          # Curated recipe index
│   └── raw_html/          # Source HTML files
├── data/                   # Backup/Template files
│   ├── history.yml        # (Sync to Supabase via migrate_to_supabase.py)
│   └── inventory.yml      # (Sync to Supabase via migrate_to_supabase.py)
├── inputs/                 # Weekly input files
└── public/plans/          # Generated HTML plans
```

## 📖 Documentation

- **[IMPLEMENTATION.md](docs/IMPLEMENTATION.md)**: Complete system architecture and roadmap
- **[BUGS.md](docs/BUGS.md)**: Bug tracking and technical debt (zero-debt policy)
- **[PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md)**: Development history and session logs
- **[FIELD_NAMING_CONVENTION.md](docs/FIELD_NAMING_CONVENTION.md)**: Field naming standards for meal feedback
- **[CLAUDE.md](CLAUDE.md)**: AI assistant context and guidelines

## 🎯 Current Status

**Phase 28: General Workflow and Frontend Clean up** ✅ Complete
- Global visual polish and dark mode improvements
- Inventory & shopping stability fixes
- Recipe experience enhancements (Focus Mode, tag migration)
- Advanced planning persistence (pause/resume workflow)

**Phase 29+: Next Steps** 🚧 Planned
- Wizard architecture refactor
- Household communication & persistence
- User authentication (single-household access)
- Mobile-friendly UX improvements

See [IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for complete roadmap.

## 🛠️ Technology Stack

- **Backend**: Python 3.9, Flask, PyYAML, Supabase (PostgreSQL)
- **Frontend**: Next.js 15, React, TypeScript
- **Deployment**: Vercel (serverless)
- **Storage**: Supabase Managed Database (Source of Truth) + local YAML (Backup/Templates)
- **Parsing**: BeautifulSoup4, lxml

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome! Please open an issue to discuss proposed changes.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built with assistance from Claude (Anthropic) and designed for a family of 4 with specific dietary preferences and scheduling constraints.
