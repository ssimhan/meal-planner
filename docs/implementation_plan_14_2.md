# Implementation Plan: Phase 14.2 - Database Migration

**Goal:** Migrate the Meal Planner's data layer from YAML files to a Supabase Postgres Database while maintaining a rigorous testing and staging workflow.

## 🛡️ Safety & Workflow Strategy

To ensure zero downtime and no data loss on the main application:

1.  **Branching**: All work will occur on `feature/db-migration`.
2.  **Environment Isolation**: 
    *   **Local**: I will use local environment variables to connect to either a "Development" Supabase project or a separate schema.
    *   **Vercel Preview**: Every push to this branch will generate a unique Preview URL. We will use this to verify the DB connection in a deployed environment without affecting the "Live" site.
3.  **Data Integrity**: I will write a non-destructive migration script that *copies* YAML data to the DB, leaving the original files intact as a fail-safe.
4.  **Rollback Path**: The app will retain the ability to toggle back to "File Mode" via a single environment variable if the DB migration fails verification.

---

## 📋 Task Breakdown

### 1. Database Schema (Design & Setup) <!-- id: 1 -->
*   [x] Define the SQL schema for `households`, `recipes`, `inventory`, and `history`.
*   [ ] Implement **Row Level Security (RLS)** to future-proof the app for multi-tenancy.
*   [x] Create a `docs/schemas/phase_14_2_schema.sql` artifact.

### 2. The Migration Bridge <!-- id: 2 -->
*   Create `scripts/migrate_to_db.py`.
*   Map `history.yml` (complex structure) to relational tables.
*   Map `inventory.yml` and `recipes/` content.

### 3. Backend Refactor (Python) <!-- id: 3 -->
*   Update `api/utils/` to handle a "Storage Engine" interface.
*   Implement `DBStorageEngine` using the Supabase Python client.
*   Update routes in `api/routes/` to use the new engine abstraction.

### 4. Verification & Deployment <!-- id: 4 -->
*   **Verification A**: Run migration script and check data in Supabase Dashboard.
*   **Verification B**: Test "Preview URL" from Vercel.
*   **Final Step**: Once you approve, merge `feature/db-migration` into `main`.

---

## 🛠️ Proposed Schema

### `households`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid (PK) | Unique ID for the family |
| `name` | text | e.g. "Simhan Family" |
| `config` | jsonb | Store all settings from `config.yml` |

### `recipes`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | text (PK) | Sluggified ID (e.g. "masala_puri") |
| `household_id` | uuid (FK) | Owner |
| `name` | text | |
| `metadata` | jsonb | Cuisine, tags, servings, etc. |
| `content` | text | Raw markdown/instructions |

### `inventory`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid (PK) | |
| `household_id` | uuid (FK) | |
| `category` | text | fridge, pantry, freezer |
| `item` | text | |
| `quantity` | float | |
| `unit` | text | |
| `metadata` | jsonb | e.g. `added_date`, `frozen_date` |

### `meal_plans`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid (PK) | |
| `household_id` | uuid (FK) | |
| `week_of` | date | Start date (Monday) |
| `plan_data` | jsonb | The full plan structure (dinners, lunches, snacks) |
| `history_data` | jsonb | The execution logs (made, feedback, etc.) |
| `status` | text | active, archived, etc. |

---

## ❓ Decision Needed
Would you like me to start by writing the SQL to create these tables in your Supabase Dashboard? Or do you want to see the migration script logic first?
