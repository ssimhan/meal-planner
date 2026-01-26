-- Chunk 1.2: Identity Linking & Backfill

DO $$
DECLARE
    default_household_id UUID;
    u RECORD;
BEGIN
    -- 1. Ensure a Default Household exists
    -- Try to find one, or create it
    SELECT id INTO default_household_id FROM households LIMIT 1;

    IF default_household_id IS NULL THEN
        INSERT INTO households (name) VALUES ('Default Household') RETURNING id INTO default_household_id;
        RAISE NOTICE 'Created Default Household: %', default_household_id;
    ELSE
        RAISE NOTICE 'Using existing Household: %', default_household_id;
    END IF;

    -- 2. Backfill Profiles for all existing users
    -- We select from auth.users (requires admin privileges, which SQL Editor has)
    FOR u IN SELECT id FROM auth.users LOOP
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = u.id) THEN
            INSERT INTO profiles (user_id, household_id, role)
            VALUES (u.id, default_household_id, 'owner');
            RAISE NOTICE 'Created Profile for User: %', u.id;
        END IF;
    END LOOP;
END $$;
