import os
import yaml
from pathlib import Path
from datetime import datetime
from flask import Blueprint, jsonify, request
from api.utils import get_yaml_data, invalidate_cache
from api.utils.auth import require_auth
from api.utils.storage import StorageEngine
from api.utils.storage import StorageEngine

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route("/api/inventory")
@require_auth
def get_inventory():
    try:
        inventory = StorageEngine.get_inventory()
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@inventory_bp.route("/api/inventory/add", methods=["POST"])
@require_auth
def add_inventory():
    try:
        data = request.json or {}
        category = data.get('category')
        item = data.get('item')
        
        if not category or not item:
            return jsonify({"status": "error", "message": "Category and item required"}), 400
            
        db_category = category
        updates = {}
        if category == 'meals':
            db_category = 'freezer_backup'
            updates = {'quantity': 4, 'frozen_date': datetime.now().strftime('%Y-%m-%d')}
        elif category == 'frozen_ingredient':
            db_category = 'freezer_ingredient'
            updates = {'quantity': 1, 'unit': 'count', 'frozen_date': datetime.now().strftime('%Y-%m-%d')}
        elif category == 'pantry':
            updates = {'quantity': 1, 'unit': 'count'}
        elif category == 'fridge':
            updates = {'quantity': 1, 'unit': 'count', 'added': datetime.now().strftime('%Y-%m-%d')}
        elif category == 'leftovers':
            # Store in 'fridge' but with 'category': 'leftovers' for grouping
            db_category = 'fridge'
            updates = {
                'quantity': 1, 
                'unit': 'servings', 
                'added': datetime.now().strftime('%Y-%m-%d'),
                'category': 'leftovers' 
            }

        # Deduplication Logic: Check if exists
        current_inv = StorageEngine.get_inventory()
        # Map category to inventory key
        inv_key_map = {
            'fridge': 'fridge',
            'pantry': 'pantry',
            'meals': 'freezer', # Special handling needed as freezer is dict
            'frozen_ingredient': 'freezer',
            'freezer_backup': 'freezer',
            'freezer_ingredient': 'freezer'
        }
        
        inv_key = inv_key_map.get(category)
        existing_item = None
        
        if inv_key == 'freezer':
            # Check backups or ingredients
            if category == 'meals':
                existing_item = next((x for x in current_inv.get('freezer', {}).get('backups', []) if x.get('meal') == item), None)
            else:
                existing_item = next((x for x in current_inv.get('freezer', {}).get('ingredients', []) if x.get('item') == item), None)
        elif inv_key:
            existing_item = next((x for x in current_inv.get(inv_key, []) if x.get('item') == item), None)
            
        if existing_item:
            # Merge/Increment
            current_qty = existing_item.get('quantity') or existing_item.get('servings', 1)
            # Default increment is 1 (or 4 for meals, based on original logic?)
            # Logic: If quick-adding via "Add", usually implies adding 1 unit/batch
            increment = 4 if category == 'meals' else 1
            new_qty = int(current_qty) + increment
            
            if category == 'meals':
                updates['quantity'] = new_qty # mapped to servings in storage
            else:
                updates['quantity'] = new_qty
            
            # Keep existing unit
            if 'unit' in existing_item:
                updates['unit'] = existing_item['unit']

        StorageEngine.update_inventory_item(db_category, item, updates)
        
        # Legacy: Still invalidate cache if any
        invalidate_cache('inventory')
        
        return jsonify({"status": "success", "inventory": StorageEngine.get_inventory()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@inventory_bp.route("/api/inventory/bulk-add", methods=["POST"])
@require_auth
def bulk_add_inventory():
    try:
        data = request.json or {}
        items = data.get('items', [])
        
        if not items:
            return jsonify({"status": "error", "message": "No items provided"}), 400
            
        for entry in items:
            category = entry.get('category')
            item = entry.get('item')
            quantity = entry.get('quantity', 1)
            unit = entry.get('unit', 'count')
            
            db_category = category
            updates = {'quantity': quantity, 'unit': unit}
            
            if category == 'meals':
                db_category = 'freezer_backup'
                updates['frozen_date'] = datetime.now().strftime('%Y-%m-%d')
            elif category == 'fridge':
                updates['added'] = datetime.now().strftime('%Y-%m-%d')
                
            # TODO: Add deduplication here too for full correctness, 
            # but standard 'upsert' acts as overwrite for bulk operations usually.
            # Leaving as overwrite for now to allow explicit setting of quantities.
            
            StorageEngine.update_inventory_item(db_category, item, updates)
            
        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": StorageEngine.get_inventory()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@inventory_bp.route("/api/inventory/bulk-update", methods=["POST"])
@require_auth
def bulk_update_inventory():
    """
    Handle bulk operations (add/remove) for inventory items.
    Payload: { "changes": [ { "category": "...", "item": "...", "operation": "add"|"remove" } ] }
    """
    try:
        data = request.json or {}
        changes = data.get('changes', [])
            
        if not changes:
             return jsonify({"status": "error", "message": "No changes provided"}), 400

        for change in changes:
            category = change.get('category')
            item = change.get('item')
            op = change.get('operation')
            
            db_category = category
            if category == 'meals': db_category = 'freezer_backup'
            elif category == 'frozen_ingredient': db_category = 'freezer_ingredient'
            
            if op == 'remove':
                StorageEngine.update_inventory_item(db_category, item, delete=True)
            elif op == 'add':
                updates = {}
                if category == 'fridge':
                    updates = {'added': datetime.now().strftime('%Y-%m-%d')}
                elif category == 'meals':
                    updates = {'quantity': 4, 'frozen_date': datetime.now().strftime('%Y-%m-%d')}
                StorageEngine.update_inventory_item(db_category, item, updates=updates)

        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": StorageEngine.get_inventory()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@inventory_bp.route("/api/inventory/delete", methods=["POST"])
@require_auth
def delete_inventory():
    try:
        data = request.json or {}
        category = data.get('category')
        item_name = data.get('item')
        
        if not category or not item_name:
            return jsonify({"status": "error", "message": "Category and item required"}), 400
            
        db_category = category
        if category == 'meals': db_category = 'freezer_backup'
        elif category == 'frozen_ingredient': db_category = 'freezer_ingredient'

        StorageEngine.update_inventory_item(db_category, item_name, delete=True)
        
        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": StorageEngine.get_inventory()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@inventory_bp.route("/api/inventory/update", methods=["POST"])
@require_auth
def update_inventory():
    try:
        data = request.json or {}
        category = data.get('category')
        item_name = data.get('item')
        updates = data.get('updates', {}) 
        
        if not category or not item_name:
            return jsonify({"status": "error", "message": "Category and item required"}), 400
            
        db_category = category
        if category == 'meals': db_category = 'freezer_backup'
        elif category == 'frozen_ingredient': db_category = 'freezer_ingredient'

        StorageEngine.update_inventory_item(db_category, item_name, updates=updates)
        
        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": StorageEngine.get_inventory()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@inventory_bp.route("/api/inventory/move", methods=["POST"])
@require_auth
def move_inventory_item():
    try:
        data = request.json or {}
        item_name = data.get('item')
        from_category = data.get('from_category')
        to_category = data.get('to_category')
        
        if not item_name or not from_category or not to_category:
            return jsonify({"status": "error", "message": "Item, from_category, and to_category required"}), 400
            
        # Mapping for from/to categories
        cat_map = {
            'meals': 'freezer_backup',
            'frozen_ingredient': 'freezer_ingredient',
            'pantry': 'pantry',
            'fridge': 'fridge'
        }
        
        from_db = cat_map.get(from_category)
        to_db = cat_map.get(to_category)
        
        # 1. Fetch current inventory to get source item details
        inv = StorageEngine.get_inventory()
        
        # Helper to find item in nested structure
        def find_in_inv(cat_key, search_name):
            if cat_key == 'meals':
                return next((x for x in inv.get('freezer', {}).get('backups', []) if x.get('meal') == search_name), None)
            elif cat_key == 'frozen_ingredient':
                return next((x for x in inv.get('freezer', {}).get('ingredients', []) if x.get('item') == search_name), None)
            else:
                return next((x for x in inv.get(cat_key, []) if x.get('item') == search_name), None)

        source_item = find_in_inv(from_category, item_name)
        if not source_item:
            return jsonify({"status": "error", "message": f"Item {item_name} not found in {from_category}"}), 404
            
        # Extract metadata
        qty = source_item.get('quantity') or source_item.get('servings', 1)
        unit = source_item.get('unit', 'count')
        meta = {k: v for k, v in source_item.items() if k not in ['item', 'meal', 'quantity', 'servings', 'unit', 'category']}
        
        # 2. Check for duplicate in target
        target_item = find_in_inv(to_category, item_name)
        
        updates = {
            'quantity': qty,
            'unit': unit,
            **meta,
            'moved_from': from_category,
            'moved_at': datetime.now().strftime('%Y-%m-%d')
        }
        
        if target_item:
            # Merge logic
            target_qty = target_item.get('quantity') or target_item.get('servings', 1)
            updates['quantity'] = int(target_qty) + int(qty)
            # Keep target unit and metadata preference?
            # For now, updates overwrites, so we want to Preserve target's unit unless we want to overwrite.
            # Let's trust target unit if exists
            if 'unit' in target_item:
                 updates['unit'] = target_item['unit']
                 
        # 3. Add/Update Target
        StorageEngine.update_inventory_item(to_db, item_name, updates=updates)
        
        # 4. Remove Source
        StorageEngine.update_inventory_item(from_db, item_name, delete=True)
        
        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": StorageEngine.get_inventory()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
