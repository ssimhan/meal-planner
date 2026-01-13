# Hardcoded Personal Data Audit

**Date:** 2026-01-09
**Phase:** 13.4 Productization Architecture
**Goal:** Identify all hardcoded personal data that must be moved to config.yml for white-labeling

---

## Summary

**Total Issues Found:** 7 locations across 5 files
**Priority Breakdown:**
- 🔴 Critical: 2 (blocks white-labeling entirely)
- 🟡 High: 3 (prevents customization of core features)
- 🟢 Medium: 2 (cosmetic defaults, minimal impact)

---

## Critical Priority 🔴

### 1. Complete Config Fallback Object
**File:** `scripts/workflow/actions.py`
**Line:** 27
**Impact:** CRITICAL - Entire config fallback uses hardcoded values

**Current Code:**
```python
config = {
    'timezone': 'America/Los_Angeles',
    'schedule': {
        'office_days': ['mon', 'wed', 'fri'],
        'busy_days': ['thu', 'fri']
    },
    'preferences': {
        'vegetarian': True,
        'avoid_ingredients': ['eggplant', 'mushrooms', 'green_cabbage'],
        'novelty_recipe_limit': 1
    }
}
```

**Problem:** When config.yml is missing or fails to load, system falls back to hardcoded personal preferences instead of failing gracefully.

**Solution:** Remove fallback entirely OR read from config.example.yml with clear error message.

**Estimated Effort:** 30 minutes

---

### 2. Default Preferences in mealplan.py
**File:** `scripts/mealplan.py`
**Lines:** 255-257
**Impact:** CRITICAL - Hardcoded dietary preferences override user config

**Current Code:**
```python
'preferences': {
    'vegetarian': True,
    'avoid_ingredients': ['eggplant', 'mushrooms', 'green_cabbage'],
    'novelty_recipe_limit': 1,
}
```

**Problem:** Similar to #1, creates a second source of truth for preferences.

**Solution:** Always read from config.yml; fail if missing.

**Estimated Effort:** 20 minutes

---

## High Priority 🟡

### 3. Hardcoded Timezone
**File:** `api/routes/status.py`
**Line:** 46
**Impact:** HIGH - Dashboard shows wrong time for non-PST users

**Current Code:**
```python
pacific_tz = pytz.timezone('America/Los_Angeles')
```

**Problem:** All users see Pacific time regardless of config.yml timezone setting.

**Solution:** Read timezone from config.yml using helper function.

**Estimated Effort:** 30 minutes

---

### 4. Lunch Defaults in lunch_selector.py
**File:** `scripts/lunch_selector.py`
**Lines:** 39-54
**Impact:** HIGH - Lunch defaults are not customizable

**Current Code:**
```python
DEFAULTS = {
    'kids': [
        'PBJ on whole wheat',
        'Egg sandwich or scrambled egg sandwich',
        'Toad-in-a-hole (egg cooked in bread)',
        'Ravioli with brown butter or simple tomato sauce',
        'Chapati or dosa rolls with fruit',
        'Veggie burrito or pizza roll',
        'Quesadilla with cheese and beans'
    ],
    'adult': [
        'Leftovers from previous night\'s dinner (preferred)',
        'Grain bowl: prepped grain + roasted vegetables + protein',
        'Salad with dinner components'
    ]
}
```

**Problem:** Users cannot customize default lunch options for their family's preferences.

**Solution:** Read from config.yml `lunch_defaults` section (already added in Chunk 1).

**Estimated Effort:** 45 minutes

---

### 5. Snack Defaults in status.py
**File:** `api/routes/status.py`
**Lines:** 86-89, 92-98 (2 locations)
**Impact:** HIGH - Snack defaults not customizable

**Current Code (Location 1):**
```python
today_snacks = {
    "school": "Fruit or Cheese sticks",
    "home": "Cucumber or Crackers"
}
```

**Current Code (Location 2):**
```python
DEFAULT_SNACKS = {
    'mon': 'Apple slices with peanut butter',
    'tue': 'Cheese and crackers',
    'wed': 'Cucumber rounds with cream cheese',
    'thu': 'Grapes',
    'fri': 'Crackers with hummus'
}
```

**Problem:** Snack rotation and fallbacks are hardcoded, cannot accommodate dietary restrictions or preferences.

**Solution:** Read from config.yml `snack_defaults` section (already added in Chunk 1).

**Estimated Effort:** 45 minutes

---

## Medium Priority 🟢

### 6. Lunch Field Update Defaults
**File:** `scripts/update_lunch_fields.py`
**Lines:** 57-63
**Impact:** MEDIUM - Affects migration script only, not core functionality

**Current Code:**
```python
LUNCH_DEFAULTS = {
    'pbj': 'PBJ on whole wheat',
    'egg_sandwich': 'Egg sandwich',
    'ravioli': 'Ravioli with butter',
    'chapati_roll': 'Chapati roll with fruit',
    'veggie_burrito': 'Veggie burrito'
}
```

**Problem:** One-time migration script with hardcoded mappings.

**Solution:** Read from config.yml or deprecate if migration is complete.

**Estimated Effort:** 15 minutes

---

### 7. Schedule Fallbacks in html_generator.py
**File:** `scripts/workflow/html_generator.py`
**Lines:** 210-211
**Impact:** MEDIUM - Fallback defaults only, config takes precedence

**Current Code:**
```python
late_class_days = inputs.get('schedule', {}).get('late_class_days', ['thu', 'fri'])
busy_days = set(inputs.get('schedule', {}).get('busy_days', ['thu', 'fri']))
```

**Problem:** Fallback defaults assume Thu/Fri are busy days, may not apply to all users.

**Solution:** Read from config.yml as fallback instead of hardcoded list.

**Estimated Effort:** 20 minutes

---

## Migration Checklist

**Phase 1: Critical Fixes (1 hour)**
- [ ] Remove hardcoded config fallback in `workflow/actions.py:27`
- [ ] Remove hardcoded preferences in `mealplan.py:255-257`

**Phase 2: Core Features (2.5 hours)**
- [ ] Migrate timezone to config-driven in `api/routes/status.py:46`
- [ ] Migrate lunch defaults in `lunch_selector.py:39-54`
- [ ] Migrate snack defaults in `status.py:86-89, 92-98`

**Phase 3: Low Impact (35 minutes)**
- [ ] Fix or deprecate `update_lunch_fields.py:57-63`
- [ ] Update schedule fallbacks in `html_generator.py:210-211`

**Total Estimated Effort:** ~4 hours

---

## Additional Notes

### Files Already Config-Driven ✅
- `config.yml` - Kid profiles with individual allergies
- Recipe selection logic - Reads kid profiles dynamically
- Weekly schedule - Properly reads from config.yml in most places

### Potential Additional Hardcoded Values (Not Audited)
These areas may contain additional hardcoded values but were not in the initial scan:
- Frontend components (`src/app/`)
- HTML template generation (`templates/`)
- GitHub Actions workflows (`.github/workflows/`)

**Recommendation:** After Phase 3, run a comprehensive text search for "Akira", "Anya", "eggplant", "mushroom" to catch any remaining instances.

---

## Success Criteria

Phase 13.4 is complete when:
1. ✅ All 7 locations read from config.yml
2. ✅ No hardcoded personal data in Python scripts
3. ✅ `config.example.yml` validates and works as a template
4. ✅ System works with different kid names, timezones, and preferences
5. ✅ New user can run `setup.py` to generate custom config
