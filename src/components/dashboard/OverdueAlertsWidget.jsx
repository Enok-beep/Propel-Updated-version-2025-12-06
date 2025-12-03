import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow, parseISO, isPast } from 'date-fns';

export function OverdueAlertsWidget({ tasks = [], projects = [] }) {
  const { tokens } = useTheme();

  const overdueItems = useMemo(() => {
    const items = [];

    // Overdue tasks
    tasks
      .filter(t => 
        t.status !== 'done' && 
        t.due_date && 
        isPast(parseISO(t.due_date))
      )
      .forEach(task => {
        items.push({
          id: task.id,
          type: 'task',
          title: task.title,
          dueDate: parseISO(task.due_date),
          assignee: task.assigned_to,
          priority: task.priority
        });
      });

    // Overdue projects
    projects
      .filter(p => 
        p.status === 'active' && 
        p.end_date && 
        isPast(parseISO(p.end_date))
      )
      .forEach(project => {
        items.push({
          id: project.id,
          type: 'project',
          title: project.name,
          dueDate: parseISO(project.end_date)
        });
      });

    return items
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 5);
  }, [tasks, projects]);

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: '#DC2626',
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#10B981'
    };
    return colors[priority] || '#DC2626';
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold" style={{ color: tokens.color }}>
            Overdue Alerts
          </h3>
        </div>
        {overdueItems.length > 0 && (
          <span 
            className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 font-medium"
          >
            {overdueItems.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {overdueItems.map(item => (
          <div 
            key={item.id}
            className="p-3 rounded-lg border-l-4"
            style={{ 
              backgroundColor: `${tokens.card}`,
              borderLeftColor: item.type === 'task' 
                ? getPriorityColor(item.priority) 
                : '#DC2626'
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm mb-1" style={{ color: tokens.color }}>
                  {item.title}
                </div>
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <Clock className="w-3 h-3" />
                  Overdue by {formatDistanceToNow(item.dueDate)}
                </div>
                {item.assignee && (
                  <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
                    Assigned to: {item.assignee.split('@')[0]}
                  </div>
                )}
              </div>
              <span 
                className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                style={{ 
                  backgroundColor: item.type === 'task' ? '#FEE2E2' : '#FECACA',
                  color: '#DC2626'
                }}
              >
                {item.type}
              </span>
            </div>
          </div>
        ))}

        {overdueItems.length === 0 && (
          <div 
            className="text-center py-6 rounded-lg"
            style={{ backgroundColor: `${tokens.accent}10` }}
          >
            <div className="text-2xl mb-2">✅</div>
            <div className="text-sm font-medium" style={{ color: tokens.accent }}>
              No overdue items!
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}