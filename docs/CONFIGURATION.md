# Meal Planner Configuration Guide

This guide explains how to customize the meal planner for your household using `config.yml`.

---

## Quick Start

### Option 1: Interactive Setup (Recommended)

Run the setup wizard to generate your config through guided prompts:

```bash
python3 scripts/setup.py
```

The wizard will ask about:
- Your timezone
- Weekly schedule (office days, busy days, late activities)
- Dietary preferences and restrictions
- Family member profiles with individual allergies
- Lunch and snack defaults

Your config will be validated automatically and saved to `config.yml`.

### Option 2: Manual Setup

1. **Copy the example config:**
   ```bash
   cp config.example.yml config.yml
   ```

2. **Edit `config.yml`** with your family's information

3. **Validate your config:**
   ```bash
   python3 scripts/validate_yaml.py --config
   ```

---

## Configuration Sections

### 1. Timezone

Set your local timezone for accurate daily check-ins and plan generation.

```yaml
timezone: America/Los_Angeles
```

**Valid values:** Any [IANA timezone](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) (e.g., `America/New_York`, `Europe/London`, `Asia/Tokyo`)

**Impact:** Dashboard displays times in your timezone, daily check-ins happen at the correct local time.

---

### 2. Schedule

Define your weekly schedule to help the planner select appropriate recipes.

```yaml
schedule:
  office_days: [mon, wed, fri]    # Days with in-person work
  busy_days: [thu, fri]            # Days needing quick/easy meals
  late_class_days: []              # Days with late activities (extra snack)
```

**Valid days:** `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`

**Impact:**
- **office_days:** Used for lunch planning context
- **busy_days:** System selects `no_chop_compatible: true` recipes
- **late_class_days:** Adds a heavy snack (fruit + protein/fat)

---

### 3. Preferences

Global dietary preferences for your household.

```yaml
preferences:
  vegetarian: true
  avoid_ingredients:
    - eggplant
    - mushrooms
    - green_cabbage
  novelty_recipe_limit: 1
```

**Fields:**
- **vegetarian:** `true` or `false` - Filters recipe selection
- **avoid_ingredients:** List of ingredients to exclude from all recipes
- **novelty_recipe_limit:** Number of "from scratch" new recipes per week (recommended: 1)

**Impact:** Recipe selection automatically filters based on these preferences.

---

### 4. Kid Profiles

Individual profiles for each family member needing customized meal planning.

```yaml
kid_profiles:
  ChildName1:
    preferences: []
    avoid_ingredients: []

  ChildName2:
    preferences: []
    avoid_ingredients:
      - nuts
      - peanuts
```

**Fields:**
- **Key (name):** Child's name (used in lunch planning display)
- **preferences:** Foods they enjoy (future feature)
- **avoid_ingredients:** Individual allergies or dislikes (in addition to household avoid_ingredients)

**Impact:**
- Lunch planning shows individualized descriptions
- School snacks automatically exclude nuts for all kids
- Recipe selection respects individual allergies

---

### 5. Lunch Defaults

Repeatable lunch options that rotate throughout the week.

```yaml
lunch_defaults:
  kids:
    - PBJ on whole wheat
    - Egg sandwich or scrambled egg sandwich
    - Toad-in-a-hole (egg cooked in bread)
    - Ravioli with brown butter or simple tomato sauce
    - Chapati or dosa rolls with fruit
    - Veggie burrito or pizza roll
    - Quesadilla with cheese and beans

  adult:
    - Leftovers from previous night's dinner (preferred)
    - Grain bowl: prepped grain + roasted vegetables + protein
    - Salad with dinner components
```

**Format:** List of strings (simple meal descriptions)

**Impact:** System rotates through these defaults when no specific lunch recipe is planned. Kid lunches cycle by day of week (Monday = option 1, Tuesday = option 2, etc.).

**Customization tips:**
- Focus on simple, repeatable meals your kids actually eat
- Keep adult list short (leftovers should be primary)
- List items in order of preference

---

### 6. Snack Defaults

Daily snack rotation with fallback options.

```yaml
snack_defaults:
  by_day:
    mon: Apple slices with peanut butter
    tue: Cheese and crackers
    wed: Cucumber rounds with cream cheese
    thu: Grapes
    fri: Crackers with hummus

  fallback:
    school: Fruit or Cheese sticks  # Nut-free for school
    home: Cucumber or Crackers
```

**Fields:**
- **by_day:** Specific snack for each day of the week
- **fallback.school:** Default school snack (should be nut-free)
- **fallback.home:** Default home snack

**Impact:** Dashboard displays daily snack. System uses `by_day` mapping first, then falls back to `fallback` values if day not specified.

