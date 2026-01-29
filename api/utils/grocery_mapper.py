import os
import json
from pathlib import Path
from flask import request

# TD-005 FIX: Migrate from local JSON to Supabase households.config
# Local file is fallback for local dev only (DISABLE_AUTH=true)

DATA_FILE = Path(os.getcwd()) / 'data' / 'store_map.json'

DEFAULT_STORES = ['Costco', 'Trader Joe\'s', 'Safeway', 'Indian Store', 'Other']

EXCLUDED_STAPLES = {
    'oil', 'ghee', 'salt', 'pepper', 'black_pepper', 'red_chili_powder', 'turmeric', 
    'olive_oil', 'sunflower_oil', 'sesame_oil', 'vegetable_oil'
}


def _get_supabase():
    """Import Supabase client lazily to avoid circular imports."""
    from api.utils.storage import supabase, execute_with_retry, get_household_id, IS_SERVICE_ROLE
    return supabase, execute_with_retry, get_household_id, IS_SERVICE_ROLE


def _is_local_mode():
    """Check if running in local development mode (no auth)."""
    return os.environ.get('DISABLE_AUTH') == 'true'


class GroceryMapper:
    _local_cache = None  # Cache for local mode only

    @classmethod
    def _load_local(cls):
        """Load from local JSON file (for local dev mode)."""
        if cls._local_cache is None:
            if DATA_FILE.exists():
                try:
                    with open(DATA_FILE, 'r') as f:
                        cls._local_cache = json.load(f)
                except Exception:
                    cls._local_cache = {'stores': DEFAULT_STORES[:], 'map': {}}
            else:
                cls._local_cache = {'stores': DEFAULT_STORES[:], 'map': {}}
        return cls._local_cache

    @classmethod
    def _save_local(cls):
        """Save to local JSON file (for local dev mode)."""
        if cls._local_cache:
            try:
                os.makedirs(DATA_FILE.parent, exist_ok=True)
                with open(DATA_FILE, 'w') as f:
                    json.dump(cls._local_cache, f, indent=2)
            except OSError as e:
                if e.errno == 30:
                    print("WARN: Read-only filesystem. Cannot save store_map.json")
                else:
                    print(f"Error saving store_map.json: {e}")

    @classmethod
    def _load_db(cls):
        """Load store preferences from Supabase households.config."""
        supabase, execute_with_retry, get_household_id, _ = _get_supabase()
        if not supabase:
            return {'stores': DEFAULT_STORES[:], 'map': {}}
        
        try:
            h_id = get_household_id()
            query = supabase.table("households").select("config").eq("id", h_id)
            res = execute_with_retry(query)
            
            if res.data and len(res.data) > 0:
                config = res.data[0].get('config') or {}
                prefs = config.get('store_preferences')
                
                if prefs:
                    return prefs
                
                # Auto-migrate from local file if DB is empty but local exists
                if DATA_FILE.exists():
                    print(f"Migrating store_map.json to DB for household {h_id}")
                    try:
                        with open(DATA_FILE, 'r') as f:
                            local_data = json.load(f)
                        cls._save_db(local_data)
                        return local_data
                    except Exception as e:
                        print(f"Migration failed: {e}")
                
            return {'stores': DEFAULT_STORES[:], 'map': {}}
        except Exception as e:
            print(f"Error loading store preferences: {e}")
            return {'stores': DEFAULT_STORES[:], 'map': {}}

    @classmethod
    def _save_db(cls, data):
        """Save store preferences to Supabase households.config."""
        supabase, execute_with_retry, get_household_id, IS_SERVICE_ROLE = _get_supabase()
        if not supabase or not IS_SERVICE_ROLE:
            print("WARN: Cannot save store preferences - no Supabase or missing service role")
            return
        
        try:
            h_id = get_household_id()
            
            # Fetch current config to merge
            query = supabase.table("households").select("config").eq("id", h_id)
            res = execute_with_retry(query)
            
            current_config = {}
            if res.data and len(res.data) > 0:
                current_config = res.data[0].get('config') or {}
            
            # Merge store_preferences into config
            current_config['store_preferences'] = data
            
            # Update
            query = supabase.table("households").update({"config": current_config}).eq("id", h_id)
            execute_with_retry(query)
        except Exception as e:
            print(f"Error saving store preferences to DB: {e}")

    @classmethod
    def load(cls):
        """Load store preferences from DB or local file based on mode."""
        if _is_local_mode():
            return cls._load_local()
        return cls._load_db()

    @classmethod
    def save(cls, data=None):
        """Save store preferences to DB or local file based on mode."""
        if _is_local_mode():
            if data:
                cls._local_cache = data
            cls._save_local()
        else:
            if data:
                cls._save_db(data)

    @classmethod
    def get_stores(cls):
        data = cls.load()
        return data.get('stores', DEFAULT_STORES[:])

    @classmethod
    def add_store(cls, store_name):
        data = cls.load()
        stores = data.get('stores', [])
        if store_name not in stores:
            stores.append(store_name)
            data['stores'] = stores
            cls.save(data)
        return stores

    @classmethod
    def get_item_store(cls, item_name):
        data = cls.load()
        mapping = data.get('map', {})
        # Normalize simple case
        key = item_name.lower()
        if key in mapping: 
            return mapping[key]

        # Partial match fallback (if map key is part of item_name)
        for m_key, m_store in mapping.items():
            if m_key in key:
                return m_store
        
        return 'Other'

    @classmethod
    def set_item_store(cls, item_name, store_name):
        data = cls.load()
        if 'map' not in data: 
            data['map'] = {}
        data['map'][item_name.lower()] = store_name
        cls.save(data)
        return data['map']

    @staticmethod
    def infer_category(item_name):
        """
        Infer inventory category (fridge, pantry, freezer) based on item name.
        """
        name = item_name.lower()
        
        # Freezer high signal
        if any(w in name for w in ['frozen', 'ice cream', 'peas', 'frozen_']):
            return 'freezer_ingredient'
            
        # Fridge high signal
        if any(w in name for w in ['milk', 'yogurt', 'cheese', 'butter', 'cream', 'berry', 'berries', 'lettuce', 'spinach', 'tofu', 'hummus', 'egg']):
            return 'fridge'
            
        # Pantry high signal
        if any(w in name for w in ['rice', 'pasta', 'flour', 'sugar', 'bean', 'chickpea', 'lentil', 'oil', 'salt', 'pepper', 'spice', 'powder', 'can ', 'canned', 'cracker', 'chip', 'nut', 'almond', 'cashew']):
            return 'pantry'
            
        # Default to fridge for fresh-sounding items (veggies)
        if any(w in name for w in ['onion', 'garlic', 'potato', 'squash', 'shallot']):
            return 'pantry'  # These usually sit in pantry/cool dark place
            
        # Most other fresh produce goes in fridge
        return 'fridge'

