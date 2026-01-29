---
name: observability
description: Use when debugging complex agentic workflows, long-running processes, or multi-step tool executions to ensure transparency and traceability.
---

# Observability & Agentic Traceability

## Overview
As agentic workflows grow in complexity, "black box" execution becomes a significant risk. This skill ensures every step an agent takes—from tool calls to internal logic—is traceble, logged, and verifiable.

## The Traceability Standard

**MANDATORY**: For any workflow involving subagents or more than 5 sequential tool calls, you must enable structured tracing.

### Core Tracing Techniques
1. **LangSmith Integration**: When available, push execution traces to LangSmith for visual debugging and evaluation.
2. **Step-by-Step Logging**: Use `PROJECT_HISTORY.md` or session-specific logs to document intermediate state.
3. **Tool Call Metadata**: Label tool calls with their intent (e.g., "Step 3: Validating schema before migration").

## Debugging with Traces

When a complex workflow fails:
1. **Identify the Point of Divergence**: Compare the actual trace against the implementation plan.
2. **Inspect the "Thought" Context**: Check the prompt and context provided to the agent at the moment of failure.
3. **Validate Inputs/Outputs**: Ensure the data passing between tools wasn't corrupted or misinterpreted.

## Integration with Workflows

| Workflow | Observability Action |
| :--- | :--- |
| **`/implement`** | Log start/end of each task with a unique Trace ID. |
| **`/code-review`** | Review the *process* logs, not just the code diffs. |
| **`/closeout`** | Summarize the execution trace in the session notes. |

## Common Observability Failures
- **Silenced Errors**: Catching an error but not logging the stack trace.
- **Ambiguous States**: Moving from "Phase A" to "Phase B" without a clear state snapshot.
- **Lost Context**: Subagents losing critical parent state due to poor context passing.

## Verification Checklist
- [ ] Execution traces are enabled/structured.
- [ ] Intermediate states are logged for multi-step tasks.
- [ ] Critical failures include full stack/context logs.
- [ ] Subagent handoffs are clearly documented.
