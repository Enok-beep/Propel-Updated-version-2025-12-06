# TypeScript Migration Guide

## Overview

This project is progressively migrating to TypeScript for better type safety and developer experience.

## Configuration

TypeScript configuration should be added to your project root as `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/pages/*": ["./pages/*"],
      "@/api/*": ["./api/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

## Type Definitions

### Core Types

```typescript
// components/types/task.d.ts
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'work' | 'personal' | 'health' | 'learning' | 'errands' | 'creative';
  energy_level?: 'low' | 'medium' | 'high';
  due_date?: string;
  estimated_minutes?: number;
  completed_at?: string;
  pomodoros_completed?: number;
  tags?: string[];
  order?: number;
  team_id?: string;
  project_id?: string;
  assigned_to?: string;
  created_date: string;
  updated_date: string;
  created_by: string;
}

export type TaskStatus = Task['status'];
export type TaskPriority = Task['priority'];
export type TaskCategory = Task['category'];
```

```typescript
// components/types/user.d.ts
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
}

export interface UserPreferences {
  id: string;
  theme_id: string;
  mode: 'light' | 'dark' | 'system';
  current_energy: 'low' | 'medium' | 'high';
  pomodoro_duration: number;
  short_break: number;
  long_break: number;
  work_mode: 'personal' | 'team';
  active_team_id?: string;
  notifications_enabled: boolean;
}
```

```typescript
// components/types/theme.d.ts
export interface ThemeTokens {
  bg: string;
  color: string;
  accent: string;
  subtle: string;
  card: string;
  border: string;
}

export interface ThemePalette {
  id: string;
  name: string;
  variants: {
    light: ThemeTokens;
    dark: ThemeTokens;
  };
}

export type ThemeMode = 'light' | 'dark' | 'system';
```

## Migration Strategy

### Phase 1: Type Definitions
- ✅ Create `.d.ts` files for core types
- ✅ Document existing interfaces

### Phase 2: Utilities & Hooks
- Convert utility functions to TypeScript
- Add types to custom hooks
- Example: `components/hooks/useTaskMutations.ts`

### Phase 3: Components
- Migrate UI components (Button, Card, etc)
- Migrate feature components (TaskCard, TaskForm, etc)
- Keep `.jsx` extension during transition

### Phase 4: Pages
- Migrate page components
- Ensure full type coverage

## JSDoc for JavaScript Files

Use JSDoc comments to add types to JavaScript files:

```javascript
/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {'todo'|'in_progress'|'done'} status
 */

/**
 * Create a new task
 * @param {Task} task - The task object
 * @returns {Promise<Task>} The created task
 */
export async function createTask(task) {
  return base44.entities.Task.create(task);
}
```

## Component Props

```typescript
// TaskCard.tsx
import { Task } from '@/components/types/task';

interface TaskCardProps {
  task: Task;
  onToggleStatus: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onClick?: (task: Task) => void;
  isSelected?: boolean;
  isDragging?: boolean;
}

export default function TaskCard({
  task,
  onToggleStatus,
  onEdit,
  onDelete,
  onClick,
  isSelected = false,
  isDragging = false,
}: TaskCardProps) {
  // Component implementation
}
```

## Hooks with TypeScript

```typescript
// useTaskMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Task } from '@/components/types/task';

interface UseTaskMutationsReturn {
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<Task>;
  deleteTask: (task: Task) => void;
  toggleTaskStatus: (task: Task) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function useTaskMutations(): UseTaskMutationsReturn {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (task: Partial<Task>) => base44.entities.Task.create(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // ... rest of implementation

  return {
    createTask: createMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutate,
    toggleTaskStatus,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

## Type Checking

Run type checking without emitting files:

```bash
npx tsc --noEmit
```

Add to package.json:

```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

## Benefits

✅ **Better IntelliSense** - Auto-completion in VS Code  
✅ **Catch Errors Early** - Type errors before runtime  
✅ **Refactoring Safety** - Rename with confidence  
✅ **Self-Documentation** - Types as documentation  
✅ **Team Collaboration** - Clear contracts between components  

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [TypeScript with React Query](https://tanstack.com/query/latest/docs/react/typescript)