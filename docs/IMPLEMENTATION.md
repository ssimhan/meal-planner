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

**Current State:** Fully functional. All core features complete (Phases 1-14). Phase 15 in planning.

**Completed Phases:**
- **1-9:** Foundation (recipe parsing, CLI, energy-based prep, HTML plans)
- **10-11:** Logging, performance, inventory intelligence, analytics
- **12:** Architecture refactoring, TypeScript migration, testing
- **13.1-13.4:** State fixes, inventory UX, prep workflow, white-labeling
- **14:** Data Layer Redesign (Plan vs Actual separation)

**Phase 13.4 (White-labeling):** ✅ Complete
System now fully configurable via `config.yml` with:
- Interactive setup wizard (`scripts/setup.py`)
- Comprehensive docs (`docs/CONFIGURATION.md`)
- Schema validation (`validate_yaml.py --config`)
- Example template (`config.example.yml`)

---

## Known Issues

### Bug: Week View Not Displaying Actual Meals
**Status:** 🐛 Open
**Description:** "Week at a Glance" view is not pulling actual meal data from the current week's plan
**Impact:** Users cannot see scheduled meals in the week overview
**Reported:** 2026-01-09
**Priority:** Medium

---

## Future Roadmap

**Phase 15: User Authentication & Scale (Cost-Efficiency Focus)**

**Strategy:** Maximize "Free Tier" longevity before incurring infrastructure costs.

### Phase 15.1: The "Family Gate" (Security)
**Goal:** Secure the current single-household application so only authorized family members can access it.
**Cost:** $0/mo (Free Tiers).

*   **Auth Provider:** **Supabase Auth** (Free up to 50,000 MAUs) or **NextAuth.js** (Self-hosted).
    *   *Why Supabase?* Easier integration for future database needs.
*   **Data Model:** Continue using **GitOps (YAML files)**.
    *   *Logic:* Database migration is expensive (dev time) and unnecessary for a single family.
    *   *Mechanism:* A simple "Login" screen that gates access to the existing dashboard. All logged-in users modify the same `history.yml`.
*   **Limits:**
    *   Single Household object only (everyone shares the same data).
    *   No "private" views per user.

### Phase 15.2: Database Migration (The "SaaS Foundation")
**Goal:** Move data from YAML to a Relational Database to support concurrency and future multi-tenancy.
**Cost:** $0/mo (Supabase Free Tier).
**Limits & Risks:**
    *   **Database Pausing:** Supabase Free projects "pause" after 1 week of inactivity. Cold starts ~5-10s.
    *   **Storage:** 500MB DB space. (Enough for ~5-10 years of text-only meal plans).
    *   **Backups:** Free tier does not include Point-in-Time recovery (Git was better for this).

*   **Action:** Refactor `api/` to read/write to Postgres instead of `yaml` files.
*   **Optimization:** Keep "generated HTML plans" as static files (Vercel Blob or Supabase Storage) to save DB space.

### Phase 15.3: Multi-Tenancy (Productization)
**Goal:** Allow *other* families to signup.
**Cost:**
    *   **Infra:** Still $0/mo until >500MB data or >50k users.
    *   **Payment Processing:** Stripe (Transaction fees only).

*   **Architecture:** Add `household_id` to all DB tables.
*   **Logic:** Row Level Security (RLS) in Supabase is critical here to ensure Family A cannot see Family B's dinner.


---

**Other Ideas:**
- Freezer ingredients tracking (raw components vs backup meals)
- Advanced analytics (monthly trends, preferences)
- Nutrition estimation

See [PROJECT_HISTORY.md](PROJECT_HISTORY.md) for detailed development timeline.
