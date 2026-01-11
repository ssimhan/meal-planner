-- Phase 14.2: Database Migration Schema
-- Targeted for Supabase (Postgres)

-- 1. Helper for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Households (The primary container)
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    config JSONB DEFAULT '{}'::jsonb -- Stores settings from config.yml
);

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3. Profiles (Link Users to Households)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 4. Recipes
CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY, -- Slug ID e.g., 'masala_puri'
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- categories, cuisine, prep_time, etc.
    content TEXT, -- Markdown body
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(id, household_id)
);

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('fridge', 'pantry', 'freezer_ingredient', 'freezer_backup')),
    item TEXT NOT NULL,
    quantity FLOAT DEFAULT 1,
    unit TEXT DEFAULT 'count',
    metadata JSONB DEFAULT '{}'::jsonb, -- added_date, frozen_date, etc.
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory_items 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6. Meal Plans (History & Active Weeks)
CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    week_of DATE NOT NULL, -- Monday of the week
    plan_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- The 'inputs/WEEK.yml' structure
    history_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- The execution logs from 'history.yml'
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'planning')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(household_id, week_of)
);

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Simple Policy: A user can access data if they belong to the same household
-- We'll assume the 'household_id' is stored in the 'profiles' table for the logged-in user.

CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view recipes from their household" ON recipes
    FOR ALL USING (
        household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can view inventory from their household" ON inventory_items
    FOR ALL USING (
        household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can view meal plans from their household" ON meal_plans
    FOR ALL USING (
        household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can view their household details" ON households
    FOR ALL USING (
        id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
    );
