-- Chunk 3.2 Fix v3: Explicit pg_catalog calls

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Explicitly specify search_path
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    new_household_id UUID;
    new_profile_id UUID;
BEGIN
    -- Use pg_catalog.gen_random_uuid() which is built-in and always available
    new_household_id := pg_catalog.gen_random_uuid();
    -- Profile ID must match User ID (Constraint detected: profiles.id references auth.users)
    new_profile_id := NEW.id;

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
    -- Idempotency check
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
        INSERT INTO public.profiles (id, user_id, household_id, role)
        VALUES (new_profile_id, NEW.id, new_household_id, 'owner');
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