**Customization tips:**
- Keep school snacks nut-free and shelf-stable
- Coordinate snacks with grocery list (don't require special purchases)
- Consider reusing dinner ingredients

---

### 7. Workflows

Automation settings (advanced).

```yaml
workflows:
  daily_check_in_time: "0 4 * * *"  # Cron format: 4am UTC = 8pm PST
```

**Format:** Standard cron syntax (`minute hour day month weekday`)

**Impact:** Determines when daily check-in reminders are sent (if automation is configured).

**Common values:**
- `"0 20 * * *"` = 8:00 PM daily
- `"0 4 * * *"` = 4:00 AM UTC (adjust for your timezone offset)

---

## Validation

The system validates your config when you run commands. To manually check:

```bash
# Validate config.yml
python3 scripts/validate_yaml.py --config

# Validate a different config file
python3 scripts/validate_yaml.py --config path/to/custom-config.yml
```

**Common validation errors:**

| Error | Solution |
|-------|----------|
| Missing required key: timezone | Add `timezone: America/Los_Angeles` |
| Invalid day 'thursday' in schedule.busy_days | Use 3-letter abbreviations: `thu` |
| preferences.vegetarian must be true or false | Use lowercase: `true` or `false` (no quotes) |
| kid_profiles must be a dictionary | Ensure proper indentation and structure |

---

## Examples

### Example 1: Single Parent, Two Kids, Nut Allergy

```yaml
timezone: America/New_York

schedule:
  office_days: [tue, wed, thu]
  busy_days: [mon, fri]
  late_class_days: [wed]

preferences:
  vegetarian: false
  avoid_ingredients:
    - cilantro
    - olives
  novelty_recipe_limit: 1

kid_profiles:
  Emma:
    preferences: []
    avoid_ingredients:
      - nuts
      - peanuts
  Liam:
    preferences: []
    avoid_ingredients: []

lunch_defaults:
  kids:
    - Turkey sandwich on whole wheat
    - Mac and cheese
    - Chicken nuggets with veggies
  adult:
    - Leftovers from previous night's dinner (preferred)

snack_defaults:
  by_day:
    mon: Apple slices with sunflower seed butter
    tue: String cheese
    wed: Pretzels
    thu: Grapes and cheese
    fri: Crackers and hummus
  fallback:
    school: Fruit or Pretzels
    home: Crackers
```

---

### Example 2: Vegan Family, Three Kids, No Gluten

```yaml
timezone: Europe/London

schedule:
  office_days: [mon, tue, wed, thu]
  busy_days: [fri]
  late_class_days: [tue, thu]

preferences:
  vegetarian: true
  avoid_ingredients:
    - dairy
    - eggs
    - gluten
    - wheat
  novelty_recipe_limit: 2

kid_profiles:
  Zara:
    preferences: []
    avoid_ingredients: []
  Amir:
    preferences: []
    avoid_ingredients: []
  Leila:
    preferences: []
    avoid_ingredients: []

lunch_defaults:
  kids:
    - Rice cakes with almond butter
    - Leftover quinoa bowl
    - Rice noodles with vegetables
    - Gluten-free wraps with hummus
  adult:
    - Leftovers from previous night's dinner (preferred)
    - Buddha bowl with tahini dressing

snack_defaults:
  by_day:
    mon: Fruit salad
    tue: Rice crackers with hummus
    wed: Vegetable sticks with guacamole
    thu: Fresh berries
    fri: Popcorn
  fallback:
    school: Fresh fruit
    home: Rice crackers
```

---

## Troubleshooting

### My changes aren't appearing in the dashboard

1. Verify config.yml is in the root directory
2. Run validation: `python3 scripts/validate_yaml.py --config`
3. Check for YAML syntax errors (indentation, colons, hyphens)
4. Restart the development server if running locally
5. Clear browser cache or hard-reload the dashboard

### How do I add a new kid?

Add a new entry under `kid_profiles`:

```yaml
kid_profiles:
  ExistingKid:
    preferences: []
    avoid_ingredients: []

  NewKid:  # Add this
    preferences: []
    avoid_ingredients: []
```

### Can I have different schedules per week?

No - `config.yml` defines your *default* weekly schedule. For one-off changes (e.g., holiday week), edit the specific week's input file in `inputs/YYYY-MM-DD.yml`.

### How do I remove vegetarian restriction?

Change `vegetarian: true` to `vegetarian: false` in preferences.

---

## Best Practices

1. **Start with config.example.yml** - Copy it instead of creating from scratch
2. **Validate after every edit** - Catch syntax errors early
3. **Keep lunch defaults simple** - Focus on meals your kids actually eat
4. **Test with a single week** - Make changes, generate one week, verify before committing
5. **Use version control** - Commit your config.yml so you can revert if needed
6. **Document customizations** - Add comments explaining family-specific choices

---

## Migration from Hardcoded Values

If you're upgrading from an older version, these fields are now configurable:

| Old Hardcoded Value | New Config Location |
|---------------------|---------------------|
| Pacific timezone | `timezone` |
| Thu/Fri busy days | `schedule.busy_days` |
| Vegetarian preference | `preferences.vegetarian` |
| Eggplant/mushroom avoidance | `preferences.avoid_ingredients` |
| PBJ/egg sandwich defaults | `lunch_defaults.kids` |
| Apple + peanut butter snack | `snack_defaults.by_day.mon` |

---

## Related Documentation

- [README.md](../README.md) - System overview and quick start
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute code
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture details
- [config.example.yml](../config.example.yml) - Annotated example config
