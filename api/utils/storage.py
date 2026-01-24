import os
from flask import request
from supabase import create_client
from pathlib import Path
import yaml

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

# Critical: Distinguish between Service Role (Admin) and Anon (Public) keys
_service_role_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
_anon_key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.environ.get('SUPABASE_ANON_KEY')

# We prefer the Service Role key for backend operations to bypass RLS
SUPABASE_SERVICE_KEY = _service_role_key or _anon_key

# Flag to verify we have write access
IS_SERVICE_ROLE = bool(_service_role_key)

if not SUPABASE_URL:
    print("WARNING: SUPABASE_URL is missing from environment!")
if not SUPABASE_SERVICE_KEY:
    print("WARNING: SUPABASE_SERVICE_KEY is missing from environment!")
if not IS_SERVICE_ROLE:
    print("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Backend is running with Public/Anon permissions only. Writes may fail RLS.")

supabase = None
init_error = None

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("Supabase client initialized successfully.")
    except Exception as e:
        init_error = str(e)
        print(f"ERROR: Failed to initialize Supabase client: {e}")

import time

def execute_with_retry(query, max_retries=3, delay=0.5):
    """
    Execute a Supabase query with retry logic for transient network errors.
    Handles [Errno 35] Resource temporarily unavailable and other httpx errors.
    """
    last_exception = None
    for i in range(max_retries):
        try:
            return query.execute()
        except Exception as e:
            last_exception = e
            msg = str(e)
            # Retry on specific network errors
            if "[Errno 35]" in msg or "[Errno 8]" in msg or "Resource temporarily unavailable" in msg or "nodename nor servname provided" in msg or "httpx" in msg:
                print(f"Supabase query retry {i+1}/{max_retries} due to: {e}")
                time.sleep(delay * (2 ** i)) # Exponential backoff
                continue
            raise e
    
    print(f"Supabase query failed after {max_retries} retries: {last_exception}")
    raise last_exception

def get_household_id():
    """Helper to get household_id from request context."""
    return getattr(request, 'household_id', "00000000-0000-0000-0000-000000000001")

