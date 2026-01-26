-- Verification: Test RLS (Aligned IDs)
-- Assuming profiles.id references auth.users.id

BEGIN;

-- 1. Create two test users
INSERT INTO auth.users (id, email)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'user_a@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'user_b@test.com')
ON CONFLICT DO NOTHING;

-- 2. Create households/profiles
-- FIX: Setting profile.id = user.id to satisfy potential foreign key constraint
INSERT INTO households (id, name) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Household A') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, user_id, household_id) VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') ON CONFLICT DO NOTHING;

INSERT INTO households (id, name) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Household B') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, user_id, household_id) VALUES ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') ON CONFLICT DO NOTHING;

-- 3. Add inventory items for User A
INSERT INTO inventory_items (household_id, category, item, quantity, unit) 
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fridge', 'User A Secret Item', 1, 'unit');

-- 4. Switch to User B context (INTRUDER)
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- TEST 1: Should return 0 results
SELECT 'User B trying to see User A item (Should be empty)' as test_case, * FROM inventory_items WHERE item = 'User A Secret Item';

-- 5. Switch to User A context (OWNER)
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- TEST 2: Should return 1 result
SELECT 'User A looking for own item (Should find 1)' as test_case, * FROM inventory_items WHERE item = 'User A Secret Item';

ROLLBACK;
