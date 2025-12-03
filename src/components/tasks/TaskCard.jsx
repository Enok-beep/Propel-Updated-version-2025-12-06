
import TaskCard from './TaskCard';

export default {
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
