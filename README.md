# Meal Planner System

Automated meal planning system with anti-repetition logic, farmers market integration, and constraint satisfaction.

**🌐 Live Site:** https://ssimhan.github.io/meal-planner/

**📖 Documentation:**
- [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) - Automation setup and implementation status
- [docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) - Development journey and key decisions
- [docs/REPO_STRUCTURE.md](docs/REPO_STRUCTURE.md) - File organization reference

## Features

### Core Capabilities
- 234+ vegetarian recipes with metadata
- Anti-repetition: No recipe repeats within 3 weeks
- No template repeats within one week
- Dietary constraints (avoid: eggplant, mushrooms, green cabbage)
- Busy-day logic with no-chop requirements
- Weekly "from scratch" novelty recipe selection

### Automation (GitHub Actions)
- **Saturday 5am PST:** PR with farmers market vegetable suggestions
- **On PR merge:** Automatic meal plan generation and deployment
- **Daily 8pm PST:** GitHub issue check-in with structured forms
- **Execution tracking:** Logs actual meals, vegetables used, and kids preferences
- **Inventory tracking:** Automatic freezer backup updates and fridge vegetable tracking
- **Live deployment:** https://ssimhan.github.io/meal-planner/

### User Interface
- Solarpunk-themed responsive design
- Mobile-first for kitchen/grocery use
- Live status updates and quick actions
- Archive of all past plans organized by month

---

## Quick Start

### Prerequisites
- Python 3.10+
- pip

### Installation

```bash
git clone <your-repo-url>
cd meal-planner
pip install -r requirements.txt
```

### Usage

**Automated (Recommended):**
1. Saturday 5am: Receive PR with vegetable suggestions
2. Review/edit vegetables on GitHub, merge when ready
3. Plan auto-generates and deploys to GitHub Pages
4. Daily 8pm: Log meals via GitHub issue

**Manual/Local:**
```bash
./mealplan next  # Automatically detects and runs next step
```

The CLI workflow:
1. Creates input file with proposed vegetables
2. Edit file, confirm vegetables after farmers market
3. Generate meal plan HTML
4. Updates history automatically

**Other commands:**
```bash
./mealplan status    # Show current state
./mealplan reset     # Force start new week
./mealplan parse     # Parse recipes (first time only)
```

---

## Project Structure

See [docs/REPO_STRUCTURE.md](docs/REPO_STRUCTURE.md) for detailed file organization.

**Key directories:**
```
meal-planner/
├── recipes/
│   ├── raw_html/         # 234 HTML recipe files
│   ├── index.yml         # Curated recipe database
│   └── taxonomy.yml      # Classification schema
├── data/
│   ├── history.yml       # Meal plan tracking (anti-repetition)
│   └── inventory.yml     # Freezer/pantry/fridge
├── inputs/               # Weekly constraints and schedule
├── plans/                # Generated meal plan HTML files
├── scripts/              # Python automation
└── .github/workflows/    # GitHub Actions automation
```

---

## Recipe Taxonomy

**Templates:** tacos, pasta, soup, curry, grain_bowl, dump_and_go, sandwich, salad, stir_fry, pizza, burrito_bowl

**Effort Levels:**
- `no_chop` - <15min, minimal chopping
- `minimal_chop` - 15-30min, light prep
- `normal` - 30-60min, standard cooking

**Appliances:** instant_pot, slow_cooker, stovetop, oven, air_fryer, blender, food_processor

---

## Recipe Management

**Adding recipes:**
1. Export as HTML with schema.org microdata
2. Place in `recipes/raw_html/`
3. Run `python scripts/parse_recipes.py`

**Editing tags:**
Manually edit `recipes/index.yml` to correct template, effort level, appliances, or ingredients.

---

## Design Philosophy

**The Meta-Goal:**
Move from "Here's a plan you *could* follow" to "Here's the plan you almost always *do* follow."

**Key principles:**
- **Energy-based prep model** - Monday (high energy) → Friday (zero prep)
- **Evening protection (5-9pm)** - Device-free time, minimal assembly only
- **Freezer backup strategy** - Maintain 3 complete backup meals
- **Anti-repetition** - Prevent recipe/template fatigue
- **Mental load reduction** - Optimize for calm, not just nutrition

See [docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) for detailed philosophy and evolution.

---

## Development Status

**Completed:**
- ✅ Phases 1-4: Core automation (GitHub Pages, weekly planning, daily check-ins, inventory)
- ✅ Phase 5: UI polish (landing page, mobile optimization, archive organization)
- ✅ Recipe parsing and classification (100% categorized, 0 unknown)
- ✅ Lunch selection intelligence (109 lunch-suitable recipes)

- ✅ Phase 6: Execution Tracking (meal adherence, vegetable tracking, kids preferences)
- 🚧 Phase 7: Analytics & Insights (initial framework complete)

See [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for complete status and future ideas.

---

## Maintaining Project History

After coding sessions, document your work in [docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md):

**What to include:**
- Date and what changed (features, fixes, refactoring)
- Why (rationale for decisions)
- Lessons learned (insights for future you)
- Next steps (optional)

**Purpose:**
- Blog post material
- Decision rationale
- Help non-coders learn
- Institutional knowledge

---

## License

Private use only.
