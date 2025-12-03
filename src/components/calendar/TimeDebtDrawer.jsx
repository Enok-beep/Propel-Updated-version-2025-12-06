import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { AlertTriangle, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export function TimeDebtDrawer({ tasks, onTaskClick, onDragStart, onDragEnd }) {
  const { tokens } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);

  const overdueTasks = tasks.filter(task => {
    if (!task.due_date || task.status === 'done') return false;
    const dueDate = typeof task.due_date === 'string' ? parseISO(task.due_date) : task.due_date;
    return dueDate < new Date();
  }).sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const priorityColors = {
    urgent: '#DC2626',
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981'
  };

  if (overdueTasks.length === 0) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-20 lg:bottom-0 right-4 w-80 rounded-t-2xl shadow-2xl z-40 transition-all duration-300",
        !isExpanded && "translate-y-[calc(100%-56px)]"
      )}
      style={{ 
        backgroundColor: tokens.card,
        borderTop: `3px solid #EF4444`,
        borderLeft: `1px solid ${tokens.border}`,
        borderRight: `1px solid ${tokens.border}`,
        maxHeight: isExpanded ? '60vh' : '56px'
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
          </div>
          <div className="text-left">
            <div className="font-semibold" style={{ color: tokens.color }}>
              Time Debt
            </div>
            <div className="text-xs" style={{ color: tokens.subtle }}>
              {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
        >
          <span className="text-xs font-bold">{overdueTasks.length}</span>
        </div>
        
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 ml-2" style={{ color: tokens.subtle }} />
        ) : (
          <ChevronUp className="w-5 h-5 ml-2" style={{ color: tokens.subtle }} />
        )}
      </button>

      {/* Task List */}
      {isExpanded && (
        <div className="overflow-y-auto px-3 pb-3" style={{ maxHeight: 'calc(60vh - 72px)' }}>
          <div className="space-y-2">
            {overdueTasks.map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('taskId', task.id);
                  e.dataTransfer.effectAllowed = 'move';
                  onDragStart?.(task.id);
                  if (window.setDraggingTaskId) {
                    window.setDraggingTaskId(task.id);
                  }
                }}
                onDragEnd={() => {
                  onDragEnd?.();
                  if (window.setDraggingTaskId) {
                    window.setDraggingTaskId(null);
                  }
                }}
                onClick={() => onTaskClick?.(task)}
                className={cn(
                  "p-3 rounded-xl cursor-move hover:scale-[1.02] transition-all",
                  "active:scale-95 border-l-4"
                )}
                style={{ 
                  backgroundColor: tokens.bg,
                  borderLeftColor: priorityColors[task.priority],
                  borderTop: `1px solid ${tokens.border}`,
                  borderRight: `1px solid ${tokens.border}`,
                  borderBottom: `1px solid ${tokens.border}`
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div 
                      className="font-medium text-sm truncate mb-1"
                      style={{ color: tokens.color }}
                    >
                      {task.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: tokens.subtle }}>
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(
                          typeof task.due_date === 'string' ? parseISO(task.due_date) : task.due_date,
                          'MMM d'
                        )}
                      </span>
                      {task.estimated_minutes && (
                        <span>• {task.estimated_minutes}m</span>
                      )}
                    </div>
                  </div>
                  
                  <div 
                    className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0"
                    style={{ 
                      backgroundColor: `${priorityColors[task.priority]}20`,
                      color: priorityColors[task.priority]
                    }}
                  >
                    {task.priority}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Helper Text */}
          <div 
            className="mt-4 p-3 rounded-lg text-xs text-center"
            style={{ backgroundColor: `${tokens.accent}10`, color: tokens.subtle }}
          >
            💡 Drag tasks to the calendar to reschedule
          </div>
        </div>
      )}
    </div>
  );
}

export default TimeDebtDrawer;