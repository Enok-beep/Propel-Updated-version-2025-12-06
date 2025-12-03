import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, CheckCircle2, Trash2, Users, Tag, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function BulkTaskActions({ selectedTasks = [], onClear }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [action, setAction] = useState('');

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ updates }) => {
      const promises = selectedTasks.map(taskId =>
        base44.entities.Task.update(taskId, updates)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClear();
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const promises = selectedTasks.map(taskId =>
        base44.entities.Task.delete(taskId)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClear();
    },
  });

  const handleAction = (actionType, value) => {
    if (actionType === 'delete') {
      if (confirm(`Delete ${selectedTasks.length} tasks?`)) {
        bulkDeleteMutation.mutate();
      }
    } else if (actionType === 'status') {
      bulkUpdateMutation.mutate({ updates: { status: value } });
    } else if (actionType === 'priority') {
      bulkUpdateMutation.mutate({ updates: { priority: value } });
    }
  };

  if (selectedTasks.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 animate-in slide-in-from-bottom"
      style={{ backgroundColor: tokens.card, borderColor: tokens.border }}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5" style={{ color: tokens.accent }} />
        <span className="font-semibold" style={{ color: tokens.color }}>
          {selectedTasks.length} selected
        </span>
      </div>

      <div className="h-6 w-px" style={{ backgroundColor: tokens.border }} />

      <Select value={action} onValueChange={(val) => {
        setAction(val);
        if (val.startsWith('status:')) {
          handleAction('status', val.replace('status:', ''));
        } else if (val.startsWith('priority:')) {
          handleAction('priority', val.replace('priority:', ''));
        }
        setAction('');
      }}>
        <SelectTrigger className="w-40" style={{ borderColor: tokens.border }}>
          <SelectValue placeholder="Change status..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="status:todo">Mark as To Do</SelectItem>
          <SelectItem value="status:in_progress">Mark as In Progress</SelectItem>
          <SelectItem value="status:done">Mark as Done</SelectItem>
        </SelectContent>
      </Select>

      <Select value={action} onValueChange={(val) => {
        setAction(val);
        if (val.startsWith('priority:')) {
          handleAction('priority', val.replace('priority:', ''));
        }
        setAction('');
      }}>
        <SelectTrigger className="w-40" style={{ borderColor: tokens.border }}>
          <SelectValue placeholder="Change priority..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="priority:low">Low Priority</SelectItem>
          <SelectItem value="priority:medium">Medium Priority</SelectItem>
          <SelectItem value="priority:high">High Priority</SelectItem>
          <SelectItem value="priority:urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAction('delete')}
        className="text-red-500 hover:bg-red-50"
        style={{ borderColor: tokens.border }}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>

      <button
        onClick={onClear}
        className="p-2 hover:bg-black/5 rounded-lg"
        style={{ color: tokens.subtle }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}