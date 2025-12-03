# Propel API Documentation

## Base44 Client

The app uses the Base44 client for all backend operations.

### Import

```javascript
import { base44 } from '@/api/base44Client';
```

---

## Entities API

### Tasks

```javascript
// List all tasks
const tasks = await base44.entities.Task.list('-created_date', 200);

// Filter tasks
const activeTasks = await base44.entities.Task.filter({ 
  status: 'todo' 
}, '-priority', 50);

// Create task
const task = await base44.entities.Task.create({
  title: 'My Task',
  description: 'Task description',
  priority: 'high',
  status: 'todo',
});

// Update task
await base44.entities.Task.update(taskId, { 
  status: 'done',
  completed_at: new Date().toISOString()
});

// Delete task
await base44.entities.Task.delete(taskId);

// Get schema
const schema = await base44.entities.Task.schema();
```

### User Preferences

```javascript
// List preferences
const prefs = await base44.entities.UserPreferences.list();

// Create/Update
if (prefs.length > 0) {
  await base44.entities.UserPreferences.update(prefs[0].id, {
    theme_id: 'arctic',
    mode: 'dark',
  });
} else {
  await base44.entities.UserPreferences.create({
    theme_id: 'arctic',
    mode: 'dark',
  });
}
```

---

## Auth API

```javascript
// Get current user
const user = await base44.auth.me();

// Update current user
await base44.auth.updateMe({
  full_name: 'John Doe',
  avatar: '🦸',
});

// Check authentication
const isAuth = await base44.auth.isAuthenticated();

// Logout
base44.auth.logout();

// Redirect to login
base44.auth.redirectToLogin('/dashboard');
```

---

## Integrations API

### InvokeLLM

```javascript
const response = await base44.integrations.Core.InvokeLLM({
  prompt: 'Parse this task: "Buy milk tomorrow at 3pm"',
  response_json_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      due_date: { type: 'string' },
    },
  },
});
// Returns parsed object
```

### SendEmail

```javascript
await base44.integrations.Core.SendEmail({
  to: 'user@example.com',
  subject: 'Task Assigned',
  body: 'You have been assigned a new task.',
});
```

### UploadFile

```javascript
const { file_url } = await base44.integrations.Core.UploadFile({
  file: fileBlob,
});
```

### GenerateImage

```javascript
const { url } = await base44.integrations.Core.GenerateImage({
  prompt: 'A futuristic productivity dashboard',
});
```

---

## React Query Hooks

### useQuery

```javascript
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const { data: tasks, isLoading, error } = useQuery({
  queryKey: ['tasks'],
  queryFn: () => base44.entities.Task.list(),
});
```

### useMutation

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const createTaskMutation = useMutation({
  mutationFn: (taskData) => base44.entities.Task.create(taskData),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  },
});

// Use it
createTaskMutation.mutate({ title: 'New Task' });
```

---

## Custom Hooks

### useTaskMutations

```javascript
import { useTaskMutations } from '@/components/hooks/useTaskMutations';

const {
  createTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  isCreating,
  isUpdating,
  isDeleting,
} = useTaskMutations();

// Use it
await createTask({ title: 'My Task' });
await updateTask(taskId, { status: 'done' });
await deleteTask(task);
await toggleTaskStatus(task);
```

### useKeyboardShortcuts

```javascript
import { useKeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';

useKeyboardShortcuts({
  tasks: filteredTasks,
  selectedIndex,
  onSelectTask: (index) => setSelectedIndex(index),
  onToggleStatus: handleToggle,
  onEditTask: handleEdit,
  onDeleteTask: handleDelete,
  onNewTask: () => setShowForm(true),
  enabled: true,
});
```

### useAnalytics

```javascript
import { useAnalytics, EVENTS } from '@/components/analytics/AnalyticsProvider';

const { trackEvent } = useAnalytics();

trackEvent(EVENTS.TASK_CREATED, {
  priority: 'high',
  category: 'work',
});
```

---

## Utility Functions

### createPageUrl

```javascript
import { createPageUrl } from '@/utils';

const url = createPageUrl('Tasks'); // Returns '/tasks'
const urlWithParams = createPageUrl('Tasks?filter=work'); // Returns '/tasks?filter=work'
```

### Gamification

```javascript
import { 
  calculateTaskPoints,
  checkAchievements,
  updateUserStats,
} from '@/components/gamification/GamificationUtils';

const points = calculateTaskPoints(task);
const newAchievements = checkAchievements(userStats);
await updateUserStats(task, 'complete');
```

### Sanitization

```javascript
import { sanitizeHtml, sanitizeInput } from '@/components/security/sanitize';

const clean = sanitizeHtml(userInput);
const safe = sanitizeInput(formData);
```

---

## Theme API

### useTheme Hook

```javascript
import { useTheme } from '@/components/theme/ThemeProvider';

const { 
  tokens,        // Current color tokens
  palette,       // Current palette object
  paletteId,     // Current palette ID
  mode,          // 'light' | 'dark' | 'system'
  effectiveMode, // Resolved mode
  palettes,      // All available palettes
  setPalette,    // Set palette by ID
  setMode,       // Set mode
  isLoaded,      // Theme loaded status
} = useTheme();

// Use tokens
<div style={{ backgroundColor: tokens.bg, color: tokens.color }}>
  Content
</div>
```

---

## Accessibility

### ARIA Utils

```javascript
import { 
  getButtonProps,
  getDialogProps,
  getListProps,
} from '@/components/accessibility/AriaUtils';

<button {...getButtonProps({
  pressed: isActive,
  label: 'Toggle menu',
})}>
  Menu
</button>
```

### Focus Management

```javascript
import { 
  useFocusManagement,
  announce,
} from '@/components/accessibility/useFocusManagement';

const { saveFocus, restoreFocus, focusElement } = useFocusManagement();

// Announce to screen readers
announce('Task created successfully', 'polite');
```

---

## Performance

### LazyLoad Component

```javascript
import { LazyLoad } from '@/components/optimization/LazyLoad';

<LazyLoad>
  <ExpensiveComponent />
</LazyLoad>
```

### CDN Image

```javascript
import { CDNImage } from '@/components/cdn/CDNImage';

<CDNImage 
  src="/path/to/image.jpg" 
  alt="Description"
  width={400}
  height={300}
/>
```

---

## Offline Support

### useOfflineMutation

```javascript
import { useOfflineMutation } from '@/components/offline/OfflineManager';

const mutation = useOfflineMutation(
  (data) => base44.entities.Task.create(data),
  {
    type: 'CREATE_TASK',
    onOfflineSuccess: (data) => {
      // Optimistic update
    },
  }
);

await mutation({ title: 'Task' });
```

---

## Store (Zustand)

```javascript
import useAppStore from '@/components/store/useAppStore';

const { 
  selectedTaskIds,
  bulkSelectMode,
  setSelectedTaskIds,
  setBulkSelectMode,
  clearSelectedTasks,
} = useAppStore();
```

---

## TypeScript Types

```typescript
// Task type
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  due_date?: string;
  created_date: string;
  updated_date: string;
  created_by: string;
}

// User type
interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
}

// Theme tokens
interface ThemeTokens {
  bg: string;
  color: string;
  accent: string;
  subtle: string;
  card: string;
  border: string;
}
```

---

## Full Documentation

For complete API reference, component documentation, and development guide, see:

- **API Reference**: `/components/docs/API.md`
- **Component Docs**: `/components/docs/COMPONENTS.md`
- **Development Guide**: `/components/docs/DEVELOPMENT.md`
- **Accessibility Guide**: `/components/accessibility/README.md`
- **Security Guide**: `/components/security/README.md