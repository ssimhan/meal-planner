# Architectural Review

**Date:** 2026-01-01
**Reviewer:** Senior Architect (AI Agent)
**Scope:** Entire Meal Planner System

## Executive Summary

The Meal Planner is a robust, single-user system designed with a "GitOps" philosophy. By leveraging GitHub Actions for orchestration and YAML files for storage, it achieves high automation with minimal operational overhead (zero server cost).

The architecture is **highly effective** for its intended purpose (personal use) but has specific limitations regarding scalability and multi-user concurrency.

## 1. System Architecture Analysis

### Strengths
*   **Zero-Ops / GitOps Model:** Using the repository as the database and GitHub Actions as the compute layer is brilliant for this use case. It ensures version history, backup, and free compute execution.
*   **Separation of Concerns:**
    *   `scripts/` handle logic.
    *   `data/` handles persistent state.
    *   `inputs/` handles user intent.
    *   `plans/` handles presentation (HTML).
*   **Resilient State Management:** The `workflow.py` script's state detection logic ("intake_complete", "plan_complete") allows the process to be interrupted and resumed without data loss.
*   **Human-in-the-Loop Design:** The workflow correctly identifies points where AI cannot decide (farmers market purchases, kids' feedback) and creates low-friction interfaces (GitHub Issues, PRs) for human input.

### Weaknesses & Risks
*   **Concurrency / Race Conditions:**
    *   *Risk:* If a user pushes a change while a GitHub Action is running (e.g., logging a meal), the Action's `git push` will fail.
    *   *Severity:* Medium. (Recoverable, but annoying).
*   **Data integrity:**
    *   *Risk:* `history.yml` is the single point of failure. If it becomes corrupted (invalid YAML), the entire system halts.
    *   *Severity:* High.
*   **Input Fragility:**
    *   *Risk:* The parsing logic (`parse_daily_log.py`) relies on specific Markdown structures in issue comments. If a user manually edits the comment and breaks the format, logging fails silently or incorrectly.
    *   *Severity:* Medium.
*   **Hardcoded Configuration:**
    *   *Risk:* Schedules (cron jobs) and timezone preferences are buried in workflow files or python scripts. Changing "8pm check-in" requires code changes.
    *   *Severity:* Low (for a technical user).

## 2. Code Quality Review

### `scripts/workflow.py`
*   **Status:** Good monolithic script.
*   **Observation:** It mixes UI logic (CLI printing), domain logic (farmers market generation), and IO.
*   **Suggestion:** As logic grows, split the "domain logic" (calculating the vegetable list) from the "interface logic" (CLI prompts).

### `scripts/validate_plan.py`
*   **Status:** Excellent.
*   **Observation:** The regex-based validation is robust for the current template.
*   **Suggestion:** Keep this strict. It is the primary defense against "AI hallucinations" in plan generation.

### `scripts/log_execution.py`
*   **Status:** Functional but brittle.
*   **Observation:** String matching for vegetable removal (e.g., matching "carrot" to "Carrots") can be error-prone.
*   **Suggestion:** Implement fuzzy matching or canonicalization of ingredient names to improve inventory accuracy.

## 3. Recommendations

### Immediate (Low Effort, High Value)
1.  **Add `workflow_dispatch` to all Actions:** Allow manual triggering of every workflow for easier debugging.
2.  **Implement DB Backup:** Add a step in the daily workflow to copy `history.yml` to `history.backup.yml` before modification to prevent total data loss on corruption.
3.  **Strict YAML Validation:** Add a pre-commit hook or CI step that just validates `data/*.yml` syntax to prevent committing broken data.

### Strategic (Refactoring)
1.  **Decouple "Presentation" from "Data":** Currently, `history.yml` stores distinct "weeks". As data grows (years of meals), searching it (`analyze_trends.py`) will get slower.
    *   *Proposal:* Archive past years into `data/archive/history_2025.yml`.
2.  **Configuration File:** Move hardcoded values (timezones, cron schedules, busy day defaults) into a global `config.yml`.
3.  **Fuzzy Ingredient Matching:** Create a simple "Ingredient Dictionary" (synonyms list) so "Cilantro" and "Coriander" are treated as the same item.

## 4. Conclusion

The system is architecturally sound for its scale. It avoids over-engineering (no SQL database, no backend server) while providing a high-utility service. The next phase of improvements should focus on **robustness** (data backups, input validation) rather than adding complex new features.
