import { useState, useEffect, useRef } from 'react';
import { Zap, Eye, EyeOff, Focus, ArrowRight } from 'lucide-react';
import { type ActionCardData } from './ActionCard';

interface TimelineViewProps {
  actions: ActionCardData[];
  onUpdateAction: (action: ActionCardData) => void;
  dependencies: DependencyConnection[];
  onAddDependency: (fromId: string, toId: string) => void;
  onRemoveDependency: (fromId: string, toId: string) => void;
}

export interface DependencyConnection {
  id: string;
  fromId: string;
  toId: string;
  type: 'intra-team' | 'cross-team';
}

const TEAMS = ['Mechanics', 'Software', 'R&D (Digital Service Design)', 'Digital Services', 'Sales Engineering', 'Sales'];

export function TimelineView({ actions, onUpdateAction, dependencies, onAddDependency, onRemoveDependency }: TimelineViewProps) {
  const [selectedHorizon, setSelectedHorizon] = useState<'short' | 'medium' | 'long' | 'all'>('all');
  const [showDependencies, setShowDependencies] = useState(true);
  const [highlightedChain, setHighlightedChain] = useState<string[]>([]);
  const [connectMode, setConnectMode] = useState(false);
  const [selectedForConnection, setSelectedForConnection] = useState<string | null>(null);
  const [focusedTeam, setFocusedTeam] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto-arrange actions based on dependencies and urgency
  const arrangedActions = arrangeActions(actions, dependencies, selectedHorizon);

  // Get upstream and downstream dependencies for highlighting
  const getConnectedChain = (actionId: string): string[] => {
    const visited = new Set<string>();
    const chain: string[] = [];

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      chain.push(id);

      // Upstream (dependencies)
      dependencies
        .filter(dep => dep.toId === id)
        .forEach(dep => traverse(dep.fromId));

      // Downstream (dependents)
      dependencies
        .filter(dep => dep.fromId === id)
        .forEach(dep => traverse(dep.toId));
    };

    traverse(actionId);
    return chain;
  };

  const handleActionClick = (actionId: string) => {
    if (connectMode) {
      if (!selectedForConnection) {
        setSelectedForConnection(actionId);
      } else if (selectedForConnection !== actionId) {
        // Create dependency
        const fromAction = actions.find(a => a.id === selectedForConnection);
        const toAction = actions.find(a => a.id === actionId);
        const type = fromAction?.team === toAction?.team ? 'intra-team' : 'cross-team';
        onAddDependency(selectedForConnection, actionId);
        setSelectedForConnection(null);
        setConnectMode(false);
      }
    } else {
      const chain = getConnectedChain(actionId);
      setHighlightedChain(chain.length > 1 ? chain : []);
    }
  };

  const handleActionHover = (actionId: string | null) => {
    setHoveredAction(actionId);
  };

  // Filter actions based on selected horizon
  const filteredActions = selectedHorizon === 'all' 
    ? arrangedActions 
    : arrangedActions.filter(a => {
        const urgencyMap: Record<string, 'H' | 'M' | 'L'> = { short: 'H', medium: 'M', long: 'L' };
        return a.urgency === urgencyMap[selectedHorizon];
      });

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header and Controls */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl mb-1" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
              Timeline View
            </h2>
            <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-sans)' }}>
              Dependency-driven sequential roadmap
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setConnectMode(!connectMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                connectMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Zap size={16} />
              {connectMode ? 'Connecting...' : 'Add Dependency'}
            </button>
            
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              {showDependencies ? <Eye size={16} /> : <EyeOff size={16} />}
              {showDependencies ? 'Hide' : 'Show'} Dependencies
            </button>

            {focusedTeam && (
              <button
                onClick={() => setFocusedTeam(null)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm"
              >
                <Focus size={16} />
                Clear Focus
              </button>
            )}
          </div>
        </div>

        {/* Time Horizon Filters */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All Horizons' },
            { key: 'short', label: 'Short-term (High Urgency)' },
            { key: 'medium', label: 'Mid-term (Medium Urgency)' },
            { key: 'long', label: 'Long-term (Low Urgency)' },
          ].map((horizon) => (
            <button
              key={horizon.key}
              onClick={() => setSelectedHorizon(horizon.key as any)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                selectedHorizon === horizon.key
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
            >
              {horizon.label}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      {connectMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800" style={{ fontFamily: 'var(--font-sans)' }}>
            {selectedForConnection 
              ? '✓ First task selected. Click another task to create a dependency.' 
              : '→ Click a task to start creating a dependency connection.'}
          </p>
        </div>
      )}

      {/* Timeline Container */}
      <div className="relative" ref={timelineRef}>
        {/* SVG for dependency lines */}
        {showDependencies && (
          <svg
            ref={svgRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            {dependencies.map((dep) => {
              const fromAction = filteredActions.find(a => a.id === dep.fromId);
              const toAction = filteredActions.find(a => a.id === dep.toId);
              
              if (!fromAction || !toAction) return null;

              const fromElement = document.getElementById(`timeline-action-${dep.fromId}`);
              const toElement = document.getElementById(`timeline-action-${dep.toId}`);
              
              if (!fromElement || !toElement || !timelineRef.current) return null;

              const containerRect = timelineRef.current.getBoundingClientRect();
              const fromRect = fromElement.getBoundingClientRect();
              const toRect = toElement.getBoundingClientRect();

              const x1 = fromRect.right - containerRect.left;
              const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
              const x2 = toRect.left - containerRect.left;
              const y2 = toRect.top + toRect.height / 2 - containerRect.top;

              const isHighlighted = highlightedChain.includes(dep.fromId) && highlightedChain.includes(dep.toId);
              const isHovered = hoveredAction === dep.fromId || hoveredAction === dep.toId;

              return (
                <g key={dep.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isHighlighted ? '#3b82f6' : dep.type === 'intra-team' ? '#94a3b8' : '#f59e0b'}
                    strokeWidth={isHighlighted || isHovered ? 3 : 2}
                    strokeDasharray={dep.type === 'cross-team' ? '5,5' : '0'}
                    opacity={isHighlighted || isHovered ? 1 : 0.4}
                  />
                  {/* Start circle */}
                  <circle cx={x1} cy={y1} r={5} fill={dep.type === 'intra-team' ? '#64748b' : '#f59e0b'} />
                  {/* End arrow */}
                  <polygon
                    points={`${x2},${y2} ${x2-8},${y2-5} ${x2-8},${y2+5}`}
                    fill={isHighlighted ? '#3b82f6' : dep.type === 'intra-team' ? '#64748b' : '#f59e0b'}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Swimlanes by Team */}
        <div className="space-y-4" style={{ position: 'relative', zIndex: 2 }}>
          {TEAMS.filter(team => !focusedTeam || focusedTeam === team).map((team) => {
            const teamActions = filteredActions.filter(a => a.team === team);
            
            if (teamActions.length === 0 && focusedTeam) return null;

            return (
              <div key={team} className="border border-gray-200 rounded-lg overflow-hidden">
                <div 
                  className="bg-slate-100 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-200 transition-colors"
                  onClick={() => setFocusedTeam(focusedTeam === team ? null : team)}
                >
                  <span className="text-sm" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {team}
                  </span>
                  <span className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-mono)' }}>
                    {teamActions.length} {teamActions.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
                
                <div className="p-4 bg-gray-50/50">
                  <div className="flex items-center gap-4 overflow-x-auto pb-2">
                    {teamActions.map((action, index) => {
                      const isInChain = highlightedChain.includes(action.id);
                      const isSelected = selectedForConnection === action.id;
                      const hasUpstream = dependencies.some(d => d.toId === action.id);
                      const hasDownstream = dependencies.some(d => d.fromId === action.id);

                      return (
                        <div key={action.id} className="flex items-center gap-2">
                          <div
                            id={`timeline-action-${action.id}`}
                            onClick={() => handleActionClick(action.id)}
                            onMouseEnter={() => handleActionHover(action.id)}
                            onMouseLeave={() => handleActionHover(null)}
                            className={`
                              min-w-[220px] p-3 rounded-lg border-2 cursor-pointer transition-all
                              ${isInChain ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-300 bg-white'}
                              ${isSelected ? 'border-blue-600 bg-blue-100 shadow-lg' : ''}
                              ${connectMode && !isSelected ? 'hover:border-blue-400 hover:shadow-md' : 'hover:shadow-md'}
                            `}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm leading-tight flex-1" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                                {action.title}
                              </h4>
                              {(hasUpstream || hasDownstream) && (
                                <div className="flex gap-1 ml-2">
                                  {hasUpstream && (
                                    <div className="w-2 h-2 rounded-full bg-orange-400" title="Has dependencies" />
                                  )}
                                  {hasDownstream && (
                                    <div className="w-2 h-2 rounded-full bg-green-400" title="Blocks other tasks" />
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${getTagColor(action.urgency, 'urgency')}`} style={{ fontFamily: 'var(--font-mono)' }}>
                                U:{action.urgency}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${getTagColor(action.risk, 'risk')}`} style={{ fontFamily: 'var(--font-mono)' }}>
                                R:{action.risk}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${getTagColor(action.effort, 'effort')}`} style={{ fontFamily: 'var(--font-mono)' }}>
                                E:{action.effort}
                              </span>
                            </div>

                            {/* Show dependencies info */}
                            {showDependencies && (dependencies.some(d => d.fromId === action.id || d.toId === action.id)) && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <div className="flex gap-2 text-[10px] text-gray-600" style={{ fontFamily: 'var(--font-mono)' }}>
                                  {dependencies.filter(d => d.toId === action.id).length > 0 && (
                                    <span>← Depends on {dependencies.filter(d => d.toId === action.id).length}</span>
                                  )}
                                  {dependencies.filter(d => d.fromId === action.id).length > 0 && (
                                    <span>Blocks {dependencies.filter(d => d.fromId === action.id).length} →</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {index < teamActions.length - 1 && (
                            <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-6 text-xs text-gray-600" style={{ fontFamily: 'var(--font-mono)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-slate-400" />
            <span>Intra-team dependency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-amber-400 border-dashed" style={{ borderTop: '2px dashed #f59e0b', height: 0 }} />
            <span>Cross-team dependency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span>Has dependencies</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span>Blocks other tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get tag colors
function getTagColor(value: 'H' | 'M' | 'L', type: string) {
  if (type === 'urgency' || type === 'risk') {
    return value === 'H' ? 'bg-red-100 text-red-700' : value === 'M' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
  } else {
    return value === 'H' ? 'bg-green-100 text-green-700' : value === 'M' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  }
}

// Smart auto-arrangement logic
function arrangeActions(
  actions: ActionCardData[], 
  dependencies: DependencyConnection[],
  horizon: 'short' | 'medium' | 'long' | 'all'
): ActionCardData[] {
  // Create a map for quick lookup
  const actionMap = new Map(actions.map(a => [a.id, a]));
  
  // Build dependency graph
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  actions.forEach(action => {
    graph.set(action.id, []);
    inDegree.set(action.id, 0);
  });
  
  dependencies.forEach(dep => {
    if (graph.has(dep.fromId) && graph.has(dep.toId)) {
      graph.get(dep.fromId)!.push(dep.toId);
      inDegree.set(dep.toId, (inDegree.get(dep.toId) || 0) + 1);
    }
  });
  
  // Topological sort with urgency priority
  const sorted: ActionCardData[] = [];
  const queue: ActionCardData[] = [];
  
  // Start with actions that have no dependencies
  actions.forEach(action => {
    if (inDegree.get(action.id) === 0) {
      queue.push(action);
    }
  });
  
  // Sort queue by urgency (H > M > L)
  const urgencyValue = (u: 'H' | 'M' | 'L') => u === 'H' ? 3 : u === 'M' ? 2 : 1;
  queue.sort((a, b) => urgencyValue(b.urgency) - urgencyValue(a.urgency));
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    
    const neighbors = graph.get(current.id) || [];
    neighbors.forEach(neighborId => {
      const newInDegree = (inDegree.get(neighborId) || 0) - 1;
      inDegree.set(neighborId, newInDegree);
      
      if (newInDegree === 0) {
        const neighbor = actionMap.get(neighborId);
        if (neighbor) {
          queue.push(neighbor);
          queue.sort((a, b) => urgencyValue(b.urgency) - urgencyValue(a.urgency));
        }
      }
    });
  }
  
  // Add any remaining actions (in case of cycles - shouldn't happen with proper validation)
  actions.forEach(action => {
    if (!sorted.find(a => a.id === action.id)) {
      sorted.push(action);
    }
  });
  
  return sorted;
}
