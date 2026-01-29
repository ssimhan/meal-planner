---
description: Connect Claude to external apps (Slack, GitHub, Gmail, etc.) using Composio.
---

# /connect

Use this workflow to bridge the gap between your local engineering environment and external communication or project management systems.

## Core Principles
- **Transparency**: Always inform the user before taking action in an external app.
- **Precision**: Search for specific records (issues, channels) instead of guessing IDs.
- **Idempotency**: Ensure that retrying a connection doesn't create duplicate notifications or data.

## The Process

1. **Discovery**
   - Identify the external system involved (e.g., "Post to Slack," "Update Notion").
   - Check authorization status using the `integrations` skill.

2. **Configuration**
   - Select the correct action from the Composio catalog.
   - Map local variables (e.g., commit hash, test results) to external fields.

3. **Execution & Verification**
   - Run the connection tool.
   - Confirm the success of the external operation (e.g., by reading the created record).
   - Inform the user: "Update successful in [App Name]."

**Internal Note**: Refer to `skills/integrations/SKILL.md` for detailed technical patterns.
