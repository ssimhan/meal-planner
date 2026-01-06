import os
import yaml
from pathlib import Path

def migrate():
    src_dir = Path('recipes/details')
    dest_dir = Path('recipes/content')
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    if not src_dir.exists():
        print(f"Error: {src_dir} not found")
        return
        
    yaml_files = list(src_dir.glob('*.yaml'))
    print(f"Migrating {len(yaml_files)} recipes to Markdown at {dest_dir}...")
    
    for yf in yaml_files:
        try:
            with open(yf, 'r') as f:
                data = yaml.safe_load(f)
                
            if not data: continue
            
            r_id = data.get('id')
            name = data.get('name')
            
            # Split data into frontmatter and content
            # We preserve everything except ingredients and instructions in frontmatter
            frontmatter = {k: v for k, v in data.items() if k not in ['ingredients', 'instructions']}
            
            ingredients = data.get('ingredients', [])
            instructions = data.get('instructions', '')
            
            md_content = "---\n"
            md_content += yaml.dump(frontmatter, default_flow_style=False, sort_keys=False, allow_unicode=True)
            md_content += "---\n\n"
            
            md_content += f"# {name}\n\n"
            
            if ingredients:
                md_content += "### Ingredients\n"
                for ing in ingredients:
                    md_content += f"- {ing}\n"
                md_content += "\n"
                
            if instructions:
                md_content += "### Instructions\n"
                # Handle cases where instructions might be a single block or multiple lines
                steps = instructions.split('\n')
                step_num = 1
                for step in steps:
                    s = step.strip()
                    if not s: continue
                    # If step already starts with a number like "1.", don't double it
                    if s[0].isdigit() and ('. ' in s[:4] or ') ' in s[:4]):
                        md_content += f"{s}\n"
                    else:
                        md_content += f"{step_num}. {s}\n"
                        step_num += 1
                md_content += "\n"
                
            dest_file = dest_dir / f"{r_id}.md"
            with open(dest_file, 'w') as f:
                f.write(md_content)
        except Exception as e:
            print(f"  ✗ Error migrating {yf.name}: {e}")
            
    print(f"\nSuccessfully migrated {len(list(dest_dir.glob('*.md')))} recipes.")

if __name__ == "__main__":
    migrate()
