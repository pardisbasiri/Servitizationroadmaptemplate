-- =====================================================
-- DIAGNOSTIC SCRIPT
-- =====================================================
-- Run this to see what's causing the 42P17 error
-- =====================================================

-- 1. Show all policies on workspace_members
SELECT
    'Current workspace_members policies:' as info,
    policyname,
    cmd,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'workspace_members'
ORDER BY policyname;

-- 2. Show all policies on workspaces
SELECT
    'Current workspaces policies:' as info,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'workspaces'
ORDER BY policyname;

-- 3. Show all policies on workspace_items
SELECT
    'Current workspace_items policies:' as info,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'workspace_items'
ORDER BY policyname;

-- 4. Check if helper functions exist
SELECT
    'Helper functions:' as info,
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname LIKE '%workspace%'
  AND proname LIKE '%member%'
ORDER BY proname;

-- 5. Test if we can query workspace_members
DO $$
BEGIN
    PERFORM COUNT(*) FROM workspace_members;
    RAISE NOTICE '✅ Can query workspace_members';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error querying workspace_members: % (Code: %)', SQLERRM, SQLSTATE;
END $$;
