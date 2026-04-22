import { useState } from 'react';
import { Target, Edit2, Check, Plus, X } from 'lucide-react';

interface KPI {
  id: string;
  label: string;
}

export function KPIPanel() {
  const [isEditing, setIsEditing] = useState(false);
  const [kpis, setKpis] = useState<KPI[]>([
    { id: '1', label: 'Alignment across teams' },
    { id: '2', label: 'On-time delivery of initiatives' },
    { id: '3', label: 'Service readiness at product launch' },
    { id: '4', label: 'Adoption of digital services' },
    { id: '5', label: 'Revenue from services / digital offerings' },
    { id: '6', label: 'Reduction of cross-functional delays' },
  ]);

  const handleUpdate = (id: string, label: string) => {
    setKpis(kpis.map((k) => (k.id === id ? { ...k, label } : k)));
  };

  const handleAdd = () => {
    setKpis([...kpis, { id: Date.now().toString(), label: 'New KPI' }]);
  };

  const handleDelete = (id: string) => {
    setKpis(kpis.filter((k) => k.id !== id));
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-blue-600" />
          <h3 className="text-sm" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            Roadmap Success KPIs
          </h3>
        </div>
        <div className="flex gap-1">
          {isEditing && (
            <button
              onClick={handleAdd}
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Plus size={14} />
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="flex items-center gap-1">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={kpi.label}
                  onChange={(e) => handleUpdate(kpi.id, e.target.value)}
                  className="flex-1 px-2 py-1 border border-blue-300 rounded text-xs bg-white"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
                <button
                  onClick={() => handleDelete(kpi.id)}
                  className="text-red-500 hover:text-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                <span className="text-xs text-slate-700" style={{ fontFamily: 'var(--font-sans)' }}>
                  {kpi.label}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
