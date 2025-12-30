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

## Usage

The simplest way to use the meal planner - just run one command and it handles everything:

```bash
./mealplan next
```

That's it! The workflow automatically:
1. Detects what stage you're at
2. Runs the appropriate next step
3. Guides you through what to do next

**Complete Workflow Example:**

```bash
# Week starts - create new input file
./mealplan next
# → Creates inputs/YYYY-MM-DD.yml with proposed vegetables

# Edit file to confirm vegetables after farmers market
vim inputs/YYYY-MM-DD.yml  # Update confirmed_veg, change status to "confirmed"

# Generate meal plan
./mealplan next
# → Creates plans/YYYY-MM-DD-weekly-plan.md and updates history

# When week is done, start next week
./mealplan next
# → Creates next week's input file automatically
```

**Other Streamlined Commands:**

```bash
./mealplan status  # Show current workflow state
./mealplan reset   # Force start new week (if needed)
```

**State Tracking:**

Each input file now tracks its progress:
- `intake_complete` + `status: proposed` → Awaiting farmers market confirmation
- `intake_complete` + `status: confirmed` → Ready to generate plan
- `plan_complete` → Week is done, ready for next week

---

### Legacy Workflow Commands

Use the `./mealplan` wrapper script with numbered workflow commands:

```bash
# First time only: Parse your HTML recipes
./mealplan parse

# Weekly workflow (follow the numbers):
./mealplan 1-start             # Step 1: Start new week (interactive)
./mealplan 2-update 2026-01-05 # Step 2: Update after farmers market
./mealplan 3-plan 2026-01-05   # Step 3: Generate the meal plan
./mealplan 4-view 2026-01-05   # Step 4: View the plan
./mealplan 5-latest            # Step 5: View most recent plan

# Optional:
./mealplan validate 2026-01-05 # Validate constraints
```

**Workflow Commands:**
1. `1-start` (or `start`) - Start new week with interactive prompts
2. `2-update <date>` (or `update`) - Update vegetables after farmers market shopping
3. `3-plan <date>` (or `plan`) - Generate meal plan
4. `4-view <date>` (or `view`) - View a specific plan
5. `5-latest` (or `latest`) - View most recent plan

**Other Commands:**
- `parse` - Parse HTML recipes into index (one-time setup)
- `validate <date>` - Validate meal plan constraints

---

### Detailed Usage (Manual Commands)

If you prefer running Python scripts directly:

#### 1. Parse Recipes (Phase 1)

Convert HTML recipes into structured JSON and YAML indexes:

```bash
python3 scripts/parse_recipes.py
```

This will:
- Read all HTML files from `recipes/raw_html/`
- Extract recipe metadata (name, ingredients, instructions, categories)
- Apply tagging heuristics (template, effort level, appliances)
- Generate `recipes/parsed/recipes.json` and `recipes/index.yml`

View the curated recipe index:

```bash
cat recipes/index.yml
```

#### 2. Create Weekly Input (Phase 2)

Run the interactive intake command to create a weekly input file:

```bash
python3 scripts/mealplan.py intake
```

This will prompt you for:
- **Week start date** (defaults to next Monday)
- **Office days** (default: Mon, Wed, Fri)
- **Busy days** (default: Thu, Fri) - Quick meals needed
- **Late class days** (default: none) - Heavy snack required
- **Special events** (optional) - Dinners out, travel, etc.

The command will:
- Generate a farmers market vegetable proposal based on:
  - Seasonal availability (current month)
  - Recipe requirements (from `recipes/index.yml`)
  - Recent usage (avoid repetition from `data/history.yml`)
- Create `inputs/YYYY-MM-DD.yml` with your schedule and preferences

After running intake:
1. Review the generated `inputs/YYYY-MM-DD.yml` file
2. Edit `proposed_veg` if needed
3. After farmers market shopping, copy vegetables to `confirmed_veg`
4. Change `status: proposed` to `status: confirmed`

#### 3. Generate Meal Plan (Phase 3)

After confirming your farmers market vegetables, generate the weekly meal plan:

```bash
python3 scripts/mealplan.py plan inputs/YYYY-MM-DD.yml
```

This will:
- Load your schedule and preferences from the input file
- Filter recipes based on constraints (anti-repetition, avoided ingredients)
- Select 5 dinners (Mon-Fri) with no template repetition
- Prioritize no-chop recipes for busy days (Thu/Fri by default)
- Generate `plans/YYYY-MM-DD-weekly-plan.md` with complete meal plan
- Update `data/history.yml` to track recipe usage

