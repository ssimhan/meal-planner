-- Chunk 3.2: Auto-Onboarding Trigger

-- 1. Create the Function that runs on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    new_household_id UUID;
    config_defaults JSONB;
BEGIN
    -- Define default config for new households
    config_defaults := '{
        "timezone": "America/Los_Angeles",
        "schedule": {"office_days": ["mon", "wed", "fri"], "busy_days": []}
    }';

    -- 1. Create a new Household
    INSERT INTO public.households (name, config)
    VALUES ('My Household', config_defaults)
    RETURNING id INTO new_household_id;

    -- 2. Create a Profile linking User to Household
    INSERT INTO public.profiles (user_id, household_id, role)
    VALUES (NEW.id, new_household_id, 'owner');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the trigger to auth.users
-- Drop if exists to avoid duplication errors during dev
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Verification Note:
-- The trigger runs as Superuser (SECURITY DEFINER), so it bypasses RLS during creation.
-- This is necessary because the new user doesn't have permissions on the tables yet until they are linked.
