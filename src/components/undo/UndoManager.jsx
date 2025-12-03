import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const UndoContext = createContext(null);

const UNDO_TIMEOUT = 5000; // 5 seconds to undo

export function UndoProvider({ children }) {
  const queryClient = useQueryClient();
  const [undoStack, setUndoStack] = useState([]);
  const timeoutRefs = useRef(new Map());

  const restoreTaskMutation = useMutation({
    mutationFn: (task) => base44.entities.Task.create(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const addToUndoStack = useCallback((action) => {
    const actionId = Date.now() + Math.random();
    
    setUndoStack(prev => [...prev, { ...action, id: actionId }]);

    // Set timeout for permanent deletion
    const timeoutId = setTimeout(() => {
      if (action.type === 'DELETE_TASK') {
        permanentDeleteMutation.mutate(action.data.id);
      }
      setUndoStack(prev => prev.filter(a => a.id !== actionId));
      timeoutRefs.current.delete(actionId);
    }, UNDO_TIMEOUT);

    timeoutRefs.current.set(actionId, timeoutId);

    // Show toast with undo button
    toast.success(action.message || 'Action completed', {
      action: {
        label: 'Undo',
        onClick: () => undo(actionId),
      },
      duration: UNDO_TIMEOUT,
    });

    return actionId;
  }, []);

  const undo = useCallback((actionId) => {
    const action = undoStack.find(a => a.id === actionId);
    if (!action) return;

    // Clear timeout
    const timeoutId = timeoutRefs.current.get(actionId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(actionId);
    }

    // Restore based on action type
    if (action.type === 'DELETE_TASK') {
      const taskData = { ...action.data };
      delete taskData.id; // Remove id so create generates new one
      
      restoreTaskMutation.mutate(taskData, {
        onSuccess: () => {
          toast.success('Task restored');
        },
      });
    }

    // Remove from stack
    setUndoStack(prev => prev.filter(a => a.id !== actionId));
  }, [undoStack, restoreTaskMutation]);

  const clearUndoStack = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
    setUndoStack([]);
  }, []);

  const value = {
    addToUndoStack,
    undo,
    undoStack,
    clearUndoStack,
  };

  return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within UndoProvider');
  }
  return context;
}