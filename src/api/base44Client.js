// DEPRECATED: Base44 has been replaced with Supabase
// This file is kept for backward compatibility during migration
// All new code should use @/lib/supabase and @/lib/repositories/*

import { supabase } from '@/lib/supabase';
import { TaskRepository } from '@/lib/repositories/TaskRepository';

// Legacy compatibility wrapper
// TODO: Remove this file after all components are migrated
export const base44 = {
  auth: {
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  },
  entities: {
    Task: {
      list: async (orderBy = '-created_at', limit = 100) => {
        console.warn('DEPRECATED: Use TaskRepository.list() instead');
        const field = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy;
        return TaskRepository.list(field, limit);
      },
      create: async (data) => {
        console.warn('DEPRECATED: Use TaskRepository.create() instead');
        return TaskRepository.create(data);
      },
      update: async (id, data) => {
        console.warn('DEPRECATED: Use TaskRepository.update() instead');
        return TaskRepository.update(id, data);
      },
      delete: async (id) => {
        console.warn('DEPRECATED: Use TaskRepository.delete() instead');
        return TaskRepository.delete(id);
      },
      filter: async (filters) => {
        console.warn('DEPRECATED: Use Supabase query builder instead');
        console.log('Filters ignored during migration:', filters);
        return TaskRepository.list();
      },
    },
    // Add other entities as needed during migration
    UserPreferences: {
      list: async () => {
        console.warn('DEPRECATED: Implement UserPreferences repository');
        return [];
      },
    },
    UserStats: {
      filter: async () => {
        console.warn('DEPRECATED: Implement UserStats repository');
        return [];
      },
    },
  },
};
