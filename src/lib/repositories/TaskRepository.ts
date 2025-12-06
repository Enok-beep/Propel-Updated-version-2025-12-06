import { supabase, type Database } from '../supabase';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export class TaskRepository {
  /**
   * Get all tasks for the current user
   */
  static async list(orderBy: keyof Task = 'created_at', limit = 100): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order(orderBy, { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get tasks filtered by status
   */
  static async listByStatus(status: Task['status']): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single task by ID
   */
  static async getById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  /**
   * Create a new task
   */
  static async create(task: TaskInsert): Promise<Task> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an existing task
   */
  static async update(id: string, updates: TaskUpdate): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a task
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Bulk update tasks (for bulk operations)
   */
  static async bulkUpdate(ids: string[], updates: TaskUpdate): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .in('id', ids)
      .select();

    if (error) throw error;
    return data || [];
  }

  /**
   * Get tasks due today
   */
  static async getDueToday(): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString())
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Search tasks by title or description
   */
  static async search(query: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Subscribe to real-time task changes
   */
  static subscribe(callback: (payload: any) => void) {
    return supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        callback
      )
      .subscribe();
  }
}
