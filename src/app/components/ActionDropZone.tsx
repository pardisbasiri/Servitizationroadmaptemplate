import { useState } from 'react';
import { useDrop } from 'react-dnd';
import { Plus, X } from 'lucide-react';
import {
  ActionCard,
  type ActionCardData,
  type DependencyConnection,
} from './ActionCard';

interface ActionDropZoneProps {
  team: string;
  timeframe: string;
  actions: ActionCardData[];
  allActions: ActionCardData[];
  dependencies: DependencyConnection[];
  onUpdate: (action: ActionCardData) => void;
  onDelete: (id: string) => void;
  onAddAction: (action: Omit<ActionCardData, 'id'>) => void;
  onMoveAction: (
    actionId: string,
    targetTeam: string,
    targetTimeframe: string,
    insertIndex: number,
  ) => void;
  onAddDependency: (fromId: string, toId: string) => void;
  onRemoveDependency: (fromId: string, toId: string) => void;
}

const canDropWithDependencies = (
  movingId: string,
  targetActions: ActionCardData[],
  insertIndex: number,
  dependencies: DependencyConnection[],
  allActions: ActionCardData[],
) => {
  const movingAction = allActions.find((action) => action.id === movingId);
  if (!movingAction) return false;

  const targetActionsWithoutMoving = targetActions.filter(
    (action) => action.id !== movingId,
  );

  const proposedTargetActions = [
    ...targetActionsWithoutMoving.slice(0, insertIndex),
    movingAction,
    ...targetActionsWithoutMoving.slice(insertIndex),
  ];

  const indexById = new Map(
    proposedTargetActions.map((action, index) => [action.id, index]),
  );

  return dependencies.every((dependency) => {
    const fromIndex = indexById.get(dependency.fromId);
    const toIndex = indexById.get(dependency.toId);

    if (fromIndex === undefined || toIndex === undefined) {
      return true;
    }

    return fromIndex < toIndex;
  });
};

