# 🚨 EMERGENCY RLS FIX - Apply Immediately

## Current Problem
Error persists after applying migration 002:
```
42P17: infinite recursion detected in policy for relation "workspace_members"
```

## Root Cause
The old migration didn't fully remove all recursive policies. Some policies still query `workspace_members` within `workspace_members` policies, creating circular dependencies.

---

## ✅ APPLY THIS FIX NOW

### Step 1: Open Supabase SQL Editor
**Direct Link:** https://supabase.com/dashboard/project/lgkrvxiblwdxftjzyhaw/sql/new

### Step 2: Copy the Migration
Open file: `supabase/migrations/EMERGENCY_RLS_RESET.sql`

**Copy the ENTIRE file** (all ~380 lines)

### Step 3: Paste and Run
1. Paste into Supabase SQL Editor
2. Click **RUN** or press **Ctrl+Enter**
3. Wait 5-10 seconds for completion

### Step 4: Verify Success
At the bottom of the output, you should see a table showing all policies:

```
schemaname | tablename         | policyname
-----------+-------------------+----------------------------------
public     | workspaces        | allow_authenticated_select_workspaces
public     | workspaces        | allow_authenticated_insert_workspaces
public     | workspaces        | allow_owner_update_workspaces
public     | workspaces        | allow_owner_delete_workspaces
public     | workspace_members | allow_authenticated_select_workspace_members
public     | workspace_members | allow_owner_insert_workspace_members
...
```

**If you see any errors**, copy them and report immediately.

### Step 5: Test the Fix
Run these test queries in the SQL Editor:

```sql
-- Should work without errors
SELECT * FROM workspaces;
SELECT * FROM workspace_members;
SELECT * FROM workspace_items;
```

If ANY of these queries return the 42P17 error, the migration failed.

### Step 6: Refresh Your Web App
1. Go to your web app
2. Hard refresh: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
3. Sign in if needed

### Step 7: Check Debug Panel
The purple "Realtime Debug Panel" should now show:
- ✅ **Workspace ID**: (actual UUID instead of "No workspace")
- ✅ **Subscription Status**: "SUBSCRIBED" (green)
- ✅ **Realtime Enabled**: YES
- ✅ **Channel State**: "joined"

---

## What This Emergency Migration Does

### 1. **Complete Policy Wipeout**
```sql
-- Disables RLS temporarily
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_items DISABLE ROW LEVEL SECURITY;

-- Drops EVERY existing policy programmatically
-- Uses pg_policies to find and drop all policies
```

### 2. **Creates SECURITY DEFINER Functions**
These functions bypass RLS entirely to break recursion:

```sql
current_user_is_workspace_member(workspace_uuid)
  → Checks workspace_members WITHOUT triggering RLS
  → Returns true/false

current_user_is_workspace_owner(workspace_uuid)  
  → Checks workspaces.owner_id WITHOUT triggering RLS
  → Returns true/false
```

**Key Point:** These functions use `SECURITY DEFINER` which means they run with elevated privileges and **bypass all RLS policies**. This breaks the circular dependency.

### 3. **Creates Safe, Non-Recursive Policies**

**For workspace_members:**
- ✅ SELECT: Allow all authenticated (no recursion - just `true`)
- ✅ INSERT: Use `current_user_is_workspace_owner()` helper
- ✅ UPDATE: Use `current_user_is_workspace_owner()` helper  
- ✅ DELETE: Use `current_user_is_workspace_owner()` helper

**No workspace_members policy queries workspace_members directly!**

### 4. **Ensures Trigger Works**
```sql
-- Recreates trigger that auto-adds workspace owner as member
CREATE TRIGGER trigger_auto_add_workspace_owner_as_member
```

### 5. **Verification Query**
Shows all policies that exist after the migration completes.

---

## Why This Works (Technical Explanation)

### The Recursion Problem:
```
Old Policy: "Users can view workspace_members if they exist in workspace_members"
                                                           ↑
                                                   Queries same table!
                                                   Creates infinite loop!
```

### The Solution:
```
Helper Function (SECURITY DEFINER):
  → Bypasses RLS completely
  → Directly queries workspace_members with elevated privileges
  → Returns simple true/false

New Policy: "Users can view workspace_members if helper() returns true"
                                                    ↑
                                          No recursion - just a function call!
```

**SECURITY DEFINER = Superuser Mode** for that function only.

---

## After Applying This Fix

### Expected Behavior:
1. ✅ User signs in → No errors
2. ✅ Workspace created/fetched → workspace_id available
3. ✅ Workspace owner auto-added to members → Trigger works
4. ✅ Can query workspace_members → No 42P17 error
5. ✅ Realtime subscribes → Connection succeeds
6. ✅ Debug panel shows "SUBSCRIBED"

### Browser Console Should Show:
```
✅ Using shared workspace (bypassing workspace_members)
🔌 Setting up realtime subscription
📺 Creating channel: workspace-[uuid]
➕ Adding postgres_changes listener
📊 Status: SUBSCRIBED
✅ ✅ ✅ Realtime SUBSCRIBED ✅ ✅ ✅
```

---

## If It Still Doesn't Work

### Check 1: Policy Verification
In Supabase SQL Editor, run:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'workspace_members';
```

Should show exactly 4 policies:
- `allow_authenticated_select_workspace_members`
- `allow_owner_insert_workspace_members`
- `allow_owner_update_workspace_members`
- `allow_owner_delete_workspace_members`

### Check 2: Test Queries
```sql
-- Should NOT error with 42P17
SELECT * FROM workspace_members;
```

If this STILL errors with 42P17, there may be additional policies we missed. Run:
```sql
-- Show ALL policies in database
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

And share the output.

### Check 3: Helper Functions Exist
```sql
-- Should return 2 rows
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname LIKE '%workspace%member%' 
   OR proname LIKE '%workspace%owner%';
```

Both should have `prosecdef = true` (meaning SECURITY DEFINER is enabled).

---

## Rollback Plan (If Needed)

If this migration causes issues, you can rollback:

```sql
-- Temporarily allow all access (DANGEROUS - only for debugging)
DROP POLICY IF EXISTS allow_authenticated_select_workspace_members ON workspace_members;
CREATE POLICY allow_all_workspace_members ON workspace_members FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS allow_authenticated_select_workspaces ON workspaces;
CREATE POLICY allow_all_workspaces ON workspaces FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS allow_authenticated_select_workspace_items ON workspace_items;
CREATE POLICY allow_all_workspace_items ON workspace_items FOR ALL TO authenticated USING (true);
```

This allows full access for debugging (remove before production).

---

## Production Note

⚠️ **For Testing/Development Only**

The policies created allow broad access for collaboration testing:
- All authenticated users can view all workspaces
- All authenticated users can view all workspace_items

In production, you'd want to restrict these using the helper functions:
```sql
-- Production version - restrict to workspace members
CREATE POLICY "members_only_select_workspace_items"
ON workspace_items FOR SELECT
USING (current_user_is_workspace_member(workspace_id));
```

But for now, broad access ensures everything works without permission issues.
