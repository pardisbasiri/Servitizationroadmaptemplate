-- =====================================================
-- VERIFICATION SCRIPT
-- =====================================================
-- Run this AFTER applying EMERGENCY_RLS_RESET.sql
-- to verify the fix worked correctly
-- =====================================================

-- Test 1: Check if helper functions exist
-- =====================================================
SELECT
    'Test 1: Helper Functions' as test_name,
    CASE
        WHEN COUNT(*) = 2 THEN '✅ PASS - Both helper functions exist'
        ELSE '❌ FAIL - Helper functions missing'
    END as result
FROM pg_proc
WHERE proname IN ('current_user_is_workspace_member', 'current_user_is_workspace_owner')
  AND prosecdef = true;  -- SECURITY DEFINER enabled


-- Test 2: Check if policies exist for workspaces
-- =====================================================
SELECT
    'Test 2: Workspace Policies' as test_name,
    CASE
        WHEN COUNT(*) >= 4 THEN '✅ PASS - Workspace policies exist'
        ELSE '❌ FAIL - Missing workspace policies'
    END as result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'workspaces';


-- Test 3: Check if policies exist for workspace_members
-- =====================================================
SELECT
    'Test 3: Workspace Members Policies' as test_name,
    CASE
        WHEN COUNT(*) >= 4 THEN '✅ PASS - Workspace members policies exist'
        ELSE '❌ FAIL - Missing workspace members policies'
    END as result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'workspace_members';


-- Test 4: Check if policies exist for workspace_items
-- =====================================================
SELECT
    'Test 4: Workspace Items Policies' as test_name,
    CASE
        WHEN COUNT(*) >= 4 THEN '✅ PASS - Workspace items policies exist'
        ELSE '❌ FAIL - Missing workspace items policies'
    END as result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'workspace_items';


-- Test 5: Check if RLS is enabled
-- =====================================================
SELECT
    'Test 5: RLS Enabled' as test_name,
    CASE
        WHEN COUNT(*) = 3 THEN '✅ PASS - RLS enabled on all tables'
        ELSE '❌ FAIL - RLS not enabled on all tables'
    END as result
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('workspaces', 'workspace_members', 'workspace_items')
  AND rowsecurity = true;


-- Test 6: Check if trigger exists
-- =====================================================
SELECT
    'Test 6: Auto-add Owner Trigger' as test_name,
    CASE
        WHEN COUNT(*) >= 1 THEN '✅ PASS - Trigger exists'
        ELSE '❌ FAIL - Trigger missing'
    END as result
FROM pg_trigger
WHERE tgname LIKE '%workspace_owner%member%';


-- Test 7: Try to query workspace_members (should NOT error with 42P17)
-- =====================================================
DO $$
DECLARE
    test_result TEXT;
    row_count INT;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO row_count FROM workspace_members;
        test_result := '✅ PASS - Can query workspace_members without 42P17 error';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLSTATE = '42P17' THEN
                test_result := '❌ FAIL - 42P17 infinite recursion still exists!';
            ELSE
                test_result := '❌ FAIL - Other error: ' || SQLERRM;
            END IF;
    END;

    RAISE NOTICE 'Test 7: Query workspace_members - %', test_result;
END $$;


-- Test 8: Try to query workspaces
-- =====================================================
DO $$
DECLARE
    test_result TEXT;
    row_count INT;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO row_count FROM workspaces;
        test_result := '✅ PASS - Can query workspaces';
    EXCEPTION
        WHEN OTHERS THEN
            test_result := '❌ FAIL - Error: ' || SQLERRM;
    END;

    RAISE NOTICE 'Test 8: Query workspaces - %', test_result;
END $$;


-- Test 9: Try to query workspace_items
-- =====================================================
DO $$
DECLARE
    test_result TEXT;
    row_count INT;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO row_count FROM workspace_items;
        test_result := '✅ PASS - Can query workspace_items';
    EXCEPTION
        WHEN OTHERS THEN
            test_result := '❌ FAIL - Error: ' || SQLERRM;
    END;

    RAISE NOTICE 'Test 9: Query workspace_items - %', test_result;
END $$;


-- =====================================================
-- Summary: List all current policies
-- =====================================================
SELECT
    '=== CURRENT POLICIES ===' as info,
    schemaname,
    tablename,
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('workspaces', 'workspace_members', 'workspace_items')
ORDER BY tablename, policyname;


-- =====================================================
-- EXPECTED OUTPUT:
-- =====================================================
-- All tests should show ✅ PASS
--
-- If any test shows ❌ FAIL:
-- 1. Copy the entire output
-- 2. Check which test failed
-- 3. Re-run EMERGENCY_RLS_RESET.sql
--
-- The summary at the end should show exactly these policies:
-- - allow_authenticated_select_workspaces
-- - allow_authenticated_insert_workspaces
-- - allow_owner_update_workspaces
-- - allow_owner_delete_workspaces
-- - allow_authenticated_select_workspace_members
-- - allow_owner_insert_workspace_members
-- - allow_owner_update_workspace_members
-- - allow_owner_delete_workspace_members
-- - allow_authenticated_select_workspace_items
-- - allow_authenticated_insert_workspace_items
-- - allow_authenticated_update_workspace_items
-- - allow_authenticated_delete_workspace_items
-- =====================================================
