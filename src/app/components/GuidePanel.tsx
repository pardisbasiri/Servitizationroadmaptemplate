import { Info } from 'lucide-react';

export function GuidePanel() {
  const steps = [
    'Define Themes (group main problems)',
    'Define Capabilities (what must exist)',
    'Teams add actions under each capability',
    'Assign one owner per action',
    'Tag actions (urgency, risk, acceptance, effort)',
    'Add key dependencies',
    'Define time horizons (short/medium/long)',
    'Use decision gates to validate progress',
    'Track success using KPIs',
  ];

  return (
    <div className="bg-slate-800 text-white rounded-lg p-6 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <Info size={20} className="text-blue-400" />
        <h3 className="text-lg" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
          How to Fill This Roadmap
        </h3>
      </div>

      <div className="space-y-3 mb-6">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-3">
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs"
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
            >
              {index + 1}
            </div>
            <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
              {step}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700 pt-4">
        <div className="bg-slate-700/50 rounded p-3">
          <p className="text-xs text-slate-300 leading-relaxed" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="text-blue-400" style={{ fontWeight: 600 }}>Rule:</span> Every action must link to:
            <br />
            Theme → Capability → Team
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <p className="text-xs text-slate-400" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
          Tag Reference:
        </p>
        <div className="grid grid-cols-2 gap-2 text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
          <div className="text-slate-400">U: Urgency</div>
          <div className="text-slate-400">R: Risk</div>
          <div className="text-slate-400">A: Acceptance</div>
          <div className="text-slate-400">E: Effort</div>
        </div>
      </div>
    </div>
  );
}
