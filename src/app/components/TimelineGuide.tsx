import { Info } from 'lucide-react';

export function TimelineGuide() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Info size={18} className="text-blue-600" />
        <h3 className="text-sm" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          Timeline View Guide
        </h3>
      </div>

      <div className="space-y-4 text-sm text-gray-700" style={{ fontFamily: 'var(--font-sans)' }}>
        <div>
          <h4 className="mb-2" style={{ fontWeight: 600 }}>How It Works</h4>
          <ul className="space-y-1.5 text-xs list-disc list-inside text-gray-600">
            <li>Tasks are arranged by dependencies and urgency</li>
            <li>Connected tasks form execution chains</li>
            <li>Filter by time horizon to focus planning</li>
            <li>Swimlanes organize by team for clarity</li>
          </ul>
        </div>

        <div>
          <h4 className="mb-2" style={{ fontWeight: 600 }}>Creating Dependencies</h4>
          <ul className="space-y-1.5 text-xs list-disc list-inside text-gray-600">
            <li>Click "Add Dependency" to enter connect mode</li>
            <li>Click first task (prerequisite), then second task</li>
            <li>Or use "Manage Dependencies" for batch management</li>
            <li>System prevents circular dependencies automatically</li>
          </ul>
        </div>

        <div>
          <h4 className="mb-2" style={{ fontWeight: 600 }}>Visual Indicators</h4>
          <ul className="space-y-1.5 text-xs list-disc list-inside text-gray-600">
            <li>🟠 Orange dot = Has dependencies (blocked)</li>
            <li>🟢 Green dot = Blocks other tasks</li>
            <li>Solid line = Same team dependency</li>
            <li>Dashed line = Cross-team dependency</li>
          </ul>
        </div>

        <div>
          <h4 className="mb-2" style={{ fontWeight: 600 }}>Interactive Features</h4>
          <ul className="space-y-1.5 text-xs list-disc list-inside text-gray-600">
            <li>Click task to highlight entire dependency chain</li>
            <li>Hover to preview upstream/downstream links</li>
            <li>Click team header to focus on single team</li>
            <li>Toggle dependency visibility with show/hide</li>
          </ul>
        </div>

        <div>
          <h4 className="mb-2" style={{ fontWeight: 600 }}>Time Horizon Filters</h4>
          <ul className="space-y-1.5 text-xs list-disc list-inside text-gray-600">
            <li>Short-term = High urgency tasks</li>
            <li>Mid-term = Medium urgency tasks</li>
            <li>Long-term = Low urgency tasks</li>
            <li>All Horizons = Complete view</li>
          </ul>
        </div>

        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            💡 <span style={{ fontWeight: 600 }}>Tip:</span> Use dependencies to model prerequisite relationships, 
            technical blockers, and cross-team coordination needs.
          </p>
        </div>
      </div>
    </div>
  );
}
