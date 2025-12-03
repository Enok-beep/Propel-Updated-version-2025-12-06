/**
 * TypeScript type definitions for Task entity
 * Gradual migration: Start with core data types
 */

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type TaskCategory = 'work' | 'personal' | 'health' | 'learning' | 'errands' | 'creative';
export type TimeBlock = 'morning' | 'midday' | 'evening' | 'night';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  energy_level: EnergyLevel;
  category: TaskCategory;
  due_date?: string;
  time_block?: TimeBlock;
  estimated_minutes: number;
  completed_at?: string;
  pomodoros_completed: number;
  location?: string;
  tags?: string[];
  order: number;
  
  // Team collaboration
  team_id?: string;
  project_id?: string;
  assigned_to?: string;
  watchers?: string[];
  
  // Dependencies
  depends_on?: string[];
  parent_task_id?: string;
  
  // Recurring
  is_recurring: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_count?: number;
  parent_recurring_task_id?: string;
  
  // Reminders
  reminders: string[];
  
  // Metadata
  created_date: string;
  updated_date: string;
  created_by: string;
}

export interface TaskFormData extends Partial<Task> {
  title: string;
}

export interface TaskSubmission {
  taskData: TaskFormData;
  attachments?: Attachment[];
  subTasks?: Partial<Task>[];
}

export interface Attachment {
  task_id?: string;
  comment_id?: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by?: string;
}

export interface TaskStats {
  completedToday: number;
  pending: number;
  highPriority: number;
  overdueCount?: number;
}