import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isFuture } from 'date-fns';

export function UpcomingCalendarWidget({ tasks = [], meetings = [] }) {
  const { tokens } = useTheme();

  const upcomingItems = useMemo(() => {
    const items = [];

    // Add tasks with due dates
    tasks
      .filter(t => t.due_date && isFuture(parseISO(t.due_date)) && t.status !== 'done')
      .forEach(task => {
        items.push({
          id: task.id,
          type: 'task',
          title: task.title,
          time: parseISO(task.due_date),
          location: task.location,
          priority: task.priority
        });
      });

    // Add meetings
    meetings
      .filter(m => m.date && isFuture(parseISO(m.date)))
      .forEach(meeting => {
        items.push({
          id: meeting.id,
          type: 'meeting',
          title: meeting.title,
          time: parseISO(meeting.date),
          location: null
        });
      });

    return items
      .sort((a, b) => a.time - b.time)
      .slice(0, 5);
  }, [tasks, meetings]);

  const getTimeLabel = (time) => {
    if (isToday(time)) return 'Today';
    if (isTomorrow(time)) return 'Tomorrow';
    return format(time, 'MMM d');
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: '#DC2626',
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#10B981'
    };
    return colors[priority] || tokens.accent;
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5" style={{ color: tokens.accent }} />
        <h3 className="font-semibold" style={{ color: tokens.color }}>
          Upcoming
        </h3>
      </div>

      <div className="space-y-3">
        {upcomingItems.map(item => (
          <div 
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-lg border"
            style={{ borderColor: tokens.border }}
          >
            <div 
              className="w-1 h-12 rounded-full flex-shrink-0"
              style={{ 
                backgroundColor: item.type === 'task' 
                  ? getPriorityColor(item.priority) 
                  : tokens.accent 
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm mb-1" style={{ color: tokens.color }}>
                {item.title}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: tokens.subtle }}>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {getTimeLabel(item.time)} • {format(item.time, 'h:mm a')}
                </span>
                {item.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {item.location}
                  </span>
                )}
              </div>
            </div>
            <span 
              className="text-xs px-2 py-1 rounded-full flex-shrink-0"
              style={{ 
                backgroundColor: item.type === 'task' ? `${tokens.accent}15` : `${tokens.accent}10`,
                color: tokens.accent
              }}
            >
              {item.type}
            </span>
          </div>
        ))}

        {upcomingItems.length === 0 && (
          <div className="text-center py-6" style={{ color: tokens.subtle }}>
            No upcoming events
          </div>
        )}
      </div>
    </Card>
  );
}