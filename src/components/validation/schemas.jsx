import { z } from 'zod';

// Task validation schema
export const taskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  
  status: z.enum(['todo', 'in_progress', 'done'])
    .default('todo'),
  
  priority: z.enum(['low', 'medium', 'high', 'urgent'])
    .default('medium'),
  
  energy_level: z.enum(['low', 'medium', 'high'])
    .default('medium'),
  
  category: z.enum(['work', 'personal', 'health', 'learning', 'errands', 'creative'])
    .default('personal'),
  
  due_date: z.string()
    .datetime()
    .optional()
    .or(z.literal('')),
  
  estimated_minutes: z.number()
    .min(1, 'Estimated time must be at least 1 minute')
    .max(1440, 'Estimated time cannot exceed 24 hours')
    .optional(),
  
  location: z.string()
    .max(500, 'Location must be less than 500 characters')
    .optional(),
  
  tags: z.array(z.string()).optional(),
  
  team_id: z.string().optional(),
  project_id: z.string().optional(),
  assigned_to: z.string().email('Invalid email address').optional().or(z.literal('')),
  parent_task_id: z.string().optional(),
});

// Team validation schema
export const teamSchema = z.object({
  name: z.string()
    .min(1, 'Team name is required')
    .max(100, 'Team name must be less than 100 characters'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  avatar: z.string().optional(),
});

// Project validation schema
export const projectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(150, 'Project name must be less than 150 characters'),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  team_id: z.string()
    .min(1, 'Team is required'),
  
  owner_email: z.string()
    .email('Invalid email address'),
  
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived'])
    .default('active'),
});

// Contact validation schema
export const contactSchema = z.object({
  name: z.string()
    .min(1, 'Contact name is required')
    .max(150, 'Name must be less than 150 characters'),
  
  phone_numbers: z.array(z.string()).optional(),
  
  email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  
  company: z.string()
    .max(200, 'Company name must be less than 200 characters')
    .optional(),
  
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
});

// Quick Reminder validation schema
export const quickReminderSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(150, 'Title must be less than 150 characters'),
  
  content: z.string()
    .min(1, 'Content is required')
    .max(2000, 'Content must be less than 2000 characters'),
  
  type: z.enum(['serial_number', 'password', 'contact_info', 'key_phrase', 'instruction', 'other'])
    .default('other'),
  
  priority: z.enum(['low', 'medium', 'high', 'critical'])
    .default('medium'),
  
  phone_numbers: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

// Meeting validation schema
export const meetingSchema = z.object({
  title: z.string()
    .min(1, 'Meeting title is required')
    .max(200, 'Title must be less than 200 characters'),
  
  team_id: z.string()
    .min(1, 'Team is required'),
  
  date: z.string()
    .datetime('Invalid date format'),
  
  attendees: z.array(z.string().email('Invalid email address'))
    .min(1, 'At least one attendee is required'),
  
  notes: z.string()
    .max(10000, 'Notes must be less than 10000 characters')
    .optional(),
});

// Helper function to get field error message
export const getFieldError = (errors, fieldName) => {
  return errors[fieldName]?.message;
};

// Helper function to check if field has error
export const hasFieldError = (errors, fieldName) => {
  return !!errors[fieldName];
};