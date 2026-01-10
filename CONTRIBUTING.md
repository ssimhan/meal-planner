# Contributing to Meal Planner

Thank you for your interest in improving the Meal Planner! This document provides guidelines for setting up your environment, making changes, and submitting contributions.

## Project Overview

The Meal Planner is a hybrid application comprising:
- **Backend:** Python + Flask (Serverless Functions on Vercel)
- **Frontend:** Next.js (React) + Tailwind CSS
- **Data:** YAML files + GitHub API (GitOps persistence)

## Prerequisites

- Python 3.9+
- Node.js 18+
- Git

## Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ssimhan/meal-planner.git
    cd meal-planner
    ```

2.  **Environment Variables:**
    Copy the example environment file and configure it (optional for basic local dev, required for GitHub sync):
    ```bash
    cp .env.example .env
    ```
    *Note: `GITHUB_TOKEN` is required if you want local changes to sync back to the repository.*

3.  **Install Dependencies:**
    
    **Backend:**
    ```bash
    pip install -r requirements.txt
    ```

    **Frontend:**
    ```bash
    npm install
    ```

4.  **Run Development Server:**
    Use the provided script to start both the Python backend and Next.js frontend:
    ```bash
    ./scripts/dev.sh
    ```
    Access the app at `http://localhost:3000`.

5.  **Configure for Your Household:**
    ```bash
    cp config.example.yml config.yml
    ```
    Edit `config.yml` with your timezone, family members, and preferences. See [CONFIGURATION.md](docs/CONFIGURATION.md) for detailed guidance.

## Customizing for Your Family

The meal planner is designed to be fully customizable via `config.yml`. You can personalize:

- **Timezone:** Set your local timezone for accurate daily check-ins
- **Schedule:** Define office days, busy days, and late class days
- **Dietary Preferences:** Vegetarian, avoid ingredients, novelty recipe limit
- **Kid Profiles:** Individual family members with their own allergies/preferences
- **Lunch Defaults:** Repeatable lunch options that rotate through the week
- **Snack Defaults:** Daily snack rotation with school/home fallbacks

**Quick validation:**
```bash
python3 scripts/validate_yaml.py --config
```

For complete documentation, see [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## Testing

**Backend Tests:**
Run pytest to verify API logic:
```bash
python3 -m pytest tests/test_backend.py
```

**frontend Tests:**
(Coming soon)

## Folder Structure

- `api/`: Flask backend and Blueprint definitions.
- `scripts/`: Python logic for planning, parsing, and execution.
- `src/`: Next.js frontend code.
- `data/`: `history.yml` and `inventory.yml`.
- `inputs/`: Weekly input configuration files.
- `recipes/`: Markdown recipe content and index.

## Submitting Changes

1.  Create a branch for your feature or fix: `git checkout -b feature/my-new-feature`.
2.  Commit your changes following conventional commit messages.
3.  Push to your fork and submit a Pull Request.

## Formatting

- **Python:** Follow PEP8.
- **TypeScript:** ESLint configuration is provided in the project.

Thank you for contributing!
