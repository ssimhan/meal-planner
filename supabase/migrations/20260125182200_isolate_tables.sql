-- Chunk 1.3: Data Isolation Columns

DO $$
DECLARE
    default_household_id UUID;
BEGIN
    -- 1. Get the Default Household ID (created in previous step)
    SELECT id INTO default_household_id FROM households LIMIT 1;
    
    IF default_household_id IS NULL THEN
        RAISE EXCEPTION 'No default household found! Please run Chunk 1.2 first.';
    END IF;

    RAISE NOTICE 'Backfilling with Household ID: %', default_household_id;

    -- ==========================================
    -- Table: inventory_items
    -- ==========================================
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'household_id') THEN
        RAISE NOTICE 'Adding household_id to inventory_items';
        ALTER TABLE inventory_items ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE CASCADE;
        
        -- Backfill
        UPDATE inventory_items SET household_id = default_household_id WHERE household_id IS NULL;
        
        -- Enforce Not Null
        ALTER TABLE inventory_items ALTER COLUMN household_id SET NOT NULL;
    END IF;

    -- ==========================================
    -- Table: recipes
    -- ==========================================
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'household_id') THEN
        RAISE NOTICE 'Adding household_id to recipes';
        ALTER TABLE recipes ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE CASCADE;
        
        -- Backfill
        UPDATE recipes SET household_id = default_household_id WHERE household_id IS NULL;
        
        -- Enforce Not Null
        ALTER TABLE recipes ALTER COLUMN household_id SET NOT NULL;
    END IF;

    -- ==========================================
    -- Table: meal_plans
    -- ==========================================
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plans' AND column_name = 'household_id') THEN
        RAISE NOTICE 'Adding household_id to meal_plans';
        ALTER TABLE meal_plans ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE CASCADE;
        
        -- Backfill
        UPDATE meal_plans SET household_id = default_household_id WHERE household_id IS NULL;
        
        -- Enforce Not Null
        ALTER TABLE meal_plans ALTER COLUMN household_id SET NOT NULL;
    END IF;

    -- ==========================================
    -- Indexes for Performance
    -- ==========================================
    CREATE INDEX IF NOT EXISTS idx_inventory_items_household_id ON inventory_items(household_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_household_id ON recipes(household_id);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_household_id ON meal_plans(household_id);

END $$;