View the generated plan:

```bash
cat plans/YYYY-MM-DD-weekly-plan.md
```

#### 4. Validate Plan (Optional)

Validate that the generated plan meets all constraints:

```bash
python3 scripts/validate_plan.py plans/YYYY-MM-DD-weekly-plan.md inputs/YYYY-MM-DD.yml
```

This checks:
- All dinners (Mon-Fri) are present
- No avoided ingredients used
- Busy days have no-chop meals or prep notes
- Late class days have heavy snacks
- No template repetition within the week
- At least one vegetable per dinner

## Project Structure

```
meal-planner/
├── README.md             # This file - main documentation
├── CLAUDE.md             # Claude Code operating instructions
├── mealplan              # Main CLI wrapper script
├── recipes/
│   ├── raw_html/         # Original HTML recipe files (234 files)
│   ├── parsed/           # Generated JSON output
│   ├── taxonomy.yml      # Template and tag definitions
│   └── index.yml         # Curated recipe index (234 recipes)
├── data/
│   └── history.yml       # Historical meal plan tracking
├── inputs/               # Weekly input files with schedule/preferences
├── plans/                # Generated weekly meal plans (Markdown)
└── scripts/              # Python automation scripts
    ├── workflow.py       # Streamlined workflow with state tracking
    ├── mealplan.py       # Legacy workflow commands
    ├── parse_recipes.py  # Recipe HTML parser
    └── validate_plan.py  # Plan validator
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
- [x] Phase 2: CLI Intake + Farmers Market
- [x] Phase 3: Plan Generation
- [x] Phase 4: Complete Template Classification (100% of recipes categorized)

## Recent Improvements (Phase 4)

**Complete Recipe Classification** - 100% of recipes now categorized (0 unknown):
- Added 8 new template categories (breakfast, snack_bar, baked_goods, etc.)
- Expanded keyword matching with 50+ new terms
- Manually classified all 36 remaining unknowns
- Improved meal-type filtering (dinner vs. lunch vs. snack)
- **Before**: 120 unknown recipes (51%)
- **After**: 0 unknown recipes (0%)

**From-Scratch Recipe Selection** - Now working correctly:
- Prioritizes normal-effort recipes for non-busy days
- Properly displays selected recipe in plan output
- Avoids template conflicts with busy-day meals

## Maintaining Project History

**After every coding session**, update the project documentation:

### End of Session Checklist

When you're ready to commit your work, always ask Claude Code to:

1. **Update PROJECT_HISTORY.md** with session notes:
   ```
   Please update PROJECT_HISTORY.md with what we did this session:
   - What features/fixes were implemented
   - Key decisions made and why
   - Lessons learned or insights discovered
   - Any new patterns or approaches introduced
   ```

2. **Commit all changes** together:
   ```bash
   # Claude Code will handle the git commands
   "Please commit all files with an appropriate message"
   ```

### What to Document

Add a new session entry to PROJECT_HISTORY.md including:
- **Date** of the session
- **What changed**: Features added, bugs fixed, refactoring done
- **Why**: Rationale for decisions made
- **Lessons learned**: Insights for future you and other builders
- **Next steps**: What to tackle next (optional)

### Example Session Entry Format

```markdown
## Session: 2025-12-30

### What We Built
- Created PROJECT_HISTORY.md to document project journey
- Added automated session tracking to README workflow

### Key Decisions
- Decided to maintain project history alongside code
- Chose Markdown format for easy editing and version control

### Lessons Learned
- Documentation is best maintained continuously, not retroactively
- Future blog posts become easier when you document as you go

### Next Steps
- Continue refining meal planning algorithm
- Add more recipes to the database
```

### Why This Matters

- **For your blog**: You'll have detailed notes about your journey
- **For future you**: Remember why you made certain decisions
- **For other builders**: Help non-coders learn from your process
- **For the project**: Creates institutional knowledge

The PROJECT_HISTORY.md file is designed to become a blog post or tutorial, so write entries with that audience in mind.

## Future Features

- Lunch prep recipe suggestions (infrastructure in place)
- Heavy snack recipe recommendations for late class days
- AI-powered plan refinement with Claude Code
- GitHub Actions automation for weekly plans
- Interactive plan editing workflow

## License

Private use only.
