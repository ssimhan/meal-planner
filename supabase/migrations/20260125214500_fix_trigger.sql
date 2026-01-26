-- Chunk 3.2 Fix: Robust Trigger Logic

-- Drop old trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    new_household_id UUID;
    new_profile_id UUID;
BEGIN
    -- Explicitly generate IDs to avoid "null value" issues if defaults rely on extensions that might flake
    new_household_id := gen_random_uuid();
    new_profile_id := gen_random_uuid();

    -- 1. Create a new Household
    INSERT INTO public.households (id, name, config)
    VALUES (
        new_household_id, 
        'My Household', 
        '{
            "timezone": "America/Los_Angeles",
            "schedule": {"office_days": ["mon", "wed", "fri"], "busy_days": []}
        }'::jsonb
    );

    -- 2. Create a Profile linking User to Household
    -- Check if profile exists (idempotency for retries)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
        INSERT INTO public.profiles (id, user_id, household_id, role)
        VALUES (new_profile_id, NEW.id, new_household_id, 'owner');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
