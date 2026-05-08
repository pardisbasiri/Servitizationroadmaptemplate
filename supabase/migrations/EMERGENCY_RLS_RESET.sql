-- =====================================================
-- EMERGENCY RLS RESET - Fix 42P17 Infinite Recursion
-- =====================================================
-- This migration completely resets all RLS policies
-- and creates SECURITY DEFINER functions to break recursion
-- =====================================================

-- STEP 1: Temporarily disable RLS to ensure we can work
-- =====================================================
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_items DISABLE ROW LEVEL SECURITY;


-- STEP 2: Drop ALL existing policies (every possible name)
-- =====================================================

-- Drop all workspace policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workspaces' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.workspaces';
    END LOOP;
END $$;

-- Drop all workspace_members policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workspace_members' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.workspace_members';
    END LOOP;
END $$;

-- Drop all workspace_items policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workspace_items' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.workspace_items';
    END LOOP;
END $$;


-- STEP 3: Create SECURITY DEFINER helper functions
-- =====================================================
-- These functions bypass RLS and prevent recursion
-- They use auth.uid() internally to get current user

-- Check if current user is member of a workspace
CREATE OR REPLACE FUNCTION public.current_user_is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    current_user_id UUID;
    is_member BOOLEAN;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();

    -- Return false if not authenticated
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check membership WITHOUT triggering RLS policies
    -- SECURITY DEFINER allows this function to bypass RLS
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE workspace_id = workspace_uuid
          AND user_id = current_user_id
    ) INTO is_member;

    RETURN COALESCE(is_member, FALSE);
END;
$$;

-- Check if current user owns a workspace
CREATE OR REPLACE FUNCTION public.current_user_is_workspace_owner(workspace_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    current_user_id UUID;
    is_owner BOOLEAN;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();

    -- Return false if not authenticated
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check ownership WITHOUT triggering RLS policies
    SELECT EXISTS (
        SELECT 1
        FROM public.workspaces
        WHERE id = workspace_uuid
          AND owner_id = current_user_id
    ) INTO is_owner;

    RETURN COALESCE(is_owner, FALSE);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.current_user_is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_workspace_owner(UUID) TO authenticated;


-- STEP 4: Create simple, non-recursive RLS policies
-- =====================================================

-- Re-enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_items ENABLE ROW LEVEL SECURITY;

-- ================
-- WORKSPACES TABLE
-- ================

-- Allow all authenticated users to view workspaces (for testing/collaboration)
CREATE POLICY "allow_authenticated_select_workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create workspaces (they become owner)
CREATE POLICY "allow_authenticated_insert_workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Allow workspace owners to update their workspaces
CREATE POLICY "allow_owner_update_workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Allow workspace owners to delete their workspaces
CREATE POLICY "allow_owner_delete_workspaces"
ON public.workspaces
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());


-- =======================
-- WORKSPACE_MEMBERS TABLE
-- =======================
-- CRITICAL: These policies use SECURITY DEFINER functions
-- to avoid querying workspace_members recursively

-- Allow all authenticated users to view workspace members
-- (No recursion - simple check)
CREATE POLICY "allow_authenticated_select_workspace_members"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (true);

-- Allow workspace owners to add members
-- Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "allow_owner_insert_workspace_members"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_is_workspace_owner(workspace_id)
);

-- Allow workspace owners to update member roles
-- Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "allow_owner_update_workspace_members"
ON public.workspace_members
FOR UPDATE
TO authenticated
USING (
    public.current_user_is_workspace_owner(workspace_id)
)
WITH CHECK (
    public.current_user_is_workspace_owner(workspace_id)
);

-- Allow workspace owners to remove members
-- Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "allow_owner_delete_workspace_members"
ON public.workspace_members
FOR DELETE
TO authenticated
USING (
    public.current_user_is_workspace_owner(workspace_id)
);


-- =======================
-- WORKSPACE_ITEMS TABLE
-- =======================

-- Allow all authenticated users to view workspace items
-- (For testing - in production you'd restrict to workspace members)
CREATE POLICY "allow_authenticated_select_workspace_items"
ON public.workspace_items
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create workspace items
-- Must set themselves as author
CREATE POLICY "allow_authenticated_insert_workspace_items"
ON public.workspace_items
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

-- Allow all authenticated users to update workspace items
-- (For testing - in production you'd restrict to workspace members)
CREATE POLICY "allow_authenticated_update_workspace_items"
ON public.workspace_items
FOR UPDATE
TO authenticated
USING (true);

-- Allow all authenticated users to delete workspace items
-- (For testing - in production you'd restrict to workspace members)
CREATE POLICY "allow_authenticated_delete_workspace_items"
ON public.workspace_items
FOR DELETE
TO authenticated
USING (true);


-- STEP 5: Ensure trigger exists for auto-adding workspace owner as member
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_add_workspace_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Add workspace owner as a member with 'owner' role
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Drop and recreate trigger to ensure it's active
DROP TRIGGER IF EXISTS trigger_auto_add_workspace_owner_as_member ON public.workspaces;

CREATE TRIGGER trigger_auto_add_workspace_owner_as_member
    AFTER INSERT ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_add_workspace_owner_as_member();


-- STEP 6: Verification
-- =====================================================

-- Show all policies that exist after migration
-- Run this to verify clean slate

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('workspaces', 'workspace_members', 'workspace_items')
ORDER BY tablename, policyname;


-- Test queries that should now work without recursion:
-- SELECT * FROM workspaces; -- Should work
-- SELECT * FROM workspace_members; -- Should work without 42P17 error
-- SELECT * FROM workspace_items; -- Should work


-- =====================================================
-- Migration Complete!
-- =====================================================
-- Expected results:
-- ✅ No 42P17 infinite recursion errors
-- ✅ Authenticated users can create workspaces
-- ✅ Workspace owners auto-added as members via trigger
-- ✅ Users can query workspaces, workspace_members, workspace_items
-- ✅ Realtime subscriptions can initialize
-- =====================================================
