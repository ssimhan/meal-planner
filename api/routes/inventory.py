import os
import yaml
from pathlib import Path
from datetime import datetime
from flask import Blueprint, jsonify, request
from api.utils import get_yaml_data, invalidate_cache
from scripts.github_helper import commit_file_to_github

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route("/api/inventory")
def get_inventory():
    try:
        # Use Cached Inventory logic by accessing directly or using helper
        # Since we modularized, we should probably use get_yaml_data directly 
        # because api/utils.py doesn't currently implement the in-memory CACHE that index.py had.
        # However, for now, let's just read the file directly as get_yaml_data does.
        # If performance is an issue, we can re-implement caching in api/utils or here.
        
        inventory = get_yaml_data('data/inventory.yml')
        if inventory is None:
            # Fallback empty inventory if file missing
            inventory = {'fridge':[], 'pantry':[], 'freezer':{}}
        
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@inventory_bp.route("/api/inventory/add", methods=["POST"])
def add_inventory():
    try:
        data = request.json or {}
        category = data.get('category') # 'meals', 'pantry', 'fridge'
        item = data.get('item')
        
        if not category or not item:
            return jsonify({"status": "error", "message": "Category and item required"}), 400
            
        inventory = get_yaml_data('data/inventory.yml') or {}
        inventory_path = Path('data/inventory.yml')
            
        if category == 'meals':
            if 'freezer' not in inventory: inventory['freezer'] = {}
            if 'backups' not in inventory['freezer']: inventory['freezer']['backups'] = []
            inventory['freezer']['backups'].append({
                'meal': item,
                'servings': 4,
                'frozen_date': datetime.now().strftime('%Y-%m-%d')
            })
        elif category == 'frozen_ingredient':
            if 'freezer' not in inventory: inventory['freezer'] = {}
            if 'ingredients' not in inventory['freezer']: inventory['freezer']['ingredients'] = []
            inventory['freezer']['ingredients'].append({
                'item': item,
                'quantity': 1,
                'unit': 'count',
                'frozen_date': datetime.now().strftime('%Y-%m-%d')
            })
        elif category == 'pantry':
            if 'pantry' not in inventory: inventory['pantry'] = []
            inventory['pantry'].append({
                'item': item,
                'quantity': 1,
                'unit': 'count'
            })
        elif category == 'fridge':
            if 'fridge' not in inventory: inventory['fridge'] = []
            inventory['fridge'].append({
                'item': item,
                'quantity': 1,
                'unit': 'count',
                'added': datetime.now().strftime('%Y-%m-%d')
            })
            
        inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')
        
        new_content = yaml.dump(inventory, default_flow_style=False, sort_keys=False, allow_unicode=True)
        
        try:
            with open(inventory_path, 'w') as f:
                f.write(new_content)
        except OSError:
            print("Read-only filesystem, skipping local write for inventory")
            
        # Sync to GitHub
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        
        success = commit_file_to_github(repo_name, str(inventory_path), "Update inventory via Web UI", content=new_content)
        
        if not success:
             return jsonify({"status": "error", "message": "Failed to sync inventory to GitHub"}), 500
        
        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@inventory_bp.route("/api/inventory/bulk-add", methods=["POST"])
def bulk_add_inventory():
    try:
        data = request.json or {}
        items = data.get('items', [])
        
        if not items:
            return jsonify({"status": "error", "message": "No items provided"}), 400
            
        inventory = get_yaml_data('data/inventory.yml') or {}
        inventory_path = Path('data/inventory.yml')
            
        for entry in items:
            category = entry.get('category')
            item = entry.get('item')
            quantity = entry.get('quantity', 1)
            unit = entry.get('unit', 'count')
            
            if category == 'meals':
                if 'freezer' not in inventory: inventory['freezer'] = {}
                if 'backups' not in inventory['freezer']: inventory['freezer']['backups'] = []
                inventory['freezer']['backups'].append({
                    'meal': item,
                    'servings': quantity if isinstance(quantity, int) else 4,
                    'frozen_date': datetime.now().strftime('%Y-%m-%d')
                })
            elif category == 'pantry':
                if 'pantry' not in inventory: inventory['pantry'] = []
                inventory['pantry'].append({
                    'item': item,
                    'quantity': quantity,
                    'unit': unit
                })
            elif category == 'fridge':
                if 'fridge' not in inventory: inventory['fridge'] = []
                inventory['fridge'].append({
                    'item': item,
                    'quantity': quantity,
                    'unit': unit,
                    'added': datetime.now().strftime('%Y-%m-%d')
                })
            
        inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')
        
        new_content = yaml.dump(inventory, default_flow_style=False, sort_keys=False, allow_unicode=True)
        
        try:
           with open(inventory_path, 'w') as f:
                f.write(new_content)
        except OSError:
            print("Read-only filesystem, skipping local write for inventory")
            
        # Sync to GitHub
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        
        success = commit_file_to_github(repo_name, str(inventory_path), "Bulk update inventory via Web UI", content=new_content)
        
        if not success:
             return jsonify({"status": "error", "message": "Failed to sync inventory to GitHub"}), 500
        
        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@inventory_bp.route("/api/inventory/delete", methods=["POST"])
