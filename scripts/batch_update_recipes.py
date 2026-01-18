#!/usr/bin/env python3
"""
Direct Supabase batch recipe update - no Flask context needed.
"""

import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.utils.storage import supabase

H_ID = "00000000-0000-0000-0000-000000000001"

def get_incomplete_recipes():
    """Fetch all recipes missing cuisine or effort_level."""
    if not supabase:
        print("ERROR: Supabase not initialized")
        return []
    
    try:
        res = supabase.table("recipes").select("id, name, metadata").eq("household_id", H_ID).execute()
        
        incomplete = []
        for r in res.data:
            metadata = r.get('metadata') or {}
            cuisine = metadata.get('cuisine', 'unknown')
            effort = metadata.get('effort_level')
            
            if cuisine == 'unknown' or not cuisine or not effort:
                incomplete.append({
                    'id': r['id'],
                    'name': r['name'],
                    'cuisine': cuisine,
                    'effort_level': effort,
                    'metadata': metadata
                })
        
        return incomplete
    except Exception as e:
        print(f"Error fetching recipes: {e}")
        return []

def categorize_by_type(recipes):
    """Categorize recipes by likely type."""
    categories = {
        'snacks': [],
        'baked_goods': [],
        'simple_items': [],
        'indian': [],
        'mexican': [],
        'other': []
    }
    
    snack_keywords = ['cheese', 'fruit', 'carrot', 'tomato', 'avocado', 'applesauce', 'yogurt']
    baked_keywords = ['muffin', 'cookie', 'bread', 'brownie', 'blondie']
    indian_keywords = ['kozhumbu', 'dal', 'curry', 'masala', 'paneer', 'tikka']
    mexican_keywords = ['bean', 'taco', 'burrito', 'salsa']
    
    for r in recipes:
        name_lower = r['name'].lower()
        
        if any(kw in name_lower for kw in baked_keywords):
            categories['baked_goods'].append(r)
        elif any(kw in name_lower for kw in snack_keywords):
            categories['snacks'].append(r)
        elif any(kw in name_lower for kw in indian_keywords):
            categories['indian'].append(r)
        elif any(kw in name_lower for kw in mexican_keywords):
            categories['mexican'].append(r)
        else:
            categories['other'].append(r)
    
    return categories

def bulk_update(recipe_ids, cuisine, effort_level):
    """Update multiple recipes with the same values - direct Supabase access."""
    success_count = 0
    
    for recipe_id in recipe_ids:
        try:
            # Fetch current recipe
            res = supabase.table("recipes").select("*").eq("id", recipe_id).eq("household_id", H_ID).execute()
            
            if not res.data:
                print(f"  SKIP: Recipe not found: {recipe_id}")
                continue
            
            recipe = res.data[0]
            current_metadata = recipe.get('metadata') or {}
            
            # Update metadata
            new_metadata = {**current_metadata}
            new_metadata['cuisine'] = cuisine
            new_metadata['effort_level'] = effort_level
            new_metadata.pop('name', None)
            new_metadata.pop('id', None)
            
            # Save back to Supabase
            supabase.table("recipes").update({
                "metadata": new_metadata
            }).eq("id", recipe_id).eq("household_id", H_ID).execute()
            
            success_count += 1
        except Exception as e:
            print(f"  ✗ Failed: {recipe_id}: {e}")
    
    return success_count

if __name__ == '__main__':
    recipes = get_incomplete_recipes()
    
    if not recipes:
        print("No incomplete recipes found!")
        sys.exit(0)
    
    print(f"Found {len(recipes)} incomplete recipes\n")
    
    categories = categorize_by_type(recipes)
    
    # Show categories
    for cat_name, cat_recipes in categories.items():
        if cat_recipes:
            print(f"\n{cat_name.upper()} ({len(cat_recipes)} recipes):")
            for r in cat_recipes[:10]:
                print(f"  - {r['name']}")
            if len(cat_recipes) > 10:
                print(f"  ... and {len(cat_recipes) - 10} more")
    
    print("\n" + "="*80)
    print("SUGGESTED BULK UPDATES:")
    print("="*80)
    
    # Baked goods
    if categories['baked_goods']:
        print(f"\n1. BAKED GOODS ({len(categories['baked_goods'])} items)")
        print("   Suggested: cuisine='american', effort_level='normal'")
        ids = [r['id'] for r in categories['baked_goods']]
        response = input("   Apply? (yes/no): ")
        if response.lower() in ['yes', 'y']:
            count = bulk_update(ids, 'american', 'normal')
            print(f"   ✓ Updated {count} recipes")
    
    # Snacks
    if categories['snacks']:
        print(f"\n2. SNACKS ({len(categories['snacks'])} items)")
        print("   Suggested: cuisine='snack', effort_level='low'")
        ids = [r['id'] for r in categories['snacks']]
        response = input("   Apply? (yes/no): ")
        if response.lower() in ['yes', 'y']:
            count = bulk_update(ids, 'snack', 'low')
            print(f"   ✓ Updated {count} recipes")
    
    # Indian
    if categories['indian']:
        print(f"\n3. INDIAN ({len(categories['indian'])} items)")
        print("   Suggested: cuisine='indian', effort_level='normal'")
        ids = [r['id'] for r in categories['indian']]
        response = input("   Apply? (yes/no): ")
        if response.lower() in ['yes', 'y']:
            count = bulk_update(ids, 'indian', 'normal')
            print(f"   ✓ Updated {count} recipes")
    
    # Mexican
    if categories['mexican']:
        print(f"\n4. MEXICAN ({len(categories['mexican'])} items)")
        print("   Suggested: cuisine='mexican', effort_level='normal'")
        ids = [r['id'] for r in categories['mexican']]
        response = input("   Apply? (yes/no): ")
        if response.lower() in ['yes', 'y']:
            count = bulk_update(ids, 'mexican', 'normal')
            print(f"   ✓ Updated {count} recipes")
    
    print("\n✓ Batch update complete!")
    remaining = len(get_incomplete_recipes())
    print(f"Remaining incomplete: {remaining}")
    
    if remaining > 0:
        print(f"\nTo review the remaining {remaining} recipes, visit:")
        print("http://localhost:3000/recipes and click 'Review Incomplete'")
