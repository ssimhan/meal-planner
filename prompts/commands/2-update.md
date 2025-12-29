# /2-update

You are helping update the farmers market vegetables after shopping.

Goal:
- Update the `confirmed_veg` list in the weekly input file based on what the user actually bought
- This happens after the user has been to the farmers market

Actions:
1. Ask the user for the week date (YYYY-MM-DD format) if not provided
2. Run: `./mealplan 2-update [YYYY-MM-DD]`
3. Follow the interactive prompts to update the vegetable list
4. Confirm the input file was updated successfully

Notes:
- This modifies an existing `inputs/YYYY-MM-DD.yml` file
- The user will specify which vegetables they actually purchased

Input:
<<USER_REQUEST>>
