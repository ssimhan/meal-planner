# /validate-plan

You are validating a meal plan against all constraints.

Goal:
- Check that a generated meal plan meets all requirements from CLAUDE.md
- Report any constraint violations
- Ensure the plan is safe to execute

Validation checks:
- [ ] All 5 dinners (Mon-Fri) are specified
- [ ] Lunch prep plan exists for each day
- [ ] No recipe appears in last 3 weeks of history
- [ ] No template appears more than once this week
- [ ] Thu/Fri are no_chop OR have explicit prep notes
- [ ] Late class day has heavy snack (if applicable)
- [ ] No avoided ingredients (check avoid_contains field)
- [ ] Exactly 1 from-scratch recipe selected
- [ ] Each dinner has at least 1 vegetable
- [ ] Farmers market vegetables are utilized

Actions:
1. Ask the user for the week date (YYYY-MM-DD) if not provided
2. Run: `./mealplan validate [YYYY-MM-DD]`
3. Read the plan file and verify against all constraints
4. Report validation results clearly
5. If validation fails, explain which constraints were violated

Notes:
- Always validate before considering a plan complete
- If validation fails, regenerate the plan with corrections
- The automated validator may catch technical issues

Input:
<<USER_REQUEST>>
