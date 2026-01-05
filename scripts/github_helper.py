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
    
    # Check if we can do a multi-file commit
    # For now, let's keep it simple and just do sequential for the legacy function
    for file_path in changed_files:
        commit_file_to_github(repo_name, file_path, f"Update {file_path} via Web UI")

def commit_multiple_files_to_github(repo_name, file_dict, commit_message):
    """
    Commits multiple files to GitHub in a single commit.
    file_dict: { 'path/in/repo': 'content string' }
    """
    g = get_github_client()
    if not g:
        print("Skipping GitHub commit: GITHUB_TOKEN not found.")
        return False

    try:
        repo = g.get_repo(repo_name)
        master_ref = repo.get_git_ref("heads/main")
        master_sha = master_ref.object.sha
        base_tree = repo.get_git_tree(master_sha)

        element_list = []
        for path, content in file_dict.items():
            # Create a blob or just use path/content in InputGitTreeElement
            # Simplified using InputGitTreeElement
            from github import InputGitTreeElement
            element = InputGitTreeElement(path, "100644", "blob", content=content)
            element_list.append(element)

        tree = repo.create_git_tree(element_list, base_tree)
        parent = repo.get_git_commit(master_sha)
        commit = repo.create_git_commit(commit_message, tree, [parent])
        master_ref.edit(commit.sha)
        
        print(f"Successfully committed {list(file_dict.keys())} to GitHub in one go.")
        return True
    except Exception as e:
        print(f"Error committing multiple files to GitHub: {e}")
        return False

def get_file_from_github(repo_name, file_path):
    """Fetches a file content from GitHub."""
    g = get_github_client()
    if not g:
        return None
    try:
        repo = g.get_repo(repo_name)
        contents = repo.get_contents(str(file_path))
        return base64.b64decode(contents.content).decode('utf-8')
    except Exception as e:
        # Don't print error for 404s, it might be expected
        if not (isinstance(e, GithubException) and e.status == 404):
            print(f"Error fetching {file_path} from GitHub: {e}")
        return None

def list_files_in_dir_from_github(repo_name, dir_path):
    """Lists file paths in a directory on GitHub."""
    g = get_github_client()
    if not g:
        return []
    try:
        repo = g.get_repo(repo_name)
        contents = repo.get_contents(str(dir_path))
        return [c.path for c in contents if c.type == 'file']
    except Exception as e:
        if not (isinstance(e, GithubException) and e.status == 404):
            print(f"Error listing {dir_path} on GitHub: {e}")
        return []
