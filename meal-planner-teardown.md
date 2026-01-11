# Teardown: Building a meal planning system that actually works
ssimhan
Dec 31, 2025
It’s 7pm on a Thursday. I’m chopping vegetables while my four-year-old melts down about bathtime. Dinner won’t be ready until 8pm, which means bedtime will derail, which means tomorrow morning will be chaos. This is the third Thursday in a row like this. UGH.

The meal plan I’d made on Sunday looked perfect. Monday’s dinner? Nailed it. Tuesday? Still good. Wednesday? Started to crack. Thursday? Complete breakdown.

SO I built a system to fix this.

## 1. The Problem I Was Trying to Solve
What I thought I needed: A better meal planning app. Something with recipes, grocery lists, and weekly calendars.

What I actually needed: A system that acknowledges Monday’s energetic Sandhya doesn’t exist on Friday evening’s exhausted parent.

Traditional meal planning apps assume constant energy. They assume if you just plan better, you can cook from scratch every evening. That assumption is wrong.

The real problem had three layers:

Energy depletion: Monday-me has bandwidth to chop vegetables for 45 minutes. Friday-me does not. Plans that ignore this fail by Thursday.

Evening protection: 6-9pm is family time. If dinner prep interferes with bedtime routines, the whole system breaks.

Decision fatigue: By Wednesday, I was spending mental energy on “what’s for dinner?” and “oh shoot I forgot about this leftover vegetable” instead of just executing a plan.

Why Existing Solutions Didn’t Work
I tried five meal planning apps. They all failed the same way:

HelloFresh/Blue Apron: Pre-portioned ingredients solved grocery shopping but not energy depletion. Still chopping vegetables at 7pm on Friday.

Paprika: Great recipe managers. Still required me to make decisions daily about what to cook when I was already exhausted.

Spreadsheets: Flexible but manual. Every week I rebuilt the plan from scratch, which defeats the purpose of planning. And not super convenient on my phone either.

The pattern: These tools assumed I needed better organization. I didn’t. I needed the system to do the (repeatable boring) thinking for me.

The Constraints I Was Working Within
Non-negotiables:

6-9pm = device-free family time (no cooking that requires active attention)

Zero chopping on Fridays (I’m running on fumes by then)

No recipe repeats within 3 weeks (my kids have their father’s foodie tastebuds)

Must integrate farmers market shopping (We live in NorCal and don’t utilize this amazing resource nearly enough)

Must work from my phone (I’m not sitting at a computer to check dinner plans)

Reality checks:

I have 234 recipes I’ve slowly collected over the years (Thanks Paprika bookmarklet). Manually matching them to constraints takes 20+ minutes per week.

Plans fail. Kids get sick. Work emergencies happen. I needed backup options built in.

Our weekends are packed and chaotic. I usually only get some basic grocery shopping in so I’m not going to be the person who preps everything on the weekends. The system had to work with my actual schedule.

## 2. The Build Process
Tools I Used
Primary stack:

Claude Code (Sonnet 4.5): Wrote 100% of the Python scripts, HTML templates, and GitHub Actions workflows

GitHub: Version control and free automation via Actions

YAML files: Recipe database (234 recipes with metadata)

VS Code: Where I worked with Claude Code

My phone: How I actually use the system daily

Cost: $20/month (just my Claude subscription). No servers, no hosting fees.

Decisions I Made and Why
Decision 1: YAML Instead of PostgreSQL/MongoDB
The choice: Plain text files in a folder vs. a real database.

Why I chose YAML:

Human-readable (I can edit recipes in any text editor)

Version control friendly (Git tracks every change)

Future-proof (files won’t break if a service shuts down)

Zero infrastructure (no server, no login, no dependencies)

The tradeoff: YAML doesn’t scale to thousands of recipes. But I have 234. For my use case, simpler is better.

What I learned: Choose tools based on your actual scale, not hypothetical future scale. I don’t need enterprise database infrastructure for personal meal planning.

Decision 2: GitHub Actions Instead of a Web App
The choice: Automate via GitHub Actions vs. building a proper app.

Why I chose Actions:

Free (generous free tier, I’m nowhere near limits)

No servers to maintain (GitHub handles infrastructure)

Mobile-accessible (I can trigger workflows from my phone via GitHub UI)

Scheduling built in (weekly plan runs Saturday at 5am automatically)

The tradeoff: Less flexible than a custom web app. But 90% of what I need is “run this script on a schedule”—Actions handles that perfectly.

What I learned: Explore infrastructure options before building. There’s often a middle ground between command-line tools and full web apps.

Decision 3: Two-Step Workflow for Farmers Market Integration
The choice: Plan before shopping vs. plan after shopping.

Why I chose plan-after:

Saturday 5am: System proposes vegetables based on seasonality

Sunday morning: My husband shops at farmers market, buy what looks good which often includes many things not in my shopping list. I also do grocery shopping at Trader Joe’s/safeway/indian stores.

Sunday afternoon: I confirm what was bought, system generates the week’s plan

