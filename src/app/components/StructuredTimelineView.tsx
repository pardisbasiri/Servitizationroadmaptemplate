import { useState, useEffect, useRef } from 'react';
import { Clock, Grid3x3, Eye, EyeOff, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { type ActionCardData } from './ActionCard';
import { type DependencyConnection } from './TimelineView';

interface StructuredTimelineViewProps {
  actions: ActionCardData[];
  onUpdateAction: (action: ActionCardData) => void;
  dependencies: DependencyConnection[];
  onAddDependency?: (fromId: string, toId: string) => void;
  onRemoveDependency?: (fromId: string, toId: string) => void;
}

interface TaskPosition {
  actionId: string;
  startBlock: number;
  duration: number;
  team: string;
}

const TEAMS = ['Mechanics', 'Software', 'R&D (Digital Service Design)', 'Digital Services', 'Sales Engineering', 'Sales'];

// Team colors for visual clustering
const TEAM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Mechanics': { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900' },
  'Software': { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-900' },
  'R&D (Digital Service Design)': { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-900' },
  'Digital Services': { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-900' },
  'Sales Engineering': { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-900' },
  'Sales': { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-900' },
};

export function StructuredTimelineView({ actions, onUpdateAction, dependencies, onAddDependency, onRemoveDependency }: StructuredTimelineViewProps) {
  const [timeBlockDuration, setTimeBlockDuration] = useState<'1-week' | '2-weeks' | '1-month'>('2-weeks');
  const [totalBlocks, setTotalBlocks] = useState(20);
  const [showDependencies, setShowDependencies] = useState(true);
  const [highlightedChain, setHighlightedChain] = useState<string[]>([]);
  const [taskPositions, setTaskPositions] = useState<Map<string, TaskPosition>>(new Map());
  const [blockWidth, setBlockWidth] = useState(60);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate task positions based on dependencies
  useEffect(() => {
    const positions = calculateTaskPositions(actions, dependencies);
    setTaskPositions(positions);
    
    // Calculate required number of blocks
    let maxBlock = 0;
    positions.forEach(pos => {
      const endBlock = pos.startBlock + pos.duration;
      if (endBlock > maxBlock) maxBlock = endBlock;
    });
    setTotalBlocks(Math.max(20, maxBlock + 2));
  }, [actions, dependencies]);

  // Get duration for an action (based on effort)
  const getDuration = (action: ActionCardData): number => {
    // Map effort to duration in blocks
    const effortMap: Record<string, number> = { 'L': 1, 'M': 2, 'H': 3 };
    return effortMap[action.effort] || 2;
  };

  // Calculate positions with dependency constraints
  const calculateTaskPositions = (
    actions: ActionCardData[],
    dependencies: DependencyConnection[]
  ): Map<string, TaskPosition> => {
    const positions = new Map<string, TaskPosition>();
    const processed = new Set<string>();
    
    // Build dependency graph
    const dependsOn = new Map<string, string[]>();
    const blocks = new Map<string, string[]>();
    
    actions.forEach(action => {
      dependsOn.set(action.id, []);
      blocks.set(action.id, []);
    });
    
    dependencies.forEach(dep => {
      if (dependsOn.has(dep.toId)) {
        dependsOn.get(dep.toId)!.push(dep.fromId);
      }
      if (blocks.has(dep.fromId)) {
        blocks.get(dep.fromId)!.push(dep.toId);
      }
    });

    // Recursive function to position tasks
    const positionTask = (actionId: string, minStartBlock: number = 0): number => {
      if (processed.has(actionId)) {
        return positions.get(actionId)?.startBlock || 0;
      }

      const action = actions.find(a => a.id === actionId);
      if (!action) return minStartBlock;

      const duration = getDuration(action);
      const deps = dependsOn.get(actionId) || [];
      
      // Calculate earliest start based on dependencies
      let earliestStart = minStartBlock;
      deps.forEach(depId => {
        const depStart = positionTask(depId, 0);
        const depAction = actions.find(a => a.id === depId);
        const depDuration = depAction ? getDuration(depAction) : 1;
        const depEnd = depStart + depDuration;
        earliestStart = Math.max(earliestStart, depEnd);
      });

      // Find available position in team lane (avoid overlaps)
      const teamActions = Array.from(positions.values()).filter(p => p.team === action.team);
      let startBlock = earliestStart;
      
      // Check for overlaps with same team
      let hasOverlap = true;
      while (hasOverlap) {
        hasOverlap = teamActions.some(pos => {
          const posEnd = pos.startBlock + pos.duration;
          const taskEnd = startBlock + duration;
          return !(taskEnd <= pos.startBlock || startBlock >= posEnd);
        });
        if (hasOverlap) startBlock++;
      }

      positions.set(actionId, {
        actionId,
        startBlock,
        duration,
        team: action.team,
      });

      processed.add(actionId);
      return startBlock;
    };

    // Process all tasks (topological order)
    const sorted = topologicalSort(actions, dependencies);
    sorted.forEach(action => {
      positionTask(action.id);
    });

    return positions;
  };

  // Topological sort for dependency ordering
  const topologicalSort = (actions: ActionCardData[], dependencies: DependencyConnection[]): ActionCardData[] => {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    actions.forEach(action => {
      graph.set(action.id, []);
      inDegree.set(action.id, 0);
    });
    
    dependencies.forEach(dep => {
      if (graph.has(dep.fromId)) {
        graph.get(dep.fromId)!.push(dep.toId);
        inDegree.set(dep.toId, (inDegree.get(dep.toId) || 0) + 1);
      }
    });
    
    const queue: ActionCardData[] = [];
    const sorted: ActionCardData[] = [];
    
    actions.forEach(action => {
      if (inDegree.get(action.id) === 0) {
        queue.push(action);
      }
    });
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      
      const neighbors = graph.get(current.id) || [];
      neighbors.forEach(neighborId => {
        const newInDegree = (inDegree.get(neighborId) || 0) - 1;
        inDegree.set(neighborId, newInDegree);
        
        if (newInDegree === 0) {
          const neighbor = actions.find(a => a.id === neighborId);
          if (neighbor) queue.push(neighbor);
        }
      });
    }
    
    // Add remaining (in case of cycles)
    actions.forEach(action => {
      if (!sorted.find(a => a.id === action.id)) {
        sorted.push(action);
      }
    });
    
    return sorted;
  };

  // Get dependency chain for highlighting
  const getConnectedChain = (actionId: string): string[] => {
    const visited = new Set<string>();
    const chain: string[] = [];

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      chain.push(id);

      dependencies
        .filter(dep => dep.toId === id)
        .forEach(dep => traverse(dep.fromId));

      dependencies
        .filter(dep => dep.fromId === id)
        .forEach(dep => traverse(dep.toId));
    };

    traverse(actionId);
    return chain;
  };

  const handleTaskClick = (actionId: string) => {
    const chain = getConnectedChain(actionId);
    setHighlightedChain(chain.length > 1 ? chain : []);
  };

  // Get time block label
  const getBlockLabel = (blockIndex: number): string => {
    const labels: Record<string, string> = {
      '1-week': `W${blockIndex + 1}`,
      '2-weeks': `W${(blockIndex * 2) + 1}`,
      '1-month': `M${blockIndex + 1}`,
    };
    return labels[timeBlockDuration] || `B${blockIndex + 1}`;
  };

  // Render dependency connections
  useEffect(() => {
    if (!showDependencies || !svgRef.current || !timelineRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    dependencies.forEach(dep => {
      const fromPos = taskPositions.get(dep.fromId);
      const toPos = taskPositions.get(dep.toId);
      
      if (!fromPos || !toPos) return;

      const fromElement = document.getElementById(`task-block-${dep.fromId}`);
      const toElement = document.getElementById(`task-block-${dep.toId}`);
      
      if (!fromElement || !toElement) return;

      const containerRect = timelineRef.current!.getBoundingClientRect();
      const fromRect = fromElement.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();

      const x1 = fromRect.right - containerRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
      const x2 = toRect.left - containerRect.left;
      const y2 = toRect.top + toRect.height / 2 - containerRect.top;

      const isHighlighted = highlightedChain.includes(dep.fromId) && highlightedChain.includes(dep.toId);
      const fromAction = actions.find(a => a.id === dep.fromId);
      const toAction = actions.find(a => a.id === dep.toId);
      const isCrossTeam = fromAction?.team !== toAction?.team;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1.toString());
      line.setAttribute('y1', y1.toString());
      line.setAttribute('x2', x2.toString());
      line.setAttribute('y2', y2.toString());
      line.setAttribute('stroke', isHighlighted ? '#3b82f6' : (isCrossTeam ? '#f59e0b' : '#64748b'));
      line.setAttribute('stroke-width', isHighlighted ? '3' : '2');
      line.setAttribute('opacity', isHighlighted ? '1' : '0.5');
      if (isCrossTeam) {
        line.setAttribute('stroke-dasharray', '5,5');
      }

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x1.toString());
      circle.setAttribute('cy', y1.toString());
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', isCrossTeam ? '#f59e0b' : '#64748b');

      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      arrow.setAttribute('points', `${x2},${y2} ${x2-8},${y2-5} ${x2-8},${y2+5}`);
      arrow.setAttribute('fill', isHighlighted ? '#3b82f6' : (isCrossTeam ? '#f59e0b' : '#64748b'));

      svg.appendChild(line);
      svg.appendChild(circle);
      svg.appendChild(arrow);
    });
  }, [dependencies, taskPositions, showDependencies, highlightedChain, actions]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl mb-1" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
              Structured Timeline View
            </h2>
            <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-sans)' }}>
              Time-block based roadmap with team clustering and dependencies
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              {showDependencies ? <Eye size={16} /> : <EyeOff size={16} />}
              {showDependencies ? 'Hide' : 'Show'} Dependencies
            </button>

            <button
              onClick={() => setBlockWidth(Math.max(40, blockWidth - 10))}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>

            <button
              onClick={() => setBlockWidth(Math.min(100, blockWidth + 10))}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>

        {/* Time Horizon Control */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-600" />
            <span className="text-sm text-slate-700" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              Time Block Definition:
            </span>
          </div>
          <div className="flex gap-2">
            {[
              { key: '1-week', label: '1 Week' },
              { key: '2-weeks', label: '2 Weeks' },
              { key: '1-month', label: '1 Month' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setTimeBlockDuration(option.key as any)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  timeBlockDuration === option.key
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-slate-600" style={{ fontFamily: 'var(--font-mono)' }}>
            1 block = {timeBlockDuration.replace('-', ' ')}
          </div>
        </div>
      </div>

      {/* Timeline Canvas */}
      <div className="relative overflow-x-auto" ref={timelineRef}>
        {/* SVG for dependency lines */}
        {showDependencies && (
          <svg
            ref={svgRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 5 }}
          />
        )}

        <div className="inline-block min-w-full">
          {/* Time Axis */}
          <div className="flex border-b-2 border-slate-300 mb-4 pb-2 sticky top-0 bg-white z-10">
            <div className="w-48 flex-shrink-0 pr-4">
              <span className="text-xs text-slate-500" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                TEAM / CATEGORY
              </span>
            </div>
            <div className="flex">
              {Array.from({ length: totalBlocks }).map((_, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 text-center border-l border-slate-200"
                  style={{ width: `${blockWidth}px` }}
                >
                  <span className="text-xs text-slate-600" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {getBlockLabel(index)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Swimlanes */}
          <div className="space-y-2">
            {TEAMS.map((team) => {
              const teamTasks = Array.from(taskPositions.values()).filter(p => p.team === team);
              const teamColor = TEAM_COLORS[team] || TEAM_COLORS['Mechanics'];

              if (teamTasks.length === 0) return null;

              return (
                <div key={team} className="flex group">
                  {/* Team Label */}
                  <div
                    className={`w-48 flex-shrink-0 pr-4 py-3 ${teamColor.bg} border-l-4 ${teamColor.border} rounded-l-lg`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${teamColor.text}`} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {team}
                      </span>
                      <span className="text-xs text-gray-600" style={{ fontFamily: 'var(--font-mono)' }}>
                        {teamTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Timeline Grid */}
                  <div className="flex-1 relative" style={{ minHeight: '80px' }}>
                    {/* Background grid */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: totalBlocks }).map((_, index) => (
                        <div
                          key={index}
                          className="flex-shrink-0 border-l border-slate-100"
                          style={{ width: `${blockWidth}px` }}
                        />
                      ))}
                    </div>

                    {/* Task Blocks */}
                    <div className="relative py-3">
                      {teamTasks.map((pos) => {
                        const action = actions.find(a => a.id === pos.actionId);
                        if (!action) return null;

                        const isInChain = highlightedChain.includes(pos.actionId);
                        const leftOffset = pos.startBlock * blockWidth;
                        const width = pos.duration * blockWidth - 8;

                        return (
                          <div
                            key={pos.actionId}
                            id={`task-block-${pos.actionId}`}
                            onClick={() => handleTaskClick(pos.actionId)}
                            className={`
                              absolute cursor-pointer transition-all
                              ${teamColor.bg} ${teamColor.border} border-2
                              ${isInChain ? 'ring-4 ring-blue-400 shadow-lg z-20' : 'hover:shadow-md z-10'}
                              rounded-lg px-3 py-2
                            `}
                            style={{
                              left: `${leftOffset + 4}px`,
                              width: `${width}px`,
                              top: '0',
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs leading-tight ${teamColor.text} truncate`} style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                                {action.title}
                              </span>
                              <div className="flex gap-1 flex-shrink-0">
                                <span className={`px-1 py-0.5 rounded text-[9px] ${getTagColor(action.urgency, 'urgency')}`} style={{ fontFamily: 'var(--font-mono)' }}>
                                  U:{action.urgency}
                                </span>
                              </div>
                            </div>
                            <div className="mt-1 text-[10px] text-gray-600" style={{ fontFamily: 'var(--font-mono)' }}>
                              {pos.duration} block{pos.duration > 1 ? 's' : ''}
                            </div>
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
            <Grid3x3 size={14} className="text-slate-400" />
            <span>Click task to highlight dependency chain</span>
          </div>
          <div className="flex items-center gap-2">
            <Maximize2 size={14} className="text-slate-400" />
            <span>Task width = duration in blocks</span>
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