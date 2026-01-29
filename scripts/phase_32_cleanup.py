#!/usr/bin/env python3
"""
Phase 32 Cleanup Script
Addresses TD-002 (typos), TD-004 (redundant tags), and audits TD-003.
"""

import sys
import os
from pathlib import Path

# Add root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.utils.storage import supabase
import re

H_ID = "00000000-0000-0000-0000-000000000001"

def cleanup_recipes():
    print("Cleanup: Recipes (TD-002, TD-004)")
    if not supabase:
        print("ERROR: Supabase not initialized")
        return

    res = supabase.table("recipes").select("id, name, metadata").eq("household_id", H_ID).execute()
    
    count = 0
    for r in res.data:
        metadata = r.get('metadata') or {}
        modified = False
        
        # 1. Deduplicate/Normalize Tags (TD-004)
        tags = metadata.get('tags', [])
        if tags:
            # Lowercase and unique
            new_tags = sorted(list(set([t.lower().strip() for t in tags if t])))
            if new_tags != tags:
                metadata['tags'] = new_tags
                modified = True
                
        # 2. Main Veg Normalization (TD-002 subset)
        main_veg = metadata.get('main_veg', [])
        if main_veg:
            # Basic normalization (singularize simple case)
            normalized_veg = []
            for v in main_veg:
                v = v.lower().strip().replace(' ', '_')
                if v.endswith('s') and not v.endswith('ss') and not v.endswith('oes') and not v.endswith('ies'):
                    v = v[:-1]
                normalized_veg.append(v)
            
            new_veg = sorted(list(set([v for v in normalized_veg if v])))
            if new_veg != main_veg:
                metadata['main_veg'] = new_veg
                modified = True
        
        if modified:
            print(f"  🔧 Updating {r['name']}")
            supabase.table("recipes").update({"metadata": metadata}).eq("id", r['id']).execute()
            count += 1
            
    print(f"  ✓ Updated {count} recipes")

def audit_inventory():
    print("\nAudit: Inventory (TD-003)")
    if not supabase: return
    
    res = supabase.table("inventory_items").select("*").eq("household_id", H_ID).execute()
    
    mashed_count = 0
    for item in res.data:
        qty = str(item.get('quantity', ''))
        # Check if quantity has non-numeric text besides . or /
        if any(c.isalpha() for c in qty):
            print(f"  📝 Mashed: '{item['item']}' has quantity '{qty}'")
            mashed_count += 1
            
    print(f"  ✓ Found {mashed_count} items with likely mashed quantity/unit fields.")

if __name__ == '__main__':
    cleanup_recipes()
    audit_inventory()
