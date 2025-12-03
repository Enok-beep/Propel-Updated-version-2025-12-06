markdown
# Zustand Global State Management

This app uses Zustand for centralized state management, eliminating prop drilling and inconsistent state.

## Store Structure

```javascript
import useAppStore from '@/components/store/useAppStore';

// In your component:
const { selectedTask, setSelectedTask } = useAppStore();
```

## State Categories

### UI State
- `sidebarOpen` - Sidebar visibility
- `commandPaletteOpen` - Command palette modal
- `showKeyboardHelp` - Keyboard shortcuts help
- `showTaskForm` - Task form modal
- `editingTask` - Task being edited

### User Preferences
- `currentEnergy` - Current energy level (low/medium/high)
- `workMode` - Personal or team mode
- `activeWidgets` - Dashboard widget configuration
- `navigationStyle` - Navigation layout style

### Task Management
- `selectedTask` - Currently selected task
- `selectedTaskIds` - Multiple selected tasks (bulk actions)
- `bulkSelectMode` - Bulk selection enabled

### Filters & Views
- `searchQuery` - Search filter
- `filterCategory` - Category filter
- `filterPriority` - Priority filter
- `sortBy` - Sort method
- `activeView` - Current view (list/kanban/graph)
- `activeTab` - Current tab (todo/done)

### Offline State
- `isOffline` - Network status
- `pendingChanges` - Queue of offline changes

## Usage Examples

### Reading State
```javascript
const currentEnergy = useAppStore(state => state.currentEnergy);
```

### Updating State
```javascript
const { setCurrentEnergy } = useAppStore();
setCurrentEnergy('high');
```

### Using Multiple Values
```javascript
const { 
  selectedTask, 
  setSelectedTask,
  showTaskForm 
} = useAppStore();
```

### Computed Values (Selectors)
```javascript
const hasSelection = useAppStore(state => state.selectedTaskIds.length > 0);
```

## Benefits

✅ **No Prop Drilling** - Access state from any component
✅ **Persistent State** - UI preferences saved to localStorage
✅ **Performance** - Only re-renders when used values change
✅ **DevTools** - Built-in debugging support
✅ **Simple API** - Easy to learn and use
✅ **TypeScript Ready** - Full type inference

## Migration from useState

**Before:**
```javascript
// Parent component
const [selectedTask, setSelectedTask] = useState(null);

// Pass down through multiple components
<Child selectedTask={selectedTask} onSelect={setSelectedTask} />
```

**After:**
```javascript
// Any component can access directly
import useAppStore from '@/components/store/useAppStore';

const { selectedTask, setSelectedTask } = useAppStore();
```

## Best Practices

1. **Use Selectors** - Only subscribe to what you need:
```javascript
// ✅ Good - only re-renders when searchQuery changes
const searchQuery = useAppStore(state => state.searchQuery);

// ❌ Bad - re-renders on any state change
const store = useAppStore();
```

2. **Batch Updates** - Update multiple values together:
```javascript
useAppStore.setState({ 
  searchQuery: '',
  filterCategory: 'all',
  selectedTaskIds: []
});
```

3. **Reset State** - Use the built-in reset function:
```javascript
const { reset } = useAppStore();
reset(); // Clears temporary state
```

## Adding New State

To add new global state, edit `useAppStore.js`:

```javascript
// Add to the store
myNewValue: initialValue,
setMyNewValue: (value) => set({ myNewValue: value }),
```

Then use in components:
```javascript
const { myNewValue, setMyNewValue } = useAppStore();
```
