# Meal Planner Implementation Guide

**Last Updated:** 2026-01-09
**Live Site:** [meal-planner-eta-seven.vercel.app](https://meal-planner-eta-seven.vercel.app/)

---

## System Overview

Hybrid Serverless application for weekly meal planning, daily execution tracking, and inventory management. Python logic engine + Next.js frontend.

### Core Workflow

1. **Weekly Planning:** "Start New Week" → enter farmers market purchases → "Generate Weekly Plan"
2. **Daily Execution:** View "Today's Schedule" → one-tap logging for meals/prep tasks
3. **Inventory:** Update via "Quick Add" or "Brain Dump"

### Data Files

- **history.yml:** Source of truth for all past plans and execution data
- **inventory.yml:** Freezer/Fridge/Pantry stock (maintains ≥3 freezer backup meals)
- **recipes/:** YAML recipe files with metadata
- **config.yml:** All user settings (dietary preferences, schedules, kid profiles)

---

## Key Features

### Energy-Based Prep Schedule
Declining energy model: Monday (high) → Friday (zero prep)

- **Monday PM:** Chop Mon/Tue/Wed veg, batch cook components, prep freezer meals (2x, freeze half)
- **Tuesday AM/PM:** Lunch prep for Wed/Thu/Fri, chop Thu/Fri dinner veg
- **Wednesday PM:** Finish ALL remaining prep (no chopping after this)
- **Thursday AM:** Light assembly only (8-9am), NO chopping after noon, NO evening prep
- **Friday:** Zero prep - reheating/assembly only, dinner must be `no_chop_compatible: true`

### Smart Personalization
- Kid profiles in `config.yml` with individual allergies
- School snacks automatically nut-free
- Leftover pipelines: dinner → next day lunch for family

### Architecture
- **Frontend:** Next.js dashboard (`src/app`)
- **Backend:** Python Serverless Functions (`api/`)
- **Persistence:** GitOps model (all changes committed to GitHub)
- **Plans:** Static HTML (`public/plans/`) with 9 tabs

---

## Local Development

```bash
./scripts/dev.sh  # Auto-regenerates plans on file changes
```

---

## Development Status

**Current State:** Fully functional. All core features complete (Phases 1-13.4).

**Completed Phases:**
- **1-9:** Foundation (recipe parsing, CLI, energy-based prep, HTML plans)
- **10-11:** Logging, performance, inventory intelligence, analytics
- **12:** Architecture refactoring, TypeScript migration, testing
- **13.1-13.4:** State fixes, inventory UX, prep workflow, white-labeling

**Phase 13.4 (White-labeling):** ✅ Complete
System now fully configurable via `config.yml` with:
- Interactive setup wizard (`scripts/setup.py`)
- Comprehensive docs (`docs/CONFIGURATION.md`)
- Schema validation (`validate_yaml.py --config`)
- Example template (`config.example.yml`)

---

## Future Roadmap

**Phase 13.5: User Authentication** (Optional)
- Multi-user support with email/password or OAuth
- Profile setup wizard
- Per-user config.yml generation

**Other Ideas:**
- Freezer ingredients tracking (raw components vs backup meals)
- Advanced analytics (monthly trends, preferences)
- Nutrition estimation

See [PROJECT_HISTORY.md](PROJECT_HISTORY.md) for detailed development timeline.
