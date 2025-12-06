import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskRepository } from '@/lib/repositories/TaskRepository';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

/**
 * Fetch all tasks
 */
export function useTasks(orderBy?: keyof Task, limit = 100) {
  return useQuery({
    queryKey: ['tasks', orderBy, limit],
    queryFn: () => TaskRepository.list(orderBy, limit),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch tasks by status
 */
export function useTasksByStatus(status: Task['status']) {
  return useQuery({
    queryKey: ['tasks', 'status', status],
    queryFn: () => TaskRepository.listByStatus(status),
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch single task
 */
export function useTask(id: string | null) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => id ? TaskRepository.getById(id) : null,
    enabled: !!id,
  });
}

/**
 * Create task mutation
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: TaskInsert) => TaskRepository.create(task),
    onSuccess: () => {
      // Invalidate and refetch tasks
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create task');
    },
  });
}

/**
 * Update task mutation
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TaskUpdate }) =>
      TaskRepository.update(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically update
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((task) => (task.id === id ? { ...task, ...updates } : task))
      );

      return { previousTasks };
    },
    onError: (error: any, _variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast.error(error.message || 'Failed to update task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated!');
    },
  });
}

/**
 * Delete task mutation
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TaskRepository.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically remove from list
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.filter((task) => task.id !== id)
      );

      return { previousTasks };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast.error(error.message || 'Failed to delete task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted!');
    },
  });
}

/**
 * Bulk update tasks
 */
export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: TaskUpdate }) =>
      TaskRepository.bulkUpdate(ids, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tasks updated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update tasks');
    },
  });
}

/**
 * Search tasks
 */
export function useSearchTasks(query: string) {
  return useQuery({
    queryKey: ['tasks', 'search', query],
    queryFn: () => TaskRepository.search(query),
    enabled: query.length > 2, // Only search if query is 3+ chars
  });
}
