import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import type { ThemeCardData } from '../components/ThemeCard';
import type { CapabilityCardData } from '../components/CapabilityCard';
import type { ActionCardData } from '../components/ActionCard';
import type { DependencyConnection } from '../components/TimelineView';

interface WorkspaceItem {
  id: string;
  workspace_id: string;
  author_id: string;
  content: any;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

interface WorkspaceData {
  themes: ThemeCardData[];
  capabilities: CapabilityCardData[];
  actions: ActionCardData[];
  dependencies: DependencyConnection[];
  timeframeDefinitions: Record<string, string>;
}

export function useWorkspaceItems(workspaceId: string | null) {
  const { user } = useAuth();
  const [data, setData] = useState<WorkspaceData>({
    themes: [],
    capabilities: [],
    actions: [],
    dependencies: [],
    timeframeDefinitions: {
      short: '0-3 months',
      medium: '3-6 months',
      long: '6-12 months',
    },
  });
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const isLocalUpdate = useRef(false);

  // Load all items from workspace
  const loadItems = useCallback(async () => {
    if (!workspaceId || !user) {
      setLoading(false);
      return;
    }

    try {
      const { data: items, error } = await supabase
        .from('workspace_items')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('Error loading workspace items:', error);
        setLoading(false);
        return;
      }

      // Parse items into categories
      const themes: ThemeCardData[] = [];
      const capabilities: CapabilityCardData[] = [];
      const actions: ActionCardData[] = [];
      const dependencies: DependencyConnection[] = [];
      let timeframeDefinitions = {
        short: '0-3 months',
        medium: '3-6 months',
        long: '6-12 months',
      };

      items?.forEach((item: WorkspaceItem) => {
        const content = item.content;

        if (content.type === 'theme') {
          themes.push(content.data);
        } else if (content.type === 'capability') {
          capabilities.push(content.data);
        } else if (content.type === 'action') {
          actions.push(content.data);
        } else if (content.type === 'dependency') {
          dependencies.push(content.data);
        } else if (content.type === 'timeframe_definitions') {
          timeframeDefinitions = content.data;
        }
      });

      setData({ themes, capabilities, actions, dependencies, timeframeDefinitions });
      setLoading(false);
    } catch (error) {
      console.error('Error in loadItems:', error);
      setLoading(false);
    }
  }, [workspaceId, user]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Set up realtime subscription
  useEffect(() => {
    if (!workspaceId || !user) {
      setIsLive(false);
      return;
    }

    const channel = supabase
      .channel(`workspace:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_items',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          // Ignore changes made by current user to prevent duplicates
          if (isLocalUpdate.current) {
            isLocalUpdate.current = false;
            return;
          }

          // Reload all items when remote change detected
          loadItems();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsLive(false);
        }
      });

    return () => {
      channel.unsubscribe();
      setIsLive(false);
    };
  }, [workspaceId, user, loadItems]);

  // Save item to database
  const saveItem = async (type: string, itemData: any, itemId?: string) => {
    if (!workspaceId || !user) return null;

    try {
      const content = { type, data: itemData };

      if (itemId) {
        // Update existing item - get all items and filter client-side
        const { data: items } = await supabase
          .from('workspace_items')
          .select('*')
          .eq('workspace_id', workspaceId);

        const existingItem = items?.find(
          (item: WorkspaceItem) =>
            item.content?.type === type &&
            item.content?.data?.id === itemId
        );

        if (existingItem) {
          const { error } = await supabase
            .from('workspace_items')
            .update({ content })
            .eq('id', existingItem.id);

          if (error) {
            console.error('Error updating item:', error);
            return null;
          }
        }
      } else {
        // Create new item
        const { error } = await supabase
          .from('workspace_items')
          .insert({
            workspace_id: workspaceId,
            author_id: user.id,
            content,
            position_x: 0,
            position_y: 0,
          });

        if (error) {
          console.error('Error creating item:', error);
          return null;
        }
      }

      return itemData;
    } catch (error) {
      console.error('Error in saveItem:', error);
      return null;
    }
  };

  // Delete item from database
  const deleteItem = async (type: string, itemId: string) => {
    if (!workspaceId || !user) return;

    try {
      const { data: items } = await supabase
        .from('workspace_items')
        .select('*')
        .eq('workspace_id', workspaceId);

      const itemToDelete = items?.find(
        (item: WorkspaceItem) =>
          item.content?.type === type &&
          item.content?.data?.id === itemId
      );

      if (itemToDelete) {
        const { error } = await supabase
          .from('workspace_items')
          .delete()
          .eq('id', itemToDelete.id);

        if (error) {
          console.error('Error deleting item:', error);
        }
      }
    } catch (error) {
      console.error('Error in deleteItem:', error);
    }
  };

  // Batch save all items (for bulk operations like reordering)
  const saveAllItems = async (newData: Partial<WorkspaceData>) => {
    if (!workspaceId || !user) return;

    try {
      // Mark as local update to prevent duplicate UI updates
      isLocalUpdate.current = true;

      // Delete all existing items
      await supabase
        .from('workspace_items')
        .delete()
        .eq('workspace_id', workspaceId);

      // Insert all items
      const itemsToInsert: any[] = [];

      if (newData.themes) {
        newData.themes.forEach((theme) => {
          itemsToInsert.push({
            workspace_id: workspaceId,
            author_id: user.id,
            content: { type: 'theme', data: theme },
            position_x: 0,
            position_y: 0,
          });
        });
      }

      if (newData.capabilities) {
        newData.capabilities.forEach((capability) => {
          itemsToInsert.push({
            workspace_id: workspaceId,
            author_id: user.id,
            content: { type: 'capability', data: capability },
            position_x: 0,
            position_y: 0,
          });
        });
      }

      if (newData.actions) {
        newData.actions.forEach((action) => {
          itemsToInsert.push({
            workspace_id: workspaceId,
            author_id: user.id,
            content: { type: 'action', data: action },
            position_x: 0,
            position_y: 0,
          });
        });
      }

      if (newData.dependencies) {
        newData.dependencies.forEach((dependency) => {
          itemsToInsert.push({
            workspace_id: workspaceId,
            author_id: user.id,
            content: { type: 'dependency', data: dependency },
            position_x: 0,
            position_y: 0,
          });
        });
      }

      if (newData.timeframeDefinitions) {
        itemsToInsert.push({
          workspace_id: workspaceId,
          author_id: user.id,
          content: { type: 'timeframe_definitions', data: newData.timeframeDefinitions },
          position_x: 0,
          position_y: 0,
        });
      }

      if (itemsToInsert.length > 0) {
        const { error } = await supabase
          .from('workspace_items')
          .insert(itemsToInsert);

        if (error) {
          console.error('Error saving all items:', error);
        }
      }
    } catch (error) {
      console.error('Error in saveAllItems:', error);
    }
  };

  return {
    data,
    loading,
    saveItem,
    deleteItem,
    saveAllItems,
    setData,
    isLive,
  };
}
