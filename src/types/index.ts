// Core API Response Types

export interface WorkflowStatus {
  week_of: string;
  state: string;
  has_data: boolean;
  status: string;
  message?: string;
  current_day?: string;
  today_dinner?: DinnerData;
  today_lunch?: LunchData;
  today_snacks?: SnackData;
  today?: { // Mapping API's 'today' object structure
    day: string;
    date: string;
    dinner: DinnerData | null;
    lunch: LunchData | null;
    snacks: SnackData;
    prep_tasks: PrepTask[];
    prep_completed: string[];
  };
  prep_tasks?: PrepTask[]; // Historical/Week-level if flattened, but API sends it inside 'today' AND we might want it at root too? No, API sends it inside 'today' AND week-level logic might exist. 
  // API returns "prep_tasks": [] inside "today" object.
  // Wait, looking at status.py, it returns "today": { ..., "prep_tasks": [...] }. It does NOT return "prep_tasks" at top level.

  week_data?: WeekData;
  available_weeks?: AvailableWeek[];
  next_week?: {
    week_of: string;
    status: string;
  };
  pending_recipes?: string[];
  slots?: { [key: string]: any };
}

export interface AvailableWeek {
  week_of: string;
  exists: boolean;
  status: string;
  is_selectable: boolean;
}

export interface PrepTask {
  id?: string;
  task: string;
  meal_id?: string;
  meal_name?: string;
  day?: string;
  type?: 'dinner' | 'lunch';
  status: 'pending' | 'complete';
}

export interface DinnerData {
  day: string;
  recipe_id: string;
  made?: boolean | string;
  vegetables?: string[];
  kids_feedback?: string;
  actual_meal?: string;
  needs_fix?: boolean;
  freezer_used?: FreezerMeal;
}

export interface LunchData {
  recipe_id?: string;
  recipe_name?: string;
  prep_style?: string;
  assembly_notes?: string;
  kids_lunch_feedback?: string;
  adult_lunch_feedback?: string;
  kids_lunch_made?: boolean;
  adult_lunch_made?: boolean;
  kids_lunch_needs_fix?: boolean;
  adult_lunch_needs_fix?: boolean;
}

export interface SnackData {
  school: string;
  home: string;
  school_snack_feedback?: string;
  home_snack_feedback?: string;
  school_snack_made?: boolean;
  home_snack_made?: boolean;
  school_snack_needs_fix?: boolean;
  home_snack_needs_fix?: boolean;
}

export interface WeekData {
  week_of?: string;
  plan_url?: string;
  freezer_inventory?: FreezerMeal[];
  dinners?: Dinner[];
  lunches?: { [day: string]: Lunch };
  snacks?: { [day: string]: SnackData };
  rollover?: string[];
  daily_feedback?: {
    [day: string]: DailyFeedback;
  };
  wizard_state?: any; // Contains transient wizard progress
}

export interface DailyFeedback {
  school_snack?: string;
  school_snack_made?: boolean;
  school_snack_needs_fix?: boolean;
  home_snack?: string;
  home_snack_made?: boolean;
  home_snack_needs_fix?: boolean;
  kids_lunch?: string;
  kids_lunch_made?: boolean;
  kids_lunch_needs_fix?: boolean;
  adult_lunch?: string;
  adult_lunch_made?: boolean;
  adult_lunch_needs_fix?: boolean;
  dinner_feedback?: string;
  prep_completed?: string[];
}

export interface FreezerMeal {
  meal: string;
  frozen_date?: string;
  servings?: number;
}

export interface Dinner {
  day: string;
  recipe_id: string;
  template?: string;
  made?: boolean | string;
  vegetables?: string[];
  kids_feedback?: string;
  actual_meal?: string;
  needs_fix?: boolean;
  freezer_used?: FreezerMeal;
}

export interface Lunch {
  day: string;
  recipe_id?: string;
  recipe_name?: string;
  type?: string;
  prep_style?: string;
  components?: string[];
}

// Inventory Types

export interface Inventory {
  fridge: InventoryItem[];
  pantry: InventoryItem[];
  spice_rack: InventoryItem[];
  freezer: FreezerInventory;
}

export interface InventoryItem {
  item: string;
  quantity?: number;
  unit?: string;
  type?: 'meal' | 'ingredient';
  added?: string;
}

export interface FreezerInventory {
  backups: FreezerMeal[];
  ingredients?: InventoryItem[];
}

export interface InventoryResponse {
  fridge: InventoryItem[];
  pantry: InventoryItem[];
  spice_rack: InventoryItem[];
  freezer: FreezerInventory;
  inventory?: Inventory; // For compatibility with some endpoints
}

export interface InventoryUpdateData {
  quantity?: number;
  unit?: string;
  added?: string;
  servings?: number; // For freezer meals
}

// Recipe Types

