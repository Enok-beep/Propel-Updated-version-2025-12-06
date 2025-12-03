import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, parseISO } from 'date-fns';

/**
 * Generate recurring task instances from a parent task
 * @param {Object} parentTask - The recurring task template
 * @param {Date} startDate - Start date for generating instances
 * @param {Date} endDate - End date for generating instances
 * @returns {Array} Array of task instances
 */
export function generateRecurringInstances(parentTask, startDate, endDate) {
  if (!parentTask.is_recurring || !parentTask.due_date) {
    return [];
  }

  const instances = [];
  const taskStartDate = parseISO(parentTask.due_date);
  let currentDate = new Date(taskStartDate);
  let occurrenceCount = 0;

  const hasEndDate = parentTask.recurrence_end_date;
  const hasCount = parentTask.recurrence_count;
  const recurrenceEndDate = hasEndDate ? parseISO(parentTask.recurrence_end_date) : null;

  while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
    // Check if we've reached the end condition
    if (hasEndDate && isAfter(currentDate, recurrenceEndDate)) break;
    if (hasCount && occurrenceCount >= parentTask.recurrence_count) break;

    // Only include if within the requested range
    if (
      (isAfter(currentDate, startDate) || currentDate.getTime() === startDate.getTime()) &&
      (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime())
    ) {
      instances.push({
        ...parentTask,
        id: `${parentTask.id}_occurrence_${currentDate.getTime()}`,
        due_date: currentDate.toISOString(),
        parent_recurring_task_id: parentTask.id,
        is_recurring: false, // Instances themselves are not recurring
        status: 'todo', // Reset status for each instance
        completed_at: null,
      });
    }

    // Calculate next occurrence
    const interval = parentTask.recurrence_interval || 1;
    switch (parentTask.recurrence_pattern) {
      case 'daily':
        currentDate = addDays(currentDate, interval);
        break;
      case 'weekly':
        currentDate = addWeeks(currentDate, interval);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, interval);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, interval);
        break;
      default:
        return instances;
    }

    occurrenceCount++;

    // Safety limit to prevent infinite loops
    if (occurrenceCount > 1000) break;
  }

  return instances;
}

/**
 * Get all tasks including recurring instances for a date range
 * @param {Array} tasks - All tasks from database
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @returns {Array} All tasks including generated recurring instances
 */
export function getTasksWithRecurring(tasks, startDate, endDate) {
  const recurringTasks = tasks.filter(t => t.is_recurring && !t.parent_recurring_task_id);
  const nonRecurringTasks = tasks.filter(t => !t.is_recurring || t.parent_recurring_task_id);

  const recurringInstances = recurringTasks.flatMap(task => 
    generateRecurringInstances(task, startDate, endDate)
  );

  return [...nonRecurringTasks, ...recurringInstances];
}

export default { generateRecurringInstances, getTasksWithRecurring };