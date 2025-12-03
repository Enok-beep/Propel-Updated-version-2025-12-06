import React, { useMemo, useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '../ui-custom/Card';
import { Calendar, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

export function TeamCalendar({ teamId, teamMembers }) {
  const { tokens } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const teamTasks = allTasks.filter(t => t.team_id === teamId);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getTasksForDay = (day) => {
    return teamTasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), day);
    });
  };

  const getMembersWithTasksOnDay = (day) => {
    const dayTasks = getTasksForDay(day);
    const members = new Set();
    dayTasks.forEach(task => {
      if (task.assigned_to) members.add(task.assigned_to);
    });
    return Array.from(members);
  };

  const selectedDayTasks = selectedDate ? getTasksForDay(selectedDate) : [];

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" style={{ color: tokens.accent }} />
          <h3 className="font-semibold" style={{ color: tokens.color }}>
            Team Calendar
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center" style={{ color: tokens.color }}>
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div 
            key={day}
            className="text-center text-xs font-medium py-2"
            style={{ color: tokens.subtle }}
          >
            {day}
          </div>
        ))}
        
        {monthDays.map((day, i) => {
          const dayTasks = getTasksForDay(day);
          const membersOnDay = getMembersWithTasksOnDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "aspect-square rounded-xl p-2 transition-all hover:scale-105 relative",
                isSelected && "ring-2"
              )}
              style={{
                backgroundColor: isSelected ? `${tokens.accent}20` : isToday ? `${tokens.accent}10` : tokens.card,
                borderColor: tokens.border,
                ringColor: tokens.accent
              }}
            >
              <div className="text-sm font-medium" style={{ color: tokens.color }}>
                {format(day, 'd')}
              </div>
              
              {dayTasks.length > 0 && (
                <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 justify-center">
                  {dayTasks.slice(0, 3).map((task, idx) => (
                    <div
                      key={idx}
                      className="w-1 h-1 rounded-full"
                      style={{
                        backgroundColor: 
                          task.priority === 'urgent' || task.priority === 'high' ? '#EF4444' :
                          task.priority === 'medium' ? '#F59E0B' : '#10B981'
                      }}
                    />
                  ))}
                </div>
              )}
              
              {membersOnDay.length > 0 && (
                <div className="absolute top-1 right-1">
                  <Users className="w-3 h-3" style={{ color: tokens.accent }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Details */}
      {selectedDate && selectedDayTasks.length > 0 && (
        <div 
          className="mt-4 p-4 rounded-xl border"
          style={{ borderColor: tokens.border, backgroundColor: `${tokens.accent}05` }}
        >
          <div className="font-semibold mb-3" style={{ color: tokens.color }}>
            {format(selectedDate, 'MMMM d, yyyy')} - {selectedDayTasks.length} tasks
          </div>
          <div className="space-y-2">
            {selectedDayTasks.map(task => (
              <div 
                key={task.id}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ backgroundColor: tokens.card }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: tokens.color }}>
                    {task.title}
                  </div>
                  {task.assigned_to && (
                    <div className="text-xs" style={{ color: tokens.subtle }}>
                      Assigned to: {task.assigned_to.split('@')[0]}
                    </div>
                  )}
                </div>
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      task.priority === 'urgent' || task.priority === 'high' ? '#EF4444' :
                      task.priority === 'medium' ? '#F59E0B' : '#10B981'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default TeamCalendar;