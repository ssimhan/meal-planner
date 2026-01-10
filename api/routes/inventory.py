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
            
            StorageEngine.update_inventory_item(db_category, item, updates)
            
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
        
        # In Db, move is just changing the category
        StorageEngine.update_inventory_item(cat_map.get(to_category), item_name, updates={'moved_from': from_category})
        # Note: In a real app we should verify it exists in from_category, 
        # but for now we follow the simple upsert logic.
        
        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": StorageEngine.get_inventory()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
