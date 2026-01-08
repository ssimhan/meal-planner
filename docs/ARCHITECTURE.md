# System Architecture

The Meal Planner uses a hybrid serverless architecture designed for low maintenance, high portability, and "GitOps" persistence.

## High-Level Overview

```mermaid
graph TD
    User[User / Browser] <--> Frontend[Next.js Frontend\n(Vercel Edge)]
    Frontend <--> API[Python Flask API\n(Vercel Serverless)]
    
    subgraph "Backend Layer"
        API --> Blueprints[Flask Blueprints\n(routes/*)]
        Blueprints --> Logic[Business Logic\n(scripts/workflow/*)]
        Logic --> GithubAPI[GitHub API Adapter]
    end
    
    subgraph "Persistence Layer (GitHub Repo)"
        GithubAPI <--> YAML[Data Files\n(history.yml, inventory.yml)]
        GithubAPI <--> Inputs[Input Files\n(inputs/YYYY-MM-DD.yml)]
        GithubAPI <--> Plans[Generated Plans\n(public/plans/*.html)]
    end
```

## Key Components

### 1. Frontend (Next.js)
- **Role**: Provides the interactive dashboard for users.
- **Tech**: React, Tailwind CSS, TypeScript.
- **State**: Fetches state from the API (`/status`) and updates via mutations (`/log-meal`, `/inventory/update`).

### 2. Backend (Flask / Python)
- **Role**: Handles complex business logic (meal selection, constraints, HTML generation).
- **Tech**: Flask, PyYAML, GitHub API Client (PyGithub).
- **Deployment**: Deployed as Vercel Serverless Functions.
- **Entry Point**: `api/index.py` initializes the app and registers blueprints.

### 3. Logic Core (Scripts)
- **Refactored Workflow**: The original monolithic script was broken down into modular components in `scripts/workflow/`.
- **Functionality**: 
    - `selection.py`: Choosing meals based on history and constraints.
    - `html_generator.py`: Rendering the rigid HTML plan format.
    - `state.py`: Managing file paths and archiving.

### 4. GitOps Persistence
- **Concept**: The application does not use a traditional database.
- **Storage**: All state (inventory, history, active plan) is stored as semantic YAML files in the Git repository.
- **Mechanism**: When the user performs an action (e.g., "Log Meal"), the API creates a commit to the repository updating the relevant YAML files. This ensures full version history and allows manual editing via GitHub UI if needed.
