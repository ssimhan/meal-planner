#!/usr/bin/env python3
import sys
import re
from pathlib import Path

def generate_prep_steps(md_content):
    """
    Heuristic-based prep step generator.
    Looks for keywords in ingredients and instructions to suggest prep-ahead tasks.
    """
    lines = md_content.split('\n')
    ingredients = []
    instructions = []
    in_ingredients = False
    in_instructions = False
    
    for line in lines:
        if re.match(r'#+\s*Ingredients', line, re.IGNORECASE):
            in_ingredients = True
            in_instructions = False
            continue
        if re.match(r'#+\s*Instructions', line, re.IGNORECASE):
            in_ingredients = False
            in_instructions = True
            continue
        if line.startswith('#'):
            in_ingredients = False
            in_instructions = False
            continue
            
        if in_ingredients and (line.strip().startswith('-') or line.strip().startswith('*')):
            ingredients.append(line.strip()[1:].strip())
        elif in_instructions:
            instructions.append(line.strip())

    prep_steps = []
    
    # Heuristics for ingredients
    for ing in ingredients:
        ing_lower = ing.lower()
        if 'onion' in ing_lower:
            prep_steps.append("Chop onions")
        if 'garlic' in ing_lower:
            prep_steps.append("Mince garlic")
        if 'ginger' in ing_lower:
            prep_steps.append("Grate/mince ginger")
        if any(v in ing_lower for v in ['carrot', 'celery', 'bell pepper', 'pepper', 'zucchini', 'squash']):
            veg = re.search(r'(carrot|celery|bell pepper|pepper|zucchini|squash)', ing_lower).group(0)
            prep_steps.append(f"Chop {veg}")
        if 'potato' in ing_lower and 'sweet' not in ing_lower:
            prep_steps.append("Peel and cube potatoes")
        if 'cilantro' in ing_lower or 'parsley' in ing_lower or 'basil' in ing_lower:
            prep_steps.append("Wash and chop herbs")
        if any(m in ing_lower for m in ['chicken', 'beef', 'pork', 'tofu']):
            prep_steps.append("Prep/cut proteins")

    # Heuristics for instructions
    inst_text = ' '.join(instructions).lower()
    if 'marinate' in inst_text or 'let sit' in inst_text:
        prep_steps.append("Marinate proteins (ahead of time)")
    if 'preheat' in inst_text and 'oven' in inst_text:
        # Not really a prep-ahead task, but good to know
        pass
    if 'boil' in inst_text and ('pasta' in inst_text or 'rice' in inst_text or 'noodles' in inst_text):
        # Could be pre-cooked but usually fresh
        pass

    # Deduplicate
    prep_steps = list(dict.fromkeys(prep_steps))
    
    if not prep_steps:
        return md_content

    # Insert Prep Steps section before Instructions
    new_content = []
    inserted = False
    for line in lines:
        if not inserted and re.match(r'#+\s*Instructions', line, re.IGNORECASE):
            new_content.append("## Prep Steps")
            for step in prep_steps:
                new_content.append(f"- {step}")
            new_content.append("")
            inserted = True
        new_content.append(line)
        
    if not inserted:
        # Append to end if no instructions found
        new_content.append("## Prep Steps")
        for step in prep_steps:
            new_content.append(f"- {step}")
            
    return '\n'.join(new_content)

def main():
    if len(sys.argv) < 2:
        print("Usage: generate_prep_steps.py <recipe_md_file>")
        return

    md_file = Path(sys.argv[1])
    if not md_file.exists():
        print(f"File {md_file} not found")
        return

    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if Prep Steps already exist
    if re.search(r'#+\s*Prep Steps', content, re.IGNORECASE):
        print(f"Prep steps already exist in {md_file.name}")
        return

    new_content = generate_prep_steps(content)
    
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {md_file.name} with generated prep steps")

if __name__ == "__main__":
    main()
