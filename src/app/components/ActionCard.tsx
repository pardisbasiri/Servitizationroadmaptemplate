import { useState } from "react";
import { useDrag } from "react-dnd";
import {
  GripVertical,
  X,
  Edit2,
  Link2,
  Plus,
} from "lucide-react";

export interface ActionCardData {
  id: string;
  title: string;
  team: string;

  urgency: "H" | "M" | "L";
  risk: "H" | "M" | "L";
  acceptance: "H" | "M" | "L";
  effort: "H" | "M" | "L";

  // visual duration in Structured Timeline
  timeBlocksRequired: number;

  // optional manual placement for drag/drop timeline editing
  manualStartBlock?: number;

  // allows intentional overlap even if dependencies exist
  allowDependencyOverlap?: boolean;

  timeframe: "short" | "medium" | "long";

  capabilityId?: string;

  // IDs of tasks this task depends on
  dependencies?: string[];
}

export interface DependencyConnection {
  id: string;
  fromId: string;
  toId: string;
  type: "intra-team" | "cross-team";
}

interface ActionCardProps {
  action: ActionCardData;
  onUpdate: (action: ActionCardData) => void;
  onDelete: (id: string) => void;
  allActions?: ActionCardData[];
  dependencies?: DependencyConnection[];
  onAddDependency?: (fromId: string, toId: string) => void;
  onRemoveDependency?: (fromId: string, toId: string) => void;
}

export function ActionCard({
  action,
  onUpdate,
  onDelete,
  allActions = [],
  dependencies = [],
  onAddDependency,
  onRemoveDependency,
}: ActionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(action);
  const [showDependencyPicker, setShowDependencyPicker] =
    useState(false);

  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: "ACTION",
    item: action,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const getTagColor = (
    value: "H" | "M" | "L",
    type: string,
  ) => {
    if (type === "effort" || type === "risk") {
      return value === "H"
        ? "bg-red-100 text-red-700"
        : value === "M"
          ? "bg-amber-100 text-amber-700"
          : "bg-green-100 text-green-700";
    } else {
      return value === "H"
        ? "bg-green-100 text-green-700"
        : value === "M"
          ? "bg-amber-100 text-amber-700"
          : "bg-red-100 text-red-700";
    }
  };

  // Get dependencies for this action
  const currentDependencies = dependencies.filter(
    (dep) => dep.toId === action.id,
  );
  const availableActions = allActions.filter(
    (a) => a.id !== action.id,
  );

  const handleAddDependency = (fromId: string) => {
    if (onAddDependency) {
      onAddDependency(fromId, action.id);
    }
    setShowDependencyPicker(false);
  };

  const handleRemoveDependency = (fromId: string) => {
    if (onRemoveDependency) {
      onRemoveDependency(fromId, action.id);
    }
  };

  return (
    <div
      ref={dragPreview}
      className="bg-white border border-gray-200 rounded-lg p-3 transition-all hover:shadow-md hover:border-gray-300 animate-in fade-in duration-200"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-start gap-2">
        <button
          ref={drag}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editData.title}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    title: e.target.value,
                  })
                }
                className="w-full px-2 py-1 border border-gray-300 rounded"
                style={{ fontFamily: "var(--font-sans)" }}
              />
              <div className="space-y-1">
  <label
    className="block text-[11px] text-gray-600"
    style={{ fontFamily: "var(--font-sans)" }}
  >
    Time Blocks 
  </label>
  <input
    type="number"
    min="1"
    value={editData.timeBlocksRequired}
    onChange={(e) =>
      setEditData({
        ...editData,
        timeBlocksRequired: Number(e.target.value),
      })
    }
    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
    style={{ fontFamily: "var(--font-mono)" }}
  />
</div>
              <div className="grid grid-cols-2 gap-2">
  <div className="space-y-1">
    <label
      className="block text-[11px] text-gray-600"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      Urgency
    </label>
    <select
      value={editData.urgency}
      onChange={(e) =>
        setEditData({
          ...editData,
          urgency: e.target.value as "H" | "M" | "L",
        })
      }
      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
      style={{ fontFamily: "var(--font-mono)" }}
    >
<option value="H">High</option>
<option value="M">Medium</option>
<option value="L">Low</option>
    </select>
  </div>

  <div className="space-y-1">
    <label
      className="block text-[11px] text-gray-600"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      Risk
    </label>
    <select
      value={editData.risk}
      onChange={(e) =>
        setEditData({
          ...editData,
          risk: e.target.value as "H" | "M" | "L",
        })
      }
      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <option value="H">High</option>
