# 🥗 Meal Planner: How to Use

This system automates 90% of the meal planning work. It remembers what you ate, suggests recipes you haven't had in a while, and manages your grocery list.

Here is your weekly routine.

---

## 📅 The Saturday Routine (5 Minutes)

### 1. Wait for the Notification (5 AM)
Every Saturday morning, the system wakes up and looks for seasonal produce. You will get a notification (via email or GitHub app) that **"Weekly Plan Start"** is ready for review.

### 2. Confirm Vegetables
1.  Click the notification to view the **Pull Request**.
2.  You will see a file listing proposed vegetables (e.g., `spinach`, `carrots`).
3.  **Action:** If you bought something different at the market, edit the file to match reality.
4.  **Action:** Click **"Merge Pull Request"**.

### 3. Done!
The system now takes over:
*   Generates the full weekly menu.
*   Creates your grocery list.
*   Updates the website.

---

## 🍽️ Daily Usage

### Viewing Your Plan
Bookmark this link on your phone:
👉 **[Open Meal Planner](https://ssimhan.github.io/meal-planner/)**

*   **Groceries Tab:** Use this while shopping on Sunday.
*   **Daily Tabs:** Check "Dinner" for tonight's plan. It tells you exactly what to prep.

---

## ✅ The Evening Check-in (8 PM)

Every night at 8 PM, the system asks: *"Did you stick to the plan?"*

1.  Open the notification on your phone (**GitHub App** or **Email**).
2.  You will see a simple checklist:
    - [ ] **Made as planned?** (Yes/No)
    - [ ] **Vegetables used?** (Select from list)
    - [ ] **Kids liked it?** (Love/Like/Meh)
3.  **Click "Comment"** to save.

**Why do this?**
*   If you skip a meal, it remembers to suggest it again soon.
*   It tracks what ingredients you have left in the fridge.
*   It learns which recipes the kids actually eat.

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
