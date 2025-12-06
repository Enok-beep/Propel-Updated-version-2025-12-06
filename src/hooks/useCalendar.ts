import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarRepository, type CalendarConnection } from '@/lib/repositories/CalendarRepository';
import { toast } from 'sonner';

/**
 * Fetch calendar connections
 */
export function useCalendarConnections() {
  return useQuery({
    queryKey: ['calendar', 'connections'],
    queryFn: () => CalendarRepository.listConnections(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create calendar connection
 */
export function useCreateCalendarConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connection: Omit<CalendarConnection, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      CalendarRepository.createConnection(connection),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'connections'] });
      toast.success('Calendar connected successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to connect calendar');
    },
  });
}

/**
 * Update calendar connection
 */
export function useUpdateCalendarConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CalendarConnection> }) =>
      CalendarRepository.updateConnection(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'connections'] });
      toast.success('Calendar connection updated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update calendar connection');
    },
  });
}

/**
 * Delete calendar connection
 */
export function useDeleteCalendarConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CalendarRepository.deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'connections'] });
      queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] });
      toast.success('Calendar disconnected!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to disconnect calendar');
    },
  });
}

/**
 * Fetch external calendar events
 */
export function useCalendarEvents(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['calendar', 'events', startDate, endDate],
    queryFn: () => CalendarRepository.getEvents(startDate, endDate),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Sync calendar
 */
export function useSyncCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => CalendarRepository.syncCalendar(connectionId),
    onMutate: () => {
      toast.loading('Syncing calendar...', { id: 'calendar-sync' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar', 'connections'] });
      toast.success('Calendar synced successfully!', { id: 'calendar-sync' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sync calendar', { id: 'calendar-sync' });
    },
  });
}
