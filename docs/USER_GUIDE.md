# 🥗 Meal Planner: How to Use

This system automates 90% of the meal planning work. It remembers what you ate, suggests recipes you haven't had in a while, and manages your grocery list.

Here is your weekly routine.

---

## 📅 The Weekly Routine (5 Minutes)

### 1. Start New Week
Open the [dashboard](https://meal-planner-eta-seven.vercel.app/) and click **"Start New Week"**. The system will suggest seasonal vegetables based on the current week.

### 2. Confirm Vegetables
After your farmers market trip, enter the vegetables you actually purchased in the dashboard.

### 3. Generate Plan
Click **"Generate Weekly Plan"**. The system will:
*   Select 5 dinners based on your schedule and recent history
*   Plan lunches with leftover pipelines
*   Create your grocery list
*   Generate prep schedules

---

## 🍽️ Daily Usage

### Viewing Your Plan
Bookmark this link on your phone:
👉 **[Open Meal Planner](https://meal-planner-eta-seven.vercel.app/)**

*   **Groceries Tab:** Use this while shopping on Sunday.
*   **Daily Tabs:** Check "Dinner" for tonight's plan. It tells you exactly what to prep.

---

## ✅ Daily Logging

After dinner, log your execution in the dashboard:

1.  Open the [dashboard](https://meal-planner-eta-seven.vercel.app/)
2.  Find "Today's Schedule" section
3.  Click the feedback buttons:
    - **Made as planned** / **Freezer backup** / **Skipped** / **Ate out**
    - Select vegetables used
    - Add kids' feedback (❤️ Love / 👍 Like / 😐 Meh)
4.  Check off prep tasks as you complete them

**Why log?**
*   If you skip a meal, it remembers to suggest it again soon
*   Tracks what ingredients you have left in the fridge
*   Learns which recipes the kids actually eat
*   Updates freezer backup inventory automatically

---

## 🧊 Freezer Backups

The system automatically manages a "Emergency Freezer Stash."
*   **Planned 2x Batches:** Sometimes the plan says *"Make double, freeze half."* Do this!
*   **Zero-Prep Fridays:** If you're too tired to cook, just grab a monitored freezer meal. The system will subtract it from your inventory automatically when you log it.

---

---

## 🧪 Testing & Local Development

If you want to tweak recipes, change the design, or verify the logic without waiting for a real Saturday rollout, you can do so locally.

### 1. Live Preview (The Feedback Loop)
The fastest way to see changes is to use the **Live Reload** script.
*   **Command:** `./scripts/dev.sh`
*   **What it does:** It watches all your files. The moment you save a recipe or change a template, it regenerates the plan and refreshes your browser automatically.

### 2. Automated Testing
To ensure your changes haven't broken core features (like anti-repetition), run the internal test suite.
*   **Logic Tests:** `python3 scripts/test_logic.py`
*   **YAML Validation:** `python3 scripts/validate_yaml.py` (checks for syntax errors in your data files).

### 3. Manual Verification Checklist
When testing a new week's logic, verify:
*   [ ] **Lunch Balance:** Do kids and adults have distinct, sensible options?
*   [ ] **Grocery List:** Are new ingredients from your recipes appearing in the "Groceries" tab?
*   [ ] **Energy Flow:** Does the prep schedule feel balanced (Mon-Tue vs. Wed-Fri)?
*   [ ] **Sticking Choices:** If you manually override a meal in `history.yml`, does the generator respect it?

---

## ⚡ Quick Tips

*   **Friday is "No Prep" day.** The plan ensures you never have to chop vegetables on a Friday night.
*   **Variety is guaranteed.** You won't see the same recipe twice in 3 weeks.
*   **Device-Free Evenings.** The plan is designed so usually all the hard work is done *before* 5 PM.
*   **Manual Overrides:** You can always manually edit your `history.yml` to "pin" a specific meal (like a Freezer Backup), and the system will build the rest of your plan around it.
