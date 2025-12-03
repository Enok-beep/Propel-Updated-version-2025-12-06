import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RollingCalendarStrip } from '@/components/calendar/RollingCalendarStrip';
import { TimeBlockSection, TIME_BLOCKS } from '@/components/calendar/TimeBlockSection';
import { TaskDetailSheet } from '@/components/calendar/TaskDetailSheet';
import { TaskForm } from '@/components/tasks/TaskForm';
import { YearlyCalendarView } from '@/components/calendar/YearlyCalendarView';
import { ExternalEventCard } from '@/components/calendar/ExternalEventCard';
import { TimeDebtDrawer } from '@/components/calendar/TimeDebtDrawer';
import { useCalendarData } from '@/components/calendar/useCalendarData';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, ListTodo, Grid3x3, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { format, isSameDay, parseISO, startOfWeek, differenceInDays } from 'date-fns';
import { useUndo } from '@/components/undo/UndoManager';
import { ConfirmDialog } from '@/components/ui-custom/ConfirmDialog';
import { useKeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';
import { usePullToRefresh } from '@/components/mobile/TouchGestures';
import { usePageTracking } from '@/components/analytics/usePageTracking';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

export default function Calendar() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const { addToUndoStack } = useUndo();
  const scrollContainerRef = useRef(null);
  
  usePageTracking('Calendar');
  const dayRefs = useRef({});
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState('timeblock'); // 'timeblock', 'list', or 'yearly'
  const [dragOverBlock, setDragOverBlock] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [pinchStartDistance, setPinchStartDistance] = useState(null);
  const [pinchStartView, setPinchStartView] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  
  // Scroll to selected date when it changes from calendar tap
  const scrollToDate = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const element = dayRefs.current[dateKey];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle calendar date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    // Update week offset if needed
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const selectedWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekDiff = Math.floor(differenceInDays(selectedWeekStart, weekStart) / 7);
    setWeekOffset(weekDiff);
    // Scroll to that day
    scrollToDate(date);
  };

  // Auto-scroll to today on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToDate(new Date());
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Track scroll position to update selected date
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || viewMode !== 'timeblock') return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      
      // Find which day section is most visible
      let closestDay = null;
      let closestDistance = Infinity;
      
      Object.entries(dayRefs.current).forEach(([dateKey, element]) => {
        if (element) {
          const rect = element.getBoundingClientRect();
          const distance = Math.abs(rect.top - containerTop - 150); // 150px offset for header
          if (distance < closestDistance) {
            closestDistance = distance;
            closestDay = dateKey;
          }
        }
      });
      
      if (closestDay) {
        const newDate = parseISO(closestDay);
        if (!isSameDay(newDate, selectedDate)) {
          setSelectedDate(newDate);
          // Update week offset to keep calendar in sync
          const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          const selectedWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
          const weekDiff = Math.floor(differenceInDays(selectedWeekStart, weekStart) / 7);
          setWeekOffset(weekDiff);
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedDate, viewMode]);

  // Fetch all tasks (optimized limit)
  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch external calendar events
  const { data: externalEvents = [] } = useQuery({
    queryKey: ['externalEvents'],
    queryFn: () => base44.entities.ExternalCalendarEvent.list('-start_time', 50),
    staleTime: 30000,
  });

  // Calendar Logic Layer - Handles all date calculations and data transformation
  const { 
    visibleDays, 
    tasks, 
    tasksByDate, 
    getTasksForDate, 
    getExternalEventsForDate 
  } = useCalendarData(rawTasks, externalEvents);

  // Tasks for selected date (for list view)
  const selectedDateTasks = useMemo(() => getTasksForDate(selectedDate), [getTasksForDate, selectedDate]);

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTask(null);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskForm(false);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (task) => {
      queryClient.setQueryData(['tasks'], (old = []) => old.filter(t => t.id !== task.id));
      addToUndoStack({
        type: 'DELETE_TASK',
        data: task,
        message: `Task "${task.title}" deleted`,
      });
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleDropTask = (taskId, block, date) => {
    const updateData = { time_block: block };
    if (date) {
      updateData.due_date = date.toISOString();
    }
    updateTaskMutation.mutate({
      id: taskId,
      data: updateData
    });
    setDragOverBlock(null);
  };

  const handleCompleteTask = (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTaskMutation.mutate({
      id: task.id,
      data: { 
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      }
    });
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setSelectedTask(null);
    setShowTaskForm(true);
  };

  const handleDeleteTask = (task) => {
    setTaskToDelete(task);
  };

  // Reschedule task from Time Debt drawer
  const rescheduleTask = async (taskId, newDate) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Keep the same time if it exists, just change the date
    let newDateTime = newDate;
    if (task.due_date) {
      const oldDate = typeof task.due_date === 'string' ? parseISO(task.due_date) : task.due_date;
      newDateTime = new Date(newDate);
      newDateTime.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
    }
    
    // Update task and open detail view to adjust time block
    await updateTaskMutation.mutateAsync({
      id: taskId,
      data: { due_date: newDateTime.toISOString() }
    });
    
    // Open task detail view with updated date
    const updatedTask = { ...task, due_date: newDateTime.toISOString() };
    setSelectedTask(updatedTask);
  };

  // Expose reschedule function globally for drag-drop
  useEffect(() => {
    window.rescheduleTask = rescheduleTask;
    window.setDraggingTaskId = setDraggingTaskId;
    return () => { 
      delete window.rescheduleTask;
      delete window.setDraggingTaskId;
    };
  }, [tasks]);

  // Pinch-to-zoom gesture handler - WORKS ON MOBILE TOUCH DEVICES
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || viewMode === 'yearly') return;

    let startDistance = null;
    let startView = null;

    const getTouchDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        startDistance = getTouchDistance(e.touches);
        startView = viewMode;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && startDistance) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        const scale = currentDistance / startDistance;
        
        // Pinch OUT (spread fingers) = ZOOM IN to more detail
        if (scale > 1.2) {
          if (startView === 'list') {
            setViewMode('timeblock');
            startDistance = null;
          }
        }
        // Pinch IN (bring fingers together) = ZOOM OUT to less detail
        else if (scale < 0.8) {
          if (startView === 'timeblock') {
            setViewMode('list');
            startDistance = null;
          } else if (startView === 'list') {
            setViewMode('yearly');
            startDistance = null;
          }
        }
      }
    };

    const handleTouchEnd = () => {
      startDistance = null;
      startView = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [viewMode]);

  const totalTasksToday = Object.values(selectedDateTasks).flat().length;

  const allTasksFlat = useMemo(() => Object.values(selectedDateTasks).flat(), [selectedDateTasks]);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    tasks: allTasksFlat,
    selectedIndex: selectedTaskIndex,
    onSelectTask: (index) => {
      setSelectedTaskIndex(index);
      const task = allTasksFlat[index];
      if (task) setSelectedTask(task);
    },
    onToggleStatus: handleCompleteTask,
    onEditTask: handleEditTask,
    onDeleteTask: handleDeleteTask,
    onNewTask: () => { setEditingTask(null); setShowTaskForm(true); },
    enabled: !showTaskForm && !selectedTask
  });

  // Pull to refresh
  usePullToRefresh({
    onRefresh: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    enabled: true
  });

  return (
    <div 
      className="min-h-screen pb-24 lg:pb-8" 
      style={{ 
        backgroundColor: tokens.bg,
        overflow: showTaskForm || selectedTask ? 'hidden' : 'auto',
        height: showTaskForm || selectedTask ? '100vh' : 'auto'
      }}
    >
      {/* Rolling Calendar Strip - Sticky Top (hidden in yearly/focus mode) */}
      {viewMode !== 'yearly' && !focusMode && (
        <div style={{ position: 'sticky', top: 0, zIndex: 20 }}>
          <RollingCalendarStrip
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            tasksByDate={tasksByDate}
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
          />
        </div>
      )}

      {/* Floating Focus Mode Exit Button */}
      {focusMode && viewMode !== 'yearly' && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed top-4 right-4 z-50 p-3 rounded-full shadow-lg hover:scale-105 transition-all"
          style={{ 
            backgroundColor: tokens.accent,
            color: '#FFFFFF'
          }}
          title="Exit Focus Mode"
        >
          <Eye className="w-5 h-5" />
        </button>
      )}

      {/* Main Content */}
      <div 
        ref={scrollContainerRef}
        className="p-3 sm:p-4 lg:p-6 max-w-6xl mx-auto"
        style={{ 
          height: viewMode !== 'yearly' ? 'calc(100vh - 180px)' : 'calc(100vh - 80px)',
          overflowY: showTaskForm || selectedTask ? 'hidden' : 'auto'
        }}
      >
        {/* Header with View Toggle */}
        {!focusMode && (
          <div className="flex items-center justify-between mb-6 sticky top-0 z-10 py-2 -mt-2"
            style={{ backgroundColor: tokens.bg }}
          >
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div 
                className="flex rounded-xl p-1 border"
                style={{ borderColor: tokens.border }}
              >
                <button
                  onClick={() => setViewMode('timeblock')}
                  className={cn("p-2 rounded-lg transition-all")}
                  style={{
                    backgroundColor: viewMode === 'timeblock' ? tokens.accent : 'transparent',
                    color: viewMode === 'timeblock' ? '#FFFFFF' : tokens.subtle
                  }}
                  title="Time Block View (Most Detail)"
                >
                  <CalendarIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn("p-2 rounded-lg transition-all")}
                  style={{
                    backgroundColor: viewMode === 'list' ? tokens.accent : 'transparent',
                    color: viewMode === 'list' ? '#FFFFFF' : tokens.subtle
                  }}
                  title="List View (Medium Detail)"
                >
                  <ListTodo className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('yearly')}
                  className={cn("p-2 rounded-lg transition-all")}
                  style={{
                    backgroundColor: viewMode === 'yearly' ? tokens.accent : 'transparent',
                    color: viewMode === 'yearly' ? '#FFFFFF' : tokens.subtle
                  }}
                  title="Yearly View (Least Detail)"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
              </div>

              {/* Pinch Gesture Hint - Only on mobile */}
              {viewMode !== 'yearly' && (
                <div className="lg:hidden text-xs px-2 py-1 rounded-lg" style={{ color: tokens.subtle }}>
                  🤏 Pinch to zoom
                </div>
              )}

              {/* Focus Mode Toggle */}
              {viewMode !== 'yearly' && (
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className={cn("p-2 rounded-lg transition-all border")}
                  style={{
                    backgroundColor: focusMode ? tokens.accent : 'transparent',
                    color: focusMode ? '#FFFFFF' : tokens.subtle,
                    borderColor: tokens.border
                  }}
                  title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
                >
                  {focusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Year selector for yearly view */}
              {viewMode === 'yearly' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: tokens.card,
                    borderColor: tokens.border,
                    color: tokens.color
                  }}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              )}

              <Button
                onClick={() => { setEditingTask(null); setShowTaskForm(true); }}
                style={{ backgroundColor: tokens.accent }}
                className="text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        )}

        {/* Yearly Calendar View */}
        {viewMode === 'yearly' ? (
          <YearlyCalendarView
            year={selectedYear}
            tasks={tasks}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setViewMode('timeblock');
              setTimeout(() => scrollToDate(date), 100);
            }}
          />
        ) : viewMode === 'timeblock' ? (
          <div className="space-y-8">
            {visibleDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTasks = getTasksForDate(day);
              const totalDayTasks = Object.values(dayTasks).flat().length;
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);
              
              return (
                <div 
                  key={dateKey}
                  ref={(el) => dayRefs.current[dateKey] = el}
                  className={cn(
                    "scroll-mt-20 rounded-3xl p-4 transition-all",
                    isSelected && "ring-2 ring-offset-2"
                  )}
                  style={{
                    backgroundColor: isSelected ? `${tokens.accent}08` : 'transparent',
                    ringColor: tokens.accent
                  }}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 
                        className="text-xl font-bold"
                        style={{ color: tokens.color }}
                      >
                        {isToday ? 'Today' : format(day, 'EEEE')}
                      </h2>
                      <p className="text-sm" style={{ color: tokens.subtle }}>
                        {format(day, 'MMMM d, yyyy')} • {totalDayTasks} tasks
                      </p>
                    </div>
                    {isToday && (
                      <div 
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: tokens.accent, color: '#FFFFFF' }}
                      >
                        Today
                      </div>
                    )}
                  </div>

                  {/* External Events */}
                  {getExternalEventsForDate(day).length > 0 && (
                    <div className="mb-4 space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: tokens.subtle }}>
                        <ExternalLink className="w-4 h-4" />
                        External Calendar Events
                      </h3>
                      {getExternalEventsForDate(day).map(event => (
                        <ExternalEventCard 
                          key={event.id} 
                          event={event}
                          onClick={() => {}}
                          compact
                        />
                      ))}
                    </div>
                  )}

                  {/* Time Blocks for this day */}
                  <div className="space-y-3">
                    {TIME_BLOCKS.map((block) => (
                      <TimeBlockSection
                        key={`${dateKey}-${block.id}`}
                        block={block.id}
                        tasks={dayTasks[block.id] || []}
                        onDropTask={(taskId, blockId) => handleDropTask(taskId, blockId, day)}
                        onTaskClick={setSelectedTask}
                        isDragOver={dragOverBlock === `${dateKey}-${block.id}`}
                        compact={totalDayTasks === 0}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View - grouped by priority color */
          <div className="space-y-6">
            {/* High Priority / Red */}
            {selectedDateTasks.morning.concat(selectedDateTasks.midday, selectedDateTasks.evening, selectedDateTasks.night)
              .filter(t => t.priority === 'urgent' || t.priority === 'high').length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="font-medium" style={{ color: tokens.color }}>
                    High Priority
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.values(selectedDateTasks).flat()
                    .filter(t => t.priority === 'urgent' || t.priority === 'high')
                    .map(task => (
                      <TaskListItem 
                        key={task.id} 
                        task={task} 
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Medium Priority / Yellow */}
            {Object.values(selectedDateTasks).flat()
              .filter(t => t.priority === 'medium').length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="font-medium" style={{ color: tokens.color }}>
                    Medium Priority
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.values(selectedDateTasks).flat()
                    .filter(t => t.priority === 'medium')
                    .map(task => (
                      <TaskListItem 
                        key={task.id} 
                        task={task} 
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Low Priority / Green */}
            {Object.values(selectedDateTasks).flat()
              .filter(t => t.priority === 'low' || t.status === 'done').length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-medium" style={{ color: tokens.color }}>
                    Low Priority / Done
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.values(selectedDateTasks).flat()
                    .filter(t => t.priority === 'low' || t.status === 'done')
                    .map(task => (
                      <TaskListItem 
                        key={task.id} 
                        task={task} 
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                </div>
              </div>
            )}

            {totalTasksToday === 0 && (
              <div 
                className="text-center py-16"
                style={{ color: tokens.subtle }}
              >
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks scheduled for this day</p>
                <Button
                  onClick={() => setShowTaskForm(true)}
                  variant="outline"
                  className="mt-4"
                  style={{ borderColor: tokens.border }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Detail Sheet */}
      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onComplete={handleCompleteTask}
          isBeingDragged={draggingTaskId === selectedTask.id}
        />
      )}

      {/* Task Form Dialog with Backdrop */}
      {showTaskForm && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => {
              setShowTaskForm(false);
              setEditingTask(null);
            }}
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: tokens.card }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold" style={{ color: tokens.color }}>
                    {editingTask ? 'Edit Task' : 'Add Task'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowTaskForm(false);
                      setEditingTask(null);
                    }}
                    className="p-2 rounded-lg hover:bg-black/5"
                    style={{ color: tokens.subtle }}
                  >
                    ✕
                  </button>
                </div>
                <TaskForm
                  task={editingTask ? { ...editingTask, due_date: selectedDate } : { due_date: selectedDate }}
                  onSubmit={(data) => {
                    if (editingTask) {
                      updateTaskMutation.mutate({ id: editingTask.id, data });
                    } else {
                      createTaskMutation.mutate(data);
                    }
                    setShowTaskForm(false);
                    setEditingTask(null);
                  }}
                  onCancel={() => {
                    setShowTaskForm(false);
                    setEditingTask(null);
                  }}
                  isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Time Debt Drawer */}
      <TimeDebtDrawer 
        tasks={tasks}
        onTaskClick={setSelectedTask}
        onDragStart={(taskId) => setDraggingTaskId(taskId)}
        onDragEnd={() => setDraggingTaskId(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="Delete Task"
        description={`Are you sure you want to delete "${taskToDelete?.title}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (taskToDelete) {
            deleteTaskMutation.mutate(taskToDelete);
            setTaskToDelete(null);
            setSelectedTask(null);
          }
        }}
      />
    </div>
  );
}

function TaskListItem({ task, onClick }) {
  const { tokens } = useTheme();
  
  const priorityColors = {
    urgent: '#DC2626',
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981'
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-2xl border text-left",
        "hover:scale-[1.01] transition-all",
        task.status === 'done' && "opacity-60"
      )}
      style={{
        backgroundColor: tokens.card,
        borderColor: tokens.border
      }}
    >
      <div 
        className="w-1.5 h-10 rounded-full"
        style={{ backgroundColor: priorityColors[task.priority] }}
      />
      <div className="flex-1 min-w-0">
        <div 
          className={cn(
            "font-medium truncate",
            task.status === 'done' && "line-through"
          )}
          style={{ color: tokens.color }}
        >
          {task.title}
        </div>
        <div className="text-sm" style={{ color: tokens.subtle }}>
          {task.category} • {task.estimated_minutes || 25} min
        </div>
      </div>
      {task.due_date && (
        <div className="text-sm" style={{ color: tokens.subtle }}>
          {format(new Date(task.due_date), 'h:mm a')}
        </div>
      )}
    </button>
  );
}