def delete_inventory():
    try:
        data = request.json or {}
        category = data.get('category')
        item_name = data.get('item')
        
        if not category or not item_name:
            return jsonify({"status": "error", "message": "Category and item required"}), 400
            
        inventory = get_yaml_data('data/inventory.yml') or {}
        inventory_path = Path('data/inventory.yml')
        
        removed = False
        if category == 'meals':
            if 'freezer' in inventory and 'backups' in inventory['freezer']:
                initial_len = len(inventory['freezer']['backups'])
                inventory['freezer']['backups'] = [i for i in inventory['freezer']['backups'] if i.get('meal') != item_name]
                removed = len(inventory['freezer']['backups']) < initial_len
        elif category == 'frozen_ingredient':
            if 'freezer' in inventory and 'ingredients' in inventory['freezer']:
                initial_len = len(inventory['freezer']['ingredients'])
                inventory['freezer']['ingredients'] = [i for i in inventory['freezer']['ingredients'] if i.get('item') != item_name]
                removed = len(inventory['freezer']['ingredients']) < initial_len
        elif category == 'pantry':
            if 'pantry' in inventory:
                initial_len = len(inventory['pantry'])
                inventory['pantry'] = [i for i in inventory['pantry'] if i.get('item') != item_name]
                removed = len(inventory['pantry']) < initial_len
        elif category == 'fridge':
            if 'fridge' in inventory:
                initial_len = len(inventory['fridge'])
                inventory['fridge'] = [i for i in inventory['fridge'] if i.get('item') != item_name]
                removed = len(inventory['fridge']) < initial_len
        
        if not removed:
             return jsonify({"status": "error", "message": f"Item '{item_name}' not found in category '{category}'"}), 404

        inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')
        new_content = yaml.dump(inventory, default_flow_style=False, sort_keys=False, allow_unicode=True)
        
        try:
            with open(inventory_path, 'w') as f:
                f.write(new_content)
        except OSError:
            pass
            
        # Sync to GitHub
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        success = commit_file_to_github(repo_name, str(inventory_path), f"Delete {item_name} from {category} inventory", content=new_content)
        
        if not success:
             return jsonify({"status": "error", "message": "Failed to sync inventory to GitHub"}), 500
             
        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@inventory_bp.route("/api/inventory/update", methods=["POST"])
def update_inventory():
    try:
        data = request.json or {}
        category = data.get('category')
        item_name = data.get('item')
        updates = data.get('updates', {}) # e.g. {'quantity': 2, 'unit': 'lb'}
        
        if not category or not item_name:
            return jsonify({"status": "error", "message": "Category and item required"}), 400
            
        inventory = get_yaml_data('data/inventory.yml') or {}
        inventory_path = Path('data/inventory.yml')
        
        updated = False
        if category == 'meals':
            if 'freezer' in inventory and 'backups' in inventory['freezer']:
                for itm in inventory['freezer']['backups']:
                    if itm.get('meal') == item_name:
                        itm.update(updates)
                        updated = True
                        break
        elif category == 'frozen_ingredient':
            if 'freezer' in inventory and 'ingredients' in inventory['freezer']:
                for itm in inventory['freezer']['ingredients']:
                    if itm.get('item') == item_name:
                        itm.update(updates)
                        updated = True
                        break
        elif category == 'pantry':
            if 'pantry' in inventory:
                for itm in inventory['pantry']:
                    if itm.get('item') == item_name:
                        itm.update(updates)
                        updated = True
                        break
        elif category == 'fridge':
            if 'fridge' in inventory:
                for itm in inventory['fridge']:
                    if itm.get('item') == item_name:
                        itm.update(updates)
                        updated = True
                        break
        
        if not updated:
             return jsonify({"status": "error", "message": f"Item '{item_name}' not found in category '{category}'"}), 404

        inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')
        new_content = yaml.dump(inventory, default_flow_style=False, sort_keys=False, allow_unicode=True)
        
        try:
            with open(inventory_path, 'w') as f:
                f.write(new_content)
        except OSError:
            pass
            
        # Sync to GitHub
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        success = commit_file_to_github(repo_name, str(inventory_path), f"Update {item_name} in {category} inventory", content=new_content)
        
        if not success:
             return jsonify({"status": "error", "message": "Failed to sync inventory to GitHub"}), 500
             
        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
