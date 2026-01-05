#!/usr/bin/env python3
import sys
import subprocess
import re
from pathlib import Path
from urllib.parse import urlparse

def sanitize_filename(name):
    return re.sub(r'[^a-zA-Z0-9]', '_', name).strip('_')

def import_recipe(url):
    print(f"Importing recipe from: {url}")
    
    # 1. Fetch the page title for the filename
    try:
        # Use curl with a common User-Agent to avoid being blocked
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        result = subprocess.run(['curl', '-L', '-H', f'User-Agent: {user_agent}', url], capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            print(f"Error fetching URL: {result.stderr}")
            return False
            
        content = result.stdout
        
        # Simple regex to find title
        title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE)
        if title_match:
            title = title_match.group(1).split('|')[0].split('-')[0].strip()
        else:
            parsed_url = urlparse(url)
            title = parsed_url.path.split('/')[-1] or "imported_recipe"
            
        filename = sanitize_filename(title) + ".html"
        save_path = Path('recipes/raw_html') / filename
        
        # 2. Save the HTML
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Saved raw HTML to: {save_path}")
        
        # 3. Run the parser
        print("Running parse_recipes.py...")
        parse_result = subprocess.run(['python3', 'scripts/parse_recipes.py'], capture_output=True, text=True)
        print(parse_result.stdout)
        
        if parse_result.returncode == 0:
            print("Successfully updated recipe index!")
            return True
        else:
            print(f"Error parsing recipe: {parse_result.stderr}")
            return False
            
    except Exception as e:
        print(f"An error occurred: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/import_recipe.py <URL>")
        sys.exit(1)
        
    url = sys.argv[1]
    import_recipe(url)