The tradeoff: Adds a confirmation step. But it prevents the system from planning okra dishes when the market doesn’t have okra that week. And it encourages using more seasonal veggies instead of our usual rotation.

What I learned: Design workflows around real-world constraints, not ideal scenarios. The farmers market doesn’t stock to my meal plan. My meal plan should flex to what’s available.

Where I Got Stuck and How I Got Unstuck
Stuck #1: Recipe Classification Was a Disaster
The problem: Only 49% of my recipes were classified. 120 recipes marked “unknown” made variety impossible.

Why I was stuck: I’d used a single category field that mixed cuisine and meal type. “Indian pasta” didn’t fit anywhere cleanly. It also meant that the lunch selector python script picked the same few meal categories over and over again.

How I got unstuck:

Separated cuisine from meal_type in the schema

Added 8 new categories (noodles, handhelds, etc.)

Expanded keyword matching (if title contains “pasta” → meal_type: pasta)

Manually classified 47 edge cases

Result: 0 unknown recipes. 100% classified. System could finally generate variety.

Time cost: 3 hours of manual work. But “tag once, query forever” pays dividends.

Stuck #2: The Energy Model Took Years to Discover
The problem: The insight to build something that was energy resilient actually came during a discussion with a cousin (thanks Vidya!). We were talking about how she meal plans based on what activities her kids have on a given day (something super fast before scouts, something that is instant pot dump and go before piano class). I realized that no matter what I planned, I would never really get home until late (6:30pm) on Thursdays and Fridays with the goal of serving dinner almost immediately.

Why I was stuck: I’d built the system to solve “which recipes to pick” (constraint satisfaction). But the real problem was “when to do the prep work.”

How I got unstuck:

Noticed the pattern: Monday = high energy, Friday = survival mode

Redesigned the system around prep scheduling, not just recipe selection

Added regular time slots: Monday through Wednesday = batch prep, Thursday/Friday = reheat and assemble

Result: Front-load hard work early in the week when I have bandwidth. By Friday, everything is prepped—just reheat.

What I learned: I couldn’t see the energy depletion pattern until I lived it. In every system I had built previously, I had built a system that solved the wrong problem. Start manual, automate later.

Stuck #3: Constraint Satisfaction Is Tedious for Humans, Trivial for AI
The problem: Finding a recipe that matches 6+ constraints takes me 20 minutes of cross-referencing spreadsheets.

Example: “Find a dinner recipe that uses farmers market okra, hasn’t been made in 3 weeks, is no-chop compatible, doesn’t repeat a template already used this week, and uses a different cuisine from last night.”

Why I was stuck: I kept trying to do the matching manually before realizing AI is designed for this.

How I got unstuck:

Described my issues to Claude and had it rewrite the CLAUDE.md file in my repo. Claude.md is a detailed operating manual for Claude Code

Documented all rules, constraints, file structures, and edge cases

Told Claude: “Read this file. Follow it like a job description.”

Result: Claude handles constraint matching in 2 seconds. I keep the creative decisions (am I in the mood for soup this week?) and delegate the logic.

What I learned: Identify the tedious, complex logic in your workflow. That’s where AI excels.

## 3. What I Learned
Technical Insights About the Tools
Claude Code is shockingly good at constraint satisfaction logic:

I describe rules in plain English (“Friday dinner MUST be no_chop_compatible”)

Claude translates that into Python logic with error handling

The code quality is production-ready (proper validation, clear error messages)

GitHub Actions is underrated for personal automation:

Free tier is generous (2,000 minutes/month, I use ~40)

Scheduling is built in (cron syntax: 0 5 * * 6 = Saturdays at 5am)

Mobile-accessible (I can trigger workflows from GitHub’s mobile UI)

No server maintenance (GitHub handles infrastructure)

YAML + Git is a surprisingly powerful database for small-scale projects:

Human-readable (I can edit recipes in any text editor)

Version control is built in (every change is tracked)

No lock-in (files are portable)

Searchable via grep/ripgrep

Product Insights About What Users Actually Need
1. Design for your worst day, not your best day.

Traditional meal planning optimizes for Sunday-you (motivated, energized, planning-mode). My system optimizes for Friday-you (exhausted, running on fumes, just-get-through-tonight-mode).

Result: The system works because it acknowledges I’m exhausted by Friday, not despite it.

2. Reduce cognitive load by removing choices, not adding options.

More recipe filters didn’t help. What helped: “Here’s what you’re making Thursday. It’s already prepped. Just saute and serve.”

Decision fatigue is real. Good systems do the thinking for you.

3. Build in failure modes from the start.

The freezer backup exists because I acknowledged that plans fail. When Thursday hits and I’m too drained to even saute a veggie, I’m not staring into the fridge having a guilt spiral. I have three complete meals ready to reheat.

Good systems accommodate how you actually are, not how you wish you were.

Systems Thinking That Emerged From the Work
The evening protection constraint had downstream effects I didn’t predict:

Limiting what I could do 6-9pm reduced stress. When there’s no option to cook, there’s no guilt about not cooking.

