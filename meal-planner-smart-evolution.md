# From "Database of Files" to "Smart Assistant": The Evolution of a Meal Planner
ssimhan
Jan 25, 2026

Two weeks ago, I wrote about migrating my meal planner to Vercel. I was proud of my "serverless functions + GitHub as a database" architecture. It was free, version-controlled, and clever. It also hit a wall exactly three days later.

This is the story of what happened next. How I broke the "GitHub as Database" model, migrated to Supabase, rebuilt the entire UI, and finally turned a tool that *records* plans into an assistant that *plans*.

My Vercel migration solved the interactivity problem—I could finally log meals from my phone. But as I started building features I needed (like suggesting recipes based on what was in my fridge) the architecture crumbled. You simply can't query a file system efficiently. To answer "What can I cook with the spinach in my fridge?", I had to fetch 227 recipe files from the GitHub API, parse every single one in Python memory, and loop through them to check for "spinach".

It was slow. Worse, it was fragile. If I logged a snack with my laptop but forgot to push it to GitHub, and then went to my phone and updated the inventory, I would overwrite my own commit. "Last write wins" is a terrible strategy for a family database. I realized I had optimized for "clever engineering"—look! no database!—instead of the actual user need: speed and intelligence.

## Admitting Defeat and Moving to Supabase

The solution was obvious, but I resisted it: I needed a real database.

Honestly, databases scared me. I'm a self-taught accidental engineer, not a trained one. Markdown files felt safe—I could see them, open them, understand them. A remote PostgreSQL database felt like a black box where I could accidentally delete everything with one wrong command.

But then I realized I had already taught myself the terminal. I had learned Git. I had figured out Vercel. Database logic isn't magic; it's just another set of rules. If I could learn how to set up an MCP server with the help of ChatGPT, I could learn how to set up a database with the help of Claude Code. 

So I took the plunge and migrated my detailed YAML history and inventory into Supabase. It was a pivot from "plain text files are forever" to "relational data enables intelligence."

The tradeoff was real. I lost the ability to just edit a text file to fix a typo. I had to build UI for *everything*. If I wanted to rename a recipe, I needed an "Edit Recipe" modal. But once I embraced the database, the "hard" problems like concurrency and querying solved themselves. Postgres handles multiple users writing at once without breaking a sweat. I can ask complex questions about my ingredients and get answers in 4 seconds, not 4 minutes.

Most importantly, I learned that file systems are for documents, but databases are for relationships. My meal planner is a web of relationships—Recipe to Ingredients to Inventory—and trying to force that into YAML files was fighting gravity.

## The "Smart" Revolution

Once the data was in a real database, magic became possible. I built a **"Waste Not" Engine**.

Now, when I start planning a week, the system looks at my inventory and becomes an opinionated assistant. It actively tries to clear my fridge. It sees the leftover heavy cream and mushrooms and suggests 'Mushroom Pasta' for Monday. It notices the three frozen backup meals using Dal and asks if I want to skip cooking Tuesday.

The new "Use Up Leftovers" feature has been a game changer. If we have three servings of Lasagna from Monday, the system auto-suggests "Leftover Lasagna" for Tuesday lunch. It’s saved me so much food waste because I don't forget the tupperware in the back of the fridge. It’s not just an empty calendar anymore; it's a tool that thinks with me.

## The "Vibes" Overhaul

My previous UI was functional—gray boxes and standard buttons that looked like a dashboard I'd use at work. But meal planning is emotional work. Staring at an ugly spreadsheet at 6pm makes me want to order pizza.

So I rebuilt the entire frontend with a Solarpunk aesthetic. I used sage greens, terra cotta, and warm beiges. I implemented glassmorphism for soft, translucent cards that feel "premium." I built a mobile "Focus Mode" for cooking that shows *only* the current step so I don't get overwhelmed.

Better aesthetics actually increased my compliance. I *want* to open the app now because it feels calm with plenty of whitespace. The "Emerald Green" button for "All Reviews Complete" gives me a little dopamine hit. The insight? If you're building a tool for yourself, make it beautiful. You deserve it.

## The Lesson

The system has graduated from "prototype" to "product." My planning time is down to 10 minutes a week, food waste is near zero, and the hard-coded "Evening Protection" rule keeps my Friday nights stress-free.

But the biggest lesson wasn't technical. It was shifting from **Recording** to **Suggesting**.

Most of us build "Version 1" tools: fancy spreadsheets where we type in what we want to do. But the real value of AI and automation is "Version 2": tools that look at your data and make decisions for you. Don't just digitize your chores. Automate your decisions.

---

*Subscribe to **The Accidental Engineer** for more on building systems that actually work for real life.*
