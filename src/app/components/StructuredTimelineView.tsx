import { useState, useEffect, useRef } from "react";
import {
  Clock,
  Grid3x3,
  Eye,
  EyeOff,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Zap,
  Trash2,
} from "lucide-react";
import { type ActionCardData } from "./ActionCard";
import { type DependencyConnection } from "./TimelineView";

interface StructuredTimelineViewProps {
  actions: ActionCardData[];
  onUpdateAction: (action: ActionCardData) => void;
  onReorderActions?: (actions: ActionCardData[]) => void;
  dependencies: DependencyConnection[];
  onAddDependency?: (fromId: string, toId: string) => void;
  onRemoveDependency?: (fromId: string, toId: string) => void;
  timeBlockWeeks?: number;
}

interface TaskPosition {
  actionId: string;
  startBlock: number;
  duration: number;
  team: string;
}

interface Milestone {
  id: string;
  blockIndex: number;
  name: string;
  goals: string[];
}

const TEAMS = [
  "Mechanics",
  "Software",
  "R&D (Digital Service Design)",
  "Digital Services",
  "Sales Engineering",
  "Sales",
];

const TEAM_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  Mechanics: {
    bg: "bg-blue-100",
    border: "border-blue-400",
    text: "text-blue-900",
  },
  Software: {
    bg: "bg-purple-100",
    border: "border-purple-400",
    text: "text-purple-900",
  },
  "R&D (Digital Service Design)": {
    bg: "bg-green-100",
    border: "border-green-400",
    text: "text-green-900",
  },
  "Digital Services": {
    bg: "bg-orange-100",
    border: "border-orange-400",
    text: "text-orange-900",
  },
  "Sales Engineering": {
    bg: "bg-pink-100",
    border: "border-pink-400",
    text: "text-pink-900",
  },
  Sales: {
    bg: "bg-teal-100",
    border: "border-teal-400",
    text: "text-teal-900",
  },
};