export function ActionDropZone({
  team,
  timeframe,
  actions,
  allActions,
  dependencies,
  onUpdate,
  onDelete,
  onAddAction,
  onMoveAction,
  onAddDependency,
  onRemoveDependency,
}: ActionDropZoneProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [dropBlocked, setDropBlocked] = useState(false);

  const [newActionData, setNewActionData] = useState<Omit<ActionCardData, 'id'>>({
    title: '',
    team,
    urgency: 'M',
    risk: 'M',
    acceptance: 'M',
    effort: 'M',
    timeBlocksRequired: 1,
    timeframe: timeframe as 'short' | 'medium' | 'long',
  });

  const showBlockedDrop = () => {
    setDropBlocked(true);

    window.setTimeout(() => {
      setDropBlocked(false);
    }, 1200);
  };

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'ACTION',
      drop: (item: ActionCardData, monitor) => {
        if (!monitor.didDrop()) {
          const insertIndex = actions.length;

          const valid = canDropWithDependencies(
            item.id,
            actions,
            insertIndex,
            dependencies,
            allActions,
          );

          if (!valid) {
            showBlockedDrop();
            return;
          }

          onMoveAction(item.id, team, timeframe, insertIndex);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [team, timeframe, actions, dependencies, allActions],
  );

  const handleOpenAddForm = () => {
    setNewActionData({
      title: '',
      team,
      urgency: 'M',
      risk: 'M',
      acceptance: 'M',
      effort: 'M',
      timeBlocksRequired: 1,
      timeframe: timeframe as 'short' | 'medium' | 'long',
    });

    setShowAddForm(true);
  };

  const handleSaveNewAction = () => {
    if (!newActionData.title.trim()) return;

    onAddAction({
      ...newActionData,
      title: newActionData.title.trim(),
    });

    setShowAddForm(false);
  };

  const handleCancelAddForm = () => {
    setShowAddForm(false);
  };

  return (
    <div
      ref={drop}
      className={`min-h-[80px] rounded-lg border border-dashed p-2 transition-colors ${
        dropBlocked
          ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
          : isOver
            ? 'bg-blue-50 border-blue-300'
            : 'bg-gray-50/50 border-gray-200'
      }`}
    >
      {dropBlocked && (
        <div className="mb-2 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] text-red-600">
          Cannot move this task before/after its dependency chain.
        </div>
      )}

      <div className="space-y-2">
        {actions.map((action, index) => (
          <ActionCardWithDrop
            key={action.id}
            action={action}
            index={index}
            team={team}
            timeframe={timeframe}
            actions={actions}
            allActions={allActions}
            dependencies={dependencies}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onMoveAction={onMoveAction}
            onBlockedDrop={showBlockedDrop}
            onAddDependency={onAddDependency}
            onRemoveDependency={onRemoveDependency}
          />
        ))}

        {showAddForm ? (
          <div className="border border-gray-300 rounded-lg bg-white p-3 space-y-2">
            <input
              type="text"
              value={newActionData.title}
              onChange={(e) =>
                setNewActionData({
                  ...newActionData,
                  title: e.target.value,
                })
              }
              placeholder="Action title"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] text-gray-600">
                  Urgency
                </label>
                <select
                  value={newActionData.urgency}
                  onChange={(e) =>
                    setNewActionData({
                      ...newActionData,
                      urgency: e.target.value as 'H' | 'M' | 'L',
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="H">High</option>
                  <option value="M">Medium</option>
                  <option value="L">Low</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-gray-600">Risk</label>
                <select
                  value={newActionData.risk}
                  onChange={(e) =>
                    setNewActionData({
                      ...newActionData,
                      risk: e.target.value as 'H' | 'M' | 'L',
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="H">High</option>
                  <option value="M">Medium</option>
                  <option value="L">Low</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-gray-600">
                  Acceptance
                </label>
                <select
                  value={newActionData.acceptance}
                  onChange={(e) =>
                    setNewActionData({
                      ...newActionData,
                      acceptance: e.target.value as 'H' | 'M' | 'L',
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="H">High</option>
                  <option value="M">Medium</option>
                  <option value="L">Low</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-gray-600">
                  Effort
                </label>
                <select
                  value={newActionData.effort}
                  onChange={(e) =>
                    setNewActionData({
                      ...newActionData,
                      effort: e.target.value as 'H' | 'M' | 'L',
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="H">High</option>
                  <option value="M">Medium</option>
                  <option value="L">Low</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-gray-600">
                Time Blocks Required
              </label>
              <input
                type="number"
                min="1"
                value={newActionData.timeBlocksRequired}
                onChange={(e) =>
                  setNewActionData({
                    ...newActionData,
                    timeBlocksRequired: Number(e.target.value) || 1,
                  })
                }
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveNewAction}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={handleCancelAddForm}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 flex items-center gap-1"
              >
                <X size={12} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleOpenAddForm}
            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors text-xs flex items-center justify-center gap-1"
          >
            <Plus size={12} />
            Add Action
          </button>
        )}
      </div>
    </div>
  );
}

interface ActionCardWithDropProps {
  action: ActionCardData;
  index: number;
  team: string;
  timeframe: string;
  actions: ActionCardData[];
  allActions: ActionCardData[];
  dependencies: DependencyConnection[];
  onUpdate: (action: ActionCardData) => void;
  onDelete: (id: string) => void;
  onMoveAction: (
    actionId: string,
    targetTeam: string,
    targetTimeframe: string,
    insertIndex: number,
  ) => void;
  onBlockedDrop: () => void;
  onAddDependency: (fromId: string, toId: string) => void;
  onRemoveDependency: (fromId: string, toId: string) => void;
}

function ActionCardWithDrop({
  action,
  index,
  team,
  timeframe,
  actions,
  allActions,
  dependencies,
  onUpdate,
  onDelete,
  onMoveAction,
  onBlockedDrop,
  onAddDependency,
  onRemoveDependency,
}: ActionCardWithDropProps) {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: 'ACTION',
      canDrop: (item: ActionCardData) => {
        if (item.id === action.id) return false;

        return canDropWithDependencies(
          item.id,
          actions,
          index,
          dependencies,
          allActions,
        );
      },
      drop: (item: ActionCardData) => {
        if (item.id === action.id) return;

        const valid = canDropWithDependencies(
          item.id,
          actions,
          index,
          dependencies,
          allActions,
        );

        if (!valid) {
          onBlockedDrop();
          return;
        }

        onMoveAction(item.id, team, timeframe, index);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [action.id, team, timeframe, index, actions, dependencies, allActions],
  );

  return (
    <div ref={drop} className="relative">
      {isOver && canDrop && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
      )}

      {isOver && !canDrop && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-red-500 rounded-full z-10" />
      )}

      <ActionCard
        action={action}
        onUpdate={onUpdate}
        onDelete={onDelete}
        allActions={allActions}
        dependencies={dependencies}
        onAddDependency={onAddDependency}
        onRemoveDependency={onRemoveDependency}
      />
    </div>
  );
}
