/**
 * TypeScript type definitions for User and Preferences
 */

export type WorkMode = 'personal' | 'team';
export type ThemeMode = 'light' | 'dark' | 'system';
export type NavigationStyle = 'traditional' | 'circular';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  created_date: string;
}

export interface UserPreferences {
  id?: string;
  theme_id: string;
  mode: ThemeMode;
  current_energy: 'low' | 'medium' | 'high';
  pomodoro_duration: number;
  short_break: number;
  long_break: number;
  onboarding_completed: boolean;
  daily_goal_tasks: number;
  work_mode: WorkMode;
  active_team_id?: string;
  language: string;
  avatar: string;
  
  // Notifications
  notifications_enabled: boolean;
  notify_task_assigned: boolean;
  notify_comment_mention: boolean;
  notify_deadline_soon: boolean;
  notify_team_activity: boolean;
  notify_achievements: boolean;
  deadline_reminder_hours: number;
  
  // Dashboard
  dashboard_widgets_personal: string[];
  dashboard_widgets_team: string[];
  navigation_style: NavigationStyle;
  
  // Location
  weather_enabled: boolean;
  default_location?: string;
  location_enabled: boolean;
  saved_latitude?: number;
  saved_longitude?: number;
  auto_travel_time: boolean;
  nearby_suggestions: boolean;
}

export interface UserStats {
  id?: string;
  user_email: string;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_completion_date?: string;
  achievements: string[];
  tasks_completed: number;
  speed_bonus_count: number;
  urgent_tasks_completed: number;
  perfect_weeks: number;
}