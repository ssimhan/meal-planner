import os
from flask import request
from supabase import create_client

# Load local environment variables if they exist
try:
    from dotenv import load_dotenv
    for env_file in ['.env.local', '.env']:
        path = os.path.join(os.getcwd(), env_file)
        if os.path.exists(path):
            load_dotenv(path)
            break
except ImportError:
    pass

# Initialize Supabase client with Service Role Key to bypass RLS in the backend
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.environ.get('SUPABASE_ANON_KEY')

if not SUPABASE_URL:
    print("WARNING: SUPABASE_URL is missing from environment!")
if not SUPABASE_SERVICE_KEY:
    print("WARNING: SUPABASE_SERVICE_KEY is missing from environment!")

supabase = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("Supabase client initialized successfully.")
    except Exception as e:
        print(f"ERROR: Failed to initialize Supabase client: {e}")

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
        if not supabase: return []
        h_id = get_household_id()
        try:
            res = supabase.table("recipes").select("id, name, metadata").eq("household_id", h_id).execute()
            # Transformation to include id and name from the columns, plus categories/cuisine from metadata
            return [
                {
                    "id": r['id'],
                    "name": r['name'],
                    "cuisine": r['metadata'].get('cuisine', 'unknown'),
                    "meal_type": r['metadata'].get('meal_type', 'unknown'),
                    "effort_level": r['metadata'].get('effort_level', 'normal'),
                    "no_chop_compatible": r['metadata'].get('no_chop_compatible', False)
                } for r in res.data
            ]
        except Exception as e:
            print(f"Error fetching recipes: {e}")
            return []

    @staticmethod
    def get_recipe_details(recipe_id):
        if not supabase: return None
        h_id = get_household_id()
        try:
            res = supabase.table("recipes").select("id, name, metadata, content").eq("household_id", h_id).eq("id", recipe_id).execute()
            if not res.data:
                return None
            row = res.data[0]
            # Merge name into recipe metadata for UI
            recipe_data = row['metadata']
            recipe_data['name'] = row['name']
            recipe_data['id'] = row['id']
            
            return {
                "recipe": recipe_data,
                "markdown": row['content']
            }
        except Exception as e:
            print(f"Error fetching recipe details for {recipe_id}: {e}")
            return None

    @staticmethod
    def get_history():
        if not supabase: return {"weeks": []}
        h_id = get_household_id()
        try:
            # Fetch all meal plans for the household
            res = supabase.table("meal_plans").select("history_data").eq("household_id", h_id).order("week_of", desc=True).execute()
            return {"weeks": [row['history_data'] for row in res.data]}
        except Exception as e:
            print(f"Error fetching history: {e}")
            return {"weeks": []}

    @staticmethod
    def update_meal_plan(week_of, plan_data=None, history_data=None, status=None):
        if not supabase: return
        h_id = get_household_id()
        try:
            update_payload = {}
            if plan_data is not None: update_payload['plan_data'] = plan_data
            if history_data is not None: update_payload['history_data'] = history_data
            if status is not None: update_payload['status'] = status
            
            supabase.table("meal_plans").upsert({
                "household_id": h_id,
                "week_of": week_of,
                **update_payload
            }).execute()
        except Exception as e:
            print(f"Error updating meal plan for {week_of}: {e}")

    @staticmethod
    def update_inventory_item(category, item_name, updates=None, delete=False):
        if not supabase: return
        h_id = get_household_id()
        try:
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
        except Exception as e:
            print(f"Error updating inventory item {item_name}: {e}")
    @staticmethod
    def get_active_week():
        """Find the active (not archived) meal plan for the household, prioritizing the current week."""
        if not supabase: return None
        h_id = get_household_id()
        
        from datetime import datetime, timedelta
        today = datetime.now().date()
        
        try:
            # 1. First priority: look for an 'active' plan that covers today
            # We look for plans where week_of <= today, ordered by week_of DESC
            today_str = today.strftime('%Y-%m-%d')
            res = supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("status", "active").lte("week_of", today_str).order("week_of", desc=True).limit(1).execute()
            
            if res.data:
                plan = res.data[0]
                week_start = plan['week_of']
                if isinstance(week_start, str):
                    week_start = datetime.strptime(week_start, '%Y-%m-%d').date()
                
                # Check if today is within the 7-day window
                if week_start <= today < (week_start + timedelta(days=7)):
                    return plan

            # 2. Second priority: find any plan currently in 'planning'
            res = supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("status", "planning").order("week_of", desc=True).limit(1).execute()
            if res.data:
                return res.data[0]

            # 3. Last fallback: the most recent non-archived plan of any status
            res = supabase.table("meal_plans").select("*").eq("household_id", h_id).neq("status", "archived").order("week_of", desc=True).limit(1).execute()
            return res.data[0] if res.data else None
            
        except Exception as e:
            print(f"Error fetching active week: {e}")
            return None

    @staticmethod
    def get_workflow_state(plan=None):
        """Determine current workflow state from DB plan data."""
        if not plan:
            plan = StorageEngine.get_active_week()
            
        if not plan:
            return 'new_week', None

        # Transform DB plan back to compatibility format for logic
        data = plan.get('plan_data') or {}
        history_data = plan.get('history_data') or {}
        week_of = plan.get('week_of')
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
    def get_available_weeks():
        """Generate list of available weeks with selectability constraints."""
        h_id = get_household_id()
        
        from datetime import datetime, timedelta
        # Lower bound: Dec 29, 2025 (a Monday)
        start_date = datetime(2025, 12, 29).date()
        
        today = datetime.now().date()
        
        # Upper bound for generation: 4 weeks out
        end_generation = today + timedelta(weeks=4)
        
        # Get existing weeks from DB
        existing_weeks = {}
        if supabase:
            try:
                res = supabase.table("meal_plans").select("week_of, status").eq("household_id", h_id).execute()
                # Store keys as strings for reliable matching
                for r in res.data:
                    w_key = str(r['week_of'])
                    existing_weeks[w_key] = r['status']
            except Exception as e:
                print(f"Error fetching existing weeks for selector: {e}")

        available_weeks = []
        current_monday = start_date
        
        while current_monday <= end_generation:
            week_str = current_monday.strftime('%Y-%m-%d')
            sunday_before = current_monday - timedelta(days=1)
            
            # Constraints:
            # 1. Lower bound is already handled by start_date = 2025-12-29
            # 2. Selectability: Sunday start date is within 48h of today
            # Sunday 00:00 is ~ today + 2 days
            is_selectable = sunday_before <= today + timedelta(days=2)
            
            available_weeks.append({
                "week_of": week_str,
                "exists": week_str in existing_weeks,
                "status": existing_weeks.get(week_str, "not_created"),
                "is_selectable": is_selectable
            })
            current_monday += timedelta(weeks=1)
            
        return available_weeks

    @staticmethod
    def archive_expired_weeks():
        """Find weeks in DB that have passed their end date and mark them as archived."""
        if not supabase: return
        h_id = get_household_id()
        # Find active/planning plans
        try:
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
        except Exception as e:
            print(f"Error in archive_expired_weeks: {e}")
