import { useState } from 'react';
import { useDrop } from 'react-dnd';
import { Edit2, X } from 'lucide-react';
import type { ActionCardData } from './ActionCard';

export interface CapabilityCardData {
  id: string;
  title: string;
  ephemerality: 'Stable' | 'Evolving' | 'Temporary';
  themeId?: string;
}

interface CapabilityCardProps {
  capability: CapabilityCardData;
  onUpdate: (capability: CapabilityCardData) => void;
  onDelete: (id: string) => void;
  initialEditing?: boolean;
}

export function CapabilityCard({ capability, onUpdate, onDelete, initialEditing = false }: CapabilityCardProps) {
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [editData, setEditData] = useState(capability);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ACTION',
    drop: (item: ActionCardData) => {
      // Handle linking action to capability
      console.log('Action dropped on capability:', item, capability);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (initialEditing) {
      // If this was a new item in edit mode, delete it
      onDelete(capability.id);
    } else {
      setIsEditing(false);
    }
  };

  const getEphemeralityColor = (value: string) => {
    switch (value) {
      case 'Stable':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Evolving':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Temporary':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div
      ref={drop}
      className={`bg-gray-50 border-2 rounded-lg p-4 transition-all ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
      }`}
    >
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded"
            style={{ fontFamily: 'var(--font-sans)' }}
            placeholder="Capability title"
            autoFocus
          />
          <select
            value={editData.ephemerality}
            onChange={(e) => setEditData({ ...editData, ephemerality: e.target.value as any })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <option value="Stable">Stable</option>
            <option value="Evolving">Evolving</option>
            <option value="Temporary">Temporary</option>
          </select>
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-base leading-tight" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
              {capability.title}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => onDelete(capability.id)}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <span
            className={`inline-block px-2 py-1 rounded border text-xs ${getEphemeralityColor(capability.ephemerality)}`}
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {capability.ephemerality}
          </span>
        </>
      )}
    </div>
  );
}
