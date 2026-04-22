import { useState, Fragment } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Plus, LayoutGrid, GitBranch, CalendarClock } from 'lucide-react';
import { ThemeCard, type ThemeCardData } from './components/ThemeCard';
import { CapabilityCard, type CapabilityCardData } from './components/CapabilityCard';
import { ActionCard, type ActionCardData } from './components/ActionCard';
import { ActionDropZone } from './components/ActionDropZone';
import { GuidePanel } from './components/GuidePanel';
import { TimeHorizonDefinition } from './components/TimeHorizonDefinition';
import { KPIPanel } from './components/KPIPanel';
import { DecisionGatesLegend, DecisionGateMarker } from './components/DecisionGates';
import { TimelineView, type DependencyConnection } from './components/TimelineView';
import { StructuredTimelineView } from './components/StructuredTimelineView';
import { DependencyManager } from './components/DependencyManager';
import { TimelineGuide } from './components/TimelineGuide';
import { StructuredTimelineGuide } from './components/StructuredTimelineGuide';

const TEAMS = ['Mechanics', 'Software', 'R&D (Digital Service Design)', 'Digital Services', 'Sales Engineering', 'Sales'];
const TIMEFRAMES = [
  { key: 'short', label: 'Short Term' },
  { key: 'medium', label: 'Medium Term' },
  { key: 'long', label: 'Long Term' },
] as const;

