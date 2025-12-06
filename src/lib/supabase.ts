import { createClient } from '@supabase/supabase-js';

// Get these from your Supabase dashboard → Settings → API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Complete TypeScript types for all tables
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          description: string | null;
          status: 'todo' | 'in_progress' | 'done' | 'archived';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          due_date: string | null;
          project_id: string | null;
          team_id: string | null;
          assigned_to: string | null;
          tags: string[] | null;
          energy_level: number | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title?: string | null;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'done' | 'archived';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          due_date?: string | null;
          project_id?: string | null;
          team_id?: string | null;
          assigned_to?: string | null;
          tags?: string[] | null;
          energy_level?: number | null;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          owner_id: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      calendar_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: 'google' | 'apple' | 'outlook';
          access_token: string;
          refresh_token: string | null;
          token_expiry: string | null;
          calendar_id: string | null;
          calendar_name: string | null;
          is_primary: boolean;
          sync_enabled: boolean;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          provider: 'google' | 'apple' | 'outlook';
          access_token: string;
          refresh_token?: string | null;
          token_expiry?: string | null;
          calendar_id?: string | null;
          calendar_name?: string | null;
          is_primary?: boolean;
          sync_enabled?: boolean;
        };
        Update: Partial<Database['public']['Tables']['calendar_connections']['Insert']>;
      };
      external_events: {
        Row: {
          id: string;
          connection_id: string;
          user_id: string;
          external_event_id: string;
          title: string | null;
          description: string | null;
          start_time: string;
          end_time: string;
          location: string | null;
          attendees: any[] | null;
          is_all_day: boolean;
          recurrence_rule: string | null;
          status: 'confirmed' | 'tentative' | 'cancelled' | null;
          raw_data: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          connection_id: string;
          user_id: string;
          external_event_id: string;
          title?: string | null;
          description?: string | null;
          start_time: string;
          end_time: string;
          location?: string | null;
          attendees?: any[] | null;
          is_all_day?: boolean;
          recurrence_rule?: string | null;
          status?: 'confirmed' | 'tentative' | 'cancelled' | null;
          raw_data?: any | null;
        };
        Update: Partial<Database['public']['Tables']['external_events']['Insert']>;
      };
      user_locations: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          latitude: number;
          longitude: number;
          city: string | null;
          country: string | null;
          timezone: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          latitude: number;
          longitude: number;
          city?: string | null;
          country?: string | null;
          timezone?: string | null;
          is_primary?: boolean;
        };
        Update: Partial<Database['public']['Tables']['user_locations']['Insert']>;
      };
      weather_cache: {
        Row: {
          id: string;
          latitude: number;
          longitude: number;
          temperature: number | null;
          feels_like: number | null;
          condition: string | null;
          description: string | null;
          humidity: number | null;
          wind_speed: number | null;
          icon_code: string | null;
          fetched_at: string;
          expires_at: string;
          raw_data: any | null;
        };
        Insert: {
          latitude: number;
          longitude: number;
          temperature?: number | null;
          feels_like?: number | null;
          condition?: string | null;
          description?: string | null;
          humidity?: number | null;
          wind_speed?: number | null;
          icon_code?: string | null;
          expires_at: string;
          raw_data?: any | null;
        };
        Update: Partial<Database['public']['Tables']['weather_cache']['Insert']>;
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          avatar_url: string | null;
          settings: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          owner_id: string;
          avatar_url?: string | null;
          settings?: any | null;
        };
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member' | 'guest';
          permissions: any | null;
          joined_at: string;
          invited_by: string | null;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member' | 'guest';
          permissions?: any | null;
          invited_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['team_members']['Insert']>;
      };
      team_invitations: {
        Row: {
          id: string;
          team_id: string;
          email: string;
          role: 'admin' | 'member' | 'guest';
          invited_by: string;
          token: string;
          status: 'pending' | 'accepted' | 'rejected' | 'expired';
          expires_at: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          team_id: string;
          email: string;
          role: 'admin' | 'member' | 'guest';
          invited_by: string;
          token: string;
          expires_at: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'expired';
        };
        Update: Partial<Database['public']['Tables']['team_invitations']['Insert']>;
      };
      team_projects: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          description: string | null;
          color: string | null;
          icon: string | null;
          status: 'active' | 'archived' | 'completed';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          team_id: string;
          name: string;
          description?: string | null;
          color?: string | null;
          icon?: string | null;
          status?: 'active' | 'archived' | 'completed';
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['team_projects']['Insert']>;
      };
    };
  };
};