This forced me to move prep earlier in the week, which revealed the energy depletion pattern, which led to the batch prep model, which made the whole system sustainable.

One constraint cascade:

Evening protection (6-9pm = no cooking)

→ Prep must happen earlier

→ Discovered energy depletion pattern

→ Batch prep on Monday/Tuesday

→ Friday becomes restful instead of stressful

The lesson: Constraints aren’t limitations. They’re design tools. Adding constraints often reveals better solutions.

4. What I’d Do Differently
Mistake #1: I Built Features Before Understanding Constraints
What I did: Spent multiple coding sessions adding features (recipe parsing, meal generation, anti-repetition) before realizing the real problem was energy depletion and evening protection.

What I’d do differently: Document constraints first. What are my non-negotiables? What are my failure modes? Then build around those.

The tradeoff: This feels slower upfront. But it prevents building the wrong system.

How to avoid this: Actively reflect on the problem before automating. Use spreadsheets. Use paper. Notice what’s hard, what fails, what causes stress. That’s your constraint list.

Mistake #2: I Under-Tagged Recipes Initially
What I did: Started with minimal metadata (just name and cuisine). Later realized I needed no_chop_compatible, effort_level, main_veg, avoid_contains.

Adding those fields retroactively meant re-reviewing all 234 recipes. Three hours of work.

What I’d do differently: Think through the queries I’ll want to run (“show me low-effort recipes using tomatoes that my kid doesn’t hate”) and build those fields into the schema from the start.

The tradeoff: Upfront tagging takes longer. But “tag once, query forever” beats re-tagging constantly.

How to avoid this: Write example queries before building the schema. What questions will you ask your data? That tells you what fields you need.

Mistake #3: I Documented “Why” Too Late
What I did: My PROJECT_HISTORY.md file didn’t exist until late in the project. I had to reconstruct the evolution story from Git commit messages.

What I’d do differently: Keep a running log of decisions and pivots as I go. “Why did I choose YAML over a database?” “Why did I add the energy-based prep model?”

The tradeoff: Documentation takes time during the build. But it’s invaluable later when I forget why I made certain choices (or when I write a teardown blog post).

How to avoid this: Create a PROJECT_HISTORY.md file on day one. After each coding session, ask Claude to summarize the updates you made and add to the file. Also consider adding in major choices or pivots like 2-3 sentences: “Chose X over Y because Z. Tradeoff: [what I gave up].”

## What This Cost (Time and Money)
Development time: 6 coding sessions spread over 2 days of active work

Ongoing maintenance: ~5 minutes/week (confirming vegetables, updating what I actually made and whether the kids liked it every night)

Money: $20/month (just my Claude Code subscription)

Value created: Zero “what’s for dinner?” decision paralysis. Evenings protected. Friday no longer feels like survival mode.

For Non-Coders: What This Means for You
Five years ago, building this system would have required learning Python, web development, database design, Git, deployment, and hosting. Months of tutorial-following.

Today, with Claude Code, I described what I needed, Claude wrote the code, I tested and refined.

The shift: From “learn to code” to “learn to describe, evaluate, and iterate.”

What you actually need to know:

Understand your problem deeply. Live with it manually first. I spent weeks doing manual meal planning in spreadsheets before touching any code. That’s how I discovered the energy depletion pattern.

Write clear instructions. Think of Claude as a capable junior employee. Write down what you’d tell a human doing this job. My CLAUDE.md file says “Friday dinner MUST be no_chop_compatible: true (NO EXCEPTIONS).”

Work iteratively. Each phase added value incrementally. Recipe parsing → meal generation → anti-repetition → energy-based prep. Don’t try to build everything at once.

Let AI handle the technical complexity. Constraint satisfaction is hard for humans, trivial for AI. Describe your rules clearly, Claude handles the logic.

Use version control. Git isn’t just for programmers. It’s a time machine for your project. Claude Code handles the Git commands—you just need to understand the concept of “checkpoints you can return to.”

The future of software development isn’t “everyone learns to code.” It’s “everyone learns to architect systems that serve human needs, and AI handles implementation.”

Success Metrics: How I Know It Works
Reduced evening stress: Dinners don’t interfere with bedtime routines

No decision paralysis: Zero “what’s for dinner?” moments

Farmers market integration: Vegetables actually get used instead of rotting in the fridge

Meal variety: 234 recipes, no repetition within 3 weeks

Friday feels restful: No longer survival mode

Freezer backup safety net: 3 meals ready for crisis days

Want to build your own system? Start with a real problem you face daily. Live with it manually first. Document the constraints and rules. Ask Claude Code for help. Iterate based on real use.

You don’t need to be a programmer. You need to be a problem-solver who understands systems.

Live Site: ssimhan.github.io/meal-planner

Subscribe to The Accidental Engineer
By ssimhan · Launched an hour ago
The Accidental Engineer documents what happens when a non-coder starts building anyway—project breakdowns, hard-won lessons, and proof that you don’t need to be an engineer to think like one.
