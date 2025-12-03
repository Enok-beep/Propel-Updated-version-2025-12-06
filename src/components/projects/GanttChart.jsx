import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';

export function GanttChart({ tasks, onTaskClick }) {
  const { tokens } = useTheme();

  const tasksWithDates = tasks.filter(t => t.due_date);

  const { startDate, endDate, weeks } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const today = new Date();
      return {
        startDate: startOfWeek(today),
        endDate: endOfWeek(addDays(today, 7)),
        weeks: 2
      };
    }

    const dates = tasksWithDates.map(t => new Date(t.due_date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const start = startOfWeek(minDate);
    const end = endOfWeek(maxDate);
    const totalWeeks = Math.ceil(differenceInDays(end, start) / 7);

    return {
      startDate: start,
      endDate: end,
      weeks: Math.max(totalWeeks, 4)
    };
  }, [tasksWithDates]);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const totalDays = days.length;

  const priorityColors = {
    urgent: '#DC2626',
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981'
  };

  const getTaskPosition = (task) => {
    const taskDate = new Date(task.due_date);
    const daysFromStart = differenceInDays(taskDate, startDate);
    const left = (daysFromStart / totalDays) * 100;
    const width = ((task.estimated_minutes || 25) / 60 / 24 / totalDays) * 100;
    
    return { left: Math.max(0, left), width: Math.max(1, width) };
  };

  if (tasksWithDates.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: tokens.subtle }}>
        <p className="text-sm">No tasks with due dates to display in Gantt chart</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="flex items-center border-b pb-2 mb-4" style={{ borderColor: tokens.border }}>
          <div className="w-48 flex-shrink-0 font-semibold text-sm" style={{ color: tokens.color }}>
            Task
          </div>
          <div className="flex-1 flex">
            {days.map((day, i) => (
              <div
                key={i}
                className="flex-1 text-center text-xs"
                style={{ color: tokens.subtle }}
              >
                <div>{format(day, 'EEE')}</div>
                <div className="font-semibold" style={{ color: tokens.color }}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          {tasksWithDates.map(task => {
            const { left, width } = getTaskPosition(task);
            
            return (
              <div key={task.id} className="flex items-center">
                <div className="w-48 flex-shrink-0 pr-4">
                  <button
                    onClick={() => onTaskClick?.(task)}
                    className="text-sm text-left truncate hover:underline w-full"
                    style={{ color: tokens.color }}
                  >
                    {task.title}
                  </button>
                </div>
                
                <div className="flex-1 relative h-8">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex">
                    {days.map((day, i) => (
                      <div
                        key={i}
                        className="flex-1 border-l"
                        style={{ borderColor: `${tokens.border}50` }}
                      />
                    ))}
                  </div>

                  {/* Task bar */}
                  <div
                    className="absolute h-6 top-1 rounded-lg flex items-center px-2 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: priorityColors[task.priority],
                      minWidth: '60px'
                    }}
                    onClick={() => onTaskClick?.(task)}
                  >
                    <span className="text-xs font-medium text-white truncate">
                      {task.status === 'done' ? '✓ ' : ''}{task.title}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex items-center gap-4 text-xs" style={{ borderColor: tokens.border }}>
          <span style={{ color: tokens.subtle }}>Priority:</span>
          {Object.entries(priorityColors).map(([priority, color]) => (
            <div key={priority} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span style={{ color: tokens.color }} className="capitalize">{priority}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GanttChart;