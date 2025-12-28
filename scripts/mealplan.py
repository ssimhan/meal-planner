#!/usr/bin/env python3
"""
Meal Planner CLI - Entry point for meal planning workflows

Usage:
    python scripts/mealplan.py intake    # Create weekly input file (Phase 2)
    python scripts/mealplan.py plan      # Generate meal plan (Phase 3)
"""

import sys


def main():
    """Main CLI entry point."""
    if len(sys.argv) < 2:
        print("Meal Planner CLI")
        print("\nUsage:")
        print("  python scripts/mealplan.py [command]")
        print("\nCommands:")
        print("  intake    Create weekly input file with schedule and preferences")
        print("  plan      Generate weekly meal plan from input file")
        print("\nCurrent Status:")
        print("  Phase 0-1: ✓ Complete (scaffolding + recipe parsing)")
        print("  Phase 2:   ⏳ Not yet implemented (intake command)")
        print("  Phase 3:   ⏳ Not yet implemented (plan command)")
        sys.exit(1)

    command = sys.argv[1]

    if command == "intake":
        print("Phase 2: intake command not yet implemented")
        print("\nThis command will:")
        print("  1. Prompt for week start date")
        print("  2. Collect office/busy/late-class days")
        print("  3. Generate farmers market vegetable proposal")
        print("  4. Create inputs/YYYY-MM-DD.yml file")
        sys.exit(0)

    elif command == "plan":
        print("Phase 3: plan command not yet implemented")
        print("\nThis command will:")
        print("  1. Read inputs/YYYY-MM-DD.yml")
        print("  2. Load recipes/index.yml and data/history.yml")
        print("  3. Select dinners based on constraints")
        print("  4. Generate plans/YYYY-MM-DD-weekly-plan.md")
        print("  5. Update data/history.yml")
        sys.exit(0)

    else:
        print(f"Unknown command: {command}")
        print("\nRun 'python scripts/mealplan.py' for usage information")
        sys.exit(1)


if __name__ == "__main__":
    main()
