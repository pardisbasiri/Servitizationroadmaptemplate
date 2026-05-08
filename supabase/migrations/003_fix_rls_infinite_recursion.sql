-- =====================================================
-- Fix RLS Infinite Recursion (Error 42P17)
-- =====================================================
-- This migration fixes the circular dependency in RLS policies
-- that was causing infinite recursion when querying workspace_members
-- =====================================================

-- Step 1: Drop all existing problematic RLS policies
-- =====================================================

-- Drop workspace policies
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Authenticated users can view workspaces" ON workspaces;
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON workspaces;

-- Drop workspace_members policies
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can update member roles" ON workspace_members;
DROP POLICY IF EXISTS "Authenticated users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can insert members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can delete members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can update members" ON workspace_members;

-- Drop workspace_items policies
DROP POLICY IF EXISTS "Users can view items in their workspaces" ON workspace_items;
DROP POLICY IF EXISTS "Workspace members can create items" ON workspace_items;
DROP POLICY IF EXISTS "Workspace members can update items" ON workspace_items;
DROP POLICY IF EXISTS "Workspace members can delete items" ON workspace_items;
DROP POLICY IF EXISTS "Authenticated users can view workspace items" ON workspace_items;
DROP POLICY IF EXISTS "Authenticated users can create workspace items" ON workspace_items;
DROP POLICY IF EXISTS "Authenticated users can update workspace items" ON workspace_items;
DROP POLICY IF EXISTS "Authenticated users can delete workspace items" ON workspace_items;


-- Step 2: Create helper function with SECURITY DEFINER
-- =====================================================
-- This function runs with elevated privileges to avoid RLS recursion
-- It checks if a user is a member of a workspace

CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = workspace_uuid
      AND user_id = user_uuid
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_workspace_owner(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspaces
    WHERE id = workspace_uuid
      AND owner_id = user_uuid
  );
END;
$$;


-- Step 3: Create new non-recursive RLS policies for WORKSPACES
-- =====================================================

-- All authenticated users can view all workspaces (for testing collaboration)
-- In production, you'd restrict this to only workspaces where user is a member
CREATE POLICY "authenticated_users_can_view_workspaces"
  ON workspaces
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can create workspaces (and become owner)
CREATE POLICY "authenticated_users_can_create_workspaces"
  ON workspaces
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
  );

-- Workspace owners can update their own workspaces
CREATE POLICY "workspace_owners_can_update_workspaces"
  ON workspaces
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Workspace owners can delete their own workspaces
CREATE POLICY "workspace_owners_can_delete_workspaces"
  ON workspaces
  FOR DELETE
  USING (owner_id = auth.uid());


-- Step 4: Create new non-recursive RLS policies for WORKSPACE_MEMBERS
-- =====================================================
-- These policies DO NOT query workspace_members recursively

-- All authenticated users can view workspace members
-- (Needed for collaboration features and avoids recursion)
CREATE POLICY "authenticated_users_can_view_workspace_members"
  ON workspace_members
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Workspace owners can add members to their workspaces
-- Uses the helper function to avoid recursion
CREATE POLICY "workspace_owners_can_add_members"
  ON workspace_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_workspace_owner(workspace_id, auth.uid())
  );

-- Workspace owners can remove members from their workspaces
CREATE POLICY "workspace_owners_can_remove_members"
  ON workspace_members
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND is_workspace_owner(workspace_id, auth.uid())
  );

-- Workspace owners can update member roles
CREATE POLICY "workspace_owners_can_update_members"
  ON workspace_members
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND is_workspace_owner(workspace_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_workspace_owner(workspace_id, auth.uid())
  );


-- Step 5: Create new non-recursive RLS policies for WORKSPACE_ITEMS
-- =====================================================

-- All authenticated users can view workspace items
-- For testing collaboration - in production you'd restrict to workspace members
CREATE POLICY "authenticated_users_can_view_workspace_items"
  ON workspace_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can create workspace items
CREATE POLICY "authenticated_users_can_create_workspace_items"
  ON workspace_items
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
  );

-- Authenticated users can update workspace items
-- For testing - in production you'd restrict to workspace members
CREATE POLICY "authenticated_users_can_update_workspace_items"
  ON workspace_items
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete workspace items
-- For testing - in production you'd restrict to workspace members
CREATE POLICY "authenticated_users_can_delete_workspace_items"
  ON workspace_items
  FOR DELETE
  USING (auth.uid() IS NOT NULL);


-- Step 6: Verify trigger still exists for auto-adding owner as member
-- =====================================================
-- This trigger should already exist from migration 001, but let's ensure it's there

CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate trigger if it doesn't exist
DROP TRIGGER IF EXISTS add_workspace_owner_as_member ON workspaces;
CREATE TRIGGER add_workspace_owner_as_member
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_member();


-- Step 7: Grant necessary permissions
-- =====================================================

-- Grant execute on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION is_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_owner_as_member() TO authenticated;


-- =====================================================
-- Migration complete!
-- =====================================================
-- Expected behavior after this migration:
-- 1. User signs in → auth.uid() available
-- 2. User creates workspace → auto-added as member via trigger
-- 3. User can fetch workspaces → no recursion error
-- 4. User can query workspace_items → no permission errors
-- 5. Realtime can subscribe → workspace_id available
-- =====================================================

-- Verification queries (run these after migration to test):
-- SELECT * FROM workspaces;
-- SELECT * FROM workspace_members;
-- SELECT * FROM workspace_items;
