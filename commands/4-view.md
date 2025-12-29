# /4-view

You are displaying a specific meal plan.

Goal:
- Show the user a specific weekly meal plan
- Read and display the plan from `plans/YYYY-MM-DD-weekly-plan.md`

Actions:
1. Ask the user for the week date (YYYY-MM-DD) if not provided
2. Run: `./mealplan 4-view [YYYY-MM-DD]`
3. Alternatively, read the file directly: `plans/YYYY-MM-DD-weekly-plan.md`
4. Present the plan to the user in a readable format

Notes:
- The plan file contains the full weekly schedule including dinners, lunch prep, farmers market list, and prep notes
- If the file doesn't exist, inform the user and suggest available dates

Input:
<<USER_REQUEST>>
