import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { format, startOfYear, addMonths, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export function YearlyCalendarView({ year, tasks, onDateSelect }) {
  const { tokens } = useTheme();
  
  const yearStart = startOfYear(new Date(year, 0, 1));
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  
  const getTaskDensity = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), date);
    });
    
    const urgent = dayTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
    return urgent > 0 ? 'high' : dayTasks.length > 0 ? 'normal' : 'none';
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
        
        return (
          <div 
            key={month.toISOString()} 
            className="rounded-xl p-3 border"
            style={{ 
              backgroundColor: tokens.card,
              borderColor: tokens.border 
            }}
          >
            <h3 className="text-sm font-semibold mb-2 text-center" style={{ color: tokens.color }}>
              {format(month, 'MMMM')}
            </h3>
            
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <div 
                  key={i} 
                  className="text-center text-[10px] font-medium"
                  style={{ color: tokens.subtle }}
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isCurrentMonth = day.getMonth() === month.getMonth();
                const isToday = isSameDay(day, new Date());
                const density = getTaskDensity(day);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => onDateSelect(day)}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded text-[10px] transition-all",
                      "hover:scale-110",
                      !isCurrentMonth && "opacity-20"
                    )}
                    style={{
                      backgroundColor: isToday 
                        ? tokens.accent 
                        : density === 'high' 
                        ? '#EF444420' 
                        : density === 'normal' 
                        ? `${tokens.accent}15` 
                        : 'transparent',
                      color: isToday ? '#FFFFFF' : tokens.color,
                      fontWeight: isToday ? 'bold' : 'normal'
                    }}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default YearlyCalendarView;