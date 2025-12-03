import { useMemo } from 'react';
import { format, isSameDay, parseISO, addDays } from 'date-fns';
import { getTasksWithRecurring } from '@/components/tasks/RecurringTaskHelper';

/**
 * Calendar Data Service Hook
 * Handles all complex date logic, recurrence expansion, and time-block grouping
 * Decouples business logic from presentation components
 */
export function useCalendarData(rawTasks, externalEvents = []) {
  /**
   * Generate visible date range (1 week before + 3 months after)
   */
  const visibleDays = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = -7; i <= 90; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, []);

  /**
   * Expand recurring tasks for the visible range
   */
  const tasks = useMemo(() => {
    const today = new Date();
    const startDate = addDays(today, -7);
    const endDate = addDays(today, 90);
    return getTasksWithRecurring(rawTasks, startDate, endDate);
  }, [rawTasks]);

  /**
   * Group tasks by date for calendar density indicators
   */
  const tasksByDate = useMemo(() => {
    const grouped = {};
    tasks.forEach(task => {
      if (task.due_date) {
        const dateKey = format(parseISO(task.due_date), 'yyyy-MM-dd');
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  /**
   * Group tasks by time blocks for a specific date
   * Time blocks: morning (6-12), midday (12-17), evening (17-21), night (21-6)
   */
  const getTasksForDate = useMemo(() => {
    return (date) => {
      const dayTasks = tasks.filter(task => {
        if (!task.due_date) return false;
        return isSameDay(parseISO(task.due_date), date);
      });

      const grouped = {
        morning: [],
        midday: [],
        evening: [],
        night: [],
        unscheduled: []
      };

      dayTasks.forEach(task => {
        if (task.time_block) {
          grouped[task.time_block]?.push(task) || grouped.unscheduled.push(task);
        } else if (task.due_date) {
          const hour = new Date(task.due_date).getHours();
          if (hour >= 6 && hour < 12) grouped.morning.push(task);
          else if (hour >= 12 && hour < 17) grouped.midday.push(task);
          else if (hour >= 17 && hour < 21) grouped.evening.push(task);
          else grouped.night.push(task);
        } else {
          grouped.unscheduled.push(task);
        }
      });

      // Sort by priority within each block
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      Object.values(grouped).forEach(arr => {
        arr.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      });

      return grouped;
    };
  }, [tasks]);

  /**
   * Get external calendar events for a specific date
   */
  const getExternalEventsForDate = useMemo(() => {
    return (date) => {
      return externalEvents.filter(event => {
        if (!event.start_time) return false;
        return isSameDay(parseISO(event.start_time), date);
      });
    };
  }, [externalEvents]);

  return {
    visibleDays,
    tasks,
    tasksByDate,
    getTasksForDate,
    getExternalEventsForDate
  };
}

export default useCalendarData;