export default function App() {
  const [viewMode, setViewMode] = useState<'multilayer' | 'timeline' | 'structured'>('multilayer');
  
  const [themes, setThemes] = useState<ThemeCardData[]>([
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
  ]);

  const [capabilities, setCapabilities] = useState<CapabilityCardData[]>([
    {
      id: '1',
      title: 'Real-time Equipment Monitoring',
      ephemerality: 'Stable',
      themeId: '1',
    },
    {
      id: '2',
      title: 'Predictive Maintenance Engine',
      ephemerality: 'Evolving',
      themeId: '1',
    },
    {
      id: '3',
      title: 'Digital Service Platform',
      ephemerality: 'Stable',
      themeId: '2',
    },
  ]);

  const [actions, setActions] = useState<ActionCardData[]>([
    {
      id: '1',
      title: 'Install IoT sensors on critical machines',
      team: 'Mechanics',
      urgency: 'H',
      risk: 'M',
      acceptance: 'H',
      effort: 'M',
      timeframe: 'short',
      capabilityId: '1',
    },
    {
      id: '2',
      title: 'Build data pipeline for sensor data',
      team: 'Software',
      urgency: 'H',
      risk: 'H',
      acceptance: 'M',
      effort: 'H',
      timeframe: 'short',
      capabilityId: '1',
    },
    {
      id: '3',
      title: 'Define service packages and pricing',
      team: 'Sales',
      urgency: 'L',
      risk: 'L',
      acceptance: 'H',
      effort: 'M',
      timeframe: 'long',
      capabilityId: '3',
    },
    {
      id: '4',
      title: 'Train ML models for failure prediction',
      team: 'R&D (Digital Service Design)',
      urgency: 'M',
      risk: 'H',
      acceptance: 'M',
      effort: 'H',
      timeframe: 'medium',
      capabilityId: '2',
    },
    {
      id: '5',
      title: 'Set up monitoring dashboard',
      team: 'Digital Services',
      urgency: 'H',
      risk: 'M',
      acceptance: 'H',
      effort: 'M',
      timeframe: 'short',
      capabilityId: '1',
    },
    {
      id: '6',
      title: 'Integrate ML engine with platform',
      team: 'Software',
      urgency: 'M',
      risk: 'H',
      acceptance: 'M',
      effort: 'H',
      timeframe: 'medium',
      capabilityId: '2',
    },
    {
      id: '7',
      title: 'Conduct pilot with key customer',
      team: 'Sales Engineering',
      urgency: 'L',
      risk: 'M',
      acceptance: 'H',
      effort: 'M',
      timeframe: 'long',
      capabilityId: '3',
    },
    {
      id: '8',
      title: 'Design service delivery workflows',
      team: 'R&D (Digital Service Design)',
      urgency: 'M',
      risk: 'M',
      acceptance: 'H',
      effort: 'M',
      timeframe: 'medium',
      capabilityId: '3',
    },
  ]);

  const [dependencies, setDependencies] = useState<DependencyConnection[]>([
    {
      id: '1',
      fromId: '1',
      toId: '2',
      type: 'cross-team',
    },
    {
      id: '2',
      fromId: '2',
      toId: '5',
      type: 'cross-team',
    },
    {
      id: '3',
      fromId: '2',
      toId: '4',
      type: 'cross-team',
    },
    {
      id: '4',
      fromId: '4',
      toId: '6',
      type: 'cross-team',
    },
    {
      id: '5',
      fromId: '6',
      toId: '8',
      type: 'cross-team',
    },
    {
      id: '6',
      fromId: '8',
      toId: '3',
      type: 'cross-team',
    },
    {
      id: '7',
      fromId: '3',
      toId: '7',
      type: 'cross-team',
    },
  ]);

  const addTheme = () => {
    const newTheme: ThemeCardData = {
      id: Date.now().toString(),
      title: 'New Theme',
      description: 'Describe the problem area',
    };
    setThemes([...themes, newTheme]);
  };

  const addCapability = () => {
    const newCapability: CapabilityCardData = {
      id: Date.now().toString(),
      title: 'New Capability',
      ephemerality: 'Evolving',
    };
    setCapabilities([...capabilities, newCapability]);
  };

  const addAction = (team: string, timeframe: string) => {
    const newAction: ActionCardData = {
      id: Date.now().toString(),
      title: 'New Action',
      team,
      urgency: 'M',
      risk: 'M',
      acceptance: 'M',
      effort: 'M',
      timeframe: timeframe as 'short' | 'medium' | 'long',
    };
    setActions([...actions, newAction]);
  };

  const addDependency = (fromId: string, toId: string) => {
    const fromAction = actions.find(a => a.id === fromId);
    const toAction = actions.find(a => a.id === toId);
    const type: 'intra-team' | 'cross-team' = 
      fromAction?.team === toAction?.team ? 'intra-team' : 'cross-team';
    
    const newDep: DependencyConnection = {
      id: Date.now().toString(),
      fromId,
      toId,
      type,
    };
    setDependencies([...dependencies, newDep]);
  };

  const removeDependency = (fromId: string, toId: string) => {
    setDependencies(dependencies.filter(d => !(d.fromId === fromId && d.toId === toId)));
  };

  const moveAction = (actionId: string, targetTeam: string, targetTimeframe: string, insertIndex: number) => {
    const actionToMove = actions.find(a => a.id === actionId);
    if (!actionToMove) return;

    // Update the action's team and timeframe
    const updatedAction = {
      ...actionToMove,
      team: targetTeam,
      timeframe: targetTimeframe as 'short' | 'medium' | 'long',
    };

    // Remove the action from its current position
    const otherActions = actions.filter(a => a.id !== actionId);

    // Get all actions in the target zone (excluding the moved action)
    const targetZoneActions = otherActions.filter(
      a => a.team === targetTeam && a.timeframe === targetTimeframe
    );

    // Insert at the specified index
    const reorderedTargetActions = [
      ...targetZoneActions.slice(0, insertIndex),
      updatedAction,
      ...targetZoneActions.slice(insertIndex),
    ];

    // Combine with actions from other zones
    const otherZoneActions = otherActions.filter(
      a => !(a.team === targetTeam && a.timeframe === targetTimeframe)
    );

    setActions([...otherZoneActions, ...reorderedTargetActions]);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-100" style={{ fontFamily: 'var(--font-sans)' }}>
        <div className="p-6">
          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1">
              {/* View Toggle */}
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
                  <LayoutGrid size={18} />
                  Multilayer View
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
                  <GitBranch size={18} />
                  Timeline View
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
                  <CalendarClock size={18} />
                  Structured Timeline
                </button>

                <div className="ml-auto">
                  <DependencyManager
                    actions={actions}
                    dependencies={dependencies}
                    onAddDependency={addDependency}
                    onRemoveDependency={removeDependency}
                  />
                </div>
              </div>

              {/* Multilayer View */}
              {viewMode === 'multilayer' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="mb-6">
                    <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
                      Digital Servitization Roadmap
                    </h1>
                    <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
                      Strategic planning for manufacturing digital transformation
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <TimeHorizonDefinition />
                      <KPIPanel />
                    </div>
                  </div>

                  {/* Time Headers with Decision Gates */}
                  <div className="mb-6">
                    <div className="grid grid-cols-[200px_1fr_auto_1fr_auto_1fr] gap-4 items-end">
                      <div></div>
                      <div className="text-center">
                        <div className="bg-slate-100 rounded-lg p-3">
                          <h3 className="text-sm uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {TIMEFRAMES[0].label}
                          </h3>
                        </div>
                      </div>
                      <DecisionGateMarker position="short" />
                      <div className="text-center">
                        <div className="bg-slate-100 rounded-lg p-3">
                          <h3 className="text-sm uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {TIMEFRAMES[1].label}
                          </h3>
                        </div>
                      </div>
                      <DecisionGateMarker position="medium" />
                      <div className="text-center">
                        <div className="bg-slate-100 rounded-lg p-3">
                          <h3 className="text-sm uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {TIMEFRAMES[2].label}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LEVEL 1: THEMES */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm uppercase tracking-wide text-gray-500" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        Level 1: Themes (Why)
                      </h2>
                      <button
                        onClick={addTheme}
                        className="flex items-center gap-1 px-3 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm"
                      >
                        <Plus size={14} />
                        Add Theme
                      </button>
                    </div>
                    <div className="grid grid-cols-[200px_1fr_auto_1fr_auto_1fr] gap-4">
                      <div className="flex items-center justify-center text-xs text-gray-400" style={{ fontFamily: 'var(--font-mono)' }}>
                        Problem Areas
                      </div>
                      <div className="col-span-5 grid grid-cols-1 gap-3">
                        {themes.map((theme) => (
                          <ThemeCard
                            key={theme.id}
                            theme={theme}
                            onUpdate={(updated) => setThemes(themes.map((t) => (t.id === updated.id ? updated : t)))}
                            onDelete={(id) => setThemes(themes.filter((t) => t.id !== id))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* LEVEL 2: CAPABILITIES */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm uppercase tracking-wide text-gray-500" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        Level 2: Capabilities (What)
                      </h2>
                      <button
                        onClick={addCapability}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                      >
                        <Plus size={14} />
                        Add Capability
                      </button>
                    </div>
                    <div className="grid grid-cols-[200px_1fr_auto_1fr_auto_1fr] gap-4">
                      <div className="flex items-center justify-center text-xs text-gray-400" style={{ fontFamily: 'var(--font-mono)' }}>
                        Required Capabilities
                      </div>
                      <div className="space-y-3">
                        {capabilities.filter((_, idx) => idx % 3 === 0).map((capability) => (
                          <CapabilityCard
                            key={capability.id}
                            capability={capability}
                            onUpdate={(updated) => setCapabilities(capabilities.map((c) => (c.id === updated.id ? updated : c)))}
                            onDelete={(id) => setCapabilities(capabilities.filter((c) => c.id !== id))}
                          />
                        ))}
                      </div>
                      <div></div>
                      <div className="space-y-3">
                        {capabilities.filter((_, idx) => idx % 3 === 1).map((capability) => (
                          <CapabilityCard
                            key={capability.id}
                            capability={capability}
                            onUpdate={(updated) => setCapabilities(capabilities.map((c) => (c.id === updated.id ? updated : c)))}
                            onDelete={(id) => setCapabilities(capabilities.filter((c) => c.id !== id))}
                          />
                        ))}
                      </div>
                      <div></div>
                      <div className="space-y-3">
                        {capabilities.filter((_, idx) => idx % 3 === 2).map((capability) => (
                          <CapabilityCard
                            key={capability.id}
                            capability={capability}
                            onUpdate={(updated) => setCapabilities(capabilities.map((c) => (c.id === updated.id ? updated : c)))}
                            onDelete={(id) => setCapabilities(capabilities.filter((c) => c.id !== id))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* LEVEL 3: TEAM ACTIONS */}
                  <div>
                    <div className="mb-3">
                      <h2 className="text-sm uppercase tracking-wide text-gray-500" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        Level 3: Team Actions (How)
                      </h2>
                    </div>

                    {TEAMS.map((team) => (
                      <div key={team} className="mb-4">
                        <div className="grid grid-cols-[200px_1fr_auto_1fr_auto_1fr] gap-4">
                          <div className="flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {team}
                            </span>
                          </div>

                          {TIMEFRAMES.map((tf, idx) => (
                            <Fragment key={tf.key}>
                              <ActionDropZone
                                team={team}
                                timeframe={tf.key}
                                actions={actions.filter((action) => action.team === team && action.timeframe === tf.key)}
                                allActions={actions}
                                dependencies={dependencies}
                                onUpdate={(updated) => setActions(actions.map((a) => (a.id === updated.id ? updated : a)))}
                                onDelete={(id) => setActions(actions.filter((a) => a.id !== id))}
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

                  {/* Footer Note */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center" style={{ fontFamily: 'var(--font-sans)' }}>
                      This is an editable template. Click any element to modify, drag actions to reposition, and use the + buttons to add new items.
                    </p>
                  </div>
                </div>
              )}

              {/* Timeline View */}
              {viewMode === 'timeline' && (
                <TimelineView
                  actions={actions}
                  onUpdateAction={(action) => setActions(actions.map((a) => (a.id === action.id ? action : a)))}
                  dependencies={dependencies}
                  onAddDependency={addDependency}
                  onRemoveDependency={removeDependency}
                />
              )}

              {/* Structured Timeline View */}
              {viewMode === 'structured' && (
                <StructuredTimelineView
                  actions={actions}
                  onUpdateAction={(action) => setActions(actions.map((a) => (a.id === action.id ? action : a)))}
                  dependencies={dependencies}
                  onAddDependency={addDependency}
                  onRemoveDependency={removeDependency}
                />
              )}
            </div>

            {/* Guide Panel */}
            <div className="w-80 space-y-4 sticky top-6 self-start">
              {viewMode === 'multilayer' ? (
                <>
                  <GuidePanel />
                  <DecisionGatesLegend />
                </>
              ) : viewMode === 'timeline' ? (
                <TimelineGuide />
              ) : (
                <StructuredTimelineGuide />
              )}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}