#!/bin/bash

# Modern local dev workflow for hybrid Next.js + Python app
# Use this to start both the Next.js dashboard and Python API together

echo "🚀 Starting Meal Planner Local Dev Environment..."
echo ""
echo "Services:"
echo "  - Next.js Dashboard: http://localhost:3000"
echo "  - Python API: http://localhost:5328"
echo "  - API Status: http://localhost:5328/api/status"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Edit .env to add your GITHUB_TOKEN (optional)"
    echo ""
fi

# Start both services concurrently
npm run dev:full
