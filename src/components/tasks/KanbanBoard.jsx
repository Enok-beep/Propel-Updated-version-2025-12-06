import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, Zap, Plus } from 'lucide-react';
import { format } from 'date-fns';

const COLUMNS = [
  { id: 'todo', label: 'To Do', icon: '📋', color: '#6B7280' },
  { id: 'in_progress', label: 'In Progress', icon: '⚡', color: '#3B82F6' },
  { id: 'done', label: 'Done', icon: '✅', color: '#10B981' }
];

export function KanbanBoard({ tasks, onTaskClick, onTaskCreate }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const priorityConfig = {
    urgent: { color: '#DC2626', bg: '#FEE2E2' },
    high: { color: '#EF4444', bg: '#FEE2E2' },
    medium: { color: '#F59E0B', bg: '#FEF3C7' },
    low: { color: '#10B981', bg: '#D1FAE5' }
  };

  const energyIcons = {
    low: '🌙',
    medium: '☀️',
    high: '⚡'
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTask && draggedTask.status !== columnId) {
      updateTaskMutation.mutate({
        id: draggedTask.id,
        data: { 
          status: columnId,
          ...(columnId === 'done' && { completed_at: new Date().toISOString() })
        }
      });
    }
    setDraggedTask(null);
  };

  const getTasksForColumn = (columnId) => {
    return tasks.filter(task => task.status === columnId);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-12rem)]">
      {COLUMNS.map(column => {
        const columnTasks = getTasksForColumn(column.id);
        const isDragOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className={cn(
              "flex-shrink-0 w-80 rounded-2xl p-4 transition-all",
              isDragOver && "ring-2 scale-[1.02]"
            )}
            style={{ 
              backgroundColor: tokens.card,
              borderColor: tokens.border,
              border: `1px solid ${tokens.border}`,
              ringColor: column.color
            }}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{column.icon}</span>
                <h3 className="font-semibold" style={{ color: tokens.color }}>
                  {column.label}
                </h3>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: `${column.color}15`,
                    color: column.color
                  }}
                >
                  {columnTasks.length}
                </span>
              </div>
              
              {column.id === 'todo' && (
                <button
                  onClick={() => onTaskCreate?.()}
                  className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
                  style={{ color: tokens.accent }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tasks */}
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-16rem)]">
              {columnTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => onTaskClick?.(task)}
                  className={cn(
                    "p-4 rounded-xl cursor-move hover:shadow-md transition-all",
                    draggedTask?.id === task.id && "opacity-50"
                  )}
                  style={{ 
                    backgroundColor: tokens.bg,
                    border: `1px solid ${tokens.border}`
                  }}
                >
                  {/* Priority Badge */}
                  <div 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mb-2"
                    style={{ 
                      backgroundColor: priorityConfig[task.priority]?.bg,
                      color: priorityConfig[task.priority]?.color
                    }}
                  >
                    {task.priority === 'urgent' && <AlertTriangle className="w-3 h-3" />}
                    {task.priority}
                  </div>

                  {/* Title */}
                  <h4 
                    className="font-semibold text-sm mb-2 line-clamp-2"
                    style={{ color: tokens.color }}
                  >
                    {task.title}
                  </h4>

                  {/* Description */}
                  {task.description && (
                    <p 
                      className="text-xs mb-3 line-clamp-2"
                      style={{ color: tokens.subtle }}
                    >
                      {task.description}
                    </p>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: tokens.subtle }}>
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(task.due_date), 'MMM d')}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <span>{energyIcons[task.energy_level]}</span>
                      <span>{task.energy_level}</span>
                    </div>
                    
                    {task.estimated_minutes && (
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {task.estimated_minutes}m
                      </div>
                    )}

                    {task.category && (
                      <span 
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ backgroundColor: `${tokens.accent}10` }}
                      >
                        {task.category}
                      </span>
                    )}
                  </div>

                  {/* Dependency Indicator */}
                  {task.depends_on?.length > 0 && (
                    <div 
                      className="mt-2 text-xs flex items-center gap-1"
                      style={{ color: tokens.subtle }}
                    >
                      🔗 {task.depends_on.length} dependencies
                    </div>
                  )}
                </div>
              ))}

              {columnTasks.length === 0 && (
                <div 
                  className="text-center py-8 text-xs"
                  style={{ color: tokens.subtle }}
                >
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default KanbanBoard;