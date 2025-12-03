import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { 
  Plus, Sparkles, CheckCircle2, Calendar, 
  Users, Target, Clock, TrendingUp 
} from 'lucide-react';

export function EmptyTasksState({ onCreateTask }) {
  const { tokens } = useTheme();
  
  return (
    <div className="text-center py-16 px-4">
      <div 
        className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: `${tokens.accent}20` }}
      >
        <CheckCircle2 className="w-10 h-10" style={{ color: tokens.accent }} />
      </div>
      <h3 className="text-2xl font-bold mb-3" style={{ color: tokens.color }}>
        Your task list is empty
      </h3>
      <p className="text-lg mb-6 max-w-md mx-auto" style={{ color: tokens.subtle }}>
        Let's add your first task and get things done! Use natural language - Propel understands you.
      </p>
      <Button
        onClick={onCreateTask}
        className="text-white px-8 py-6 text-lg"
        style={{ backgroundColor: tokens.accent }}
      >
        <Plus className="w-5 h-5 mr-2" />
        Create Your First Task
      </Button>
      
      <div className="mt-8 text-sm" style={{ color: tokens.subtle }}>
        <p className="mb-2">💡 Try natural language like:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <code className="px-3 py-1 rounded-lg" style={{ backgroundColor: `${tokens.accent}10` }}>
            "Call mom tomorrow at 3pm"
          </code>
          <code className="px-3 py-1 rounded-lg" style={{ backgroundColor: `${tokens.accent}10` }}>
            "Urgent: finish report by Friday"
          </code>
        </div>
      </div>
    </div>
  );
}

export function EmptyCalendarState({ onAddTask, selectedDate }) {
  const { tokens } = useTheme();
  
  return (
    <div className="text-center py-12 px-4">
      <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: tokens.subtle }} />
      <h3 className="text-xl font-bold mb-2" style={{ color: tokens.color }}>
        No tasks scheduled for this day
      </h3>
      <p className="mb-6" style={{ color: tokens.subtle }}>
        Add a task to plan your day
      </p>
      <Button
        onClick={onAddTask}
        variant="outline"
        style={{ borderColor: tokens.border }}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Task
      </Button>
    </div>
  );
}

export function EmptyTeamState({ onCreateTeam }) {
  const { tokens } = useTheme();
  
  return (
    <div className="text-center py-16 px-4">
      <div 
        className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: `${tokens.accent}20` }}
      >
        <Users className="w-10 h-10" style={{ color: tokens.accent }} />
      </div>
      <h3 className="text-2xl font-bold mb-3" style={{ color: tokens.color }}>
        Start collaborating with your team
      </h3>
      <p className="text-lg mb-6 max-w-md mx-auto" style={{ color: tokens.subtle }}>
        Create a team to share tasks, track progress, and stay aligned with your colleagues.
      </p>
      <Button
        onClick={onCreateTeam}
        className="text-white px-8 py-6 text-lg"
        style={{ backgroundColor: tokens.accent }}
      >
        <Users className="w-5 h-5 mr-2" />
        Create Your First Team
      </Button>
    </div>
  );
}

export function EmptyFocusState({ onSelectTask }) {
  const { tokens } = useTheme();
  
  return (
    <div className="text-center py-12 px-4">
      <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: tokens.subtle }} />
      <h3 className="text-xl font-bold mb-2" style={{ color: tokens.color }}>
        No task selected
      </h3>
      <p className="mb-6" style={{ color: tokens.subtle }}>
        Choose a task to start a focus session
      </p>
      <Button
        onClick={onSelectTask}
        variant="outline"
        style={{ borderColor: tokens.border }}
      >
        <Target className="w-4 h-4 mr-2" />
        Select Task
      </Button>
    </div>
  );
}

export function EmptyInsightsState() {
  const { tokens } = useTheme();
  
  return (
    <div className="text-center py-16 px-4">
      <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: tokens.subtle }} />
      <h3 className="text-xl font-bold mb-2" style={{ color: tokens.color }}>
        Not enough data yet
      </h3>
      <p className="max-w-md mx-auto" style={{ color: tokens.subtle }}>
        Complete more tasks to see insights about your productivity patterns and trends.
      </p>
    </div>
  );
}

export function EmptySearchState({ searchQuery }) {
  const { tokens } = useTheme();
  
  return (
    <div className="text-center py-12 px-4">
      <div className="text-4xl mb-4">🔍</div>
      <h3 className="text-xl font-bold mb-2" style={{ color: tokens.color }}>
        No results for "{searchQuery}"
      </h3>
      <p style={{ color: tokens.subtle }}>
        Try adjusting your search or filters
      </p>
    </div>
  );
}

export default {
  EmptyTasksState,
  EmptyCalendarState,
  EmptyTeamState,
  EmptyFocusState,
  EmptyInsightsState,
  EmptySearchState,
};