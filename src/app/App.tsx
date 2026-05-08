import { useState, Fragment, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Plus, LayoutGrid, GitBranch, CalendarClock, Clock, User, LogOut, LogIn } from 'lucide-react';
import { ThemeCard, type ThemeCardData } from './components/ThemeCard';
import { CapabilityCard, type CapabilityCardData } from './components/CapabilityCard';
import { type ActionCardData } from './components/ActionCard';
import { ActionDropZone } from './components/ActionDropZone';
import { TimelineView, type DependencyConnection } from './components/TimelineView';
import { StructuredTimelineView } from './components/StructuredTimelineView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { useWorkspace } from './hooks/useWorkspace';
import { useWorkspaceItems } from './hooks/useWorkspaceItems';
import { LiveIndicator } from './components/LiveIndicator';
import { RealtimeDebugPanel } from './components/RealtimeDebugPanel';
import { projectId } from '../../utils/supabase/info';

const TEAMS = ['Mechanics', 'Software', 'R&D (Digital Service Design)', 'Digital Services', 'Sales Engineering', 'Sales'];

const TIMEFRAMES = [
  { key: 'short', label: 'Short Term' },
  { key: 'medium', label: 'Medium Term' },
  { key: 'long', label: 'Long Term' },
] as const;

function RoadmapApp() {
  const { user, signOut } = useAuth();
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { data, loading: itemsLoading, saveItem, deleteItem, saveAllItems, setData, isLive, connectionStatus, debugInfo } = useWorkspaceItems(workspace?.id || null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [viewMode, setViewMode] = useState<'multilayer' | 'timeline' | 'structured'>('multilayer');
  const [timeBlockWeeks, setTimeBlockWeeks] = useState(1);
  const [newThemeIds, setNewThemeIds] = useState<Set<string>>(new Set());
  const [newCapabilityIds, setNewCapabilityIds] = useState<Set<string>>(new Set());

  // Capture console errors for debugging
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      // Errors are already being logged, just making sure they're visible
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  // Extract data from workspace
  const themes = data.themes;
  const capabilities = data.capabilities;
  const actions = data.actions;
  const dependencies = data.dependencies;
  const timeframeDefinitions = data.timeframeDefinitions;

  // Log workspace info for debugging
  useEffect(() => {
    if (workspace) {
      console.log('🏢 Active workspace:', {
        id: workspace.id,
        name: workspace.name,
        owner_id: workspace.owner_id,
      });
    }
  }, [workspace]);

  // Initialize workspace with default data if empty
  useEffect(() => {
    if (!workspace || itemsLoading) return;

    // If workspace is empty, add default sample data
    if (themes.length === 0 && capabilities.length === 0 && actions.length === 0) {
      const defaultData = {
        themes: [
          {
            id: '1',
            title: 'Equipment Downtime',
            description: 'Reduce unplanned stops and improve maintenance response',
          },
          {
            id: '2',
            title: 'Service Revenue Growth',
            description: 'Transition from product sales to recurring service revenue',
          },
        ],
        capabilities: [
          {
            id: '1',
            title: 'Real-time Equipment Monitoring',
            ephemerality: 'Stable' as const,
            themeId: '1',
          },
          {
            id: '2',
            title: 'Predictive Maintenance Engine',
            ephemerality: 'Evolving' as const,
            themeId: '1',
          },
          {
            id: '3',
            title: 'Digital Service Platform',
            ephemerality: 'Stable' as const,
            themeId: '2',
          },
        ],
        actions: [
          {
            id: '1',
            title: 'Install IoT sensors on critical machines',
            team: 'Mechanics',
            urgency: 'H' as const,
            risk: 'M' as const,
            acceptance: 'H' as const,
            effort: 'M' as const,
            timeBlocksRequired: 2,
            timeframe: 'short' as const,
            capabilityId: '1',
          },
          {
            id: '2',
            title: 'Build data pipeline for sensor data',
            team: 'Software',
            urgency: 'H' as const,
            risk: 'H' as const,
            acceptance: 'M' as const,
            effort: 'H' as const,
            timeBlocksRequired: 3,
            timeframe: 'short' as const,
            capabilityId: '1',
          },
        ],
        dependencies: [
          {
            id: '1',
            fromId: '1',
            toId: '2',
            type: 'cross-team' as const,
          },
        ],
        timeframeDefinitions: {
          short: '0–12 months',
          medium: '1–3 years',
          long: '3–5+ years',
        },
      };

      setData(defaultData);
      saveAllItems(defaultData);
    }
  }, [workspace, itemsLoading, themes.length, capabilities.length, actions.length]);

  // Update functions that save to Supabase
  const setThemes = (newThemes: ThemeCardData[]) => {
    setData({ ...data, themes: newThemes });
    saveAllItems({ ...data, themes: newThemes });
  };

  const setCapabilities = (newCapabilities: CapabilityCardData[]) => {
    setData({ ...data, capabilities: newCapabilities });
    saveAllItems({ ...data, capabilities: newCapabilities });
  };

  const setActions = (newActions: ActionCardData[]) => {
    setData({ ...data, actions: newActions });
    saveAllItems({ ...data, actions: newActions });
  };

  const setDependencies = (newDependencies: DependencyConnection[]) => {
    setData({ ...data, dependencies: newDependencies });
    saveAllItems({ ...data, dependencies: newDependencies });
  };

  const setTimeframeDefinitions = (newTimeframeDefinitions: Record<string, string>) => {
    setData({ ...data, timeframeDefinitions: newTimeframeDefinitions });
    saveAllItems({ ...data, timeframeDefinitions: newTimeframeDefinitions });
  };

  const orderActionsByDependencies = (
    sourceActions: ActionCardData[],
    sourceDependencies: DependencyConnection[],
  ) => {
    const actionById = new Map(sourceActions.map((action) => [action.id, action]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const orderedActions: ActionCardData[] = [];

    const visit = (actionId: string) => {
      if (visited.has(actionId)) return;
      if (visiting.has(actionId)) return;

      const action = actionById.get(actionId);
      if (!action) return;

      visiting.add(actionId);

      sourceDependencies
        .filter((dependency) => dependency.toId === actionId)
        .forEach((dependency) => {
          visit(dependency.fromId);
        });

      visiting.delete(actionId);
      visited.add(actionId);
      orderedActions.push(action);
    };

    sourceActions.forEach((action) => {
      visit(action.id);
    });

    return orderedActions;
  };

  const setOrderedActions = (
    nextActions: ActionCardData[],
    nextDependencies: DependencyConnection[] = dependencies,
  ) => {
    setActions(orderActionsByDependencies(nextActions, nextDependencies));
  };

  const updateActionSafely = (updatedAction: ActionCardData) => {
    const updatedActions = actions.map((action) =>
      action.id === updatedAction.id ? updatedAction : action,
    );

    setOrderedActions(updatedActions);
  };

  const deleteActionSafely = (id: string) => {
    const updatedActions = actions.filter((action) => action.id !== id);
    const updatedDependencies = dependencies.filter(
      (dependency) => dependency.fromId !== id && dependency.toId !== id,
    );

    setDependencies(updatedDependencies);
    setOrderedActions(updatedActions, updatedDependencies);
  };

  const orderedActions = orderActionsByDependencies(actions, dependencies);

  const addTheme = () => {
    const newTheme: ThemeCardData = {
      id: Date.now().toString(),
      title: '',
      description: '',
    };

    setThemes([...themes, newTheme]);
    setNewThemeIds(new Set([...newThemeIds, newTheme.id]));
  };

  const addCapability = () => {
    const newCapability: CapabilityCardData = {
      id: Date.now().toString(),
      title: '',
      ephemerality: 'Evolving',
    };

    setCapabilities([...capabilities, newCapability]);
    setNewCapabilityIds(new Set([...newCapabilityIds, newCapability.id]));
  };

  const addAction = (newAction: Omit<ActionCardData, 'id'>) => {
    const actionToAdd: ActionCardData = {
      ...newAction,
      id: Date.now().toString(),
    };

    setOrderedActions([...actions, actionToAdd]);
  };

  const addDependency = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    const dependencyAlreadyExists = dependencies.some(
      (dependency) => dependency.fromId === fromId && dependency.toId === toId,
    );

    if (dependencyAlreadyExists) return;

    const fromAction = actions.find((a) => a.id === fromId);
    const toAction = actions.find((a) => a.id === toId);

    const type: 'intra-team' | 'cross-team' =
      fromAction?.team === toAction?.team ? 'intra-team' : 'cross-team';

    const newDep: DependencyConnection = {
      id: Date.now().toString(),
      fromId,
      toId,
      type,
    };

    const updatedDependencies = [...dependencies, newDep];

    setDependencies(updatedDependencies);
    setOrderedActions(actions, updatedDependencies);
  };

  const removeDependency = (fromId: string, toId: string) => {
    const updatedDependencies = dependencies.filter(
      (d) => !(d.fromId === fromId && d.toId === toId),
    );

    setDependencies(updatedDependencies);
    setOrderedActions(actions, updatedDependencies);
  };

  const moveAction = (
    actionId: string,
    targetTeam: string,
    targetTimeframe: string,
    insertIndex: number,
  ) => {
    const actionToMove = actions.find((a) => a.id === actionId);
    if (!actionToMove) return;

    const updatedAction: ActionCardData = {
      ...actionToMove,
      team: targetTeam,
      timeframe: targetTimeframe as 'short' | 'medium' | 'long',
    };

    const otherActions = actions.filter((a) => a.id !== actionId);

    const targetZoneActions = otherActions.filter(
      (a) => a.team === targetTeam && a.timeframe === targetTimeframe,
    );

    const reorderedTargetActions = [
      ...targetZoneActions.slice(0, insertIndex),
      updatedAction,
      ...targetZoneActions.slice(insertIndex),
    ];

    const targetZoneIds = new Set(targetZoneActions.map((action) => action.id));

    let replacementIndex = 0;

    const proposedActions = otherActions.flatMap((action) => {
      if (targetZoneIds.has(action.id)) {
        const replacementAction = reorderedTargetActions[replacementIndex];
        replacementIndex += 1;
        return replacementAction ? [replacementAction] : [];
      }

      return [action];
    });

    if (targetZoneActions.length === 0 || replacementIndex < reorderedTargetActions.length) {
      proposedActions.push(...reorderedTargetActions.slice(replacementIndex));
    }

    setOrderedActions(proposedActions);
  };

  // Show loading state
  if (workspaceLoading || itemsLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading workspace...</div>
      </div>
    );
  }

  // Show auth prompt if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Welcome to Digital Servitization Roadmap</h2>
          <p className="text-gray-600 mb-6">Please sign in to access your workspace</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors mx-auto"
            style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
          >
            <LogIn size={18} />
            Sign In
          </button>
        </div>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="min-h-screen bg-gray-100"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        <div className="p-6">
          <div className="flex gap-6">
            <div className="flex-1">
              <div className="mb-6 flex items-center gap-3">
                <button
                  onClick={() => setViewMode('multilayer')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'multilayer'
                      ? 'bg-slate-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  Input View
                  <LayoutGrid size={18} />
                </button>

                <button
                  onClick={() => setViewMode('timeline')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-slate-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  Review View
                  <GitBranch size={18} />
                </button>

                <button
                  onClick={() => setViewMode('structured')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'structured'
                      ? 'bg-slate-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  Output View
                  <CalendarClock size={18} />
                </button>

                <div className="ml-auto flex items-center gap-3">
                  <LiveIndicator
                    isLive={isLive}
                    workspaceId={workspace?.id}
                    connectionStatus={connectionStatus}
                    userId={user?.id}
                  />

                  {user ? (
                    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
                          <User size={15} className="text-blue-600" />
                        </div>
                        <span className="text-sm" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                          {user.user_metadata?.name || user.email}
                        </span>
                      </div>
                      <button
                        onClick={signOut}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
                      >
                        <LogOut size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                    >
                      <LogIn size={16} />
                      Sign In
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                      <Clock size={15} className="text-slate-600" />
                    </div>

                    <span
                      className="text-sm"
                      style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                    >
                      Time Block
                    </span>
                  </div>

                  <div className="h-5 w-px bg-slate-200" />

                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs text-slate-500"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                    >
                      1 block =
                    </span>

                    <select
                      value={timeBlockWeeks}
                      onChange={(e) => setTimeBlockWeeks(Number(e.target.value))}
                      className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                    >
                      {Array.from({ length: 12 }).map((_, index) => {
                        const weekValue = index + 1;

                        return (
                          <option key={weekValue} value={weekValue}>
                            {weekValue} {weekValue === 1 ? 'week' : 'weeks'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {viewMode === 'multilayer' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="mb-8">
                    <h1
                      className="text-2xl mb-1"
                      style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}
                    >
                      Digital Servitization Multilayer Roadmap
                    </h1>
                    <p
                      className="text-sm text-gray-600"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      A common ground for translating strategy to actions and co-creating roadmap
                    </p>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <h2
                        className="text-sm uppercase tracking-wide text-gray-500"
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                      >
                        LAYER 1: Why (themes)
                      </h2>

                      <button
                        onClick={addTheme}
                        className="flex items-center gap-1 px-3 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm"
                      >
                        <Plus size={14} />
                        Add Theme
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {themes.map((theme) => (
                        <ThemeCard
                          key={theme.id}
                          theme={theme}
                          initialEditing={newThemeIds.has(theme.id)}
                          onUpdate={(updated) => {
                            setThemes(
                              themes.map((t) =>
                                t.id === updated.id ? updated : t,
                              ),
                            );
                            // Remove from new IDs when saved
                            const updatedNewIds = new Set(newThemeIds);
                            updatedNewIds.delete(updated.id);
                            setNewThemeIds(updatedNewIds);
                          }}
                          onDelete={(id) => {
                            setThemes(themes.filter((t) => t.id !== id));
                            // Remove from new IDs when deleted
                            const updatedNewIds = new Set(newThemeIds);
                            updatedNewIds.delete(id);
                            setNewThemeIds(updatedNewIds);
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <h2
                        className="text-sm uppercase tracking-wide text-gray-500"
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                      >
                        LAYER 2: WHAT (CAPABILITIES)
                      </h2>

                      <button
                        onClick={addCapability}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                      >
                        <Plus size={14} />
                        Add Capability
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {capabilities.map((capability) => (
                        <CapabilityCard
                          key={capability.id}
                          capability={capability}
                          initialEditing={newCapabilityIds.has(capability.id)}
                          onUpdate={(updated) => {
                            setCapabilities(
                              capabilities.map((c) =>
                                c.id === updated.id ? updated : c,
                              ),
                            );
                            // Remove from new IDs when saved
                            const updatedNewIds = new Set(newCapabilityIds);
                            updatedNewIds.delete(updated.id);
                            setNewCapabilityIds(updatedNewIds);
                          }}
                          onDelete={(id) => {
                            setCapabilities(
                              capabilities.filter((c) => c.id !== id),
                            );
                            // Remove from new IDs when deleted
                            const updatedNewIds = new Set(newCapabilityIds);
                            updatedNewIds.delete(id);
                            setNewCapabilityIds(updatedNewIds);
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3">
                      <h2
                        className="text-sm uppercase tracking-wide text-gray-500"
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                      >
                        LAYER 3: HOW (TEAM ACTIONS)
                      </h2>
                    </div>

                    <div className="mb-3">
                      <div className="grid grid-cols-[200px_1fr_1fr_1fr] gap-4 items-end">
                        <div></div>

                        {TIMEFRAMES.map((tf) => (
                          <div key={tf.key} className="text-center">
                            <div className="bg-slate-100 rounded-lg p-3">
                              <h3
                                className="text-sm uppercase tracking-wide"
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 600,
                                }}
                              >
                                {tf.label}
                              </h3>

                              <input
                                type="text"
                                value={timeframeDefinitions[tf.key]}
                                onChange={(e) =>
                                  setTimeframeDefinitions({
                                    ...timeframeDefinitions,
                                    [tf.key]: e.target.value,
                                  })
                                }
                                placeholder="Set timeframe"
                                title="Click to edit timeframe"
                                className="mt-2 w-full rounded-md px-2 py-1 text-center text-xs text-gray-600 bg-white/60 border border-transparent hover:border-slate-300 focus:border-blue-400 focus:bg-white focus:outline-none transition-colors"
                                style={{ fontFamily: 'var(--font-sans)' }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {TEAMS.map((team) => (
                      <div key={team} className="mb-4">
                        <div className="grid grid-cols-[200px_1fr_auto_1fr_auto_1fr] gap-4">
                          <div className="flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span
                              className="text-xs"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                              }}
                            >
                              {team}
                            </span>
                          </div>

                          {TIMEFRAMES.map((tf, idx) => (
                            <Fragment key={tf.key}>
                              <ActionDropZone
                                team={team}
                                timeframe={tf.key}
                                actions={orderedActions.filter(
                                  (action) =>
                                    action.team === team &&
                                    action.timeframe === tf.key,
                                )}
                                allActions={orderedActions}
                                dependencies={dependencies}
                                onUpdate={updateActionSafely}
                                onDelete={deleteActionSafely}
                                onAddAction={addAction}
                                onMoveAction={moveAction}
                                onAddDependency={addDependency}
                                onRemoveDependency={removeDependency}
                              />

                              {idx < TIMEFRAMES.length - 1 && <div></div>}
                            </Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <p
                      className="text-xs text-gray-500 text-center"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      This is an editable template. Click any element to modify,
                      drag actions to reposition, and use the + buttons to add new
                      items.
                    </p>
                  </div>
                </div>
              )}

              {viewMode === 'timeline' && (
                <TimelineView
  actions={orderedActions}
  onUpdateAction={updateActionSafely}
  dependencies={dependencies}
  onAddDependency={addDependency}
  onRemoveDependency={removeDependency}
  onMoveAction={moveAction}
/>
              )}

              {viewMode === 'structured' && (
                <StructuredTimelineView
  actions={orderedActions}
  onUpdateAction={updateActionSafely}
  onReorderActions={setOrderedActions}
  dependencies={dependencies}
  onAddDependency={addDependency}
  onRemoveDependency={removeDependency}
  timeBlockWeeks={timeBlockWeeks}
/>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Temporary Debug Panel */}
      <RealtimeDebugPanel
        supabaseUrl={`https://${projectId}.supabase.co`}
        userId={user?.id || null}
        workspaceId={workspace?.id || null}
        channelName={debugInfo.channelName}
        subscriptionStatus={connectionStatus}
        lastError={debugInfo.lastError}
        lastEventTime={debugInfo.lastEventTime}
        isSubscribedToWorkspaceItems={debugInfo.isSubscribedToWorkspaceItems}
        channelState={debugInfo.channelState}
        realtimeEnabled={debugInfo.realtimeEnabled}
      />
    </DndProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RoadmapApp />
    </AuthProvider>
  );
}