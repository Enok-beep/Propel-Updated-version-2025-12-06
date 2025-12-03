import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { format, addDays, isSameDay, startOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, setYear, differenceInYears, getWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function RollingCalendarStrip({ 
  selectedDate, 
  onSelectDate, 
  tasksByDate = {},
  weekOffset = 0,
  onWeekChange
}) {
  const { tokens } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const touchStartRef = React.useRef({ x: 0, y: 0 });
  const containerRef = React.useRef(null);
  
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Generate 6 weeks for expanded month view
  const expandedWeeks = React.useMemo(() => {
    const weeks = [];
    const currentMonth = addDays(new Date(), weekOffset * 7);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Get first day of first week (may be in previous month)
    const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    
    // Generate 6 weeks of days
    for (let weekIdx = 0; weekIdx < 6; weekIdx++) {
      const weekStart = addDays(firstWeekStart, weekIdx * 7);
      const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      weeks.push(week);
    }
    
    return weeks;
  }, [weekOffset]);

  const getTaskDensity = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const tasks = tasksByDate[dateKey] || [];
    
    const red = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
    const yellow = tasks.filter(t => t.priority === 'medium').length;
    const green = tasks.filter(t => t.priority === 'low' || t.status === 'done').length;
    const total = red + yellow + green;
    
    return { red, yellow, green, total };
  };

  // Gesture handlers for swipe navigation
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now()
    };

    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = touchEnd.y - touchStartRef.current.y;
    const timeDiff = touchEnd.time - touchStartRef.current.time;

    // Vertical swipe detection for expand/collapse (> 80px, < 300ms, mostly vertical)
    if (timeDiff < 300 && Math.abs(deltaY) > 80 && Math.abs(deltaX) < 50) {
      if (deltaY > 0 && !isExpanded) {
        // Swipe down - Expand to month view
        setIsExpanded(true);
      } else if (deltaY < 0 && isExpanded) {
        // Swipe up - Collapse to week view
        setIsExpanded(false);
      }
    }
    // Horizontal swipe detection for week/month navigation (> 100px, < 300ms, mostly horizontal)
    else if (timeDiff < 300 && Math.abs(deltaX) > 100 && Math.abs(deltaY) < 50) {
      if (deltaX < 0) {
        // Swipe left - Next week/month
        onWeekChange?.(weekOffset + 1);
      } else {
        // Swipe right - Previous week/month
        onWeekChange?.(weekOffset - 1);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "py-4 px-2 border-b backdrop-blur-xl transition-all duration-300",
        isExpanded && "pb-6"
      )}
      style={{ 
        backgroundColor: `${tokens.bg}95`,
        borderColor: tokens.border,
        height: isExpanded ? '50vh' : 'auto',
        overflow: isExpanded ? 'auto' : 'visible'
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-3 px-2">
        <button
          onClick={() => onWeekChange?.(weekOffset - 1)}
          className="p-2 rounded-lg hover:bg-black/5 transition-colors"
          style={{ color: tokens.subtle }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: tokens.color }}>
            {format(weekStart, 'MMMM')}
          </span>
          <Select 
            value={String(weekStart.getFullYear())} 
            onValueChange={(year) => {
              const currentDate = addDays(new Date(), weekOffset * 7);
              const newDate = setYear(currentDate, Number(year));
              const today = new Date();
              const daysDiff = Math.floor((newDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const newWeekOffset = Math.floor(daysDiff / 7);
              onWeekChange?.(newWeekOffset);
            }}
          >
            <SelectTrigger className="w-24 h-8 border-0" style={{ color: tokens.color }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <button
          onClick={() => onWeekChange?.(weekOffset + 1)}
          className="p-2 rounded-lg hover:bg-black/5 transition-colors"
          style={{ color: tokens.subtle }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Strip Content */}
      {!isExpanded ? (
        /* Compact Week Strip */
        <div className="flex gap-2">
          {/* Week Number */}
          <div 
            className="flex items-center justify-center px-2 rounded-xl"
            style={{ 
              backgroundColor: `${tokens.accent}10`,
              color: tokens.subtle
            }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider">
              W{getWeek(weekStart, { weekStartsOn: 1 })}
            </span>
          </div>

          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const density = getTaskDensity(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDate(day)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.transform = '';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.transform = '';
                  const taskId = e.dataTransfer.getData('taskId');
                  if (taskId && window.rescheduleTask) {
                    window.rescheduleTask(taskId, day);
                  }
                }}
                className={cn(
                  "flex-1 flex flex-col items-center py-3 rounded-2xl transition-all",
                  "hover:scale-105 active:scale-95",
                  isSelected && "ring-2 ring-offset-2"
                )}
                style={{
                  backgroundColor: isSelected ? tokens.accent : isToday ? `${tokens.accent}20` : tokens.card,
                  color: isSelected ? '#FFFFFF' : tokens.color,
                  ringColor: tokens.accent,
                  borderColor: tokens.border
                }}
              >
                <span className="text-xs font-medium opacity-70">
                  {format(day, 'EEE')}
                </span>
                <span className="text-lg font-bold mt-0.5">
                  {format(day, 'd')}
                </span>
                
                {/* Task Density Bar */}
                {density.total > 0 && (
                  <div className="flex gap-0.5 mt-2 h-1.5 w-8 rounded-full overflow-hidden">
                    {density.red > 0 && (
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          backgroundColor: '#EF4444',
                          flex: density.red
                        }}
                      />
                    )}
                    {density.yellow > 0 && (
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          backgroundColor: '#F59E0B',
                          flex: density.yellow
                        }}
                      />
                    )}
                    {density.green > 0 && (
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          backgroundColor: '#10B981',
                          flex: density.green
                        }}
                      />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Expanded Month Grid */
        <div className="space-y-1">
          {/* Day headers */}
          <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: 'auto repeat(7, 1fr)' }}>
            <div className="w-8" />
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div 
                key={day} 
                className="text-center text-xs font-medium py-2"
                style={{ color: tokens.subtle }}
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* 6 weeks grid */}
          {expandedWeeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(7, 1fr)' }}>
              {/* Week Number */}
              <div 
                className="flex items-center justify-center rounded-lg"
                style={{ 
                  backgroundColor: `${tokens.accent}08`,
                  color: tokens.subtle
                }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  W{getWeek(week[0], { weekStartsOn: 1 })}
                </span>
              </div>

              {week.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const density = getTaskDensity(day);
                const currentMonthDate = addDays(new Date(), weekOffset * 7);
                const isCurrentMonth = day.getMonth() === currentMonthDate.getMonth();

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => onSelectDate(day)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${tokens.accent}`;
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.boxShadow = '';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.boxShadow = '';
                      const taskId = e.dataTransfer.getData('taskId');
                      if (taskId && window.rescheduleTask) {
                        window.rescheduleTask(taskId, day);
                      }
                    }}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-xl transition-all",
                      "hover:scale-105 active:scale-95 relative",
                      isSelected && "ring-2 ring-offset-1",
                      !isCurrentMonth && "opacity-30"
                    )}
                    style={{
                      backgroundColor: isSelected ? tokens.accent : isToday ? `${tokens.accent}20` : tokens.card,
                      color: isSelected ? '#FFFFFF' : tokens.color,
                      ringColor: tokens.accent
                    }}
                  >
                    <span className={cn(
                      "text-sm font-semibold",
                      isToday && !isSelected && "font-bold"
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {/* Task Density Dots */}
                    {density.total > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {density.red > 0 && (
                          <div className="w-1 h-1 rounded-full bg-red-500" />
                        )}
                        {density.yellow > 0 && (
                          <div className="w-1 h-1 rounded-full bg-yellow-500" />
                        )}
                        {density.green > 0 && (
                          <div className="w-1 h-1 rounded-full bg-green-500" />
                        )}
                      </div>
                    )}
                    
                    {density.total > 0 && (
                      <span className="text-[10px] mt-0.5 opacity-60">
                        {density.total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Swipe Indicator */}
      <div className="flex justify-center mt-3 pt-2 border-t" style={{ borderColor: tokens.border }}>
        <div 
          className="flex flex-col items-center gap-1 py-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div 
            className="w-8 h-1 rounded-full"
            style={{ backgroundColor: tokens.border }}
          />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: tokens.subtle }}>
            {isExpanded ? '↑ Swipe up to collapse' : '↓ Swipe down to expand'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default RollingCalendarStrip;