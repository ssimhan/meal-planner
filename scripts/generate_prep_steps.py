
#!/usr/bin/env python3
import sys
import re
import argparse
import hashlib
from pathlib import Path
from functools import lru_cache

# Mapping of keywords (regex) to prep tasks
PREP_RULES = [
    # Veggies
    (r'\b(onions?|shallots?)\b', "Chop onions/shallots", ["onion powder", "dried onion"]),
    (r'\b(garlic)\b', "Mince garlic", ["garlic powder", "granulated garlic"]),
    (r'\b(ginger)\b', "Grate/mince ginger", ["ground ginger", "ginger powder"]),
    (r'\b(carrots?)\b', "Chop carrots", []),
    (r'\b(celery)\b', "Chop celery", ["celery seed", "celery salt"]),
    (r'\b(bell\s+peppers?|peppers?)\b', "Chop peppers", ["black pepper", "white pepper", "cayenne pepper", "chili pepper flakes"]),
    (r'\b(zucchini|courgette)\b', "Chop zucchini", []),
    (r'\b(squash|butternut|acorn|pumpkin)\b', "Peel/chop squash", []),
    (r'\b(potatoes?)\b', "Peel and cube potatoes", ["sweet potato"]),
    (r'\b(sweet\s+potatoes?|yams?)\b', "Peel and cube sweet potatoes", []),
    (r'\b(broccoli|cauliflower)\b', "Cut florets", []),
    (r'\b(spinach|kale|chard)\b', "Wash and chop greens", ["frozen spinach"]),
    (r'\b(mushrooms?)\b', "Clean and slice mushrooms", []),
    (r'\b(cucumber)\b', "Slice cucumber", []),
    (r'\b(cabbage)\b', "Shred/chop cabbage", []),
    (r'\b(green\s+beens?|string\s+beans?)\b', "Trim green beans", []),
    
    # Herbs
    (r'\b(cilantro|parsley|basil|mint|dill|chives)\b', "Wash and chop herbs", ["dried", "flakes"]),
    (r'\b(scallions?|green\s+onions?)\b', "Chop scallions", []),

    # Proteins
    (r'\b(chicken|beef|pork|steak|lamb)\b', "Prep/cut proteins", ["ground", "minced", "broth", "stock"]),
    (r'\b(tofu)\b', "Press/cube tofu", []),
    
    # Instructions based
    (r'\b(marinate|marinade)\b', "Marinate proteins (ahead of time)", []),
]

# TD-006 FIX: Cache for parsed prep tasks to avoid re-parsing on every request
# Uses content hash as key, with max 100 entries (LRU eviction)
@lru_cache(maxsize=100)
def _get_prep_tasks_cached(content_hash: str, md_content: str) -> tuple:
    """
    Cached version of prep task parsing.
    Returns tuple (immutable for caching) instead of list.
    """
    lines = md_content.split('\n')
    ingredients = []
    instructions = []
    
    # Simple state machine to extract sections
    in_ingredients = False
    in_instructions = False
    
    for line in lines:
        if re.match(r'#+\s*Prep Steps', line, re.IGNORECASE):
            continue
            
        # Standard parsing
        if re.match(r'#+\s*Ingredients', line, re.IGNORECASE):
            in_ingredients = True
            in_instructions = False
        elif re.match(r'#+\s*Instructions', line, re.IGNORECASE):
            in_ingredients = False
            in_instructions = True
        elif line.startswith('#'):
            in_ingredients = False
            in_instructions = False
            
        if in_ingredients and (line.strip().startswith('-') or line.strip().startswith('*')):
            ingredients.append(line.strip()[1:].strip())
        elif in_instructions:
            instructions.append(line.strip())

    generated_steps = []
    
    # Check Ingredients
    for ing in ingredients:
        ing_lower = ing.lower()
        for pattern, task, exclusions in PREP_RULES:
            # Check exclusions first
            if any(exc in ing_lower for exc in exclusions):
                continue
                
            if re.search(pattern, ing_lower, re.IGNORECASE):
                generated_steps.append(task)
                
    # Check Instructions
    inst_text = ' '.join(instructions).lower()
    if 'marinate' in inst_text or 'marinade' in inst_text:
        if "Marinate proteins (ahead of time)" not in generated_steps:
             generated_steps.append("Marinate proteins (ahead of time)")

    # Deduplicate and return as tuple for caching
    return tuple(dict.fromkeys(generated_steps))


def get_prep_tasks(md_content):
    """
    Heuristic-based prep step generator.
    Returns a list of suggested prep-ahead tasks.
    
    TD-006 FIX: Now uses caching to avoid re-parsing on every request.
    """
    # Generate hash for cache key
    content_hash = hashlib.md5(md_content.encode()).hexdigest()
    
    # Get cached result (returns tuple)
    cached_result = _get_prep_tasks_cached(content_hash, md_content)
    
    # Convert back to list for backward compatibility
    return list(cached_result)

def generate_prep_steps(md_content, force=False):
    """
    Heuristic-based prep step generator.
    Looks for keywords in ingredients and instructions to suggest prep-ahead tasks.
    """
    lines = md_content.split('\n')
    
    # Simple state machine to find existing section
    has_prep_steps = False
    prep_start_idx = -1
    prep_end_idx = -1

    for i, line in enumerate(lines):
        if re.match(r'#+\s*Prep Steps', line, re.IGNORECASE):
            has_prep_steps = True
            prep_start_idx = i
            continue
            
        if has_prep_steps and prep_end_idx == -1:
            if re.match(r'#+\s*', line) and not line.startswith('-') and not line.startswith('*') and line.strip():
                prep_end_idx = i
                has_prep_steps = False 

    # Re-read content to strip existing Prep Steps if force is True
    if force and prep_start_idx != -1:
        if prep_end_idx == -1: prep_end_idx = len(lines)
        lines = lines[:prep_start_idx] + lines[prep_end_idx:]
    elif not force and prep_start_idx != -1:
        return None # Already exists and not forced

    generated_steps = get_prep_tasks(md_content)
    
    if not generated_steps:
        return '\n'.join(lines)

    # Insert Prep Steps section before Instructions
    new_content_lines = []
    inserted = False
    
    for line in lines:
        if not inserted and re.match(r'#+\s*Instructions', line, re.IGNORECASE):
            new_content_lines.append("## Prep Steps")
            for step in generated_steps:
                new_content_lines.append(f"- {step}")
            new_content_lines.append("")
            inserted = True
        new_content_lines.append(line)
        
    if not inserted:
        new_content_lines.append("## Prep Steps")
        for step in generated_steps:
            new_content_lines.append(f"- {step}")

    return '\n'.join(new_content_lines)


def main():
    parser = argparse.ArgumentParser(description='Generate prep steps for recipe markdown files.')
    parser.add_argument('file', help='Path to key markdown file')
    parser.add_argument('-f', '--force', action='store_true', help='Overwrite existing Prep Steps section')
    
    args = parser.parse_args()
    md_file = Path(args.file)
    
    if not md_file.exists():
        print(f"File {md_file} not found")
        return

    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = generate_prep_steps(content, force=args.force)
    
    if new_content is None:
        print(f"Skipped {md_file.name} (Prep Steps already exist, use --force to overwrite)")
        return
        
    if new_content == content:
         print(f"No changes made to {md_file.name}")
         return

    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {md_file.name}")

if __name__ == "__main__":
    main()
