import React, { useState, useMemo } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskDetailSheet } from '@/components/calendar/TaskDetailSheet';
import { TaskDependencyGraph } from '@/components/tasks/TaskDependencyGraph';
import { MindMapView } from '@/components/tasks/MindMapView';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { getTasksWithRecurring } from '@/components/tasks/RecurringTaskHelper';
import { ListSkeleton } from '@/components/ui-custom/LoadingSkeleton';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui-custom/ConfirmDialog';
import { useUndo } from '@/components/undo/UndoManager';
import { BulkTaskActions } from '@/components/tasks/BulkTaskActions';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addDays } from 'date-fns';
import { 
  Plus, Search, Filter, SortAsc, 
  CheckCircle2, Circle, Clock, GitBranch
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { notifyTaskAssignment, notifyStatusChange } from '../components/notifications/NotificationService';
import { useKeyboardShortcuts } from '../components/keyboard/KeyboardShortcuts';
import { usePullToRefresh } from '../components/mobile/TouchGestures';
import { usePageTracking } from '../components/analytics/usePageTracking';
import { useAnalytics, EVENTS } from '../components/analytics/AnalyticsProvider';

export default function Tasks() {
  const { tokens } = useTheme();
  const { trackEvent } = useAnalytics();
  const queryClient = useQueryClient();
  const { addToUndoStack } = useUndo();
  
  usePageTracking('Tasks');
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortBy, setSortBy] = useState('created');
  const [activeTab, setActiveTab] = useState('todo');
  const [activeView, setActiveView] = useState('list');
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);

  // Fetch tasks and generate recurring instances
  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const tasks = useMemo(() => {
    const today = new Date();
    const endDate = addDays(today, 90); // Show recurring tasks for next 3 months
    return getTasksWithRecurring(rawTasks, today, endDate);
  }, [rawTasks]);

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (submission) => {
      const taskData = submission.taskData || submission;
      const createdTask = await base44.entities.Task.create(taskData);
      
      // Send notification if task is assigned to someone
      if (createdTask.assigned_to && createdTask.assigned_to !== user?.email) {
        await notifyTaskAssignment(createdTask, createdTask.assigned_to, user?.email);
      }
      
      // Create attachments
      if (submission.attachments?.length > 0) {
        await Promise.all(
          submission.attachments.map(att =>
            base44.entities.Attachment.create({
              task_id: createdTask.id,
              ...att,
              uploaded_by: user?.email
            })
          )
        );
      }
      
      // Create sub-tasks if any
      const subTasks = submission.subTasks || submission.subTasks;
      if (subTasks && subTasks.length > 0) {
        const subTaskPromises = subTasks.map(st =>
          base44.entities.Task.create({
            title: st.title,
            parent_task_id: createdTask.id,
            team_id: taskData.team_id,
            project_id: taskData.project_id,
            priority: st.priority,
            estimated_minutes: st.estimated_minutes,
            status: 'todo'
          })
        );
        await Promise.all(subTaskPromises);
      }
      
      return createdTask;
    },
    onMutate: async (submission) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);

      queryClient.setQueryData(['tasks'], (old = []) => [
        {
          id: `temp-${Date.now()}`,
          ...(submission.taskData || submission),
          created_date: new Date().toISOString(),
        },
        ...old
      ]);

      return { previousTasks };
    },
    onError: (error, submission, context) => {
      queryClient.setQueryData(['tasks'], context.previousTasks);
      toast.error('Failed to create task');
    },
    onSuccess: () => {
      setShowTaskForm(false);
      toast.success('Task created successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data, previousData }) => base44.entities.Task.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);

      queryClient.setQueryData(['tasks'], (old = []) =>
        old.map(task => task.id === id ? { ...task, ...data } : task)
      );

      return { previousTasks };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['tasks'], context.previousTasks);
      toast.error('Failed to update task');
    },
    onSuccess: async (updatedTask, { data, previousData }) => {
      trackEvent(EVENTS.TASK_EDITED, {
        priority: data.priority,
        status: data.status,
      });
      
      if (data.status === 'done') {
        trackEvent(EVENTS.TASK_COMPLETED, {
          priority: data.priority,
          category: data.category,
        });
      }
      
      // Send notifications for status changes
      if (previousData?.status && data.status && previousData.status !== data.status) {
        const fullTask = { ...updatedTask, ...data };
        await notifyStatusChange(fullTask, previousData.status, data.status, user?.email);
      }
      
      // Send notification for new assignment
      if (data.assigned_to && previousData?.assigned_to !== data.assigned_to) {
        const fullTask = { ...updatedTask, ...data };
        await notifyTaskAssignment(fullTask, data.assigned_to, user?.email);
      }
      
      setEditingTask(null);
      setShowTaskForm(false);
      toast.success('Task updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (task) => {
      // Optimistically remove from UI
      queryClient.setQueryData(['tasks'], (old = []) => old.filter(t => t.id !== task.id));
      
      // Add to undo stack instead of deleting immediately
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

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // Filter by status/tab
    if (activeTab === 'todo') {
      result = result.filter(t => t.status !== 'done');
    } else if (activeTab === 'done') {
      result = result.filter(t => t.status === 'done');
    }
    
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }
    
    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter(t => t.category === filterCategory);
    }
    
    // Priority filter
    if (filterPriority !== 'all') {
      result = result.filter(t => t.priority === filterPriority);
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'due':
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        case 'energy':
          const energyOrder = { high: 0, medium: 1, low: 2 };
          return energyOrder[a.energy_level] - energyOrder[b.energy_level];
        default:
          return new Date(b.created_date) - new Date(a.created_date);
      }
    });
    
    return result;
  }, [tasks, activeTab, searchQuery, filterCategory, filterPriority, sortBy]);

  const handleToggleStatus = (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTaskMutation.mutate({
      id: task.id,
      data: { 
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      },
      previousData: { status: task.status }
    });
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setSelectedTask(null);
    setShowTaskForm(true);
  };

  const handleDelete = (task) => {
    setTaskToDelete(task);
  };

  const handleCompleteTask = (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTaskMutation.mutate({
      id: task.id,
      data: { 
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      },
      previousData: { status: task.status }
    });
  };

  const handleReorder = (sourceIndex, destIndex) => {
    // Reorder logic - update order field
    const reorderedTasks = [...filteredTasks];
    const [removed] = reorderedTasks.splice(sourceIndex, 1);
    reorderedTasks.splice(destIndex, 0, removed);
    
    // Update order for affected tasks
    reorderedTasks.forEach((task, index) => {
      if (task.order !== index) {
        updateTaskMutation.mutate({ id: task.id, data: { order: index } });
      }
    });
  };

  const todoCount = tasks.filter(t => t.status !== 'done').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    tasks: filteredTasks,
    selectedIndex: selectedTaskIndex,
    onSelectTask: (index) => {
      setSelectedTaskIndex(index);
      const task = filteredTasks[index];
      if (task) setSelectedTask(task);
    },
    onToggleStatus: handleToggleStatus,
    onEditTask: handleEdit,
    onDeleteTask: handleDelete,
    onNewTask: () => { setEditingTask(null); setShowTaskForm(true); },
    enabled: !showTaskForm && !selectedTask
  });

  // Pull to refresh
  usePullToRefresh({
    onRefresh: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    enabled: true
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3">
        <h1 
          className="text-3xl font-bold tracking-tight"
          style={{ color: tokens.color }}
        >
          Tasks
        </h1>
        <div className="flex items-center gap-2">
          {activeView === 'list' && (
            <Button
              variant={bulkSelectMode ? "outline" : "ghost"}
              size="sm"
              onClick={() => {
                setBulkSelectMode(!bulkSelectMode);
                setSelectedTaskIds([]);
              }}
              style={{ borderColor: bulkSelectMode ? tokens.accent : tokens.border }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {bulkSelectMode ? 'Cancel' : 'Select'}
            </Button>
          )}
          <Button
            onClick={() => { setEditingTask(null); setShowTaskForm(true); }}
            style={{ backgroundColor: tokens.accent }}
            className="text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: tokens.subtle }} 
          />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            style={{ 
              backgroundColor: tokens.card,
              borderColor: tokens.border,
              color: tokens.color
            }}
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger 
              className="w-32"
              style={{ borderColor: tokens.border }}
            >
              <Filter className="w-4 h-4 mr-2" style={{ color: tokens.subtle }} />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="work">💼 Work</SelectItem>
              <SelectItem value="personal">🏠 Personal</SelectItem>
              <SelectItem value="health">💪 Health</SelectItem>
              <SelectItem value="learning">📚 Learning</SelectItem>
              <SelectItem value="errands">🛒 Errands</SelectItem>
              <SelectItem value="creative">🎨 Creative</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger 
              className="w-32"
              style={{ borderColor: tokens.border }}
            >
              <SortAsc className="w-4 h-4 mr-2" style={{ color: tokens.subtle }} />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Newest</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="due">Due Date</SelectItem>
              <SelectItem value="energy">Energy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="mb-6">
        <TabsList style={{ backgroundColor: tokens.card }}>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="dependency">Dependencies</TabsTrigger>
          <TabsTrigger value="mindmap">Mind Map</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          {/* Status Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList 
              className="w-full grid grid-cols-2"
              style={{ backgroundColor: tokens.card }}
            >
              <TabsTrigger value="todo" className="flex items-center gap-2">
                <Circle className="w-4 h-4" />
                To Do ({todoCount})
              </TabsTrigger>
              <TabsTrigger value="done" className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Done ({doneCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Task List */}
          {isLoading ? (
            <ListSkeleton items={5} />
          ) : bulkSelectMode ? (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
              <Checkbox
                checked={selectedTaskIds.includes(task.id)}
                onCheckedChange={(checked) => {
                  setSelectedTaskIds(prev =>
                    checked
                      ? [...prev, task.id]
                      : prev.filter(id => id !== task.id)
                  );
                }}
              />
              <div className="flex-1" style={{ color: tokens.color }}>
                {task.title}
              </div>
              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: `${tokens.accent}20`, color: tokens.accent }}>
                {task.priority}
              </span>
            </div>
          ))}
        </div>
          ) : (
            <TaskList
              tasks={filteredTasks}
              onToggleStatus={handleToggleStatus}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTaskClick={setSelectedTask}
              onReorder={handleReorder}
              emptyMessage={activeTab === 'done' ? "No completed tasks yet" : "No tasks to do"}
            />
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <KanbanBoard 
            tasks={filteredTasks}
            onTaskClick={(task) => setSelectedTask(task)}
            onTaskCreate={() => { setEditingTask(null); setShowTaskForm(true); }}
          />
        </TabsContent>

        <TabsContent value="dependency" className="mt-6">
          <TaskDependencyGraph 
            tasks={tasks} 
            onTaskClick={(task) => setSelectedTask(task)}
          />
        </TabsContent>

        <TabsContent value="mindmap" className="mt-6">
          <MindMapView 
            tasks={tasks} 
            onTaskClick={(task) => setSelectedTask(task)}
          />
        </TabsContent>
      </Tabs>

      {/* Task Form Dialog */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent 
          className="max-w-lg max-h-[85vh] overflow-y-auto"
          style={{ backgroundColor: tokens.card, borderColor: tokens.border }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: tokens.color }}>
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            onSubmit={(submission) => {
              if (editingTask) {
                updateTaskMutation.mutate({ 
                  id: editingTask.id, 
                  data: submission.taskData || submission,
                  previousData: editingTask
                });
              } else {
                createTaskMutation.mutate(submission);
              }
            }}
            onCancel={() => setShowTaskForm(false)}
            isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Task Detail Sheet */}
      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onEdit={handleEdit}
          onDelete={() => handleDelete(selectedTask.id)}
          onComplete={handleCompleteTask}
        />
      )}

      {/* Bulk Actions */}
      <BulkTaskActions
        selectedTasks={selectedTaskIds}
        onClear={() => {
          setSelectedTaskIds([]);
          setBulkSelectMode(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="Delete Task"
        description={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
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