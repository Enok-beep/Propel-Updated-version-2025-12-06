import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SubTaskList({ parentTask }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [showInput, setShowInput] = useState(false);

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const subTasks = allTasks.filter(t => t.parent_task_id === parentTask.id);
  const completedSubTasks = subTasks.filter(t => t.status === 'done').length;
  const progress = subTasks.length > 0 ? (completedSubTasks / subTasks.length) * 100 : 0;

  const createSubTaskMutation = useMutation({
    mutationFn: (title) => base44.entities.Task.create({
      title,
      parent_task_id: parentTask.id,
      team_id: parentTask.team_id,
      project_id: parentTask.project_id,
      priority: parentTask.priority,
      category: parentTask.category,
      status: 'todo'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewSubTaskTitle('');
      setShowInput(false);
    },
  });

  const toggleSubTaskMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, { 
      status: status === 'done' ? 'todo' : 'done',
      completed_at: status === 'done' ? null : new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteSubTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleCreateSubTask = (e) => {
    e.preventDefault();
    if (!newSubTaskTitle.trim()) return;
    createSubTaskMutation.mutate(newSubTaskTitle);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm" style={{ color: tokens.color }}>
            Sub-tasks ({completedSubTasks}/{subTasks.length})
          </h4>
          {subTasks.length > 0 && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInput(!showInput)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {showInput && (
        <form onSubmit={handleCreateSubTask} className="flex gap-2">
          <Input
            placeholder="Sub-task title..."
            value={newSubTaskTitle}
            onChange={(e) => setNewSubTaskTitle(e.target.value)}
            autoFocus
            style={{ borderColor: tokens.border }}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newSubTaskTitle.trim()}
            style={{ backgroundColor: tokens.accent }}
            className="text-white"
          >
            Add
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {subTasks.map(subTask => (
          <div
            key={subTask.id}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/5 transition-colors group"
          >
            <button
              onClick={() => toggleSubTaskMutation.mutate({ id: subTask.id, status: subTask.status })}
              className="flex-shrink-0"
            >
              {subTask.status === 'done' ? (
                <CheckCircle2 className="w-4 h-4" style={{ color: '#10B981' }} />
              ) : (
                <Circle className="w-4 h-4" style={{ color: tokens.subtle }} />
              )}
            </button>
            
            <span 
              className={cn(
                "flex-1 text-sm",
                subTask.status === 'done' && "line-through opacity-60"
              )}
              style={{ color: tokens.color }}
            >
              {subTask.title}
            </span>

            <button
              onClick={() => deleteSubTaskMutation.mutate(subTask.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubTaskList;