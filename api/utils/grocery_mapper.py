import os
import json
from pathlib import Path

DATA_FILE = Path(os.getcwd()) / 'data' / 'store_map.json'

DEFAULT_STORES = ['Costco', 'Trader Joe\'s', 'Safeway', 'Indian Store', 'Other']

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
