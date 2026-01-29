import os
import json
from pathlib import Path

DATA_FILE = Path(os.getcwd()) / 'data' / 'store_map.json'

DEFAULT_STORES = ['Costco', 'Trader Joe\'s', 'Safeway', 'Indian Store', 'Other']

EXCLUDED_STAPLES = {
    'oil', 'ghee', 'salt', 'pepper', 'black_pepper', 'red_chili_powder', 'turmeric', 
    'olive_oil', 'sunflower_oil', 'sesame_oil', 'vegetable_oil'
}

class GroceryMapper:
    _data = None

    @classmethod
    def load(cls):
        if cls._data is None:
            if DATA_FILE.exists():
                try:
                    with open(DATA_FILE, 'r') as f:
                        cls._data = json.load(f)
                except Exception:
                    cls._data = {'stores': DEFAULT_STORES, 'map': {}}
            else:
                cls._data = {'stores': DEFAULT_STORES, 'map': {}}
                cls.save()
        return cls._data

    @classmethod
    def save(cls):
        if cls._data:
            os.makedirs(DATA_FILE.parent, exist_ok=True)
            with open(DATA_FILE, 'w') as f:
                json.dump(cls._data, f, indent=2)

    @classmethod
    def get_stores(cls):
        data = cls.load()
        return data.get('stores', DEFAULT_STORES)

    @classmethod
    def add_store(cls, store_name):
        data = cls.load()
        stores = data.get('stores', [])
        if store_name not in stores:
            stores.append(store_name)
            data['stores'] = stores
            cls.save()
        return stores

    @classmethod
    def get_item_store(cls, item_name):
        data = cls.load()
        mapping = data.get('map', {})
        # Normalize simple case
        key = item_name.lower()
        if key in mapping: return mapping[key]

        # Partial match fallback (if key is part of map key or map key part of key?)
        # For safety, let's only do "if map key in item_name"
        # e.g. map has "milk", item is "organic milk" -> return Store
        for m_key, m_store in mapping.items():
            if m_key in key:
                return m_store
        
        return 'Other'

    @classmethod
    def set_item_store(cls, item_name, store_name):
        data = cls.load()
        if 'map' not in data: data['map'] = {}
        data['map'][item_name.lower()] = store_name
        cls.save()
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
        # But wait, many things are pantry. Let's do a heuristic for veggies.
        if any(w in name for w in ['onion', 'garlic', 'potato', 'squash', 'shallot']):
            return 'pantry' # These usually sit in pantry/cool dark place
            
        # Most other fresh produce goes in fridge
        return 'fridge'