export interface Recipe {
  id: string;
  name: string;
  cuisine?: string;
  meal_type?: string;
  effort_level?: string;
  no_chop_compatible?: boolean;
  leftover_potential?: string;
  kid_favorite?: boolean;
  main_veg?: string[];
  avoid_contains?: string[];
  appliances?: string[];
  ingredients?: string[];
  instructions?: string;
  tags?: string[];
}

export interface RecipeListItem {
  id: string;
  name: string;
  cuisine?: string;
  meal_type?: string;
  effort_level?: string;
  no_chop_compatible?: boolean;
  tags?: string[];
}

export interface RecipesResponse {
  recipes: RecipeListItem[];
}

// Analytics Types

export interface Analytics {
  popularity: RecipePopularity[];
  recent_feedback: FeedbackSummary[];
  adherence?: {
    total_planned: number;
    total_made: number;
    percentage: number;
  };
  vegetable_usage?: {
    [vegetable: string]: number;
  };
}

export interface RecipePopularity {
  id: string;
  name: string;
  count: number;
  last_feedback?: string;
}

export interface FeedbackSummary {
  recipe_id: string;
  recipe_name: string;
  date: string;
  feedback: string;
}

// Plan Generation Types

export interface GeneratePlanResponse {
  success: boolean;
  message: string;
  plan_url?: string;
  week_of: string;
}

export interface CreateWeekResponse {
  success: boolean;
  message: string;
  week_of: string;
  proposed_veg?: string[];
  rollover_count?: number;
}

export interface ConfirmVegResponse extends WorkflowStatus {
  success?: boolean;
  message?: string;
}

// Meal Logging Types

export interface LogMealData {
  week?: string;
  day?: string;
  made?: string | boolean;
  vegetables?: string;
  kids_feedback?: string;
  kids_complaints?: string;
  actual_meal?: string;
  made_2x?: boolean;
  freezer_meal?: string;
  reason?: string;
  confirm_day?: boolean;
  // Snack/lunch feedback
  school_snack_feedback?: string;
  home_snack_feedback?: string;
  kids_lunch_feedback?: string;
  adult_lunch_feedback?: string;
  // Made status for each meal type
  school_snack_made?: boolean;
  home_snack_made?: boolean;
  kids_lunch_made?: boolean;
  adult_lunch_made?: boolean;
  // Need fix flags
  dinner_needs_fix?: boolean;
  kids_lunch_needs_fix?: boolean;
  adult_lunch_needs_fix?: boolean;
  school_snack_needs_fix?: boolean;
  home_snack_needs_fix?: boolean;
  request_recipe?: boolean;
  // Prep completion tracking
  prep_completed?: string[];
  // Outside meal leftovers
  outside_leftover_name?: string;
  outside_leftover_qty?: number;
  leftovers_created?: string;
}

export interface LogMealResponse extends WorkflowStatus {
  success?: boolean;
  message?: string;
}

// Inventory Operations Types

export interface AddInventoryItemRequest {
  category: string;
  item: string;
  quantity?: number;
  unit?: string;
}

export interface BulkAddInventoryItem {
  category: string;
  item: string;
  quantity?: number;
  unit?: string;
}

export interface InventoryOperationResponse {
  success: boolean;
  message: string;
  inventory?: Inventory;
}

// Recipe Import Types

export interface ImportRecipeRequest {
  url: string;
}

export interface ImportRecipeResponse {
  success: boolean;
  message: string;
  recipe_id?: string;
}

// Replan Types

export interface ReplanResponse {
  success: boolean;
  message: string;
  output?: string;
}

// Swap Meals Types

export interface SwapMealsRequest {
  week: string;
  day1: string;
  day2: string;
}

export interface SwapMealsResponse {
  success: boolean;
  message: string;
}

// Recipe Capture Types

export interface CaptureRecipeRequest {
  name: string;
  mode: 'url' | 'manual';
  url?: string;
  ingredients?: string;
  instructions?: string;
  is_snack_only?: boolean;
}

export interface CaptureRecipeResponse {
  status: string;
  message: string;
  recipe_id: string;
}

// Error Response Type

export interface ApiError {
  message: string;
  error?: string;
}

// Wizard Types

export interface ReviewDay {
  day: string;
  dinner: {
    planned_recipe_id: string | null;
    planned_recipe_name: string | null;
    made: boolean | null;
    actual_meal: string | null;
    leftovers: boolean | null;
    leftovers_note: string;
    leftovers_qty: number;
    instead_meal?: string;
  };
  snacks: {
    school_snack: string | null;
    home_snack: string | null;
    kids_lunch: string | null;
    adult_lunch: string | null;
  };
  planned_snacks: {
    school_snack: string | null;
    home_snack: string | null;
    kids_lunch: string | null;
  };
}

export interface InventoryState {
  meals: any[];
  ingredients: {
    fridge: any[];
    freezer: any[];
    pantry: any[];
    spice_rack: any[];
  };
}
