---
description: Evaluate a new repository for skills or commands to incorporate into the Simhan quickstart repo.
---

# /add-skills

Use this workflow to scout and integrate high-quality skills, patterns, or commands from external repositories into this SDK.

## Core Principles
- **Selective Quality**: Prioritize skills that align with the SDK's "Premium Aesthetics" and "Engineering Rigor" standards.
- **Unified Integration**: Avoid direct copying; refactor external skills to follow the SDK's naming conventions and structure.
- **Workflow-First**: Favor patterns that can be "tapped" by existing workflows over standalone commands.

## The Process

1. **Discovery & Crawl**
   - Provide a repository URL (GitHub, etc.).
   - Use `read_url_content` or `run_command` (if cloned) to explore the repository structure.
   - Identify files in `skills/`, `commands/`, `.agent/workflows/`, or `README.md` that contain reusable patterns.

2. **Analysis & Recommendation**
   - Evaluate each potential skill against:
     - **Utility**: Does it solve a frequent problem for Sandhya or her audience?
     - **Compatibility**: Does it fit the TDD and Clean Architecture standards?
     - **Novelty**: Does it cover a gap not currently served by existing skills?
   - Create a **Comparison Table** showing how the new skill relates to existing ones.

3. **Proposal Presentation**
   - Present a structured recommendation to Sandhya including:
     - **Name & Purpose**: What it is and why it's valuable.
     - **Integration Strategy**: How to merge it (e.g., "Add to `debugging`," "New `ui-component` skill").
     - **Changes Required**: Which files to create/modify.

4. **Persistence**
   - Once Sandhya approves, create an **Implementation Plan** and follow the standard development cycle (RED-GREEN-REFACTOR).

5. **Documentation & Citation**
   - **Required**: Add the integrated skill to the **Third-Party Skills** table in `README.md`.
   - Include: skill name, source repo link, license, and brief description.
   - Add an attribution comment in the skill's `SKILL.md` header with original source, author, and license.

   Example README entry:
   ```markdown
   | `skill-name` | [author/repo](https://github.com/author/repo) | MIT | Brief description |
   ```

   Example SKILL.md attribution:
   ```html
   <!--
     Original source: https://github.com/author/repo
     Author: author
     License: MIT
     Integrated into claude-code-quickstart SDK
   -->
   ```

**Internal Note**: Use the `writing-skills` skill when integrating the final results.
