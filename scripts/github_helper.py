import os
import base64
from github import Github, GithubException
from pathlib import Path

def get_github_client():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        # For local development, check .env
        from dotenv import load_dotenv
        load_dotenv()
        token = os.environ.get("GITHUB_TOKEN")
    
    if not token:
        return None
    return Github(token)

def commit_file_to_github(repo_name, file_path, commit_message, content=None):
    """Commits a file to GitHub. If content is None, it reads from the local path."""
    g = get_github_client()
    if not g:
        print("Skipping GitHub commit: GITHUB_TOKEN not found.")
        return False

    try:
        repo = g.get_repo(repo_name)
    except GithubException as e:
        print(f"Error getting repo {repo_name}: {e}")
        return False

    if content is None:
        try:
            with open(file_path, 'r') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading local file {file_path}: {e}")
            return False

    # Path in repo should be relative to root
    # If the file_path is already relative, use it. If absolute, we need to make it relative.
    # For now assume it's relative from the root of the project.
    rel_path = str(file_path)

    try:
        # Check if file exists to get its SHA
        try:
            contents = repo.get_contents(rel_path)
            repo.update_file(rel_path, commit_message, content, contents.sha)
            print(f"Successfully updated {rel_path} on GitHub.")
        except GithubException as e:
            if e.status == 404:
                repo.create_file(rel_path, commit_message, content)
                print(f"Successfully created {rel_path} on GitHub.")
            else:
                raise e
        return True
    except Exception as e:
        print(f"Error committing to GitHub: {e}")
        return False

def sync_changes_to_github(changed_files):
    """
    Syncs a list of files to GitHub.
    repo_name should be something like 'ssimhan/meal-planner'
    """
    repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
    
    for file_path in changed_files:
        commit_file_to_github(repo_name, file_path, f"Update {file_path} via Web UI")