class StorageEngine:
    """Storage abstraction to handle DB vs File operations."""
    
    @staticmethod
    def get_inventory():
        h_id = get_household_id()
        query = supabase.table("inventory_items").select("*").eq("household_id", h_id)
        res = execute_with_retry(query)
        
        # Transform flat DB rows back to the nested YAML structure for compatibility
        # Transform flat DB rows back to the nested YAML structure for compatibility
        inventory = {'fridge': [], 'pantry': [], 'spice_rack': [], 'freezer': {'backups': [], 'ingredients': []}}
        
        for item in res.data:
            category = item['category']
            formatted = {
                'item': item['item'],
                'quantity': item['quantity'],
                'unit': item['unit'],
                **(item.get('metadata') or {})
            }
            
            if category == 'fridge':
                inventory['fridge'].append(formatted)
            elif category == 'pantry':
                inventory['pantry'].append(formatted)
            elif category == 'spice_rack':
                inventory['spice_rack'].append(formatted)
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
            query = supabase.table("recipes").select("id, name, metadata").eq("household_id", h_id)
            res = execute_with_retry(query)
            if not res or not hasattr(res, 'data') or res.data is None:
                return []
                
            # Transformation to include id and name from the columns, plus categories/cuisine from metadata
            return [
                {
                    "id": r['id'],
                    "name": r['name'],
                    "cuisine": (r.get('metadata') or {}).get('cuisine', 'unknown'),
                    "meal_type": (r.get('metadata') or {}).get('meal_type', 'unknown'),
                    "effort_level": (r.get('metadata') or {}).get('effort_level', 'normal'),
                    "no_chop_compatible": (r.get('metadata') or {}).get('no_chop_compatible', False),
                    "tags": (r.get('metadata') or {}).get('tags', [])
                } for r in res.data
            ]
        except Exception as e:
            print(f"Error fetching recipes: {e}")
            import traceback
            traceback.print_exc()
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
            recipe_data = row.get('metadata') or {}
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
            # The original instruction snippet for get_history was likely a mistake,
            # as it introduced a 'week_of' parameter that wasn't present in the method signature
            # and changed the select columns. Reverting to original logic for fetching all history.
            res = supabase.table("meal_plans").select("history_data").eq("household_id", h_id).order("week_of", desc=True).execute()
            return {"weeks": [row['history_data'] for row in res.data]}
        except Exception as e:
            print(f"Error fetching history: {e}")
            return {"weeks": []}

    @staticmethod
    def update_meal_plan(week_of, plan_data=None, history_data=None, status=None):
        if not supabase: return
        h_id = get_household_id()
        if not IS_SERVICE_ROLE:
            raise Exception("SUPABASE_SERVICE_ROLE_KEY is missing. Cannot write to database.")
        try:
            update_payload = {}
            if plan_data is not None: update_payload['plan_data'] = plan_data
            if history_data is not None: update_payload['history_data'] = history_data
            if status is not None: update_payload['status'] = status
            
            supabase.table("meal_plans").upsert({
                "household_id": h_id,
                "week_of": week_of,
                **update_payload
            }, on_conflict="household_id, week_of").execute()
        except Exception as e:
            print(f"Error updating meal plan for {week_of}: {e}")

    @staticmethod
    def update_inventory_item(category, item_name, updates=None, delete=False):
        if not supabase: return
        h_id = get_household_id()
        if not IS_SERVICE_ROLE:
            raise Exception("SUPABASE_SERVICE_ROLE_KEY is missing. Cannot write to database.")
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
            }, on_conflict="household_id, category, item").execute()

            # PENDING RECIPE WORKFLOW: If this is a freezer meal, ensure it exists in the recipe index
            if category == 'freezer_backup' and not delete:
                import re
                recipe_id = re.sub(r'[^a-zA-Z0-9]', '_', item_name.lower()).strip('_')
                
                # Check if recipe exists
                existing_recipe = StorageEngine.get_recipe_details(recipe_id)
                if not existing_recipe:
                    print(f"Auto-capturing new meal as recipe: {item_name}")
                    # Create skeleton recipe
                    metadata = {
                        "name": item_name,
                        "cuisine": "unknown",
                        "meal_type": "dinner", # Assume dinner for freezer backups
                        "effort_level": "normal",
                        "tags": ["missing ingredients", "missing instructions"]
                    }
                    StorageEngine.save_recipe(recipe_id, item_name, metadata, f"# {item_name}\n\nRecipe captured from freezer inventory. Please add ingredients and instructions.")
                    
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
                if today.weekday() < 5 and now.hour >= 18: 
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
            
            # Filter out weeks that don't exist and aren't selectable yet
            # This prevents the "4-week view" bug where future unplannable weeks clutter the UI
            if (week_str in existing_weeks) or is_selectable:
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

    @staticmethod
    def get_pending_recipes():
        """Detect 'Actual Meals' logged that are not in the recipe index."""
        if not supabase: return []
        h_id = get_household_id()
        
        try:
            # 1. Get all recipes
            recipes_res = supabase.table("recipes").select("id, name").eq("household_id", h_id).execute()
            recipe_ids = {r['id'] for r in recipes_res.data}
            recipe_names = {r['name'].lower() for r in recipes_res.data}
            
            # 2. Get history (all weeks)
            res = supabase.table("meal_plans").select("history_data").eq("household_id", h_id).execute()
            weeks = [row['history_data'] for row in res.data if row.get('history_data')]
            
            pending = []
            seen = set()
            
            # Common non-recipe keywords to ignore
            ignore = {
                'leftovers', 'skipped', 'outside_meal', 'same', 'none', 'yes', 'no', 'true', 'false',
                'freezer meal', 'ate out', 'make at home', 'takeout', 'delivery', 'restaurant'
            }
            
            # Load ignored recipes from file
            ignored_path = Path('data/ignored.yml')
            if ignored_path.exists():
                with open(ignored_path, 'r') as f:
                    saved_ignores = yaml.safe_load(f) or []
                    for i in saved_ignores:
                        ignore.add(i.lower())

            for week in weeks:
                # Check dinners
                for dinner in week.get('dinners', []):
                    actual = dinner.get('actual_meal')
                    if actual and isinstance(actual, str):
                        actual_clean = actual.strip()
                        if actual_clean.lower() in ignore: continue
                        
                        actual_id = actual_clean.lower().replace(' ', '_')
                        if actual_id not in recipe_ids and actual_clean.lower() not in recipe_names:
                            if actual_clean not in seen:
                                pending.append(actual_clean)
                                seen.add(actual_clean)
                                
                # Check lunches/snacks in daily_feedback
                df = week.get('daily_feedback', {})
                for day, feedback in df.items():
                    for key in ['kids_lunch_made', 'adult_lunch_made', 'school_snack_made', 'home_snack_made']:
                        actual = feedback.get(key)
                        if actual and isinstance(actual, str):
                            actual_clean = actual.strip()
                            if actual_clean.lower() in ignore: continue
                            
                            actual_id = actual_clean.lower().replace(' ', '_')
                            if actual_id not in recipe_ids and actual_clean.lower() not in recipe_names:
                                if actual_clean not in seen:
                                    pending.append(actual_clean)
                                    seen.add(actual_clean)
            return pending
        except Exception as e:
            print(f"Error in get_pending_recipes: {e}")
            return []

    @staticmethod
    def delete_recipe(recipe_id):
        """Delete a single recipe from the database."""
        if not supabase: return
        h_id = get_household_id()
        if not IS_SERVICE_ROLE:
            raise Exception("SUPABASE_SERVICE_ROLE_KEY is missing. Cannot write to database.")
        try:
            supabase.table("recipes").delete().eq("id", recipe_id).eq("household_id", h_id).execute()
        except Exception as e:
            print(f"Error deleting recipe {recipe_id}: {e}")
            raise e

    @staticmethod
    def get_recipe_content(recipe_id):
        """Get recipe content (ingredients, instructions) from YAML file."""
        yaml_path = Path(f'recipes/details/{recipe_id}.yaml')
        
        if not yaml_path.exists():
            # If YAML doesn't exist, return empty lists but don't fail
            # This allows the editor to start fresh for newly captured recipes or missing files
            return {
                'ingredients': [],
                'instructions': []
            }
        
        try:
            with open(yaml_path, 'r') as f:
                data = yaml.safe_load(f) or {}
            
            return {
                'ingredients': data.get('ingredients', []),
                'instructions': data.get('instructions') or data.get('directions', [])
            }
        except Exception as e:
            print(f"Error reading recipe content for {recipe_id}: {e}")
            return {
                'ingredients': [],
                'instructions': []
            }
    
    @staticmethod
    def update_recipe_content(recipe_id, ingredients=None, instructions=None, name=None, cuisine=None, effort_level=None, tags=None):
        """Update recipe YAML file with full metadata and content. Creates file if missing."""
        yaml_path = Path(f'recipes/details/{recipe_id}.yaml')
        
        # Ensure directory exists
        yaml_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            # Read existing YAML if it exists
            data = {}
            if yaml_path.exists():
                with open(yaml_path, 'r') as f:
                    data = yaml.safe_load(f) or {}
            
            # Update fields if provided
            if ingredients is not None: data['ingredients'] = ingredients
            if instructions is not None: data['instructions'] = instructions
            if name is not None: data['name'] = name
            if cuisine is not None: data['cuisine'] = cuisine
            if effort_level is not None: data['effort_level'] = effort_level
            if tags is not None: data['tags'] = tags
            
            # Write back to file
            with open(yaml_path, 'w', encoding='utf-8') as f:
                yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
            
            return True
        except Exception as e:
            print(f"Error updating recipe content for {recipe_id}: {e}")
            raise e

    @staticmethod
    def save_recipe(recipe_id, name, metadata, content):
        """Save a single recipe to the database."""
        if not supabase: return
        h_id = get_household_id()
        if not IS_SERVICE_ROLE:
            raise Exception("SUPABASE_SERVICE_ROLE_KEY is missing. Cannot write to database.")
        try:
            supabase.table("recipes").upsert({
                "id": recipe_id,
                "household_id": h_id,
                "name": name,
                "metadata": metadata,
                "content": content
            }).execute()
        except Exception as e:
            print(f"Error saving recipe {recipe_id}: {e}")
            raise e

    @staticmethod
    def ignore_recipe(name):
        """Add a recipe name to the ignored list."""
        try:
            ignored_path = Path('data/ignored.yml')
            existing = []
            if ignored_path.exists():
                with open(ignored_path, 'r') as f:
                    existing = yaml.safe_load(f) or []
            
            if name not in existing:
                existing.append(name)
                
                # Sort for tidiness
                existing.sort()
                
                with open(ignored_path, 'w', encoding='utf-8') as f:
                    yaml.dump(existing, f)
                    
            return True
        except Exception as e:
            print(f"Error ignoring recipe {name}: {e}")
            return False

    @staticmethod
    def get_preferences():
        """Load user ingredient preferences."""
        try:
            pref_path = Path('data/preferences.yml')
            if pref_path.exists():
                with open(pref_path, 'r') as f:
                    return yaml.safe_load(f) or {}
            return {}
        except Exception as e:
            print(f"Error loading preferences: {e}")
            return {}

    @staticmethod
    def save_preference(ingredient, brand_or_note):
        """Save a user preference for an ingredient."""
        if not IS_SERVICE_ROLE:
            print("WARNING: Sketchy write without Service Role")
            # raise Exception("SUPABASE_SERVICE_ROLE_KEY is missing. Cannot write to database.")
            # Preferences are currently file-based fallback mostly, but let's be safe or strict?
            # The current impl uses FILE based preferences (lines 586+).
            # So actually, we don't need the DB check here for the current file implementation.
            # But wait, looking at the code...
        try:
            pref_path = Path('data/preferences.yml')
            current = {}
            if pref_path.exists():
                with open(pref_path, 'r') as f:
                    current = yaml.safe_load(f) or {}
            
            # Simple Key-Value for now: "Milk" -> "Oatly"
            # Normalize key
            key = ingredient.lower().strip()
            current[key] = brand_or_note
            
            with open(pref_path, 'w', encoding='utf-8') as f:
                yaml.dump(current, f)
            return True
        except Exception as e:
            print(f"Error saving preference: {e}")
            return False

    @staticmethod
    def get_config():
        """Load config from DB or fallback to file."""
        if not supabase: 
            # Fallback to loading local config.yml if DB not available
            try:
                config_path = Path('config.yml')
                if config_path.exists():
                    with open(config_path, 'r') as f:
                        return yaml.safe_load(f) or {}
            except:
                pass
            return {}

        h_id = get_household_id()
        try:
            res = supabase.table("households").select("config").eq("id", h_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]['config'] or {}
        except Exception as e:
            print(f"Error fetching config: {e}")
        return {}

    @staticmethod
    def save_config(new_config):
        """Save config to DB."""
        if not supabase: return False
        h_id = get_household_id()
        if not IS_SERVICE_ROLE:
            raise Exception("SUPABASE_SERVICE_ROLE_KEY is missing. Cannot write to database.")
        try:
            supabase.table("households").update({"config": new_config}).eq("id", h_id).execute()
            return True
        except Exception as e:
            print(f"Error saving config: {e}")
            return False

