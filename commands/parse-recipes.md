# /parse-recipes

You are parsing HTML recipe files into the recipe index.

Goal:
- Parse all HTML recipe files from `recipes/html/` directory
- Generate or update `recipes/index.yml` with structured recipe data
- This is typically a one-time setup task

Actions:
1. Run: `./mealplan parse`
2. The script will process all .html files in recipes/html/
3. Confirm the index.yml was updated successfully
4. Report any parsing errors or warnings

Notes:
- This is automated - you don't need to manually parse recipes
- The index.yml contains all recipe metadata: templates, effort levels, vegetables, appliances, etc.
- Only run this when new recipes are added or existing recipes are modified

Input:
<<USER_REQUEST>>
