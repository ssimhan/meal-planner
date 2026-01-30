# Implementation Plan - Phase 34: Frictionless Shopping & Recipe Loop

Modularize recipe management by supporting Main + Side pairings and filtering out "Permanent Pantry" staples.

## Goal
Enable multi-recipe slots in meal plans and implement an intelligent "Permanent Pantry" filter to streamline the shopping experience.

## Architecture
- **Data Layer**: Transition `meal_plans.plan_data` from `recipe_id` to `recipe_ids` array. Add `requires_side` and `tags` to recipe metadata.
- **Service Layer**: 
    - `PairingService`: History-based co-occurrence analysis for side dish suggestions.
    - `ShoppingEngine`: Multi-recipe ingredient aggregation and pantry filtering.
- **UI Layer**: Modular `PairingDrawer` component and enhanced `ReplacementModal` to support Main/Side selection.

## Tech Stack
- **Frontend**: Next.js (React), TypeScript, Tailwind CSS.
- **Backend**: Flask (Python), Supabase (PostgreSQL).
- **Testing**: Pytest (Backend), Vitest/Jest (Frontend).

## Implementation Phases

### Phase 1: Data Schema & Migration
- [ ] Update `recipes` metadata in Supabase to support `tags` and `requires_side`. <!-- id: 1.1 -->
- [ ] Update `households.config` to include `permanent_pantry`. <!-- id: 1.2 -->
- [ ] Add migration logic to handle old `recipe_id` fields in `meal_plans`. <!-- id: 1.3 -->

### Phase 2: Backend Logic (TDD)
- [ ] Implement `get_paired_suggestions` in `PairingService`. <!-- id: 2.1 -->
- [ ] Update `get_shopping_list` to handle multiple recipes per slot. <!-- id: 2.2 -->
- [ ] Implement `permanent_pantry` filter in `inventory_intelligence.py`. <!-- id: 2.3 -->

### Phase 3: UI Components
- [ ] Create `PairingDrawer` for side dish selection. <!-- id: 3.1 -->
- [ ] Update `ReplacementModal` to support multi-select and Main/Side filtering. <!-- id: 3.2 -->
- [ ] Implement "Bulk Tagging" UI in recipe index. <!-- id: 3.3 -->

### Phase 4: Integration & Verification
- [ ] Verify end-to-end "Select Main -> Choose Side -> Aggregate Shopping List". <!-- id: 4.1 -->
- [ ] Ensure "Permanent Pantry" items are correctly filtered. <!-- id: 4.2 -->

## Bite-Sized Tasks

### Phase 1: Data & Migration

#### Task 1.1: Update Recipe Metadata Default
- **Files**: Modify `supabase/migrations/20260125181800_alter_households.sql:L4` (or create new migration).
- **Step 1: Write failing test**: N/A (Schema change).
- **Step 2: Verify failure**: Observe missing `tags` and `requires_side` in new recipe objects.
- **Step 3: Implement minimal code**:
  ```sql
  -- Add suggested side support
  UPDATE recipes SET metadata = metadata || '{"requires_side": false, "tags": ["main"]}'::jsonb 
  WHERE metadata->>'tags' IS NULL;
  ```
- **Step 4: Verify pass**: Check `recipes` table in Supabase dashboard.
- **Step 5: Commit**: `git commit -m "db: update recipe metadata defaults for phase 34"`

### Phase 2: Backend Logic

#### Task 2.1: History-based Pairing Engine
- **Files**: Create `api/services/pairing_service.py`.
- **Step 1: Write failing test**:
  ```python
  def test_get_paired_suggestions():
      history = {"weeks": [{"dinners": [{"recipe_ids": ["rasam_rice", "beetroot_kai"]}]}]}
      assert "beetroot_kai" in get_paired_suggestions("rasam_rice", history)
  ```
- **Step 2: Verify failure**: `pytest api/services/pairing_service.py` (File not found).
- **Step 3: Implement minimal code**:
  ```python
  def get_paired_suggestions(main_id, history):
      pairs = {}
      for week in history.get('weeks', []):
          for dinner in week.get('dinners', []):
              ids = dinner.get('recipe_ids', [])
              if main_id in ids:
                  for side_id in ids:
                      if side_id != main_id:
                          pairs[side_id] = pairs.get(side_id, 0) + 1
      return sorted(pairs, key=pairs.get, reverse=True)
  ```
- **Step 4: Verify pass**: `pytest api/services/pairing_service.py`
- **Step 5: Commit**: `git commit -m "feat: implement history-based pairing engine"`

#### Task 2.2: Permanent Pantry Filtering
- **Files**: Modify `scripts/inventory_intelligence.py:L244`.
- **Step 1: Write failing test**: Add test case to `tests/test_grocery_logic.py` where "rice" is in permanent pantry and should be excluded.
- **Step 2: Verify failure**: `pytest tests/test_grocery_logic.py` (Rice still appears).
- **Step 3: Implement minimal code**:
  ```python
  pantry_basics = config.get('permanent_pantry', [])
  if norm in [normalize_ingredient(p) for p in pantry_basics]:
      continue
  ```
- **Step 4: Verify pass**: `pytest tests/test_grocery_logic.py`
- **Step 5: Commit**: `git commit -m "feat: filter permanent pantry items from shopping list"`

### Phase 3: UI Components

#### Task 3.1: Create Pairing Drawer
- **Files**: Create `src/components/PairingDrawer.tsx`.
- **Step 1: Write failing test**: Component should render when `requires_side` is true.
- **Step 2: Verify failure**: Component not found.
- **Step 3: Implement minimal code**: Basic Drawer UI with "Suggestions" list.
- **Step 4: Verify pass**: Manual check in browser.
- **Step 5: Commit**: `git commit -m "ui: add PairingDrawer component"`

## Technical Debt Strategy
- **Backwards Compatibility**: We will support both `recipe_id` (old) and `recipe_ids` (new) for one phase before deprecating `recipe_id`.
- **Bulk Migration**: We assume by default all recipes are `main`. Automation will tag them during the first run.

## UI Feature: Design System Check
- [x] No `system.md` found. Will create one in Phase 3.1 using the "Earthy Spice" palette defined in brainstorming.

Ready to start building? Use `/build`.