export function StructuredTimelineView({
  actions,
  onUpdateAction,
  dependencies,
  onAddDependency,
  onRemoveDependency,
  onReorderActions,
  timeBlockWeeks = 1,
}: StructuredTimelineViewProps) {
  const structuredActions = actions.filter(
  (action) => action.timeframe === "short",
);
  const [startDate, setStartDate] = useState("");
  const [showDates, setShowDates] = useState(false);

  const [connectMode, setConnectMode] = useState(false);
  const [dependencyStartId, setDependencyStartId] = useState<string | null>(
    null,
  );

  const [totalBlocks, setTotalBlocks] = useState(20);
  const [showDependencies, setShowDependencies] = useState(true);
  const [highlightedChain, setHighlightedChain] = useState<string[]>([]);
 const [selectedDependency, setSelectedDependency] = useState<{
  fromId: string;
  toId: string;
  x: number;
  y: number;
} | null>(null);
  const [isTaskMoveMode, setIsTaskMoveMode] = useState(false);
  const [taskPositions, setTaskPositions] = useState<Map<string, TaskPosition>>(
    new Map(),
  );
  const [blockWidth, setBlockWidth] = useState(80);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneDraft, setMilestoneDraft] = useState<Milestone | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    const positions = calculateTaskPositions(actions, dependencies);
    setTaskPositions(positions);

    let maxBlock = 0;
    positions.forEach((pos) => {
      const endBlock = pos.startBlock + pos.duration;
      if (endBlock > maxBlock) maxBlock = endBlock;
    });

    setTotalBlocks(Math.max(20, maxBlock + 2));
  }, [actions, dependencies]);

  const getDuration = (action: ActionCardData) => {
    return action.timeBlocksRequired || 1;
  };

  const calculateTaskPositions = (
    actions: ActionCardData[],
    dependencies: DependencyConnection[],
  ): Map<string, TaskPosition> => {
    const positions = new Map<string, TaskPosition>();
    const processed = new Set<string>();

    const dependsOn = new Map<string, string[]>();

    actions.forEach((action) => {
      dependsOn.set(action.id, []);
    });

    dependencies.forEach((dep) => {
      if (dependsOn.has(dep.toId)) {
        dependsOn.get(dep.toId)!.push(dep.fromId);
      }
    });

    const positionTask = (
      actionId: string,
      minStartBlock: number = 0,
    ): number => {
      if (processed.has(actionId)) {
        return positions.get(actionId)?.startBlock || 0;
      }

      const action = actions.find((a) => a.id === actionId);
      if (!action) return minStartBlock;

      const duration = getDuration(action);
      const deps = dependsOn.get(actionId) || [];

      let earliestStart = minStartBlock;

      deps.forEach((depId) => {
        const depStart = positionTask(depId, 0);
        const depAction = actions.find((a) => a.id === depId);
        const depDuration = depAction ? getDuration(depAction) : 1;
        const depEnd = depStart + depDuration;

        if (!action.allowDependencyOverlap) {
          earliestStart = Math.max(earliestStart, depEnd);
        }
      });

      let startBlock =
        typeof action.manualStartBlock === "number"
          ? Math.max(action.manualStartBlock, earliestStart)
          : earliestStart;

      const teamActions = Array.from(positions.values()).filter(
        (p) => p.team === action.team,
      );

      let hasOverlap = true;

      while (hasOverlap && !action.allowDependencyOverlap) {
        hasOverlap = teamActions.some((pos) => {
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

    const sorted = topologicalSort(actions, dependencies);

    sorted.forEach((action) => {
      positionTask(action.id);
    });

    return positions;
  };

  const topologicalSort = (
  actions: ActionCardData[],
  dependencies: DependencyConnection[],
): ActionCardData[] => {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const orderIndex = new Map(actions.map((action, index) => [action.id, index]));

  actions.forEach((action) => {
    graph.set(action.id, []);
    inDegree.set(action.id, 0);
  });

  dependencies.forEach((dep) => {
    if (graph.has(dep.fromId) && graph.has(dep.toId)) {
      graph.get(dep.fromId)!.push(dep.toId);
      inDegree.set(dep.toId, (inDegree.get(dep.toId) || 0) + 1);
    }
  });

  const queue = actions
    .filter((action) => inDegree.get(action.id) === 0)
    .sort(
      (a, b) =>
        (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
    );

  const sorted: ActionCardData[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    const neighbors = (graph.get(current.id) || []).sort(
      (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0),
    );

    neighbors.forEach((neighborId) => {
      const newInDegree = (inDegree.get(neighborId) || 0) - 1;
      inDegree.set(neighborId, newInDegree);

      if (newInDegree === 0) {
        const neighbor = actions.find((a) => a.id === neighborId);
        if (neighbor) {
          queue.push(neighbor);
          queue.sort(
            (a, b) =>
              (orderIndex.get(a.id) ?? 0) -
              (orderIndex.get(b.id) ?? 0),
          );
        }
      }
    });
  }

  actions.forEach((action) => {
    if (!sorted.find((a) => a.id === action.id)) {
      sorted.push(action);
    }
  });

  return sorted;
};
  
  const getConnectedChain = (actionId: string): string[] => {
    const visited = new Set<string>();
    const chain: string[] = [];

    const traverse = (id: string) => {
      if (visited.has(id)) return;

      visited.add(id);
      chain.push(id);

      dependencies
        .filter((dep) => dep.toId === id)
        .forEach((dep) => traverse(dep.fromId));

      dependencies
        .filter((dep) => dep.fromId === id)
        .forEach((dep) => traverse(dep.toId));
    };

    traverse(actionId);
    return chain;
  };

  const syncGlobalOrderFromStructuredPositions = (
  updatedAction?: ActionCardData,
) => {
  if (!onReorderActions) return;

  const nextActions = updatedAction
    ? actions.map((action) =>
        action.id === updatedAction.id ? updatedAction : action,
      )
    : actions;

  const nextPositions = calculateTaskPositions(nextActions, dependencies);

  const actionIndex = new Map(
    nextActions.map((action, index) => [action.id, index]),
  );

  const orderedIds = Array.from(nextPositions.values())
    .sort((a, b) => {
      if (a.startBlock !== b.startBlock) {
        return a.startBlock - b.startBlock;
      }

      return (
        (actionIndex.get(a.actionId) ?? 0) -
        (actionIndex.get(b.actionId) ?? 0)
      );
    })
    .map((position) => position.actionId);

  const orderedIdSet = new Set(orderedIds);

  const orderedActions = [
    ...orderedIds
      .map((id) => nextActions.find((action) => action.id === id))
      .filter(Boolean),
    ...nextActions.filter((action) => !orderedIdSet.has(action.id)),
  ] as ActionCardData[];

  onReorderActions(orderedActions);
};

  const handleTaskClick = (actionId: string) => {
    if (connectMode) {
      if (!dependencyStartId) {
        setDependencyStartId(actionId);
        setHighlightedChain([actionId]);
        setIsTaskMoveMode(false);
        return;
      }

      if (dependencyStartId === actionId) {
        setDependencyStartId(null);
        setHighlightedChain([]);
        return;
      }

      if (onAddDependency) {
        onAddDependency(dependencyStartId, actionId);
      }

      setDependencyStartId(null);
      setConnectMode(false);
      setHighlightedChain([]);
      setIsTaskMoveMode(false);
      return;
    }

    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    const chain = getConnectedChain(actionId);
    const nextChain = chain.length > 1 ? chain : [actionId];

    if (isTaskMoveMode && highlightedChain.includes(actionId)) {
      setIsTaskMoveMode(false);
      setHighlightedChain([]);
      return;
    }

    setIsTaskMoveMode(true);
    setHighlightedChain(nextChain);
  };

  const clearTaskMoveMode = () => {
    setIsTaskMoveMode(false);

    if (!connectMode) {
      setHighlightedChain([]);
    }
  };

  const getBlockLabel = (index: number) => {
    const startWeek = index * timeBlockWeeks + 1;
    const endWeek = startWeek + timeBlockWeeks - 1;

    if (timeBlockWeeks === 1) {
      return `W${startWeek}`;
    }

    return `W${startWeek}–W${endWeek}`;
  };

  const getBlockDateLabel = (index: number) => {
    if (!startDate) return "";

    const baseDate = new Date(startDate);
    const blockDate = new Date(baseDate);

    blockDate.setDate(baseDate.getDate() + index * timeBlockWeeks * 7);

    return blockDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
  };

  const getMilestoneTimeLabel = (blockIndex: number) => {
    const weekNumber = blockIndex * timeBlockWeeks;
    const weekLabel = `W${weekNumber}`;

    if (!showDates || !startDate) return weekLabel;

    const baseDate = new Date(startDate);
    const milestoneDate = new Date(baseDate);

    milestoneDate.setDate(baseDate.getDate() + weekNumber * 7);

    const dateLabel = milestoneDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });

    return `${weekLabel} · ${dateLabel}`;
  };

  const getMilestoneFirstWord = (name: string) => {
    const firstWord = name.trim().split(/\s+/)[0];
    return firstWord || "Milestone";
  };

  const openMilestoneEditor = (blockIndex: number) => {
    const safeBlockIndex = Math.max(1, Math.min(blockIndex, totalBlocks));

    const existingMilestone = milestones.find(
      (milestone) => milestone.blockIndex === safeBlockIndex,
    );

    const milestoneToEdit =
      existingMilestone ||
      ({
        id: Date.now().toString(),
        blockIndex: safeBlockIndex,
        name: "",
        goals: [""],
      } as Milestone);

    setMilestoneDraft({ ...milestoneToEdit });
  };

  const saveMilestone = () => {
    if (!milestoneDraft) return;

    const cleanedMilestone: Milestone = {
      ...milestoneDraft,
      name: milestoneDraft.name.trim() || "New Milestone",
      goals: milestoneDraft.goals.map((goal) => goal.trim()).filter(Boolean),
    };

    setMilestones((currentMilestones) => {
      const alreadyExists = currentMilestones.some(
        (milestone) => milestone.id === cleanedMilestone.id,
      );

      if (alreadyExists) {
        return currentMilestones.map((milestone) =>
          milestone.id === cleanedMilestone.id ? cleanedMilestone : milestone,
        );
      }

      return [...currentMilestones, cleanedMilestone];
    });

    setMilestoneDraft(null);
  };

  const deleteMilestone = () => {
    if (!milestoneDraft) return;

    setMilestones((currentMilestones) =>
      currentMilestones.filter(
        (milestone) => milestone.id !== milestoneDraft.id,
      ),
    );

    setMilestoneDraft(null);
  };

  const updateMilestoneGoal = (goalIndex: number, value: string) => {
    if (!milestoneDraft) return;

    setMilestoneDraft({
      ...milestoneDraft,
      goals: milestoneDraft.goals.map((goal, index) =>
        index === goalIndex ? value : goal,
      ),
    });
  };

  const addMilestoneGoal = () => {
    if (!milestoneDraft) return;

    setMilestoneDraft({
      ...milestoneDraft,
      goals: [...milestoneDraft.goals, ""],
    });
  };

  const removeMilestoneGoal = (goalIndex: number) => {
    if (!milestoneDraft) return;

    const updatedGoals = milestoneDraft.goals.filter(
      (_, index) => index !== goalIndex,
    );

    setMilestoneDraft({
      ...milestoneDraft,
      goals: updatedGoals.length > 0 ? updatedGoals : [""],
    });
  };

  const handleResizeTask = (
    action: ActionCardData,
    startClientX: number,
    startDuration: number,
  ) => {
    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - startClientX;
      const deltaBlocks = Math.round(deltaX / blockWidth);
      const newDuration = Math.max(1, startDuration + deltaBlocks);

      if (newDuration !== action.timeBlocksRequired) {
        onUpdateAction({
          ...action,
          timeBlocksRequired: newDuration,
        });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMoveTask = (
    action: ActionCardData,
    startClientX: number,
    startBlock: number,
  ) => {
    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - startClientX;

      if (Math.abs(deltaX) > 4) {
        suppressNextClickRef.current = true;
      }

      const deltaBlocks = Math.round(deltaX / blockWidth);
      const newStartBlock = Math.max(0, startBlock + deltaBlocks);

      if (newStartBlock !== action.manualStartBlock) {
        const updatedAction = {
  ...action,
  manualStartBlock: newStartBlock,
};

onUpdateAction(updatedAction);
syncGlobalOrderFromStructuredPositions(updatedAction);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    if (!showDependencies || !svgRef.current || !timelineRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = "";

    dependencies.forEach((dep) => {
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

      const isHighlighted =
        highlightedChain.includes(dep.fromId) &&
        highlightedChain.includes(dep.toId);

      const fromAction = actions.find((a) => a.id === dep.fromId);
      const toAction = actions.find((a) => a.id === dep.toId);
      const isCrossTeam = fromAction?.team !== toAction?.team;

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      // Invisible wider line for easier clicking
      const clickableLine = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      clickableLine.setAttribute("x1", x1.toString());
      clickableLine.setAttribute("y1", y1.toString());
      clickableLine.setAttribute("x2", x2.toString());
      clickableLine.setAttribute("y2", y2.toString());
      clickableLine.setAttribute("stroke", "transparent");
      clickableLine.setAttribute("stroke-width", "12");
      clickableLine.style.cursor = "pointer";
      clickableLine.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        
  setSelectedDependency({
    fromId: dep.fromId,
    toId: dep.toId,
    x: midX,
    y: midY,
  });
});

      // Visible line
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );

      line.setAttribute("x1", x1.toString());
      line.setAttribute("y1", y1.toString());
      line.setAttribute("x2", x2.toString());
      line.setAttribute("y2", y2.toString());
      line.setAttribute(
        "stroke",
        isHighlighted ? "#3b82f6" : isCrossTeam ? "#f59e0b" : "#64748b",
      );
      line.setAttribute("stroke-width", isHighlighted ? "3" : "2");
      line.setAttribute("opacity", isHighlighted ? "1" : "0.5");
      line.style.pointerEvents = "none";

      if (isCrossTeam) {
        line.setAttribute("stroke-dasharray", "5,5");
      }

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );

      circle.setAttribute("cx", x1.toString());
      circle.setAttribute("cy", y1.toString());
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", isCrossTeam ? "#f59e0b" : "#64748b");
      circle.style.pointerEvents = "none";

      const arrow = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polygon",
      );

      arrow.setAttribute(
        "points",
        `${x2},${y2} ${x2 - 8},${y2 - 5} ${x2 - 8},${y2 + 5}`,
      );
      arrow.setAttribute(
        "fill",
        isHighlighted ? "#3b82f6" : isCrossTeam ? "#f59e0b" : "#64748b",
      );
      arrow.style.pointerEvents = "none";

      svg.appendChild(clickableLine);
      svg.appendChild(line);
      svg.appendChild(circle);
      svg.appendChild(arrow);
    });
  }, [
    dependencies,
    taskPositions,
    showDependencies,
    highlightedChain,
    actions,
  ]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-xl mb-1"
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
              }}
            >Short-term Timeline Roadmap </h2>

            <p
              className="text-sm text-gray-600"
              style={{ fontFamily: "var(--font-sans)" }}
            >Time-block based roadmap for short-term actions with team clustering and dependencies</p>
          </div>

          <div className="flex gap-2">
            {isTaskMoveMode && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  clearTaskMoveMode();
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                }}
              >
                Move Mode On
              </button>
            )}

            <button
              onClick={(event) => {
                event.stopPropagation();
                setConnectMode((current) => !current);
                setDependencyStartId(null);
                setHighlightedChain([]);
                setIsTaskMoveMode(false);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                connectMode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Zap size={16} />
              {connectMode
                ? dependencyStartId
                  ? "Select target task"
                  : "Select source task"
                : "Add Dependency"}
            </button>

            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              {showDependencies ? <Eye size={16} /> : <EyeOff size={16} />}
              {showDependencies ? "Hide" : "Show"} Dependencies
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

        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-600" />
            <span
              className="text-sm text-slate-700"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
              }}
            >Start Date:</span>
          </div>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setShowDates(Boolean(e.target.value));
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm"
            style={{ fontFamily: "var(--font-mono)" }}
          />

          {startDate && (
            <button
              onClick={() => setShowDates(!showDates)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showDates
                  ? "bg-slate-700 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {showDates ? "Hide Dates" : "Show Dates"}
            </button>
          )}

          {startDate && (
            <button
              onClick={() => {
                setStartDate("");
                setShowDates(false);
              }}
              className="px-3 py-1.5 rounded-lg text-sm bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Clear Date
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() =>
                openMilestoneEditor(
                  milestones.length > 0
                    ? milestones[milestones.length - 1].blockIndex + 1
                    : 1,
                )
              }
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
              }}
            >
              ◆ Add Milestone
            </button>
          </div>
        </div>
      </div>

      <div
        className="relative overflow-x-auto"
        ref={timelineRef}
        onClick={clearTaskMoveMode}
      >
        {showDependencies && (
          <svg
            ref={svgRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{ zIndex: 5 }}
          />
        )}

        {/* Delete button overlay for selected dependency */}
        {selectedDependency && (
          <div
            className="absolute z-50 bg-white border-2 border-red-500 rounded-full p-2 shadow-lg cursor-pointer hover:bg-red-50 transition-colors"
            style={{
              left: `${selectedDependency.x}px`,
              top: `${selectedDependency.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onRemoveDependency) {
  onRemoveDependency(
    selectedDependency.fromId,
    selectedDependency.toId,
  );
}
setSelectedDependency(null);
            }}
          >
            <Trash2 size={16} className="text-red-600" />
          </div>
        )}

        {/* Click overlay to deselect dependency */}
        {selectedDependency && (
          <div
            className="absolute inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDependency(null);
            }}
          />
        )}

        <div className="inline-block min-w-full relative">
          <div className="flex border-b-2 border-slate-300 mb-4 pb-2 sticky top-0 bg-white z-10">
            <div className="w-48 flex-shrink-0 pr-4">
              <span
                className="text-xs text-slate-500"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                }}
              >
                TEAM / CATEGORY
              </span>
            </div>

            <div className="flex">
              {Array.from({ length: totalBlocks }).map((_, index) => (
                <div
                  key={index}
                  className="relative flex-shrink-0 text-center border-l border-slate-200"
                  style={{ width: `${blockWidth}px` }}
                >
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      openMilestoneEditor(index + 1);
                    }}
                    className="absolute right-0 top-0 h-full w-3 translate-x-1.5 cursor-pointer rounded-sm hover:bg-slate-200/70 transition-colors"
                    title={`Add milestone at ${getMilestoneTimeLabel(
                      index + 1,
                    )}`}
                  />

                  <div
                    className="flex flex-col items-center leading-tight text-xs text-slate-600"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                    }}
                  >
                    <span>{getBlockLabel(index)}</span>

                    {showDates && startDate && (
                      <span className="text-[10px] text-slate-400 mt-1">
                        {getBlockDateLabel(index)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {milestones.map((milestone) => (
            <button
              key={milestone.id}
              onClick={(event) => {
                event.stopPropagation();
                openMilestoneEditor(milestone.blockIndex);
              }}
              className="absolute z-20 -translate-x-1/2 rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 shadow-sm hover:border-slate-500 hover:shadow-md"
              style={{
                left: `${192 + milestone.blockIndex * blockWidth}px`,
                top: "34px",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
              }}
              title={milestone.name}
            >
              ◆ {getMilestoneFirstWord(milestone.name)}
            </button>
          ))}

          {milestoneDraft && (
            <div
              onClick={(event) => event.stopPropagation()}
              className="absolute z-30 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
              style={{
                left: `${Math.max(
                  200,
                  192 + milestoneDraft.blockIndex * blockWidth - 120,
                )}px`,
                top: "64px",
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3
                    className="text-sm text-slate-900"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontWeight: 700,
                    }}
                  >
                    Milestone
                  </h3>

                  <p
                    className="text-xs text-slate-500"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {getMilestoneTimeLabel(milestoneDraft.blockIndex)}
                  </p>
                </div>

                <button
                  onClick={() => setMilestoneDraft(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ×
                </button>
              </div>

              <label
                className="mb-1 block text-xs text-slate-600"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                }}
              >
                Position
              </label>

              <select
                value={String(milestoneDraft.blockIndex)}
                onChange={(e) =>
                  setMilestoneDraft({
                    ...milestoneDraft,
                    blockIndex: Number(e.target.value),
                  })
                }
                className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {Array.from({ length: totalBlocks }).map((_, index) => {
                  const blockIndex = index + 1;

                  return (
                    <option key={blockIndex} value={String(blockIndex)}>
                      {getBlockLabel(index)}
                      {showDates && startDate
                        ? ` • ${getBlockDateLabel(index)}`
                        : ""}
                    </option>
                  );
                })}
              </select>

              <label
                className="mb-1 block text-xs text-slate-600"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                }}
              >
                Name
              </label>

              <input
                value={milestoneDraft.name}
                onChange={(e) =>
                  setMilestoneDraft({
                    ...milestoneDraft,
                    name: e.target.value,
                  })
                }
                placeholder="Example: Pilot launch"
                className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                style={{ fontFamily: "var(--font-sans)" }}
              />

              <div className="mb-2 flex items-center justify-between">
                <label
                  className="text-xs text-slate-600"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                  }}
                >
                  Checklist goals
                </label>

                <button
                  onClick={addMilestoneGoal}
                  className="text-xs text-slate-600 hover:text-slate-900"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  + Add
                </button>
              </div>

              <div className="space-y-2">
                {milestoneDraft.goals.map((goal, goalIndex) => (
                  <div key={goalIndex} className="flex gap-2">
                    <input
                      value={goal}
                      onChange={(e) =>
                        updateMilestoneGoal(goalIndex, e.target.value)
                      }
                      placeholder="Goal"
                      className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
                      style={{ fontFamily: "var(--font-sans)" }}
                    />

                    <button
                      onClick={() => removeMilestoneGoal(goalIndex)}
                      className="rounded-lg px-2 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={deleteMilestone}
                  className="text-xs text-red-500 hover:text-red-700"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Delete
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setMilestoneDraft(null)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveMilestone}
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            className={
              "space-y-2 " +
              (milestones.length > 0 && showDates && startDate
                ? "mt-10"
                : milestones.length > 0
                  ? "mt-7"
                  : showDates && startDate
                    ? "mt-3"
                    : "")
            }
          >
            {TEAMS.map((team) => {
              const actionOrderIndex = new Map(
  actions.map((action, index) => [action.id, index]),
);

const teamTasks = Array.from(taskPositions.values())
  .filter((p) => p.team === team)
  .sort((a, b) => {
    if (a.startBlock !== b.startBlock) {
      return a.startBlock - b.startBlock;
    }

    return (
      (actionOrderIndex.get(a.actionId) ?? 0) -
      (actionOrderIndex.get(b.actionId) ?? 0)
    );
  });

              const teamColor =
                TEAM_COLORS[team] || TEAM_COLORS["Mechanics"];

              if (teamTasks.length === 0) return null;

              return (
                <div key={team} className="flex group">
                  <div
                    className={`w-48 flex-shrink-0 pr-4 py-3 ${teamColor.bg} border-l-4 ${teamColor.border} rounded-l-lg`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm ${teamColor.text}`}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                        }}
                      >
                        {team}
                      </span>

                      <span
                        className="text-xs text-gray-600"
                        style={{
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {teamTasks.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 relative" style={{ minHeight: "80px" }}>
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: totalBlocks }).map((_, index) => (
                        <div
                          key={index}
                          className="relative flex-shrink-0 border-l border-slate-100"
                          style={{ width: `${blockWidth}px` }}
                        >
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openMilestoneEditor(index + 1);
                            }}
                            className="absolute right-0 top-0 h-full w-3 translate-x-1.5 cursor-pointer hover:bg-slate-200/40"
                            title={`Add milestone at ${getMilestoneTimeLabel(
                              index + 1,
                            )}`}
                          />
                        </div>
                      ))}
                    </div>

                   <div className="relative py-3">
  {teamTasks.map((pos) => {
    const action = structuredActions.find(
      (a) => a.id === pos.actionId,
    );

    if (!action) return null;

    const isInChain = highlightedChain.includes(
      pos.actionId,
    );

    const leftOffset = pos.startBlock * blockWidth;
    const width = pos.duration * blockWidth - 8;
    const isActiveMoveTask =
      isTaskMoveMode && isInChain;
                        return (
                          <div
                            key={pos.actionId}
                            id={`task-block-${pos.actionId}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleTaskClick(pos.actionId);
                            }}
                            onMouseDown={(event) => {
                              if (!isActiveMoveTask) return;

                              event.stopPropagation();
                              event.preventDefault();

                              handleMoveTask(
                                action,
                                event.clientX,
                                pos.startBlock,
                              );
                            }}
                            className={`
                              absolute transition-all
                              ${teamColor.bg} ${teamColor.border} border-2
                              ${
                                isActiveMoveTask
                                  ? "ring-4 ring-blue-400 shadow-lg z-20 cursor-grab active:cursor-grabbing"
                                  : "hover:shadow-md z-10 cursor-pointer"
                              }
                              rounded-lg px-2 py-1.5
                            `}
                            style={{
                              left: `${leftOffset + 4}px`,
                              width: `${width}px`,
                              top: "0",
                            }}
                          >
                            <div className="space-y-1 pr-2">
                              <div
                                className={`text-xs leading-tight ${teamColor.text} truncate`}
                                style={{
                                  fontFamily: "var(--font-sans)",
                                  fontWeight: 500,
                                }}
                                title={action.title}
                              >
                                {action.timeBlocksRequired === 1
                                  ? action.title
                                      .split(" ")
                                      .slice(0, 2)
                                      .join(" ")
                                  : action.title.length >
                                      action.timeBlocksRequired * 10
                                    ? `${action.title.slice(
                                        0,
                                        action.timeBlocksRequired * 10,
                                      )}...`
                                    : action.title}
                              </div>

                              <div className="flex gap-1 flex-wrap">
                                <span
                                  className={`px-1 py-0.5 rounded text-[9px] ${getTagColor(
                                    action.urgency,
                                    "urgency",
                                  )}`}
                                  style={{
                                    fontFamily: "var(--font-mono)",
                                  }}
                                >
                                  U:{action.urgency}
                                </span>
                              </div>

                              <div
                                className="text-[10px] text-gray-600"
                                style={{
                                  fontFamily: "var(--font-mono)",
                                }}
                              >
                                {action.timeBlocksRequired} block
                                {action.timeBlocksRequired > 1 ? "s" : ""}
                              </div>
                            </div>

                            <div
                              onMouseDown={(event) => {
                                event.stopPropagation();
                                event.preventDefault();

                                handleResizeTask(
                                  action,
                                  event.clientX,
                                  action.timeBlocksRequired || 1,
                                );
                              }}
                              className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-lg bg-black/5 hover:bg-black/15 transition-colors"
                              title="Drag to resize duration"
                            />
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

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div
          className="flex items-center gap-6 text-xs text-gray-600"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-slate-400" />
            <span>Intra-team dependency</span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 bg-amber-400 border-dashed"
              style={{
                borderTop: "2px dashed #f59e0b",
                height: 0,
              }}
            />
            <span>Cross-team dependency</span>
          </div>

          <div className="flex items-center gap-2">
            <Grid3x3 size={14} className="text-slate-400" />
            <span>
              {connectMode
                ? dependencyStartId
                  ? "Click target task to complete dependency"
                  : "Click source task to start dependency"
                : isTaskMoveMode
                  ? "Drag highlighted tasks to change position"
                  : "Click task to enter move mode"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Maximize2 size={14} className="text-slate-400" />
            <span>Drag task edge to resize duration</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTagColor(value: "H" | "M" | "L", type: string) {
  if (type === "urgency" || type === "risk") {
    return value === "H"
      ? "bg-red-100 text-red-700"
      : value === "M"
        ? "bg-amber-100 text-amber-700"
        : "bg-green-100 text-green-700";
  }

  return value === "H"
    ? "bg-green-100 text-green-700"
    : value === "M"
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";
}