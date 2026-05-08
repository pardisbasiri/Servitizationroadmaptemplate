import { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  Zap,
  Eye,
  EyeOff,
  Focus,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { type ActionCardData } from "./ActionCard";

interface TimelineViewProps {
  actions: ActionCardData[];
  onUpdateAction: (action: ActionCardData) => void;
  dependencies: DependencyConnection[];
  onAddDependency: (fromId: string, toId: string) => void;
  onRemoveDependency: (fromId: string, toId: string) => void;
  onMoveAction: (
    actionId: string,
    targetTeam: string,
    targetTimeframe: string,
    insertIndex: number,
  ) => void;
}

export interface DependencyConnection {
  id: string;
  fromId: string;
  toId: string;
  type: "intra-team" | "cross-team";
}

const TEAMS = [
  "Mechanics",
  "Software",
  "R&D (Digital Service Design)",
  "Digital Services",
  "Sales Engineering",
  "Sales",
];

const canDropWithDependencies = (
  movingId: string,
  movingAction: ActionCardData | undefined,
  targetList: ActionCardData[],
  insertIndex: number,
  dependencies: DependencyConnection[],
) => {
  if (!movingAction) return false;

  const targetWithoutMoving = targetList.filter((a) => a.id !== movingId);

  const reordered = [
    ...targetWithoutMoving.slice(0, insertIndex),
    movingAction,
    ...targetWithoutMoving.slice(insertIndex),
  ];

  const indexMap = new Map(reordered.map((a, i) => [a.id, i]));

  return dependencies.every((dep) => {
    const fromIndex = indexMap.get(dep.fromId);
    const toIndex = indexMap.get(dep.toId);

    if (fromIndex === undefined || toIndex === undefined) return true;

    return fromIndex < toIndex;
  });
};

export function TimelineView({
  actions,
  onUpdateAction,
  dependencies,
  onAddDependency,
  onRemoveDependency,
  onMoveAction,
}: TimelineViewProps) {
  const [selectedHorizon, setSelectedHorizon] = useState<
    "short" | "medium" | "long" | "all"
  >("all");
  const [showDependencies, setShowDependencies] = useState(true);
  const [highlightedChain, setHighlightedChain] = useState<string[]>([]);
  const [connectMode, setConnectMode] = useState(false);
  const [selectedForConnection, setSelectedForConnection] =
    useState<string | null>(null);
  const [focusedTeam, setFocusedTeam] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [hoveredDependencyId, setHoveredDependencyId] = useState<string | null>(
    null,
  );
  const [selectedDependency, setSelectedDependency] = useState<{
    id: string;
    fromId: string;
    toId: string;
    x: number;
    y: number;
    showDelete: boolean;
  } | null>(null);

  const arrangedActions = actions;

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

const handleActionClick = (actionId: string) => {
  if (connectMode) {
    if (!selectedForConnection) {
      setSelectedForConnection(actionId);
    } else if (selectedForConnection !== actionId) {
      onAddDependency(selectedForConnection, actionId);
      setSelectedForConnection(null);
      setConnectMode(false);
    }

    return;
  }

  const chain = getConnectedChain(actionId);

  const clickedInsideCurrentChain =
    highlightedChain.length > 0 && highlightedChain.includes(actionId);

  if (clickedInsideCurrentChain) {
    setHighlightedChain([]);
  } else {
    setHighlightedChain(chain.length > 1 ? chain : []);
  }

  setSelectedDependency(null);
};

  const handleActionHover = (actionId: string | null) => {
    setHoveredAction(actionId);
  };

  const filteredActions =
    selectedHorizon === "all"
      ? arrangedActions
      : arrangedActions.filter((a) => a.timeframe === selectedHorizon);

  const getDependencyLine = (dep: DependencyConnection) => {
    const fromAction = filteredActions.find((a) => a.id === dep.fromId);
    const toAction = filteredActions.find((a) => a.id === dep.toId);

    if (!fromAction || !toAction) return null;

    const fromElement = document.getElementById(`timeline-action-${dep.fromId}`);
    const toElement = document.getElementById(`timeline-action-${dep.toId}`);
    const containerElement = document.getElementById("timeline-roadmap-area");

    if (!fromElement || !toElement || !containerElement) return null;

    const containerRect = containerElement.getBoundingClientRect();
    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();

    const x1 = fromRect.right - containerRect.left;
    const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
    const x2 = toRect.left - containerRect.left;
    const y2 = toRect.top + toRect.height / 2 - containerRect.top;

    return { x1, y1, x2, y2 };
  };

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
            >
              Teams Action Roadmap
            </h2>

            <p
              className="text-sm text-gray-600"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Dependency-driven sequential roadmap
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setConnectMode(!connectMode);
                setSelectedForConnection(null);
                setSelectedDependency(null);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                connectMode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Zap size={16} />
              {connectMode ? "Connecting..." : "Add Dependency"}
            </button>

            <button
              onClick={() => {
                setShowDependencies(!showDependencies);
                setSelectedDependency(null);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              {showDependencies ? <Eye size={16} /> : <EyeOff size={16} />}
              {showDependencies ? "Hide" : "Show"} Dependencies
            </button>

            {focusedTeam && (
              <button
                onClick={() => {
                  setFocusedTeam(null);
                  setSelectedDependency(null);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm"
              >
                <Focus size={16} />
                Clear Focus
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { key: "all", label: "All Horizons" },
            { key: "short", label: "Short-term" },
            { key: "medium", label: "Mid-term" },
            { key: "long", label: "Long-term" },
          ].map((horizon) => (
            <button
              key={horizon.key}
              onClick={() => {
                setSelectedHorizon(
                  horizon.key as "short" | "medium" | "long" | "all",
                );
                setSelectedDependency(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                selectedHorizon === horizon.key
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
              }}
            >
              {horizon.label}
            </button>
          ))}
        </div>
      </div>

      {connectMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p
            className="text-sm text-blue-800"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {selectedForConnection
              ? "✓ First task selected. Click another task to create a dependency."
              : "→ Click a task to start creating a dependency connection."}
          </p>
        </div>
      )}

      <div
        id="timeline-roadmap-area"
        className="relative"
        onClick={() => {
          setSelectedDependency(null);
        }}
      >
        {showDependencies && (
          <>
            {/* Visible dependency lines behind task cards */}
            <svg
              className="absolute top-0 left-0 w-full h-full"
              style={{ zIndex: 1, pointerEvents: "none" }}
            >
              {dependencies.map((dep) => {
                const line = getDependencyLine(dep);
                if (!line) return null;

                const { x1, y1, x2, y2 } = line;

                const isHighlighted =
                  highlightedChain.includes(dep.fromId) &&
                  highlightedChain.includes(dep.toId);

                const isTaskHovered =
                  hoveredAction === dep.fromId || hoveredAction === dep.toId;

                const isDependencyHovered = hoveredDependencyId === dep.id;
                const isDependencySelected = selectedDependency?.id === dep.id;

                const lineColor =
                  isDependencyHovered || isDependencySelected
                    ? "#f97316"
                    : isHighlighted
                      ? "#3b82f6"
                      : dep.type === "intra-team"
                        ? "#94a3b8"
                        : "#f59e0b";

                const isActive =
                  isHighlighted ||
                  isTaskHovered ||
                  isDependencyHovered ||
                  isDependencySelected;

                return (
                  <g key={dep.id}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={lineColor}
                      strokeWidth={isActive ? 3 : 2}
                      strokeDasharray={dep.type === "cross-team" ? "5,5" : "0"}
                      opacity={isActive ? 1 : 0.4}
                    />

                    <circle cx={x1} cy={y1} r={5} fill={lineColor} />

                    <polygon
                      points={`${x2},${y2} ${x2 - 8},${y2 - 5} ${x2 - 8},${
                        y2 + 5
                      }`}
                      fill={lineColor}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Invisible clickable dependency lines above task cards */}
            <svg
              className="absolute top-0 left-0 w-full h-full"
              style={{ zIndex: 30, pointerEvents: "none" }}
            >
              {dependencies.map((dep) => {
                const line = getDependencyLine(dep);
                if (!line) return null;

                const { x1, y1, x2, y2 } = line;

                return (
                  <line
                    key={`hit-${dep.id}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth={14}
                    style={{
                      pointerEvents: "stroke",
                      cursor: "pointer",
                    }}
                    onMouseEnter={() => setHoveredDependencyId(dep.id)}
                    onMouseLeave={() => setHoveredDependencyId(null)}
                    onClick={(event) => {
                      event.stopPropagation();

                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2;

                      if (selectedDependency?.id === dep.id) {
                        setSelectedDependency({
                          id: dep.id,
                          fromId: dep.fromId,
                          toId: dep.toId,
                          x: midX,
                          y: midY,
                          showDelete: true,
                        });
                      } else {
                        setSelectedDependency({
                          id: dep.id,
                          fromId: dep.fromId,
                          toId: dep.toId,
                          x: midX,
                          y: midY,
                          showDelete: false,
                        });
                      }
                    }}
                  />
                );
              })}
            </svg>
          </>
        )}

        {selectedDependency?.showDelete && (
          <div
            className="absolute z-50"
            style={{
              left: selectedDependency.x,
              top: selectedDependency.y,
              transform: "translate(-50%, -50%)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={(event) => {
                event.stopPropagation();

                onRemoveDependency(
                  selectedDependency.fromId,
                  selectedDependency.toId,
                );

                setSelectedDependency(null);
              }}
              className="bg-white border border-gray-300 rounded-full p-1.5 shadow hover:bg-red-50 transition-colors"
              title="Delete dependency"
            >
              <Trash2 size={14} className="text-red-600" />
            </button>
          </div>
        )}

        <div className="space-y-4" style={{ position: "relative", zIndex: 2 }}>
          {TEAMS.filter((team) => !focusedTeam || focusedTeam === team).map(
            (team) => {
              const teamActions = filteredActions.filter((a) => a.team === team);

              if (teamActions.length === 0 && focusedTeam) return null;

              return (
                <div
                  key={team}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div
                    className="bg-slate-100 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-200 transition-colors"
                    onClick={() =>
                      setFocusedTeam(focusedTeam === team ? null : team)
                    }
                  >
                    <span
                      className="text-sm"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                      }}
                    >
                      {team}
                    </span>

                    <span
                      className="text-xs text-gray-500"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {teamActions.length}{" "}
                      {teamActions.length === 1 ? "task" : "tasks"}
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50/50">
                    <div className="flex items-center gap-4 overflow-x-auto pb-2">
                      {teamActions.map((action, index) => {
                        const isInChain = highlightedChain.includes(action.id);
                        const isSelected = selectedForConnection === action.id;
                        const hasUpstream = dependencies.some(
                          (d) => d.toId === action.id,
                        );
                        const hasDownstream = dependencies.some(
                          (d) => d.fromId === action.id,
                        );

                        return (
                          <div
                            key={action.id}
                            className="flex items-center gap-2"
                          >
                            <TimelineDraggableTask
                              action={action}
                              index={index}
                              team={team}
                              teamActions={teamActions}
                              allActions={actions}
                              dependencies={dependencies}
                              isInChain={isInChain}
                              isSelected={isSelected}
                              hasUpstream={hasUpstream}
                              hasDownstream={hasDownstream}
                              connectMode={connectMode}
                              showDependencies={showDependencies}
                              onMoveAction={onMoveAction}
                              handleActionClick={handleActionClick}
                              handleActionHover={handleActionHover}
                            />

                            {index < teamActions.length - 1 &&
                              (() => {
                                const nextAction = teamActions[index + 1];

                                const hasDependency = dependencies.some(
                                  (d) =>
                                    d.fromId === action.id &&
                                    d.toId === nextAction.id,
                                );

                                return hasDependency ? (
                                  <ArrowRight
                                    size={16}
                                    className="text-gray-400 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-4 h-[1px] bg-gray-300 mx-1" />
                                );
                              })()}
                          </div>
                        );
                      })}

                      <TimelineEndDropZone
                        team={team}
                        teamActions={teamActions}
                        allActions={actions}
                        dependencies={dependencies}
                        selectedHorizon={selectedHorizon}
                        onMoveAction={onMoveAction}
                      />
                    </div>
                  </div>
                </div>
              );
            },
          )}
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

function TimelineDraggableTask({
  action,
  index,
  team,
  teamActions,
  allActions,
  dependencies,
  isInChain,
  isSelected,
  hasUpstream,
  hasDownstream,
  connectMode,
  showDependencies,
  onMoveAction,
  handleActionClick,
  handleActionHover,
}: {
  action: ActionCardData;
  index: number;
  team: string;
  teamActions: ActionCardData[];
  allActions: ActionCardData[];
  dependencies: DependencyConnection[];
  isInChain: boolean;
  isSelected: boolean;
  hasUpstream: boolean;
  hasDownstream: boolean;
  connectMode: boolean;
  showDependencies: boolean;
  onMoveAction: (
    actionId: string,
    targetTeam: string,
    targetTimeframe: string,
    insertIndex: number,
  ) => void;
  handleActionClick: (actionId: string) => void;
  handleActionHover: (actionId: string | null) => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ACTION",
    item: action,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "ACTION",
    canDrop: (item: ActionCardData) => {
      if (item.id === action.id) return false;

      const movingAction = allActions.find((a) => a.id === item.id);

      return canDropWithDependencies(
        item.id,
        movingAction,
        teamActions,
        index,
        dependencies,
      );
    },
    drop: (item: ActionCardData) => {
      if (item.id === action.id) return;

      const movingAction = allActions.find((a) => a.id === item.id);

      const valid = canDropWithDependencies(
        item.id,
        movingAction,
        teamActions,
        index,
        dependencies,
      );

      if (!valid) return;

      onMoveAction(item.id, team, action.timeframe, index);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  return (
    <div ref={drop} className="relative">
      {isOver && canDrop && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 z-10" />
      )}

      {isOver && !canDrop && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-red-500 z-10" />
      )}

      <div
        ref={drag}
        id={`timeline-action-${action.id}`}
        onClick={() => handleActionClick(action.id)}
        onMouseEnter={() => handleActionHover(action.id)}
        onMouseLeave={() => handleActionHover(null)}
        className={`
          min-w-[220px] p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all
          ${isInChain ? "border-blue-500 bg-blue-50 shadow-lg" : "border-gray-300 bg-white"}
          ${isSelected ? "border-blue-600 bg-blue-100 shadow-lg" : ""}
          ${connectMode && !isSelected ? "hover:border-blue-400 hover:shadow-md" : "hover:shadow-md"}
          ${isDragging ? "opacity-50" : ""}
        `}
      >
        <div className="flex items-start justify-between mb-2">
          <h4
            className="text-sm leading-tight flex-1"
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
            }}
          >
            {action.title}
          </h4>

          {(hasUpstream || hasDownstream) && (
            <div className="flex gap-1 ml-2">
              {hasUpstream && (
                <div
                  className="w-2 h-2 rounded-full bg-orange-400"
                  title={`Depends on: ${dependencies
                    .filter((d) => d.toId === action.id)
                    .map((d) => allActions.find((a) => a.id === d.fromId)?.title)
                    .filter(Boolean)
                    .join(", ")}`}
                />
              )}

              {hasDownstream && (
                <div
                  className="w-2 h-2 rounded-full bg-green-400"
                  title={`Blocks: ${dependencies
                    .filter((d) => d.fromId === action.id)
                    .map((d) => allActions.find((a) => a.id === d.toId)?.title)
                    .filter(Boolean)
                    .join(", ")}`}
                />
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] ${getTagColor(
              action.urgency,
              "urgency",
            )}`}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            U:{action.urgency}
          </span>

          <span
            className={`px-1.5 py-0.5 rounded text-[10px] ${getTagColor(
              action.risk,
              "risk",
            )}`}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            R:{action.risk}
          </span>

          <span
            className={`px-1.5 py-0.5 rounded text-[10px] ${getTagColor(
              action.acceptance,
              "acceptance",
            )}`}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            A:{action.acceptance}
          </span>

          <span
            className={`px-1.5 py-0.5 rounded text-[10px] ${getTagColor(
              action.effort,
              "effort",
            )}`}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            E:{action.effort}
          </span>
        </div>

        {showDependencies &&
          dependencies.some(
            (d) => d.fromId === action.id || d.toId === action.id,
          ) && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div
                className="flex gap-2 text-[10px] text-gray-600"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {dependencies.filter((d) => d.toId === action.id).length > 0 && (
                  <span>
                    ← Depends on{" "}
                    {dependencies.filter((d) => d.toId === action.id).length}
                  </span>
                )}

                {dependencies.filter((d) => d.fromId === action.id).length >
                  0 && (
                  <span>
                    Blocks{" "}
                    {dependencies.filter((d) => d.fromId === action.id).length} →
                  </span>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

function TimelineEndDropZone({
  team,
  teamActions,
  allActions,
  dependencies,
  selectedHorizon,
  onMoveAction,
}: {
  team: string;
  teamActions: ActionCardData[];
  allActions: ActionCardData[];
  dependencies: DependencyConnection[];
  selectedHorizon: "short" | "medium" | "long" | "all";
  onMoveAction: (
    actionId: string,
    targetTeam: string,
    targetTimeframe: string,
    insertIndex: number,
  ) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "ACTION",
    canDrop: (item: ActionCardData) => {
      const movingAction = allActions.find((a) => a.id === item.id);

      return canDropWithDependencies(
        item.id,
        movingAction,
        teamActions,
        teamActions.length,
        dependencies,
      );
    },
    drop: (item: ActionCardData) => {
      const movingAction = allActions.find((a) => a.id === item.id);

      const valid = canDropWithDependencies(
        item.id,
        movingAction,
        teamActions,
        teamActions.length,
        dependencies,
      );

      if (!valid) return;

      const targetTimeframe =
        selectedHorizon === "all" ? item.timeframe : selectedHorizon;

      onMoveAction(item.id, team, targetTimeframe, teamActions.length);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`h-[76px] min-w-[28px] rounded-lg border border-dashed transition-colors ${
        isOver && canDrop
          ? "border-blue-400 bg-blue-50"
          : isOver && !canDrop
            ? "border-red-400 bg-red-50"
            : "border-transparent"
      }`}
      title="Drop here to move task to the end"
    />
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