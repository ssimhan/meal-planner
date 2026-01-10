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

**Phase 13.5: User Authentication** (In Progress)

**Two-Phase Approach:**

### Phase 1: Simple Multi-User (3 weeks) - In Planning
**Goal:** Multiple family members share household data with role-based access

**Tech Stack:**
- Supabase (PostgreSQL + Auth + Row Level Security)
- Magic links via Resend (passwordless email auth)
- JWT tokens (HTTP-only cookies, 7-day expiry)
- Roles: admin, editor, viewer

**Implementation:**
- Week 1: Backend auth infrastructure (magic link API, JWT middleware, household models)
- Week 2: Frontend auth UI (login page, AuthContext, route protection)
- Week 3: Migration script, testing, documentation

**Key Files:**
- New: `api/auth/magic_link.py`, `src/app/login/page.tsx`, `src/context/AuthContext.tsx`
- Modified: `api/index.py`, `api/routes/status.py`, `src/app/layout.tsx`

### Phase 2: Multi-Tenant Productization (5 weeks) - Future
**Goal:** Isolated data per household + subscription model

**Features:**
- Database-first storage (migrate history/inventory from YAML to Supabase)
- Household invitation system
- Stripe subscriptions (Free/$9/$19 tiers)
- Multi-household support per user

**Timeline:** 8 weeks total to full productization

**Detailed Plan:** See `/Users/sandhyasimhan/.claude/plans/snappy-beaming-lagoon.md`

---

**Other Ideas:**
- Freezer ingredients tracking (raw components vs backup meals)
- Advanced analytics (monthly trends, preferences)
- Nutrition estimation

See [PROJECT_HISTORY.md](PROJECT_HISTORY.md) for detailed development timeline.
