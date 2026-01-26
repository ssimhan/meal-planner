-- Chunk 3.2 Fix v2: Robust Trigger with Search Path

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Explicitly specify search_path to include extensions
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, extensions, auth
AS $$
DECLARE
    new_household_id UUID;
    new_profile_id UUID;
BEGIN
    -- Use uuid_generate_v4() which is standard for uuid-ossp extension
    -- We fall back to gen_random_uuid() if the first fails (though unlikely with uuid-ossp installed)
    BEGIN
        new_household_id := uuid_generate_v4();
        new_profile_id := uuid_generate_v4();
    EXCEPTION WHEN OTHERS THEN
        new_household_id := gen_random_uuid();
        new_profile_id := gen_random_uuid();
    END;

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
