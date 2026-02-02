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
- **Enhanced Agent Assets**: Advanced slash commands (`/brainstorm`, `/design`, `/implement`) and specialized skills located in `.agent/workflows` and `skills/`.

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

For detailed setup, testing, and deployment instructions, see [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md).

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
├── api/                    # Vercel serverless functions (Python)
├── docs/                   # Documentation & Archival
├── scripts/                # Core Python automation
├── src/                    # Next.js web UI (TypeScript)
├── public/                 # Static assets & plans
├── recipes/                # Recipe database (Markdown)
├── data/                   # Persistent data & logs
└── supabase/               # DB migrations & triggers
```

## 📖 Documentation

- **[project_roadmap.md](docs/project_roadmap.md)**: System architecture and roadmap
- **[DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)**: Setup, testing, and deployment
- **[BUGS.md](docs/BUGS.md)**: Active bug tracking
- **[PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md)**: Development journey & insights
- **[REPO_STRUCTURE.md](docs/REPO_STRUCTURE.md)**: Detailed file organization

## 🎯 Current Status

**Phase 34: Strategic Tech Debt Cleanup** ✅ Complete
- Systemic data sanitization in StorageEngine (null metadata safety)
- SWR (Stale-While-Revalidate) cache pattern for serverless reliability
- 100% test coverage for core `meal_service.py` functions
- Performance optimizations for pending recipe scans

**Phase 35: Frictionless Shopping & Recipe Loop** 🚧 Active
- Closed-loop shopping list to inventory sync
- Recipe-to-List automation with ingredient deduplication
- Automated multi-recipe shopping intelligence

See [project_roadmap.md](docs/project_roadmap.md) for complete roadmap.

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
