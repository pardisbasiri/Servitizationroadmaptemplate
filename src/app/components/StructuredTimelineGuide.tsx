import { CalendarClock, Grid3x3, Maximize2, Clock, Layers, MousePointerClick } from 'lucide-react';

export function StructuredTimelineGuide() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock size={20} className="text-slate-700" />
        <h3 className="text-sm" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
          Structured Timeline Guide
        </h3>
      </div>

      <div className="space-y-4 text-xs" style={{ fontFamily: 'var(--font-sans)' }}>
        {/* Time Blocks */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Grid3x3 size={14} className="text-blue-600" />
            <h4 className="text-xs" style={{ fontWeight: 600 }}>
              Time Block System
            </h4>
          </div>
          <p className="text-gray-600 leading-relaxed ml-6">
            Tasks are positioned on a horizontal time grid. Each block represents a configurable time period (1 week, 2 weeks, or 1 month).
          </p>
        </div>

        {/* Duration */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Maximize2 size={14} className="text-green-600" />
            <h4 className="text-xs" style={{ fontWeight: 600 }}>
              Task Duration
            </h4>
          </div>
          <p className="text-gray-600 leading-relaxed ml-6">
            The width of each task bar represents its duration in time blocks. Duration is automatically calculated from the task's effort level:
          </p>
          <ul className="ml-6 mt-1 space-y-1 text-gray-600">
            <li>• Low Effort = 1 block</li>
            <li>• Medium Effort = 2 blocks</li>
            <li>• High Effort = 3 blocks</li>
          </ul>
        </div>

        {/* Team Clustering */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Layers size={14} className="text-purple-600" />
            <h4 className="text-xs" style={{ fontWeight: 600 }}>
              Team Clustering
            </h4>
          </div>
          <p className="text-gray-600 leading-relaxed ml-6">
            Tasks are grouped by team in separate swimlanes. Each team has a unique color for easy visual identification and scanning.
          </p>
        </div>

        {/* Dependencies */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-orange-600" />
            <h4 className="text-xs" style={{ fontWeight: 600 }}>
              Dependency-Based Sequencing
            </h4>
          </div>
          <p className="text-gray-600 leading-relaxed ml-6">
            Tasks are automatically positioned based on their dependencies. If Task B depends on Task A, it will start after Task A completes.
          </p>
        </div>

        {/* Interactions */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick size={14} className="text-pink-600" />
            <h4 className="text-xs" style={{ fontWeight: 600 }}>
              Interactive Features
            </h4>
          </div>
          <ul className="ml-6 space-y-1 text-gray-600">
            <li>• Click a task to highlight its dependency chain</li>
            <li>• Use zoom controls to adjust block width</li>
            <li>• Toggle dependency lines on/off</li>
            <li>• Adjust time block definition (week/month)</li>
          </ul>
        </div>

        {/* Dependency Lines */}
        <div className="pt-3 border-t border-gray-200">
          <h4 className="text-xs mb-2" style={{ fontWeight: 600 }}>
            Dependency Line Types
          </h4>
          <div className="space-y-2 ml-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-slate-400" />
              <span className="text-gray-600">Intra-team (same team)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 border-t-2 border-dashed border-amber-400" />
              <span className="text-gray-600">Cross-team (different teams)</span>
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="pt-3 border-t border-gray-200">
          <h4 className="text-xs mb-2" style={{ fontWeight: 600 }}>
            Key Benefits
          </h4>
          <ul className="ml-2 space-y-1 text-gray-600">
            <li>• Clear visualization of task sequencing</li>
            <li>• Easy identification of team workload</li>
            <li>• Automatic conflict resolution (no overlaps)</li>
            <li>• Visual time estimation with duration blocks</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
