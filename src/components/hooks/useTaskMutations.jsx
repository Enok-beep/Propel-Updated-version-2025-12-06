import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useAnalytics, EVENTS } from '../analytics/AnalyticsProvider';
import { notifyTaskAssignment, notifyStatusChange } from '../notifications/NotificationService';
import { useUndo } from '../undo/UndoManager';
import type { Task, TaskSubmission, User } from '../types/task.types';

interface UpdateTaskParams {
  id: string;
  data: Partial<Task>;
  previousData?: Partial<Task>;
}

/**
 * Centralized task mutations hook with TypeScript
 * Eliminates duplication across Dashboard and Tasks pages
 */
export function useTaskMutations(user?: User | null) {
  const queryClient = useQueryClient();
  const { trackEvent } = useAnalytics();
  const { addToUndoStack } = useUndo();

  const createTaskMutation = useMutation({
    mutationFn: async (submission: TaskSubmission) => {
      const taskData = submission.taskData;
      
      trackEvent(EVENTS.TASK_CREATED, {
        priority: taskData.priority,
        category: taskData.category,
      });
      
      const task = await base44.entities.Task.create(taskData);
      
      // Send notification if assigned
      if (task.assigned_to && task.assigned_to !== user?.email) {
        await notifyTaskAssignment(task, task.assigned_to, user?.email);
      }
      
      // Create attachments
      if (submission.attachments?.length) {
        await Promise.all(
          submission.attachments.map(att =>
            base44.entities.Attachment.create({
              task_id: task.id,
              ...att,
              uploaded_by: user?.email
            })
          )
        );
      }

      // Create sub-tasks
      if (submission.subTasks?.length) {
        await Promise.all(
          submission.subTasks.map(subTask =>
            base44.entities.Task.create({
              ...subTask,
              parent_task_id: task.id,
              status: 'todo'
            })
          )
        );
      }

      return task;
    },
    onMutate: async (submission: TaskSubmission) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      queryClient.setQueryData<Task[]>(['tasks'], (old = []) => [
        {
          id: `temp-${Date.now()}`,
          ...submission.taskData,
          created_date: new Date().toISOString(),
          created_by: user?.email || '',
        } as Task,
        ...old
      ]);

      return { previousTasks };
    },
    onError: (error: Error, submission: TaskSubmission, context: any) => {
      queryClient.setQueryData(['tasks'], context.previousTasks);
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    },
    onSuccess: () => {
      toast.success('Task created successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: UpdateTaskParams) => 
      base44.entities.Task.update(id, data),
    onMutate: async ({ id, data }: UpdateTaskParams) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map(task => task.id === id ? { ...task, ...data } : task)
      );

      return { previousTasks };
    },
    onError: (error: Error, variables: UpdateTaskParams, context: any) => {
      queryClient.setQueryData(['tasks'], context.previousTasks);
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    },
    onSuccess: async (updatedTask: Task, { data, previousData }: UpdateTaskParams) => {
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
      
      // Send notifications
      if (previousData?.status && data.status && previousData.status !== data.status) {
        const fullTask = { ...updatedTask, ...data };
        await notifyStatusChange(fullTask, previousData.status, data.status, user?.email);
      }
      
      if (data.assigned_to && previousData?.assigned_to !== data.assigned_to) {
        const fullTask = { ...updatedTask, ...data };
        await notifyTaskAssignment(fullTask, data.assigned_to, user?.email);
      }
      
      toast.success('Task updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (task: Task) => {
      trackEvent(EVENTS.TASK_DELETED, {
        priority: task.priority,
        category: task.category,
      });
      
      // Optimistically remove from UI
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) => 
        old.filter(t => t.id !== task.id)
      );
      
      // Add to undo stack
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

  return {
    createTask: createTaskMutation,
    updateTask: updateTaskMutation,
    deleteTask: deleteTaskMutation,
  };
}

export default useTaskMutations;