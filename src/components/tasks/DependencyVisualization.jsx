import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2, Clock, ArrowRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DependencyVisualization({ task, onTaskClick }) {
  const { tokens } = useTheme();
  const [hoveredTaskId, setHoveredTaskId] = useState(null);

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const dependsOnTasks = (task.depends_on || [])
    .map(id => allTasks.find(t => t.id === id))
    .filter(Boolean);

  const blockedTasks = allTasks.filter(t => 
    t.depends_on?.includes(task.id)
  );

  const isBlocked = dependsOnTasks.some(t => t.status !== 'done');

  if (dependsOnTasks.length === 0 && blockedTasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Flow Strand Visualization Header */}
      <div 
        className="flex items-center gap-2 p-3 rounded-xl"
        style={{ 
          backgroundColor: `${tokens.accent}08`,
          border: `1px solid ${tokens.accent}40`
        }}
      >
        <Zap className="w-4 h-4 animate-pulse" style={{ color: tokens.accent }} />
        <span className="text-xs font-semibold" style={{ color: tokens.accent }}>
          Task Flow Connections
        </span>
      </div>

      {/* Depends On */}
      {dependsOnTasks.length > 0 && (
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${tokens.accent}15` }}
            >
              <ArrowRight className="w-3.5 h-3.5" style={{ color: tokens.accent }} />
            </div>
            <h4 className="font-semibold text-sm" style={{ color: tokens.color }}>
              Depends On ({dependsOnTasks.length})
            </h4>
            {isBlocked && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Blocked
              </span>
            )}
          </div>
          
          <div className="relative space-y-2 pl-3">
            {/* Flow Strand Line */}
            <div 
              className="absolute left-0 top-2 bottom-2 w-0.5"
              style={{ 
                background: `linear-gradient(to bottom, ${tokens.accent}40, ${tokens.accent}10)`,
              }}
            />
            
            {dependsOnTasks.map((depTask, idx) => (
              <button
                key={depTask.id}
                onClick={() => onTaskClick?.(depTask)}
                onMouseEnter={() => setHoveredTaskId(depTask.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                  "hover:scale-[1.02] hover:shadow-lg relative group"
                )}
                style={{ 
                  borderColor: hoveredTaskId === depTask.id ? tokens.accent : tokens.border,
                  backgroundColor: hoveredTaskId === depTask.id ? `${tokens.accent}05` : 'transparent',
                  boxShadow: hoveredTaskId === depTask.id ? `0 0 20px ${tokens.accent}30` : 'none'
                }}
              >
                {/* Connection Node */}
                <div 
                  className="absolute -left-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all"
                  style={{ 
                    backgroundColor: hoveredTaskId === depTask.id ? tokens.accent : `${tokens.accent}40`,
                    boxShadow: hoveredTaskId === depTask.id ? `0 0 8px ${tokens.accent}` : 'none'
                  }}
                />
                
                {depTask.status === 'done' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#10B981' }} />
                ) : depTask.status === 'in_progress' ? (
                  <Clock className="w-5 h-5 flex-shrink-0 animate-pulse" style={{ color: '#3B82F6' }} />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                )}
                
                <div className="flex-1 min-w-0">
                  <div 
                    className={cn(
                      "text-sm font-medium truncate",
                      depTask.status === 'done' && "line-through opacity-60"
                    )}
                    style={{ color: tokens.color }}
                  >
                    {depTask.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs capitalize" style={{ color: tokens.subtle }}>
                      {depTask.status.replace('_', ' ')}
                    </span>
                    {hoveredTaskId === depTask.id && (
                      <span 
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: `${tokens.accent}15`,
                          color: tokens.accent
                        }}
                      >
                        Click to view
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Blocking */}
      {blockedTasks.length > 0 && (
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${tokens.accent}15` }}
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" style={{ color: tokens.accent }} />
            </div>
            <h4 className="font-semibold text-sm" style={{ color: tokens.color }}>
              Blocking ({blockedTasks.length})
            </h4>
          </div>
          
          <div className="relative space-y-2 pl-3">
            {/* Flow Strand Line */}
            <div 
              className="absolute left-0 top-2 bottom-2 w-0.5"
              style={{ 
                background: `linear-gradient(to bottom, ${tokens.accent}40, ${tokens.accent}10)`,
              }}
            />
            
            {blockedTasks.map((blockedTask, idx) => (
              <button
                key={blockedTask.id}
                onClick={() => onTaskClick?.(blockedTask)}
                onMouseEnter={() => setHoveredTaskId(blockedTask.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                  "hover:scale-[1.02] hover:shadow-lg relative group"
                )}
                style={{ 
                  borderColor: hoveredTaskId === blockedTask.id ? tokens.accent : tokens.border,
                  backgroundColor: hoveredTaskId === blockedTask.id ? `${tokens.accent}05` : 'transparent',
                  boxShadow: hoveredTaskId === blockedTask.id ? `0 0 20px ${tokens.accent}30` : 'none'
                }}
              >
                {/* Connection Node */}
                <div 
                  className="absolute -left-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all"
                  style={{ 
                    backgroundColor: hoveredTaskId === blockedTask.id ? tokens.accent : `${tokens.accent}40`,
                    boxShadow: hoveredTaskId === blockedTask.id ? `0 0 8px ${tokens.accent}` : 'none'
                  }}
                />
                
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: tokens.color }}>
                    {blockedTask.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: tokens.subtle }}>
                      Waiting for this task
                    </span>
                    {hoveredTaskId === blockedTask.id && (
                      <span 
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: `${tokens.accent}15`,
                          color: tokens.accent
                        }}
                      >
                        Click to view
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DependencyVisualization;