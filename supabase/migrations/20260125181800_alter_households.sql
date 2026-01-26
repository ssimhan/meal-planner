-- Chunk 1.1: Core Tables (Safe Update)

-- 1. Ensure households table exists
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Household',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  config JSONB DEFAULT '{}'::JSONB
);

-- 2. Ensure profiles table exists
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add columns safetly if they are missing
DO $$
BEGIN
    -- Add user_id to profiles if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
        ALTER TABLE profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        -- If data exists, we can't make it NOT NULL immediately without a default or backfill
        -- For now, add constraints separately if the table is empty
    END IF;

    -- Add household_id to profiles if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'household_id') THEN
        ALTER TABLE profiles ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE CASCADE;
    END IF;

    -- Add role to profiles if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'member';
    END IF;
END $$;

-- 4. Enable RLS (Safe to re-run)
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create indexes (IF NOT EXISTS handles safety)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_household_id ON profiles(household_id);
