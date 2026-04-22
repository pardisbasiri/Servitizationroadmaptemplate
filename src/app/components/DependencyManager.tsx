import { useState } from 'react';
import { Network, Trash2, AlertCircle } from 'lucide-react';
import { type ActionCardData } from './ActionCard';
import { type DependencyConnection } from './TimelineView';

interface DependencyManagerProps {
  actions: ActionCardData[];
  dependencies: DependencyConnection[];
  onAddDependency: (fromId: string, toId: string) => void;
  onRemoveDependency: (fromId: string, toId: string) => void;
}

export function DependencyManager({ 
  actions, 
  dependencies, 
  onAddDependency, 
  onRemoveDependency 
}: DependencyManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState<string>('');
  const [selectedTo, setSelectedTo] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleAddDependency = () => {
    setError('');
    
    if (!selectedFrom || !selectedTo) {
      setError('Please select both tasks');
      return;
    }

    if (selectedFrom === selectedTo) {
      setError('A task cannot depend on itself');
      return;
    }

    // Check if dependency already exists
    if (dependencies.some(d => d.fromId === selectedFrom && d.toId === selectedTo)) {
      setError('This dependency already exists');
      return;
    }

    // Check for circular dependencies
    if (wouldCreateCycle(selectedFrom, selectedTo, dependencies)) {
      setError('This would create a circular dependency');
      return;
    }

    const fromAction = actions.find(a => a.id === selectedFrom);
    const toAction = actions.find(a => a.id === selectedTo);
    
    if (!fromAction || !toAction) {
      setError('Invalid task selection');
      return;
    }

    onAddDependency(selectedFrom, selectedTo);
    setSelectedFrom('');
    setSelectedTo('');
  };

  const handleRemoveDependency = (fromId: string, toId: string) => {
    onRemoveDependency(fromId, toId);
  };

  const getActionTitle = (id: string) => {
    return actions.find(a => a.id === id)?.title || 'Unknown';
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
      >
        <Network size={16} />
        Manage Dependencies ({dependencies.length})
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
      <div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
              Dependency Manager
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'var(--font-sans)' }}>
            Define task dependencies to ensure proper sequencing
          </p>
        </div>

        <div className="p-6">
          {/* Add Dependency Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm mb-3" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              Add New Dependency
            </h4>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                  Prerequisite Task (FROM)
                </label>
                <select
                  value={selectedFrom}
                  onChange={(e) => setSelectedFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  <option value="">Select task...</option>
                  {actions.map(action => (
                    <option key={action.id} value={action.id}>
                      {action.title} ({action.team})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                  Dependent Task (TO)
                </label>
                <select
                  value={selectedTo}
                  onChange={(e) => setSelectedTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  <option value="">Select task...</option>
                  {actions.map(action => (
                    <option key={action.id} value={action.id}>
                      {action.title} ({action.team})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-sm text-red-700">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleAddDependency}
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              Add Dependency
            </button>

            <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'var(--font-sans)' }}>
              This means: "FROM task must complete before TO task can start"
            </p>
          </div>

          {/* Existing Dependencies List */}
          <div>
            <h4 className="text-sm mb-3" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              Existing Dependencies ({dependencies.length})
            </h4>

            {dependencies.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No dependencies defined yet
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dependencies.map((dep) => {
                  const fromAction = actions.find(a => a.id === dep.fromId);
                  const toAction = actions.find(a => a.id === dep.toId);

                  return (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-700" style={{ fontFamily: 'var(--font-sans)' }}>
                            {getActionTitle(dep.fromId)}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-700" style={{ fontFamily: 'var(--font-sans)' }}>
                            {getActionTitle(dep.toId)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            dep.type === 'intra-team' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`} style={{ fontFamily: 'var(--font-mono)' }}>
                            {dep.type === 'intra-team' ? 'Same Team' : 'Cross-Team'}
                          </span>
                          <span className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-mono)' }}>
                            {fromAction?.team} → {toAction?.team}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveDependency(dep.fromId, dep.toId)}
                        className="ml-3 p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
            style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to detect circular dependencies
function wouldCreateCycle(
  fromId: string, 
  toId: string, 
  existingDeps: DependencyConnection[]
): boolean {
  // Build adjacency list
  const graph = new Map<string, string[]>();
  
  existingDeps.forEach(dep => {
    if (!graph.has(dep.fromId)) {
      graph.set(dep.fromId, []);
    }
    graph.get(dep.fromId)!.push(dep.toId);
  });

  // Add the new dependency
  if (!graph.has(fromId)) {
    graph.set(fromId, []);
  }
  graph.get(fromId)!.push(toId);

  // DFS to detect cycle
  const visited = new Set<string>();
  const recStack = new Set<string>();

  const hasCycle = (node: string): boolean => {
    if (!visited.has(node)) {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && hasCycle(neighbor)) {
          return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }
    }
    recStack.delete(node);
    return false;
  };

  // Check all nodes
  const allNodes = new Set([...graph.keys(), ...Array.from(graph.values()).flat()]);
  for (const node of allNodes) {
    if (hasCycle(node)) {
      return true;
    }
  }

  return false;
}
