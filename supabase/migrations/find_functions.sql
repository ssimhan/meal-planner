-- Find where uuid functions live
SELECT n.nspname, p.proname 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE p.proname IN ('uuid_generate_v4', 'gen_random_uuid');
