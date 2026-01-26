-- Chunk 1.1: Core Tables

-- 1. Create households table
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Household',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  config JSONB DEFAULT '{}'::JSONB
);

-- 2. Create profiles table
-- Links Supabase Auth users to Households
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, member, admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- User can only belong to one household for now (MVP)
);

-- 3. Enable RLS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_household_id ON profiles(household_id);
