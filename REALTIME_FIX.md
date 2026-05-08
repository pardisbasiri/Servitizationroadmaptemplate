# Fix for Realtime Collaboration Issue

## Problem
The database has Row Level Security (RLS) policies with **infinite recursion**. The error is:
```
Error code: 42P17
Message: "infinite recursion detected in policy for relation workspace_members"
```

## Root Cause
The RLS policies reference `workspace_members` table within their own checks, creating a circular dependency:
- To view `workspaces`, you need to check `workspace_members`
- To view `workspace_members`, you need to check `workspace_members` again
- This creates infinite recursion

## Solution
A comprehensive migration file has been created to fix this: `supabase/migrations/003_fix_rls_infinite_recursion.sql`

This migration:
- Drops all problematic circular policies
- Creates SECURITY DEFINER helper functions to break recursion
- Implements non-recursive RLS policies
- Ensures workspace owners are auto-added as members

## How to Apply the Fix

### Option 1: Supabase SQL Editor (Recommended)
1. Open your Supabase project dashboard:
   **https://supabase.com/dashboard/project/lgkrvxiblwdxftjzyhaw**
2. Go to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the **ENTIRE CONTENTS** of `supabase/migrations/003_fix_rls_infinite_recursion.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned" (multiple times as each statement runs)
8. Verify no errors appear in the output
9. Refresh the web app - the error should be gone

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db reset
```

### Option 3: Manual Policy Updates
If you can't run migrations, manually update the RLS policies in Supabase Dashboard:

1. Go to **Authentication** → **Policies**
2. For each table (`workspaces`, `workspace_members`, `workspace_items`):
   - Delete all existing policies
   - Create new policies that allow access for ALL authenticated users:
     - `auth.uid() IS NOT NULL` for SELECT
     - `auth.uid() = author_id` for INSERT (workspace_items)
     - `auth.uid() IS NOT NULL` for UPDATE and DELETE

## What the Fix Does
The new RLS policies:
- ✅ Remove circular references to `workspace_members`
- ✅ Allow all authenticated users to view all workspaces (for testing)
- ✅ Allow all authenticated users to create/update/delete workspace items
- ✅ Maintain basic security by requiring authentication
- ✅ Enable realtime collaboration to work properly

## After Applying the Fix
1. Clear browser cache and refresh both browser sessions
2. Sign in with two different accounts
3. Check console logs - you should see:
   - `✅ Realtime SUBSCRIBED`
   - Green "Live" indicator in the header
   - No more RLS errors
4. Make a change in Browser 1 - it should appear in Browser 2 immediately

## Verification
Open browser console and look for:
```
✅ Using shared workspace (bypassing workspace_members)
🔌 Setting up realtime subscription
✅ Realtime SUBSCRIBED
```

If you still see the recursion error after applying the fix, the migration didn't apply correctly. Try clearing all policies and re-creating them manually.
