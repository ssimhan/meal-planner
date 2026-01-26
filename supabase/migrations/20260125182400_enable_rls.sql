-- Chunk 1.4: RLS Policies

-- 1. Helper Function to get Current User's Household
-- optimizes query performance and readability
CREATE OR REPLACE FUNCTION get_auth_household_id()
RETURNS UUID AS $$
    SELECT household_id 
    FROM profiles 
    WHERE user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Profiles Table Policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Inventory Items Policies
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Households can view own inventory" ON inventory_items
    FOR SELECT USING (household_id = get_auth_household_id());

CREATE POLICY "Households can edit own inventory" ON inventory_items
    FOR ALL USING (household_id = get_auth_household_id());

-- 4. Recipes Policies
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Households can view own recipes" ON recipes
    FOR SELECT USING (household_id = get_auth_household_id());

CREATE POLICY "Households can edit own recipes" ON recipes
    FOR ALL USING (household_id = get_auth_household_id());

-- 5. Meal Plans Policies
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Households can view own plans" ON meal_plans
    FOR SELECT USING (household_id = get_auth_household_id());

CREATE POLICY "Households can edit own plans" ON meal_plans
    FOR ALL USING (household_id = get_auth_household_id());

-- 6. Households Table Policies
-- Users can see their own household
CREATE POLICY "Users can view their own household" ON households
    FOR SELECT USING (id = get_auth_household_id());

-- Users can edit their own household settings
CREATE POLICY "Users can update their own household" ON households
    FOR UPDATE USING (id = get_auth_household_id());
