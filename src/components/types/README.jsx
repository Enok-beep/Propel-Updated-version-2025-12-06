# TypeScript Migration Guide

This app is gradually migrating from JavaScript to TypeScript for better type safety and developer experience.

## Current Status

**Migrated:**
- ✅ `types/task.types.ts` - Core task type definitions
- ✅ `types/user.types.ts` - User and preferences types
- ✅ `hooks/useTaskMutations.ts` - Task mutations hook with full typing

**In Progress:**
- Components with complex props
- Custom hooks with shared logic
- Utility functions

## Migration Strategy

### 1. **Start with Type Definitions**
Create `.ts` files in `types/` folder first:
```typescript
// types/myFeature.types.ts
export interface MyData {
  id: string;
  name: string;
}
```

### 2. **Migrate Hooks Next**
Convert custom hooks to TypeScript:
```typescript
// hooks/useMyHook.ts
import type { MyData } from '../types/myFeature.types';

export function useMyHook(): MyData[] {
  // implementation
}
```

### 3. **Gradually Convert Components**
Rename `.jsx` → `.tsx` and add types:
```typescript
// components/MyComponent.tsx
import type { Task } from '../types/task.types';

interface Props {
  task: Task;
  onComplete: (id: string) => void;
}

export function MyComponent({ task, onComplete }: Props) {
  // component code
}
```

### 4. **Use TypeScript in New Files**
All new files should be TypeScript by default.

## Type Import Patterns

```typescript
// Import types with 'type' keyword (better for tree-shaking)
import type { Task, TaskStatus } from '../types/task.types';

// Or import specific types
import { type Task, type User } from '../types';
```

## Benefits

- ✅ Catch errors at compile time
- ✅ Better IDE autocomplete
- ✅ Self-documenting code
- ✅ Safer refactoring
- ✅ Improved team collaboration

## Next Steps

1. Convert utility functions in `components/utils/`
2. Add types to remaining custom hooks
3. Gradually convert page components
4. Add strict TypeScript config when ready

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)