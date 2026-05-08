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
      setWorkspace(null);
      setLoading(false);
      return;
    }

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
        console.error('Error fetching workspace:', fetchError);
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

      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', targetWorkspace.id)
        .eq('user_id', user.id)
        .single();

      if (!existingMembership) {
        // Add current user to workspace_members
        const { error: memberError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: targetWorkspace.id,
            user_id: user.id,
            role: 'editor',
          });

        if (memberError) {
          console.error('Error adding user to workspace:', memberError);
        } else {
          console.log('👤 Added user to workspace members:', user.email);
        }
      } else {
        console.log('👤 User already member of workspace:', user.email);
      }

      setWorkspace(targetWorkspace);
      setLoading(false);
    } catch (error) {
      console.error('Error in loadOrCreateWorkspace:', error);
      setLoading(false);
    }
  };

  return { workspace, loading };
}
