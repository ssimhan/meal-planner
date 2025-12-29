# Option 1: Markdown-based “Pseudo Slash Commands” for Claude Code

This is the simplest, most reliable way to create slash-command–like behavior in Claude Code using files in your repo. It works by turning commands into **prompt files** that Claude consistently follows.

---

## Why this works

Claude Code:
- Reads instructions from files very reliably
- Treats file-based prompts as higher-signal than long chat messages
- Is excellent at following structured, repeatable instructions

Think of this as **prompt macros backed by versioned files**.

---

## Step 1: Create a prompts folder

In your repo, create the following structure:

```
/prompts
  /commands
    implement.md
    review.md
    explain.md
    refactor.md
```

Each file represents one slash-style command.

---

## Step 2: Define one command per file

Example: `prompts/commands/implement.md`

```md
# /implement

You are acting as a senior software engineer.

Goal:
- Implement the requested feature or change.
- Modify existing code where possible.
- Follow existing patterns and style.
- Do NOT over-engineer.

Rules:
- Explain assumptions briefly.
- Output code changes clearly.
- If something is unclear, ask clarifying questions before coding.

Input:
<<USER_REQUEST>>
```

Key design principles:
- Clear role definition
- Explicit goals
- Short, enforceable rules
- A clear placeholder for user input

---

## Step 3: Invoke the command in Claude Code

In Claude Code chat, type:

```
/implement

Add RSS ingestion for Substack posts and save them as Markdown files.
```

Claude will:
1. Read the `/implement` prompt file
2. Treat your message as `<<USER_REQUEST>>`
3. Execute the task using the rules defined in the file

This feels and behaves like a real slash command.

---

## Tips for reliability

- Keep each command focused on *one* job
- Avoid long philosophical instructions
- Prefer bullet points over paragraphs
- Put constraints in the file, not the chat
- Version-control these files like code

---

## When to use this pattern

Use Option 1 when you want:
- Maximum predictability
- Minimal tooling
- Easy sharing across repos
- A clean mental model

This is the best foundation before adding routers, scripts, or automation.

