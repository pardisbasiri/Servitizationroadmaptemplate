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
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [debugInfo, setDebugInfo] = useState({
    channelName: null as string | null,
    channelState: 'unknown',
    lastError: null as any,
    lastEventTime: null as number | null,
    isSubscribedToWorkspaceItems: false,
    realtimeEnabled: true,
  });
  const channelRef = useRef<any>(null);

  // Load all items from workspace
  const loadItems = useCallback(async () => {
    if (!workspaceId || !user) {
      setLoading(false);
      return;
    }

    try {
      console.log('📥 Loading items for workspace:', workspaceId);
      const { data: items, error } = await supabase
        .from('workspace_items')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('❌ Error loading workspace items:', error);
        setDebugInfo(prev => ({ ...prev, lastError: error }));
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

      console.log('✅ Loaded items:', {
        themes: themes.length,
        capabilities: capabilities.length,
        actions: actions.length,
        dependencies: dependencies.length,
      });

      setData({ themes, capabilities, actions, dependencies, timeframeDefinitions });
      setLoading(false);
    } catch (error) {
      console.error('❌ Error in loadItems:', error);
      setDebugInfo(prev => ({ ...prev, lastError: error }));
      setLoading(false);
    }
  }, [workspaceId, user]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Set up realtime subscription
  useEffect(() => {
    console.log('🔄 Realtime effect triggered', { workspaceId, userId: user?.id });

    if (!workspaceId || !user) {
      console.log('⚠️ Realtime: No workspace or user', { workspaceId, userId: user?.id });
      setIsLive(false);
      setConnectionStatus('no_workspace_or_user');
      setDebugInfo(prev => ({
        ...prev,
        channelName: null,
        channelState: 'not_initialized',
        isSubscribedToWorkspaceItems: false,
      }));
      return;
    }

    console.log('🔌 Setting up realtime subscription', {
      workspaceId,
      userId: user.id,
      userEmail: user.email,
    });

    setConnectionStatus('connecting');

    // Clean up any existing channel
    if (channelRef.current) {
      console.log('🧹 Cleaning up existing channel');
      try {
        channelRef.current.unsubscribe();
      } catch (e) {
        console.error('Error unsubscribing:', e);
      }
      channelRef.current = null;
    }

    const channelName = `workspace-${workspaceId}`;
    console.log('📺 Creating channel:', channelName);

    setDebugInfo(prev => ({
      ...prev,
      channelName,
      channelState: 'creating',
      isSubscribedToWorkspaceItems: false,
    }));

    try {
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: user.id },
        },
      });

      channelRef.current = channel;

      console.log('➕ Adding postgres_changes listener for workspace_items');

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_items',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('📡 Realtime event received:', {
            event: payload.eventType,
            table: payload.table,
            workspace_id: payload.new?.workspace_id || payload.old?.workspace_id,
            author_id: payload.new?.author_id || payload.old?.author_id,
            current_user: user.id,
            timestamp: new Date().toISOString(),
          });

          setDebugInfo(prev => ({ ...prev, lastEventTime: Date.now() }));

          // Check if this was from the current user
          const isFromCurrentUser =
            payload.new?.author_id === user.id ||
            payload.old?.author_id === user.id;

          if (isFromCurrentUser) {
            console.log('⏭️ Skipping - change from current user');
            return;
          }

          console.log('🔄 Reloading items due to remote change from another user');
          loadItems();
        }
      );

      setDebugInfo(prev => ({ ...prev, isSubscribedToWorkspaceItems: true }));

      console.log('🔗 Subscribing to channel...');

      channel.subscribe(async (status, err) => {
        console.log('📊 === REALTIME SUBSCRIPTION CALLBACK ===');
        console.log('📊 Status:', status);
        console.log('📊 Error:', err);
        console.log('📊 Channel state:', channel.state);
        console.log('📊 Timestamp:', new Date().toISOString());
        console.log('📊 ======================================');

        setConnectionStatus(status);
        setDebugInfo(prev => ({ ...prev, channelState: channel.state }));

        if (err) {
          console.error('❌ Subscription error:', err);
          setDebugInfo(prev => ({ ...prev, lastError: err }));
        }

        if (status === 'SUBSCRIBED') {
          setIsLive(true);
          console.log('✅ ✅ ✅ Realtime SUBSCRIBED ✅ ✅ ✅', {
            channel: channelName,
            workspaceId,
            userId: user.id,
            channelState: channel.state,
          });
        } else if (status === 'CHANNEL_ERROR') {
          setIsLive(false);
          console.error('❌ ❌ ❌ Realtime CHANNEL_ERROR ❌ ❌ ❌', err);
          setDebugInfo(prev => ({ ...prev, lastError: err || 'CHANNEL_ERROR' }));
        } else if (status === 'TIMED_OUT') {
          setIsLive(false);
          console.error('❌ ❌ ❌ Realtime TIMED_OUT ❌ ❌ ❌');
          setDebugInfo(prev => ({ ...prev, lastError: 'TIMED_OUT' }));
        } else if (status === 'CLOSED') {
          setIsLive(false);
          console.log('🔴 Realtime CLOSED');
        } else {
          console.log('📊 Realtime intermediate status:', status);
        }
      });

      // Check connection state after delays
      setTimeout(() => {
        console.log('🔍 [2s check] Channel state:', {
          state: channel.state,
          isLive,
          status: connectionStatus,
        });
      }, 2000);

      setTimeout(() => {
        console.log('🔍 [5s check] Channel state:', {
          state: channel.state,
          isLive,
          status: connectionStatus,
        });
      }, 5000);

    } catch (error) {
      console.error('❌ Error setting up realtime:', error);
      setDebugInfo(prev => ({ ...prev, lastError: error }));
      setConnectionStatus('setup_error');
    }

    return () => {
      console.log('🔌 Cleaning up realtime subscription');
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch (e) {
          console.error('Error during cleanup:', e);
        }
        channelRef.current = null;
      }
      setIsLive(false);
      setConnectionStatus('disconnected');
      setDebugInfo(prev => ({
        ...prev,
        channelState: 'closed',
        isSubscribedToWorkspaceItems: false,
      }));
    };
  }, [workspaceId, user, loadItems]);

  // Save item to database
  const saveItem = async (type: string, itemData: any, itemId?: string) => {
    if (!workspaceId || !user) return null;

    try {
      const content = { type, data: itemData };

      if (itemId) {
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
      console.log('💾 Saving all items to workspace:', workspaceId, {
        themes: newData.themes?.length,
        capabilities: newData.capabilities?.length,
        actions: newData.actions?.length,
        dependencies: newData.dependencies?.length,
      });

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
        } else {
          console.log('✅ Saved', itemsToInsert.length, 'items to workspace');
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
    connectionStatus,
    debugInfo,
  };
}
