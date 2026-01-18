#!/usr/bin/env python3
import sys
import os
import yaml
import re
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.utils.storage import supabase

H_ID = "00000000-0000-0000-0000-000000000001"

def parse_time_from_text(text):
    """Estimate total time by summing up all minute/hour mentions in instructions."""
    if not text:
        return 0
    
    total_minutes = 0
    
    # 1. Look for minute patterns: "20 min", "20 minutes", "20-25 mins"
    # Take the maximum in a range like 20-25
    min_patterns = re.findall(r'(\d+)(?:-(\d+))?\s*(min|minute|mins)', text, re.IGNORECASE)
    for match in min_patterns:
        val1, val2, _ = match
        val = int(val2) if val2 else int(val1)
        total_minutes += val

    # 2. Look for hour patterns: "1 hour", "1-2 hours", "1.5 hours"
    hour_patterns = re.findall(r'(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?\s*(hour|hr)', text, re.IGNORECASE)
    for match in hour_patterns:
        val1, val2, _ = match
        val = float(val2) if val2 else float(val1)
        total_minutes += int(val * 60)
        
    return total_minutes

def update_local_files(recipe_id, new_effort, prep=None, cook=None):
    """Update YAML and Markdown files with new effort level and estimated times."""
    # 1. Update YAML
    yaml_path = Path(f"recipes/details/{recipe_id}.yaml")
    if yaml_path.exists():
        try:
            with open(yaml_path, 'r') as f:
                data = yaml.safe_load(f) or {}
            data['effort_level'] = new_effort
            if prep: data['prep_time_minutes'] = prep
            if cook: data['cook_time_minutes'] = cook
            with open(yaml_path, 'w') as f:
                yaml.dump(data, f, default_flow_style=False, sort_keys=False)
        except Exception as e:
            print(f"  ✗ Error updating {yaml_path}: {e}")

    # 2. Update Markdown
    md_path = Path(f"recipes/content/{recipe_id}.md")
    if md_path.exists():
        try:
            with open(md_path, 'r') as f:
                lines = f.readlines()
            
            new_lines = []
            frontmatter_count = 0
            for line in lines:
                if line.strip() == '---':
                    frontmatter_count += 1
                
                if frontmatter_count == 1:
                    if line.startswith('effort_level:'):
                        new_lines.append(f"effort_level: {new_effort}\n")
                    elif line.startswith('prep_time_minutes:') and prep:
                        new_lines.append(f"prep_time_minutes: {prep}\n")
                    elif line.startswith('cook_time_minutes:') and cook:
                        new_lines.append(f"cook_time_minutes: {cook}\n")
                    else:
                        new_lines.append(line)
                else:
                    new_lines.append(line)
            
            with open(md_path, 'w') as f:
                f.writelines(new_lines)
        except Exception as e:
            print(f"  ✗ Error updating {md_path}: {e}")

def recalibrate():
    if not supabase:
        print("ERROR: Supabase not initialized")
        return

    print("Fetching all recipes...")
    res = supabase.table("recipes").select("id, name, metadata").eq("household_id", H_ID).execute()
    
    recipes = res.data
    print(f"Found {len(recipes)} recipes. Scanning instructions for durations...")
    
    updated_count = 0
    for r in recipes:
        recipe_id = r['id']
        name = r['name']
        metadata = r.get('metadata') or {}
        
        # Determine existing effort
        current_effort = metadata.get('effort_level')
        
        # Find instructions in YAML
        yaml_path = Path(f"recipes/details/{recipe_id}.yaml")
        total_estimated = 0
        if yaml_path.exists():
            try:
                with open(yaml_path, 'r') as f:
                    data = yaml.safe_load(f) or {}
                # Check prep/cook fields first
                prep = data.get('prep_time_minutes') or 0
                cook = data.get('cook_time_minutes') or 0
                
                if prep + cook > 0:
                    total_estimated = prep + cook
                else:
                    # Scan text instructions
                    instr = data.get('instructions', '')
                    total_estimated = parse_time_from_text(instr)
            except:
                pass
        
        if total_estimated > 45:
            if current_effort != 'high':
                print(f"Updating {name} (Est. {total_estimated}m) -> HARD")
                
                # Update metadata
                new_metadata = {**metadata}
                new_metadata['effort_level'] = 'high'
                new_metadata.pop('id', None)
                new_metadata.pop('name', None)
                
                try:
                    # Supabase Sync
                    supabase.table("recipes").update({
                        "metadata": new_metadata
                    }).eq("id", recipe_id).eq("household_id", H_ID).execute()
                    
                    # File Sync
                    update_local_files(recipe_id, 'high')
                    
                    updated_count += 1
                except Exception as e:
                    print(f"  ✗ Failed to update {name}: {e}")

    print(f"\nRecalibration complete. Updated {updated_count} recipes to 'high' effort.")

if __name__ == '__main__':
    recalibrate()