<option value="M">Medium</option>
<option value="L">Low</option>
    </select>
  </div>

  <div className="space-y-1">
    <label
      className="block text-[11px] text-gray-600"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      Acceptance
    </label>
    <select
      value={editData.acceptance}
      onChange={(e) =>
        setEditData({
          ...editData,
          acceptance: e.target.value as "H" | "M" | "L",
        })
      }
      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
      style={{ fontFamily: "var(--font-mono)" }}
    >
<option value="H">High</option>
<option value="M">Medium</option>
<option value="L">Low</option>
    </select>
  </div>

  <div className="space-y-1">
    <label
      className="block text-[11px] text-gray-600"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      Effort
    </label>
    <select
      value={editData.effort}
      onChange={(e) =>
        setEditData({
          ...editData,
          effort: e.target.value as "H" | "M" | "L",
        })
      }
      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
      style={{ fontFamily: "var(--font-mono)" }}
    >
<option value="H">High</option>
<option value="M">Medium</option>
<option value="L">Low</option>
    </select>
  </div>
</div>

              {/* Dependencies Section */}
              {onAddDependency && onRemoveDependency && (
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <label
                      className="text-xs font-medium text-gray-600"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Dependencies
                    </label>
                    <button
                      onClick={() =>
                        setShowDependencyPicker(
                          !showDependencyPicker,
                        )
                      }
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Add
                    </button>
                  </div>

                  {/* Current Dependencies */}
                  {currentDependencies.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {currentDependencies.map((dep) => {
                        const fromAction = allActions.find(
                          (a) => a.id === dep.fromId,
                        );
                        return fromAction ? (
                          <div
                            key={dep.id}
                            className="flex items-center justify-between gap-2 bg-gray-50 rounded px-2 py-1"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <Link2
                                size={10}
                                className="text-gray-400 flex-shrink-0"
                              />
                              <span
                                className="text-[10px] text-gray-700 truncate"
                                style={{
                                  fontFamily:
                                    "var(--font-sans)",
                                }}
                              >
                                {fromAction.title}
                              </span>
                              <span
                                className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 ${dep.type === "cross-team" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}
                              >
                                {dep.type === "cross-team"
                                  ? "Cross"
                                  : "Intra"}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                handleRemoveDependency(
                                  dep.fromId,
                                )
                              }
                              className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Dependency Picker */}
                  {showDependencyPicker && (
                    <div className="border border-gray-300 rounded bg-white max-h-32 overflow-y-auto">
                      {availableActions.filter(
                        (a) =>
                          !currentDependencies.some(
                            (dep) => dep.fromId === a.id,
                          ),
                      ).length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-gray-500 text-center">
                          No more tasks available
                        </div>
                      ) : (
                        availableActions
                          .filter(
                            (a) =>
                              !currentDependencies.some(
                                (dep) => dep.fromId === a.id,
                              ),
                          )
                          .map((a) => (
                            <button
                              key={a.id}
                              onClick={() =>
                                handleAddDependency(a.id)
                              }
                              className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <div
                                className="font-medium text-gray-700 truncate"
                                style={{
                                  fontFamily:
                                    "var(--font-sans)",
                                }}
                              >
                                {a.title}
                              </div>
                              <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                <span>{a.team}</span>
                                <span>•</span>
                                <span className="uppercase">
                                  {a.timeframe}
                                </span>
                              </div>
                            </button>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-1">
                <button
                  onClick={handleSave}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4
                  className="text-sm leading-tight"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 500,
                  }}
                >
                  {action.title}
                </h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => onDelete(action.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${getTagColor(action.urgency, "urgency")}`}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  U:{action.urgency}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${getTagColor(action.risk, "risk")}`}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  R:{action.risk}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${getTagColor(action.acceptance, "acceptance")}`}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  A:{action.acceptance}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${getTagColor(action.effort, "effort")}`}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  E:{action.effort}
                </span>
              </div>
              <div className="mb-2"><span
    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700"
    style={{ fontFamily: "var(--font-mono)" }}
  >Time Blocks: {action.timeBlocksRequired}</span></div>

              {/* Show Dependencies */}
              {currentDependencies.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Link2 size={10} className="text-gray-400" />
                  <span className="text-[10px] text-gray-500">
                    Depends on:
                  </span>
                  {currentDependencies.map((dep) => {
                    const fromAction = allActions.find(
                      (a) => a.id === dep.fromId,
                    );
                    return fromAction ? (
                      <span
                        key={dep.id}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                        style={{
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {fromAction.title}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}