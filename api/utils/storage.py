import os
from supabase import create_client, Client
from flask import request

# Initialize Supabase client
# Initialize Supabase client with Service Role Key to bypass RLS in the backend
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
# Use Service Role Key for backend operations to bypass RLS during auth/onboarding
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.environ.get('SUPABASE_ANON_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) if SUPABASE_URL and SUPABASE_SERVICE_KEY else None

def get_household_id():
    """Helper to get household_id from request context."""
    return getattr(request, 'household_id', "00000000-0000-0000-0000-000000000001")

class StorageEngine:
    """Storage abstraction to handle DB vs File operations."""
    
    @staticmethod
    def get_inventory():
        h_id = get_household_id()
        res = supabase.table("inventory_items").select("*").eq("household_id", h_id).execute()
        
        # Transform flat DB rows back to the nested YAML structure for compatibility
        inventory = {'fridge': [], 'pantry': [], 'freezer': {'backups': [], 'ingredients': []}}
        
        for item in res.data:
            category = item['category']
            formatted = {
                'item': item['item'],
                'quantity': item['quantity'],
                'unit': item['unit'],
                **item['metadata']
            }
            
            if category == 'fridge':
                inventory['fridge'].append(formatted)
            elif category == 'pantry':
                inventory['pantry'].append(formatted)
            elif category == 'freezer_ingredient':
                inventory['freezer']['ingredients'].append(formatted)
            elif category == 'freezer_backup':
                # Convert back to 'meal' and 'servings' for UI compatibility
                formatted['meal'] = formatted.pop('item')
                formatted['servings'] = formatted.pop('quantity')
                inventory['freezer']['backups'].append(formatted)
        
        return inventory

    @staticmethod
    def get_recipes():
        h_id = get_household_id()
        res = supabase.table("recipes").select("metadata").eq("household_id", h_id).execute()
        return [r['metadata'] for r in res.data]

    @staticmethod
    def get_recipe_details(recipe_id):
        h_id = get_household_id()
        res = supabase.table("recipes").select("metadata, content").eq("household_id", h_id).eq("id", recipe_id).single().execute()
        if not res.data:
            return None
        return {
            "recipe": res.data['metadata'],
            "markdown": res.data['content']
        }

    @staticmethod
    def get_history():
        h_id = get_household_id()
        # Fetch all meal plans for the household
        res = supabase.table("meal_plans").select("history_data").eq("household_id", h_id).order("week_of", desc=True).execute()
        return {"weeks": [row['history_data'] for row in res.data]}

    @staticmethod
    def update_meal_plan(week_of, plan_data=None, history_data=None, status=None):
        h_id = get_household_id()
        update_payload = {}
        if plan_data is not None: update_payload['plan_data'] = plan_data
        if history_data is not None: update_payload['history_data'] = history_data
        if status is not None: update_payload['status'] = status
        
        supabase.table("meal_plans").upsert({
            "household_id": h_id,
            "week_of": week_of,
            **update_payload
        }).execute()

    @staticmethod
    def update_inventory_item(category, item_name, updates=None, delete=False):
        h_id = get_household_id()
        
        if delete:
            supabase.table("inventory_items").delete().eq("household_id", h_id).eq("category", category).eq("item", item_name).execute()
            return

        # Prepare payload for upsert
        # Since quantity and unit might be in updates, we need to extract them
        quantity = updates.pop('quantity', 1) if updates else 1
        unit = updates.pop('unit', 'count') if updates else 'count'
        
        supabase.table("inventory_items").upsert({
            "household_id": h_id,
            "category": category,
            "item": item_name,
            "quantity": quantity,
            "unit": unit,
            "metadata": updates or {}
        }).execute()
    @staticmethod
    def get_active_week():
        """Find the active (not archived) meal plan for the household."""
        h_id = get_household_id()
        # First priority: find what is currently 'active'
        res = supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("status", "active").order("week_of", desc=True).limit(1).execute()
        if res.data:
            return res.data[0]
            
        # Second priority: find what is in 'planning'
        res = supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("status", "planning").order("week_of", desc=True).limit(1).execute()
        return res.data[0] if res.data else None

    @staticmethod
    def get_workflow_state(plan=None):
        """Determine current workflow state from DB plan data."""
        if not plan:
            plan = StorageEngine.get_active_week()
            
        if not plan:
            return 'new_week', None

        # Transform DB plan back to compatibility format for logic
        data = plan['plan_data']
        history_data = plan['history_data']
        week_of = plan['week_of']
        status = plan.get('status')
        
        # Cross-reference with dates
        from datetime import datetime, timedelta
        if week_of:
            try:
                # Handle both string and date objects
                week_start_date = datetime.strptime(week_of, '%Y-%m-%d').date() if isinstance(week_of, str) else week_of
                week_end = week_start_date + timedelta(days=7)
                if datetime.now().date() >= week_end:
                    return 'archived', data
            except (ValueError, TypeError):
                pass

        if status == 'planning':
            fm_status = data.get('farmers_market', {}).get('status')
            if fm_status == 'confirmed':
                return 'ready_to_plan', data
            else:
                return 'awaiting_farmers_market', data
        elif status == 'active':
            now = datetime.now()
            week_start_date = datetime.strptime(week_of, '%Y-%m-%d').date() if isinstance(week_of, str) else week_of
            today = now.date()
            if week_start_date <= today < (week_start_date + timedelta(days=7)):
                if today.weekday() < 5 and now.hour >= 20: 
                    current_day_abbr = now.strftime('%a').lower()[:3]
                    for dinner in history_data.get('dinners', []):
                        if dinner.get('day') == current_day_abbr:
                            if 'made' not in dinner:
                                return 'waiting_for_checkin', data
                            break
            return 'active', data
        
        return 'new_week', None
    @staticmethod
    def archive_expired_weeks():
        """Find weeks in DB that have passed their end date and mark them as archived."""
        h_id = get_household_id()
        # Find active/planning plans
        res = supabase.table("meal_plans").select("*").eq("household_id", h_id).neq("status", "archived").execute()
        
        from datetime import datetime, timedelta
        now = datetime.now().date()
        
        for plan in res.data:
            week_of = plan['week_of']
            week_start = datetime.strptime(week_of, '%Y-%m-%d').date() if isinstance(week_of, str) else week_of
            week_end = week_start + timedelta(days=7)
            
            if now >= week_end:
                supabase.table("meal_plans").update({"status": "archived"}).eq("id", plan['id']).execute()
                print(f"Archived expired week: {week_of}")
