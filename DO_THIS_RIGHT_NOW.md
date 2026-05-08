# 🚨 STOP - DO THIS RIGHT NOW

## You're Getting Error 42P17

This means the SQL migration hasn't been applied correctly or old policies still exist.

---

## STEP 1: Diagnose the Problem

1. **Open Supabase SQL Editor:**
   https://supabase.com/dashboard/project/lgkrvxiblwdxftjzyhaw/sql/new

2. **Copy and paste:** `DIAGNOSE_PROBLEM.sql`

3. **Click RUN**

4. **Look at the output** - it will show what policies currently exist

5. **Send me the output** OR proceed to Step 2

---

## STEP 2: Apply the Minimal Fix

1. **In the SAME Supabase SQL Editor** (or open a new query tab)

2. **Copy ALL contents of:** `MINIMAL_FIX.sql`

3. **Paste into SQL Editor**

4. **Click RUN** (or press Ctrl+Enter)

5. **Wait for output** - should see:
   ```
   ✅ Workspaces: N rows
   ✅ Workspace members: N rows
   ✅ Workspace items: N rows
   ```

6. **If you see ❌ ERROR instead:**
   - Copy the ENTIRE error message
   - Send it to me
   - Do NOT proceed

---

## STEP 3: Refresh Your App

1. Go to your web app
2. Press **Ctrl+Shift+R** (hard refresh)
3. Sign in
4. Check the purple debug panel (bottom-right corner)

**Should show:**
- ✅ Workspace ID: `[uuid]` (NOT "No workspace")
- ✅ Subscription Status: `SUBSCRIBED`
- ✅ Channel State: `joined`

---

## STEP 4: Verify in Browser Console

1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Should see:
   ```
   ✅ Using shared workspace
   🔌 Setting up realtime subscription
   ✅ ✅ ✅ Realtime SUBSCRIBED ✅ ✅ ✅
   ```

4. Should NOT see:
   ```
   ❌ Error fetching workspace: 42P17
   ```

---

## Why This Works

**MINIMAL_FIX.sql is the simplest possible approach:**

1. ✅ Disables RLS completely
2. ✅ Force drops ALL policies using CASCADE
3. ✅ Drops ALL old functions
4. ✅ Creates ONE policy per table (no complex logic)
5. ✅ workspace_members policy = `USING (true)` - NO recursion possible!
6. ✅ Tests itself before finishing

**The key difference:**
```sql
-- OLD (causes recursion)
CREATE POLICY ON workspace_members
USING (workspace_id IN (SELECT ... FROM workspace_members ...))
                                              ^^^ recursion!

-- NEW (no recursion)
CREATE POLICY ON workspace_members
USING (true)  -- Just allow all authenticated users
      ^^^ Simple, no subqueries, no recursion!
```

---

## If It STILL Doesn't Work

Run this in SQL Editor:

```sql
-- Check what policies exist
SELECT * FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'workspace_members';

-- Try to query the table
SELECT COUNT(*) FROM workspace_members;
```

**If `SELECT COUNT(*)` returns 42P17:**
- Send me the policy details from the first query
- There's a policy we need to manually drop

**If `SELECT COUNT(*)` works:**
- The database is fine
- The problem is in the frontend
- Check browser console for errors

---

## After This Works

Once you see:
- ✅ Workspace ID in debug panel
- ✅ SUBSCRIBED status
- ✅ No 42P17 errors

Then you can test multi-user collaboration:
1. Open two browsers
2. Sign in with different accounts
3. Make changes in one browser
4. See them appear instantly in the other

---

## Files You Need:

1. **DIAGNOSE_PROBLEM.sql** - Shows current state
2. **MINIMAL_FIX.sql** - Applies the fix

Both are in your project root.

---

## ⚠️ IMPORTANT

- Do NOT use `002_fix_rls_policies.sql` - it doesn't work
- Do NOT use `EMERGENCY_RLS_RESET.sql` - try MINIMAL_FIX.sql first
- Do NOT edit the SQL files - just copy/paste them as-is
- Do NOT skip the diagnosis step - it helps us understand what's wrong

---

## Last Resort

If MINIMAL_FIX.sql doesn't work, there's one final option - completely disable RLS for testing:

```sql
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_items DISABLE ROW LEVEL SECURITY;
```

This will allow everything to work, but it's not secure for production.

Only use this if:
1. MINIMAL_FIX.sql failed
2. You need to test the realtime functionality
3. This is a development/testing environment
