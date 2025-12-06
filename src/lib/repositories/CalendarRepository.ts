import { supabase } from '../supabase';

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: 'google' | 'apple' | 'outlook';
  access_token: string;
  refresh_token?: string;
  token_expiry?: string;
  calendar_id?: string;
  calendar_name?: string;
  is_primary: boolean;
  sync_enabled: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalEvent {
  id: string;
  connection_id: string;
  user_id: string;
  external_event_id: string;
  title?: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees?: any[];
  is_all_day: boolean;
  recurrence_rule?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  raw_data?: any;
}

export class CalendarRepository {
  // Get all calendar connections for current user
  static async listConnections(): Promise<CalendarConnection[]> {
    const { data, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Add a new calendar connection
  static async createConnection(connection: Omit<CalendarConnection, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('calendar_connections')
      .insert({ ...connection, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update calendar connection
  static async updateConnection(id: string, updates: Partial<CalendarConnection>) {
    const { data, error } = await supabase
      .from('calendar_connections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete calendar connection
  static async deleteConnection(id: string) {
    const { error } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Get external events for a date range
  static async getEvents(startDate: string, endDate: string): Promise<ExternalEvent[]> {
    const { data, error } = await supabase
      .from('external_events')
      .select('*')
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Trigger calendar sync (calls Edge Function)
  static async syncCalendar(connectionId: string) {
    const { data, error } = await supabase.functions.invoke('calendar-sync', {
      body: { connection_id: connectionId }
    });

    if (error) throw error;
    return data;
  }
}
