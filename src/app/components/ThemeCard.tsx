import { useState } from 'react';
import { Edit2, X } from 'lucide-react';

export interface ThemeCardData {
  id: string;
  title: string;
  description: string;
}

interface ThemeCardProps {
  theme: ThemeCardData;
  onUpdate: (theme: ThemeCardData) => void;
  onDelete: (id: string) => void;
  initialEditing?: boolean;
}

export function ThemeCard({ theme, onUpdate, onDelete, initialEditing = false }: ThemeCardProps) {
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [editData, setEditData] = useState(theme);

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (initialEditing) {
      // If this was a new item in edit mode, delete it
      onDelete(theme.id);
    } else {
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-slate-700 text-white rounded-lg p-4 h-full min-h-[120px] transition-all hover:shadow-lg">
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="w-full px-2 py-1 border border-slate-500 bg-slate-600 text-white rounded"
            style={{ fontFamily: 'var(--font-sans)' }}
            placeholder="Theme title"
            autoFocus
          />
          <textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="w-full px-2 py-1 border border-slate-500 bg-slate-600 text-white rounded resize-none"
            rows={2}
            style={{ fontFamily: 'var(--font-sans)' }}
            placeholder="Describe the problem area"
          />
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 bg-slate-600 text-white rounded text-xs hover:bg-slate-500"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="text-lg leading-tight" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              {theme.title}
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => onDelete(theme.id)}
                className="text-slate-300 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
            {theme.description}
          </p>
        </>
      )}
    </div>
  );
}
