import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface RealtimeDebugPanelProps {
  supabaseUrl: string;
  userId: string | null;
  workspaceId: string | null;
  channelName: string | null;
  subscriptionStatus: string;
  lastError: any;
  lastEventTime: number | null;
  isSubscribedToWorkspaceItems: boolean;
  channelState: string;
  realtimeEnabled: boolean;
}

export function RealtimeDebugPanel({
  supabaseUrl,
  userId,
  workspaceId,
  channelName,
  subscriptionStatus,
  lastError,
  lastEventTime,
  isSubscribedToWorkspaceItems,
  channelState,
  realtimeEnabled,
}: RealtimeDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border-2 border-purple-500 rounded-lg shadow-xl z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-purple-600 text-white font-semibold text-sm flex items-center justify-between rounded-t-lg"
      >
        <span>🔍 Realtime Debug Panel</span>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
          <div className="space-y-1">
            <div className="font-semibold text-purple-700">Environment</div>
            <div className="pl-2 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Supabase URL:</span>
                <span className="text-gray-900">{supabaseUrl || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Realtime Enabled:</span>
                <span className={realtimeEnabled ? 'text-green-600' : 'text-red-600'}>
                  {realtimeEnabled ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-purple-700">User & Workspace</div>
            <div className="pl-2 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-600">User ID:</span>
                <span className="text-gray-900 truncate ml-2">{userId || 'Not logged in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Workspace ID:</span>
                <span className="text-gray-900 truncate ml-2">{workspaceId || 'No workspace'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-purple-700">Channel Info</div>
            <div className="pl-2 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Channel Name:</span>
                <span className="text-gray-900">{channelName || 'Not created'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Channel State:</span>
                <span className={
                  channelState === 'joined' ? 'text-green-600' :
                  channelState === 'closed' ? 'text-red-600' :
                  'text-yellow-600'
                }>
                  {channelState || 'unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subscription Status:</span>
                <span className={
                  subscriptionStatus === 'SUBSCRIBED' ? 'text-green-600' :
                  subscriptionStatus.includes('ERROR') ? 'text-red-600' :
                  'text-yellow-600'
                }>
                  {subscriptionStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Workspace Items:</span>
                <span className={isSubscribedToWorkspaceItems ? 'text-green-600' : 'text-red-600'}>
                  {isSubscribedToWorkspaceItems ? 'Subscribed' : 'Not subscribed'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-purple-700">Events</div>
            <div className="pl-2 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Last Event:</span>
                <span className="text-gray-900">
                  {lastEventTime ? new Date(lastEventTime).toLocaleTimeString() : 'Never'}
                </span>
              </div>
              {lastEventTime && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Time Since:</span>
                  <span className="text-gray-900">
                    {Math.round((Date.now() - lastEventTime) / 1000)}s ago
                  </span>
                </div>
              )}
            </div>
          </div>

          {lastError && (
            <div className="space-y-1">
              <div className="font-semibold text-red-700">Last Error</div>
              <div className="pl-2 bg-red-50 p-2 rounded border border-red-200">
                <pre className="text-[10px] text-red-800 whitespace-pre-wrap break-words">
                  {typeof lastError === 'string'
                    ? lastError
                    : JSON.stringify(lastError, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-500">
            Check browser console (F12) for detailed logs
          </div>
        </div>
      )}
    </div>
  );
}
