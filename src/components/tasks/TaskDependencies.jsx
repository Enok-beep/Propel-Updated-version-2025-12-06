import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link2, X, Search, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TaskDependencies({ dependencies = [], allTasks = [], currentTaskId, onChange }) {
  const { tokens } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const selectedTasks = allTasks.filter(t => dependencies.includes(t.id));
  const availableTasks = allTasks.filter(t => 
    t.id !== currentTaskId && 
    !dependencies.includes(t.id) &&
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addDependency = (taskId) => {
    onChange([...dependencies, taskId]);
    setSearchQuery('');
    setShowSearch(false);
  };

  const removeDependency = (taskId) => {
    onChange(dependencies.filter(id => id !== taskId));
  };

  const hasBlockedDependencies = selectedTasks.some(t => t.status !== 'done');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2" style={{ color: tokens.color }}>
          <Link2 className="w-4 h-4" />
          Dependencies
        </label>
        {!showSearch && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(true)}
            style={{ borderColor: tokens.border }}
          >
            <Search className="w-3 h-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Selected Dependencies */}
      {selectedTasks.length > 0 && (
        <div className="space-y-2">
          {selectedTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center justify-between p-2 rounded-lg border"
              style={{ borderColor: tokens.border }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ 
                    backgroundColor: task.status === 'done' ? '#10B981' : '#F59E0B' 
                  }}
                />
                <span className="text-sm truncate" style={{ color: tokens.color }}>
                  {task.title}
                </span>
                {task.status === 'done' ? (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Done
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Pending
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeDependency(task.id)}
                className="flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Blocked Warning */}
      {hasBlockedDependencies && (
        <div 
          className="flex items-start gap-2 p-3 rounded-lg text-xs"
          style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Task is blocked</div>
            <div>Complete dependencies before starting this task</div>
          </div>
        </div>
      )}

      {/* Search Interface */}
      {showSearch && (
        <div className="space-y-2 p-3 rounded-lg border" style={{ borderColor: tokens.border }}>
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            style={{ borderColor: tokens.border }}
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {availableTasks.length === 0 ? (
              <div className="text-center py-4 text-sm" style={{ color: tokens.subtle }}>
                No tasks found
              </div>
            ) : (
              availableTasks.slice(0, 10).map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => addDependency(task.id)}
                  className="w-full text-left p-2 rounded-lg hover:bg-opacity-50 transition-colors"
                  style={{ backgroundColor: `${tokens.accent}10` }}
                >
                  <div className="text-sm font-medium" style={{ color: tokens.color }}>
                    {task.title}
                  </div>
                  <div className="text-xs" style={{ color: tokens.subtle }}>
                    {task.category} • {task.priority}
                  </div>
                </button>
              ))
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      )}

      {selectedTasks.length === 0 && !showSearch && (
        <p className="text-xs" style={{ color: tokens.subtle }}>
          No dependencies. This task can start anytime.
        </p>
      )}
    </div>
  );
}

export default TaskDependencies;