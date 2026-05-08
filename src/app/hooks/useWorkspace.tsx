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
      // Try to get existing workspace
      const { data: workspaces, error: fetchError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1);

      if (fetchError) {
        console.error('Error fetching workspace:', fetchError);
        setLoading(false);
        return;
      }

      if (workspaces && workspaces.length > 0) {
        setWorkspace(workspaces[0]);
        setLoading(false);
        return;
      }

      // Create default workspace if none exists
      const { data: newWorkspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          name: 'My Roadmap',
          owner_id: user.id,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating workspace:', createError);
        setLoading(false);
        return;
      }

      setWorkspace(newWorkspace);
      setLoading(false);
    } catch (error) {
      console.error('Error in loadOrCreateWorkspace:', error);
      setLoading(false);
    }
  };

  return { workspace, loading };
}
