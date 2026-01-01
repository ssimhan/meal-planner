#!/bin/bash

# Live Reload Development Script for Meal Planner
# This script watches for changes in input files and templates, 
# regenerates the meal plan, and refreshes the browser.

# 1. Start nodemon to watch for changes and regenerate the plan
# We use npx to avoid requiring a local install of nodemon
echo "🚀 Starting watcher (nodemon)..."
npx -y nodemon --watch inputs/ --watch recipes/ --watch templates/ --watch data/ \
    -e yml,html,py \
    --exec "python3 scripts/workflow.py generate-plan" &

# 2. Wait a moment for the first generation if needed
sleep 2

# 3. Start browser-sync to serve the plans and refresh on HTML changes
# It will automatically find the latest generated plan if we point it to the plans directory
echo "🌐 Starting local server (browser-sync)..."
# Find the most recent plan file to open initially
LATEST_PLAN=$(ls -t plans/*-weekly-plan.html 2>/dev/null | head -n 1)

if [ -z "$LATEST_PLAN" ]; then
    echo "⚠️ No plan found yet. Generating one now..."
    python3 scripts/workflow.py generate-plan
    LATEST_PLAN=$(ls -t plans/*-weekly-plan.html | head -n 1)
fi

echo "📖 Opening latest plan: $LATEST_PLAN"

npx -y browser-sync start --server --files "plans/*.html" --startPath "$LATEST_PLAN" --no-notify

# Handle cleanup on exit
trap "kill 0" EXIT
