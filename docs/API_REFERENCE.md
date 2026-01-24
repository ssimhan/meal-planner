# API Reference

Base URL: `/api`
 
 ## Error Handling
 All API endpoints return structured error responses in the following format:
 
 ```json
 {
   "status": "error",
   "code": "ERROR_CODE_STRING",
   "message": "Human readable error message",
   "details": "Optional stack trace or additional context"
 }
 ```
 
 **Common Error Codes:**
 - `MISSING_PARAMETERS`: Required fields are missing from the payload.
 - `PLAN_NOT_FOUND`: The requested meal plan (week/day) does not exist in the database.
 - `INTERNAL_SERVER_ERROR`: An unhandled exception occurred on the server (check `details` for stack trace).


## Status

### `GET /status`
Returns the current application state, including the active week, today's meal plan, and inventory summary.

**Response:**
```json
{
  "status": "success",
  "data": {
    "week": "2026-01-05",
    "day": "mon",
    "today": { ... },
    "inventory": { ... }
  }
}
```

### `GET /history`
Returns the full history of past meal plans.

### `GET /analytics`
Returns computed trends and statistics based on history.

## Meals & Planning

### `POST /generate-plan`
Triggers the Python logic to generate a new HTML meal plan for the current active week.

**Response:**
```json
{
  "status": "success",
  "plan_url": "/plans/2026-01-05-weekly-plan.html"
}
```

### `POST /create-week`
Initializes a new week input file.

**Payload:**
```json
{
  "week_of": "2026-01-12"
}
```

### `POST /log-meal`
Logs the execution of a meal section (Dinner, Snack, Lunch). Updates history and inventory.

**Payload:**
```json
{
  "week": "2026-01-05",
  "day": "mon",
  "meal_type": "dinner",
  "made": true,
  "feedback": { ... } // Optional
}
```

### `POST /swap-meals`
Swaps two planned meals within the active week.

**Payload:**
```json
{
  "week": "2026-01-05",
  "day1": "mon",
  "day2": "wed"
}
```

### `POST /confirm-veg`
Updates the confirmed vegetables list after shopping.

**Payload:**
```json
{
  "confirmed_veg": ["spinach", "carrots"]
}
```

### `POST /replan`
Triggers the smart replanning logic to shift missed meals to future days.

## Inventory

### `GET /inventory`
Returns the current inventory state (fridge, freezer, pantry).

### `POST /inventory/add`
Adds a single item to inventory.

### `POST /inventory/update`
Updates an existing inventory item (e.g., quantity).

### `POST /inventory/delete`
Removes an item from inventory.

### `POST /inventory/bulk-add`
Adds multiple items at once (used by the Brain Dump feature).

## Recipes

### `GET /recipes`
Returns the recipe index.

### `GET /recipes/<recipe_id>`
Returns the full details (Markdown content) of a specific recipe.

### `POST /recipes/import`
Imports a new recipe from a URL.

**Payload:**
```json
{
  "url": "https://example.com/recipe"
}
```
