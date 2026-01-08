# Field Naming Convention

## Overview

This document standardizes field naming for meal feedback across the codebase (snacks, lunch, dinner).

## Standard Convention

### 1. Storage Layer (history.yml - daily_feedback)

Clean field names without `_feedback` suffix:

```yaml
daily_feedback:
  thu:
    # Snacks
    school_snack: "Dried mangoes"     # Actual value (name OR emoji)
    school_snack_made: true            # Boolean status
    school_snack_needs_fix: false     # Boolean status

    home_snack: "❤️"                  # Actual value (name OR emoji)
    home_snack_made: true
    home_snack_needs_fix: false

    # Lunch
    kids_lunch: "Leftovers"           # Actual value
    kids_lunch_made: true
    kids_lunch_needs_fix: false

    adult_lunch: "👍"                 # Actual value
    adult_lunch_made: true
    adult_lunch_needs_fix: false
```

**Rule**: Base field contains the actual value (either planned meal name OR user feedback/emoji)

### 2. API Requests (Frontend → Backend)

Use `*_feedback` suffix to clarify user input:

```typescript
// POST /api/log-meal
{
  school_snack_feedback: "❤️",        // User's feedback value
  school_snack_made: true,
  school_snack_needs_fix: false,

  home_snack_feedback: "Pomegranates",
  home_snack_made: true,
  home_snack_needs_fix: false,

  kids_lunch_feedback: "Leftovers",
  kids_lunch_made: true,
  kids_lunch_needs_fix: false
}
```

**Rule**: API accepts `*_feedback` fields from frontend, strips suffix before storing

### 3. API Responses (Backend → Frontend)

Map to simple display names:

```typescript
// GET /api/status
{
  today_snacks: {
    school: "Dried mangoes",          // Mapped from daily_feedback.school_snack
    school_snack_made: true,
    school_snack_needs_fix: false,

    home: "Cucumber",
    home_snack_made: true,
    home_snack_needs_fix: false
  },

  today_lunch: {
    recipe_name: "Leftovers",
    kids_lunch_made: true,
    kids_lunch_needs_fix: false,
    adult_lunch_made: true,
    adult_lunch_needs_fix: false
  }
}
```

**Rule**:
- Snacks use base names (`school`, `home`) for display
- Status flags keep full names (`*_made`, `*_needs_fix`)

### 4. TypeScript Interfaces

```typescript
export interface SnackData {
  school: string;                    // Display value
  home: string;                      // Display value
  school_snack_feedback?: string;    // Optional feedback override
  home_snack_feedback?: string;      // Optional feedback override
  school_snack_made?: boolean;
  home_snack_made?: boolean;
  school_snack_needs_fix?: boolean;
  home_snack_needs_fix?: boolean;
}

export interface LunchData {
  recipe_id?: string;
  recipe_name?: string;
  kids_lunch_feedback?: string;      // Optional feedback override
  adult_lunch_feedback?: string;     // Optional feedback override
  kids_lunch_made?: boolean;
  adult_lunch_made?: boolean;
  kids_lunch_needs_fix?: boolean;
  adult_lunch_needs_fix?: boolean;
}
```

## Field Semantics

### Base Fields (no suffix)
- **Purpose**: Store the actual display value
- **Values**: Either the planned meal name OR user's feedback/emoji
- **Examples**: `"Dried mangoes"`, `"❤️"`, `"Leftovers"`, `"👎"`

### `*_feedback` Fields
- **Purpose**: API request parameter name (clarity for user input)
- **Flow**: Frontend sends `school_snack_feedback` → Backend stores as `school_snack`
- **Note**: Not stored in history.yml with this suffix

### `*_made` Fields
- **Purpose**: Boolean flag indicating if the meal was prepared
- **Values**: `true`, `false`, or undefined
- **Usage**: Track meal completion status

### `*_needs_fix` Fields
- **Purpose**: Boolean flag indicating if the meal needs replacement
- **Values**: `true`, `false`, or undefined
- **Usage**: Flag problematic meals for replanning

## Implementation Checklist

- [x] API status.py maps `daily_feedback.school_snack` → `today_snacks.school`
- [x] API meals.py receives `*_feedback` params, stores without suffix
- [x] Frontend sends `*_feedback` in requests
- [x] Frontend displays from base fields (`today_snacks.school`, `today_snacks.home`)
- [x] TypeScript interfaces define both base and optional feedback fields
- [x] history.yml stores clean field names without `_feedback`

## Migration Notes

**No migration needed** - Current implementation already follows this convention after recent fixes. This document codifies the existing standard.
