-- Fix RLS policies to avoid infinite recursion
-- Drop existing policies that cause circular dependencies

-- Drop workspace policies
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete their workspaces" ON workspaces;

-- Drop workspace_members policies
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can update member roles" ON workspace_members;

-- Drop workspace_items policies
DROP POLICY IF EXISTS "Users can view items in their workspaces" ON workspace_items;
DROP POLICY IF EXISTS "Workspace members can create items" ON workspace_items;
DROP POLICY IF EXISTS "Workspace members can update items" ON workspace_items;
DROP POLICY IF EXISTS "Workspace members can delete items" ON workspace_items;

-- Create simpler policies without circular references

-- Workspaces: All authenticated users can view all workspaces
CREATE POLICY "Authenticated users can view workspaces"
  ON workspaces FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Workspaces: Authenticated users can create workspaces
CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Workspaces: Owners can update their workspaces
CREATE POLICY "Owners can update workspaces"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

-- Workspaces: Owners can delete their workspaces
CREATE POLICY "Owners can delete workspaces"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Workspace members: All authenticated users can view members
CREATE POLICY "Authenticated users can view workspace members"
  ON workspace_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Workspace members: Workspace owners can manage members
CREATE POLICY "Workspace owners can insert members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can delete members"
  ON workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can update members"
  ON workspace_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );

-- Workspace items: All authenticated users can view items
CREATE POLICY "Authenticated users can view workspace items"
  ON workspace_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Workspace items: Authenticated users can create items
CREATE POLICY "Authenticated users can create workspace items"
  ON workspace_items FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Workspace items: Authenticated users can update all items
CREATE POLICY "Authenticated users can update workspace items"
  ON workspace_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Workspace items: Authenticated users can delete all items
CREATE POLICY "Authenticated users can delete workspace items"
  ON workspace_items FOR DELETE
  USING (auth.uid() IS NOT NULL);
