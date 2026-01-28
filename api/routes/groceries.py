from flask import Blueprint, jsonify, request
from api.utils.auth import require_auth
from api.utils import storage, invalidate_cache
from api.utils.grocery_mapper import GroceryMapper

groceries_bp = Blueprint('groceries', __name__)

@groceries_bp.route("/api/groceries/stores", methods=["GET"])
@require_auth
def get_stores():
    try:
        stores = GroceryMapper.get_stores()
        return jsonify({"status": "success", "stores": stores})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@groceries_bp.route("/api/groceries/stores", methods=["POST"])
@require_auth
def add_store():
    try:
        data = request.json or {}
        name = data.get('name')
        if not name: return jsonify({"status": "error", "message": "Name required"}), 400
        
        stores = GroceryMapper.add_store(name)
        return jsonify({"status": "success", "stores": stores})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@groceries_bp.route("/api/groceries/map", methods=["POST"])
@require_auth
def map_item():
    try:
        data = request.json or {}
        item = data.get('item')
        store = data.get('store')
        if not item or not store: return jsonify({"status": "error", "message": "Item and store required"}), 400
        
        GroceryMapper.set_item_store(item, store)
        return jsonify({"status": "success", "message": "Mapping updated"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@groceries_bp.route("/api/plan/shopping-list/add", methods=["POST"])
@require_auth
def add_extra_items():
    try:
        data = request.json or {}
        week_of = data.get('week_of')
        items = data.get('items', []) # List of strings
        
        if not week_of: return jsonify({"status": "error", "message": "Week required"}), 400
        if not items: return jsonify({"status": "success", "message": "No items to add"})
        
        h_id = storage.get_household_id()
        res = storage.supabase.table("meal_plans").select("plan_data").eq("household_id", h_id).eq("week_of", week_of).execute()
        
        if not res.data or len(res.data) == 0:
            return jsonify({"status": "error", "message": "Week not found"}), 404
            
        plan_data = res.data[0].get('plan_data') or {}
        current_extras = plan_data.get('extra_items', [])
        
        # Determine items to append (avoid exact dupes if needed, or allow?)
        # Let's allow dupes in the raw list, handled by set() in generator if desired, 
        # but generator does set(). Let's blindly append.
        
        # Clean items
        new_items = [i.strip() for i in items if i.strip()]
        updated_extras = current_extras + new_items
        
        plan_data['extra_items'] = updated_extras
        
        storage.StorageEngine.update_meal_plan(week_of, plan_data=plan_data)
        invalidate_cache()
        
        return jsonify({"status": "success", "count": len(updated_extras)})
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@groceries_bp.route("/api/plan/shopping-list/remove-extra", methods=["POST"])
@require_auth
def remove_extra_item():
    try:
        data = request.json or {}
        week_of = data.get('week_of')
        item = data.get('item')
        
        if not week_of or not item: return jsonify({"status": "error", "message": "Data required"}), 400
        
        h_id = storage.get_household_id()
        res = storage.supabase.table("meal_plans").select("plan_data").eq("household_id", h_id).eq("week_of", week_of).execute()
        
        if res.data and len(res.data) > 0:
            plan_data = res.data[0].get('plan_data') or {}
            current_extras = plan_data.get('extra_items', [])
            if item in current_extras:
                current_extras.remove(item)
                plan_data['extra_items'] = current_extras
                storage.StorageEngine.update_meal_plan(week_of, plan_data=plan_data)
                invalidate_cache()
                
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
@groceries_bp.route("/api/plan/shopping-list/smart-update", methods=["POST"])
@require_auth
def smart_action():
    try:
        data = request.json or {}
        week_of = data.get('week_of')
        item = data.get('item')
        action = data.get('action') # 'add_to_inventory' or 'exclude_from_plan'
        
        if not week_of or not item or not action:
            return jsonify({"status": "error", "message": "Missing required fields", "code": "MISSING_FIELDS"}), 400
            
        h_id = storage.get_household_id()
        
        # Action 1: Add to inventory
        if action == 'add_to_inventory':
            try:
                # Default to pantry, quantity 1
                storage.StorageEngine.update_inventory_item('pantry', item, {
                    'quantity': 1,
                    'unit': 'count'
                })
                return jsonify({"status": "success", "message": "Item added to inventory"})
            except Exception as e:
                return jsonify({"status": "error", "message": "Failed to update inventory", "code": "INVENTORY_UPDATE_FAILED", "details": str(e)}), 500
            
        # Action 2: Exclude from plan
        elif action == 'exclude_from_plan':
            try:
                res = storage.supabase.table("meal_plans").select("plan_data").eq("household_id", h_id).eq("week_of", week_of).execute()
                
                if res.data and len(res.data) > 0:
                    plan_data = res.data[0].get('plan_data') or {}
                    excluded = plan_data.get('excluded_items', [])
                    
                    if item not in excluded:
                        excluded.append(item)
                        plan_data['excluded_items'] = excluded
                        storage.StorageEngine.update_meal_plan(week_of, plan_data=plan_data)
                        invalidate_cache()
                        
                    return jsonify({"status": "success", "message": "Item excluded from plan"})
                else:
                     return jsonify({"status": "error", "message": "Plan not found", "code": "PLAN_NOT_FOUND"}), 404
            except Exception as e:
                return jsonify({"status": "error", "message": "Failed to update plan", "code": "PLAN_UPDATE_FAILED", "details": str(e)}), 500
                
        return jsonify({"status": "error", "message": "Invalid action", "code": "INVALID_ACTION"}), 400
        
    except Exception as e:
        return jsonify({"status": "error", "message": "System error", "code": "INTERNAL_SERVER_ERROR", "details": str(e)}), 500
