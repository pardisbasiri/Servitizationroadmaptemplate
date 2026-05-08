import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export function useWorkspace() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      console.log('⚠️ useWorkspace: No user');
      setWorkspace(null);
      setLoading(false);
      return;
    }

    console.log('👤 useWorkspace: User detected', {
      userId: user.id,
      email: user.email,
    });

    loadOrCreateWorkspace();
  }, [user]);

  const loadOrCreateWorkspace = async () => {
    if (!user) return;

    try {
      // Use a shared workspace name for collaboration testing
      const SHARED_WORKSPACE_NAME = 'Shared Test Roadmap';

      // Try to get the shared workspace
      const { data: sharedWorkspaces, error: fetchError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('name', SHARED_WORKSPACE_NAME)
        .limit(1);

      if (fetchError) {
        console.error('❌ Error fetching workspace:', {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
        });

        if (fetchError.code === '42P17') {
          console.error('');
          console.error('💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥');
          console.error('💥                                        💥');
          console.error('💥  CRITICAL: RLS INFINITE RECURSION      💥');
          console.error('💥                                        💥');
          console.error('💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥');
          console.error('');
          console.error('📋 READ THIS FILE: DO_THIS_RIGHT_NOW.md');
          console.error('');
          console.error('🚨 QUICK FIX:');
          console.error('');
          console.error('1. Open: https://supabase.com/dashboard/project/lgkrvxiblwdxftjzyhaw/sql/new');
          console.error('2. Copy ALL of: MINIMAL_FIX.sql');
          console.error('3. Paste and click RUN');
          console.error('4. Wait for "✅ Workspaces: N rows" messages');
          console.error('5. Hard refresh this page (Ctrl+Shift+R)');
          console.error('');
          console.error('📁 Files to use:');
          console.error('   - DIAGNOSE_PROBLEM.sql (run first to see what\'s wrong)');
          console.error('   - MINIMAL_FIX.sql (run this to fix it)');
          console.error('');
          console.error('⚠️  DO NOT use these files (they don\'t work):');
          console.error('   - 002_fix_rls_policies.sql');
          console.error('   - EMERGENCY_RLS_RESET.sql');
          console.error('');
          console.error('💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥');
          console.error('');
        }

        setLoading(false);
        return;
      }

      let targetWorkspace: Workspace | null = null;

      if (sharedWorkspaces && sharedWorkspaces.length > 0) {
        targetWorkspace = sharedWorkspaces[0];
        console.log('📁 Using existing shared workspace:', targetWorkspace.id);
      } else {
        // Create shared workspace if none exists
        const { data: newWorkspace, error: createError } = await supabase
          .from('workspaces')
          .insert({
            name: SHARED_WORKSPACE_NAME,
            owner_id: user.id,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating workspace:', createError);
          setLoading(false);
          return;
        }

        targetWorkspace = newWorkspace;
        console.log('✨ Created new shared workspace:', targetWorkspace.id);
      }

      if (!targetWorkspace) {
        setLoading(false);
        return;
      }

      // Skip workspace_members to avoid RLS infinite recursion error
      // All authenticated users have access to the shared workspace for testing
      console.log('✅ Using shared workspace (bypassing workspace_members)', {
        workspace_id: targetWorkspace.id,
        user_id: user.id,
        email: user.email,
      });

      setWorkspace(targetWorkspace);
      setLoading(false);
    } catch (error) {
      console.error('Error in loadOrCreateWorkspace:', error);
      setLoading(false);
    }
  };

  return { workspace, loading };
}
