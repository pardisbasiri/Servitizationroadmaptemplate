import { useState } from 'react';
import { Clock, Edit2, Check } from 'lucide-react';

interface TimeHorizon {
  key: string;
  label: string;
  definition: string;
}

export function TimeHorizonDefinition() {
  const [isEditing, setIsEditing] = useState(false);
  const [horizons, setHorizons] = useState<TimeHorizon[]>([
    { key: 'short', label: 'Short Term', definition: '0–12 months' },
    { key: 'medium', label: 'Medium Term', definition: '1–3 years' },
    { key: 'long', label: 'Long Term', definition: '3–5+ years' },
  ]);

  const handleUpdate = (key: string, definition: string) => {
    setHorizons(horizons.map((h) => (h.key === key ? { ...h, definition } : h)));
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-600" />
          <h3 className="text-sm" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            Time Horizon Definition
          </h3>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-slate-500 hover:text-slate-700 transition-colors"
        >
          {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {horizons.map((horizon) => (
          <div key={horizon.key} className="flex flex-col">
            <span className="text-xs text-slate-600 mb-1" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
              {horizon.label}:
            </span>
            {isEditing ? (
              <input
                type="text"
                value={horizon.definition}
                onChange={(e) => handleUpdate(horizon.key, e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            ) : (
              <span className="text-xs text-slate-700" style={{ fontFamily: 'var(--font-mono)' }}>
                {horizon.definition}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
