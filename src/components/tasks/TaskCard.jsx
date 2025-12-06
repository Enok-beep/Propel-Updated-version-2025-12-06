import React from 'react';
import { Card } from '@/components/ui/card';

// Actual TaskCard component
export function TaskCard({ task, onToggleStatus, onEdit, onDelete, onClick, onStartPomodoro, isRecommended }) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-foreground">{task.title}</h3>
          {isRecommended && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
              Recommended
            </span>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex gap-2 text-xs flex-wrap">
          <span className={`px-2 py-1 rounded-md font-medium ${
            task.priority === 'urgent' ? 'bg-destructive/10 text-destructive' :
            task.priority === 'high' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400' :
            task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
            'bg-accent/10 text-accent'
          }`}>
            {task.priority}
          </span>

          <span className={`px-2 py-1 rounded-md font-medium ${
            task.status === 'done' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
            task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
            'bg-muted text-muted-foreground'
          }`}>
            {task.status?.replace('_', ' ')}
          </span>

          {task.due_date && (
            <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

export default TaskCard;

// Storybook configuration below
const StorybookConfig = {
  title: 'Tasks/TaskCard',
  component: TaskCard,
  tags: ['autodocs'],
};

const mockTask = {
  id: '1',
  title: 'Design new landing page',
  description: 'Create wireframes and mockups for the new landing page',
  status: 'todo',
  priority: 'high',
  category: 'work',
  energy_level: 'high',
  due_date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
  estimated_minutes: 120,
  created_date: new Date().toISOString(),
  depends_on: [],
};

export const Default = {
  args: {
    task: mockTask,
    onToggleStatus: () => console.log('Toggle status'),
    onEdit: () => console.log('Edit task'),
    onDelete: () => console.log('Delete task'),
    onClick: () => console.log('Task clicked'),
    onStartPomodoro: () => console.log('Start Pomodoro'),
  },
};

export const InProgress = {
  args: {
    task: { ...mockTask, status: 'in_progress' },
    onToggleStatus: () => console.log('Toggle status'),
    onEdit: () => console.log('Edit task'),
    onDelete: () => console.log('Delete task'),
    onClick: () => console.log('Task clicked'),
    onStartPomodoro: () => console.log('Start Pomodoro'),
  },
};

export const Done = {
  args: {
    task: { 
      ...mockTask, 
      status: 'done',
      completed_at: new Date().toISOString() 
    },
    onToggleStatus: () => console.log('Toggle status'),
    onEdit: () => console.log('Edit task'),
    onDelete: () => console.log('Delete task'),
    onClick: () => console.log('Task clicked'),
    onStartPomodoro: () => console.log('Start Pomodoro'),
  },
};

export const UrgentPriority = {
  args: {
    task: { ...mockTask, priority: 'urgent' },
    onToggleStatus: () => console.log('Toggle status'),
    onEdit: () => console.log('Edit task'),
    onDelete: () => console.log('Delete task'),
    onClick: () => console.log('Task clicked'),
    onStartPomodoro: () => console.log('Start Pomodoro'),
  },
};

export const WithoutDueDate = {
  args: {
    task: { ...mockTask, due_date: null },
    onToggleStatus: () => console.log('Toggle status'),
    onEdit: () => console.log('Edit task'),
    onDelete: () => console.log('Delete task'),
    onClick: () => console.log('Task clicked'),
    onStartPomodoro: () => console.log('Start Pomodoro'),
  },
};

export const OverdueTask = {
  args: {
    task: { ...mockTask, due_date: new Date(Date.now() - 86400000 * 3).toISOString() }, // 3 days ago
    onToggleStatus: () => console.log('Toggle status'),
    onEdit: () => console.log('Edit task'),
    onDelete: () => console.log('Delete task'),
    onClick: () => console.log('Task clicked'),
    onStartPomodoro: () => console.log('Start Pomodoro'),
  },
};

export const LowEnergyPersonal = {
  args: {
    task: { 
      ...mockTask, 
      category: 'personal', 
      energy_level: 'low',
      title: 'Go for a walk',
      description: 'Enjoy the fresh air and get some steps in',
      priority: 'low',
      estimated_minutes: 30,
      due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    },
    onToggleStatus: () => console.log('Toggle status'),
    onEdit: () => console.log('Edit task'),
    onDelete: () => console.log('Delete task'),
    onClick: () => console.log('Task clicked'),
    onStartPomodoro: () => console.log('Start Pomodoro'),
  },
};

export const RecommendedTask = {
  args: {
    task: { 
      ...mockTask, 
      title: 'Review project proposal',
      priority: 'medium',
      energy_level: 'medium',
      due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
    },
    isRecommended: true,
    onToggleStatus: () => console.log('Toggle status'),
    onEdit: () => console.log('Edit task'),
    onDelete: () => console.log('Delete task'),
    onClick: () => console.log('Task clicked'),
    onStartPomodoro: () => console.log('Start Pomodoro'),
  },
};
