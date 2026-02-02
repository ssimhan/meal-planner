import os
import yaml
from pathlib import Path
from datetime import datetime
from scripts.github_helper import get_file_from_github

# Caching
CACHE = {
    'recipes': {'data': None, 'timestamp': 0},
    'inventory': {'data': None, 'timestamp': 0},
    'history': {'data': None, 'timestamp': 0}
}

CACHE_TTL = 300  # 5 minutes

def get_actual_path(rel_path):
    is_vercel = os.environ.get('VERCEL') == '1'
    if is_vercel:
        tmp_path = Path("/tmp") / rel_path
        if tmp_path.exists():
            return tmp_path
    return Path(rel_path)

def get_yaml_data(rel_path):
    """Fetches YAML data, prioritizing GitHub Truth on Vercel."""
    is_vercel = os.environ.get('VERCEL') == '1'
    repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
    
    if is_vercel:
        content = get_file_from_github(repo_name, rel_path)
        if content:
            # Sync to /tmp for other scripts
            tmp_path = Path("/tmp") / rel_path
            os.makedirs(tmp_path.parent, exist_ok=True)
            with open(tmp_path, 'w') as f:
                f.write(content)
            return yaml.safe_load(content)
            
    # Fallback to local
    path = Path(rel_path)
    if path.exists():
        with open(path, 'r') as f:
            return yaml.safe_load(f)
    return None

def get_cached_data(key, path):
    """Get data from cache or load from file."""
    is_vercel = os.environ.get('VERCEL') == '1'

    # On Vercel, disable caching for frequently updated files since each
    # serverless invocation may not share memory and GitHub is source of truth
    if is_vercel and key in ['history', 'inventory']:
        return get_yaml_data(path)

    now = datetime.now().timestamp()
    cache_entry = CACHE.get(key)

    if cache_entry and cache_entry['data'] and (now - cache_entry['timestamp'] < CACHE_TTL):
        return cache_entry['data']

    data = get_yaml_data(path)
    if data:
        CACHE[key] = {'data': data, 'timestamp': now}

    return data

def invalidate_cache(key=None):
    """Bridge to StorageEngine invalidation and local cleanup."""
    if key:
        if key in CACHE:
            CACHE[key] = {'data': None, 'timestamp': 0}
    else:
        for k in CACHE:
            CACHE[k] = {'data': None, 'timestamp': 0}
            
    from api.utils.storage import invalidate_cache as storage_invalidate
    storage_invalidate(key)

