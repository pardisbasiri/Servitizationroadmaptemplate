import { useState } from 'react';
import { Diamond, Edit2, Check, Plus, X } from 'lucide-react';

interface Gate {
  id: string;
  label: string;
  description: string;
}

export function DecisionGatesLegend() {
  const [isEditing, setIsEditing] = useState(false);
  const [gates, setGates] = useState<Gate[]>([
    { id: '1', label: 'Gate 1', description: 'Concept validation' },
    { id: '2', label: 'Gate 2', description: 'Feasibility check' },
    { id: '3', label: 'Gate 3', description: 'Go-to-market readiness' },
    { id: '4', label: 'Gate 4', description: 'Scale / rollout decision' },
  ]);

  const handleUpdate = (id: string, description: string) => {
    setGates(gates.map((g) => (g.id === id ? { ...g, description } : g)));
  };

  const handleAdd = () => {
    const newGate: Gate = {
      id: Date.now().toString(),
      label: `Gate ${gates.length + 1}`,
      description: 'New decision gate',
    };
    setGates([...gates, newGate]);
  };

  const handleDelete = (id: string) => {
    setGates(gates.filter((g) => g.id !== id));
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Diamond size={16} className="text-amber-600 fill-amber-600" />
          <h3 className="text-sm" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            Decision Gates
          </h3>
        </div>
        <div className="flex gap-1">
          {isEditing && (
            <button
              onClick={handleAdd}
              className="text-amber-600 hover:text-amber-700 transition-colors"
            >
              <Plus size={14} />
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-amber-600 hover:text-amber-700 transition-colors"
          >
            {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-600 mb-3 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
        Gates = review points where initiatives are validated or stopped, used for prioritization and alignment.
      </p>

      <div className="space-y-2">
        {gates.map((gate) => (
          <div key={gate.id} className="flex items-center gap-2">
            <Diamond size={10} className="text-amber-600 fill-amber-600 flex-shrink-0" />
            {isEditing ? (
              <>
                <span className="text-xs font-semibold text-amber-700 w-12" style={{ fontFamily: 'var(--font-mono)' }}>
                  {gate.label}:
                </span>
                <input
                  type="text"
                  value={gate.description}
                  onChange={(e) => handleUpdate(gate.id, e.target.value)}
                  className="flex-1 px-2 py-1 border border-amber-300 rounded text-xs bg-white"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
                <button
                  onClick={() => handleDelete(gate.id)}
                  className="text-red-500 hover:text-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-700" style={{ fontFamily: 'var(--font-sans)' }}>
                <span className="font-semibold text-amber-700" style={{ fontFamily: 'var(--font-mono)' }}>
                  {gate.label}:
                </span>{' '}
                {gate.description}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DecisionGateMarker({ position }: { position: 'short' | 'medium' | 'long' }) {
  const getGateLabel = () => {
    switch (position) {
      case 'short':
        return 'G1';
      case 'medium':
        return 'G2';
      case 'long':
        return 'G3';
      default:
        return 'G';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-2 group">
      <Diamond size={16} className="text-amber-600 fill-amber-600 transition-all group-hover:scale-110" />
      <span className="text-[9px] text-amber-700 mt-0.5 transition-all group-hover:text-amber-800" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
        {getGateLabel()}
      </span>
      <div className="w-px h-4 bg-amber-300 mt-1 opacity-50"></div>
    </div>
  );
}
