import { useDrop } from 'react-dnd';
import { Plus } from 'lucide-react';
import { ActionCard, type ActionCardData, type DependencyConnection } from './ActionCard';

interface ActionDropZoneProps {
  team: string;
  timeframe: string;
  actions: ActionCardData[];
  allActions: ActionCardData[];
  dependencies: DependencyConnection[];
  onUpdate: (action: ActionCardData) => void;
  onDelete: (id: string) => void;
  onAddAction: (team: string, timeframe: string) => void;
  onMoveAction: (actionId: string, targetTeam: string, targetTimeframe: string, insertIndex: number) => void;
  onAddDependency: (fromId: string, toId: string) => void;
  onRemoveDependency: (fromId: string, toId: string) => void;
}

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
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ACTION',
    drop: (item: ActionCardData, monitor) => {
      // Only handle if dropped directly on this zone (not on a child)
      if (!monitor.didDrop()) {
        // If dragging from same zone, reorder to end
        // If dragging from different zone, move to this zone
        const insertIndex = actions.length;
        onMoveAction(item.id, team, timeframe, insertIndex);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  }), [team, timeframe, actions]);

  return (
    <div
      ref={drop}
      className={`min-h-[80px] bg-gray-50/50 rounded-lg border border-dashed border-gray-200 p-2 transition-colors ${
        isOver ? 'bg-blue-50 border-blue-300' : ''
      }`}
    >
      <div className="space-y-2">
        {actions.map((action, index) => (
          <ActionCardWithDrop
            key={action.id}
            action={action}
            index={index}
            team={team}
            timeframe={timeframe}
            allActions={allActions}
            dependencies={dependencies}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onMoveAction={onMoveAction}
            onAddDependency={onAddDependency}
            onRemoveDependency={onRemoveDependency}
          />
        ))}
        <button
          onClick={() => onAddAction(team, timeframe)}
          className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors text-xs flex items-center justify-center gap-1"
        >
          <Plus size={12} />
          Add Action
        </button>
      </div>
    </div>
  );
}

interface ActionCardWithDropProps {
  action: ActionCardData;
  index: number;
  team: string;
  timeframe: string;
  allActions: ActionCardData[];
  dependencies: DependencyConnection[];
  onUpdate: (action: ActionCardData) => void;
  onDelete: (id: string) => void;
  onMoveAction: (actionId: string, targetTeam: string, targetTimeframe: string, insertIndex: number) => void;
  onAddDependency: (fromId: string, toId: string) => void;
  onRemoveDependency: (fromId: string, toId: string) => void;
}

function ActionCardWithDrop({
  action,
  index,
  team,
  timeframe,
  allActions,
  dependencies,
  onUpdate,
  onDelete,
  onMoveAction,
  onAddDependency,
  onRemoveDependency,
}: ActionCardWithDropProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'ACTION',
    canDrop: (item: ActionCardData) => {
      // Can't drop on itself
      return item.id !== action.id;
    },
    drop: (item: ActionCardData) => {
      if (item.id !== action.id) {
        // Insert before this action
        onMoveAction(item.id, team, timeframe, index);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [action.id, team, timeframe, index]);

  return (
    <div ref={drop} className="relative">
      {isOver && canDrop && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
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
