import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { toast } from 'sonner';

/**
 * Global Keyboard Shortcuts Handler
 * Supports vim-style navigation and actions
 */
export function useKeyboardShortcuts({ 
  tasks = [], 
  selectedIndex = 0,
  onSelectTask,
  onToggleStatus,
  onEditTask,
  onDeleteTask,
  onNewTask,
  enabled = true 
}) {
  const navigate = useNavigate();

  const handleKeyPress = useCallback((e) => {
    if (!enabled) return;

    // Ignore if typing in input/textarea/contenteditable
    const isTyping = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || 
                     e.target.isContentEditable;
    
    if (isTyping && !e.metaKey && !e.ctrlKey) return;

    const key = e.key.toLowerCase();
    const task = tasks[selectedIndex];

    // Navigation shortcuts
    if (key === 'j' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const nextIndex = Math.min(selectedIndex + 1, tasks.length - 1);
      onSelectTask?.(nextIndex);
    } else if (key === 'k' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const prevIndex = Math.max(selectedIndex - 1, 0);
      onSelectTask?.(prevIndex);
    } else if (key === 'g' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onSelectTask?.(0); // Go to first
    } else if (key === 'G' && e.shiftKey) {
      e.preventDefault();
      onSelectTask?.(tasks.length - 1); // Go to last
    }

    // Action shortcuts
    else if (key === 'd' && task && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onToggleStatus?.(task);
      toast.success('Task status toggled');
    } else if (key === 'e' && task && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onEditTask?.(task);
    } else if ((key === 'delete' || key === 'backspace') && task && e.shiftKey) {
      e.preventDefault();
      onDeleteTask?.(task);
    } else if (key === 'n' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onNewTask?.();
    }

    // Global navigation (Cmd/Ctrl + number)
    else if ((e.metaKey || e.ctrlKey) && ['1', '2', '3', '4', '5'].includes(key)) {
      e.preventDefault();
      const routes = ['Dashboard', 'Tasks', 'Calendar', 'Focus', 'Settings'];
      navigate(createPageUrl(routes[parseInt(key) - 1]));
    }

    // Search (Cmd/Ctrl + K) - handled by CommandPalette
    // No need to handle here as it's already in Layout

  }, [enabled, tasks, selectedIndex, onSelectTask, onToggleStatus, onEditTask, onDeleteTask, onNewTask, navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
}

/**
 * Keyboard Shortcuts Help Dialog
 */
export function KeyboardShortcutsHelp({ open, onClose }) {
  const shortcuts = [
    { category: 'Navigation', items: [
      { keys: ['j'], description: 'Move down' },
      { keys: ['k'], description: 'Move up' },
      { keys: ['g'], description: 'Go to first' },
      { keys: ['Shift', 'G'], description: 'Go to last' },
    ]},
    { category: 'Actions', items: [
      { keys: ['d'], description: 'Toggle task done' },
      { keys: ['e'], description: 'Edit task' },
      { keys: ['n'], description: 'New task' },
      { keys: ['Shift', 'Delete'], description: 'Delete task' },
    ]},
    { category: 'Global', items: [
      { keys: ['⌘/Ctrl', 'K'], description: 'Command palette' },
      { keys: ['⌘/Ctrl', '1-5'], description: 'Navigate pages' },
      { keys: ['?'], description: 'Show shortcuts' },
      { keys: ['Esc'], description: 'Close dialogs' },
    ]},
    { category: 'Focus Timer', items: [
      { keys: ['Space/P'], description: 'Play/Pause timer' },
      { keys: ['R'], description: 'Reset timer' },
      { keys: ['F'], description: 'Toggle fullscreen' },
      { keys: ['M'], description: 'Mute/Unmute' },
    ]},
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">⌨️ Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="space-y-4">
          {shortcuts.map(section => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, j) => (
                        <kbd key={j} className="px-2 py-1 text-xs font-mono bg-gray-100 rounded border">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-gray-500">
          Press <kbd className="px-1 bg-gray-100 rounded">?</kbd> to toggle this help
        </div>
      </div>
    </div>
  );
}

export default useKeyboardShortcuts;