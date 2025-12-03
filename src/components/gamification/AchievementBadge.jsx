import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Trophy, Zap, Target, Flame, Star, Award, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ACHIEVEMENTS = {
  first_task: { 
    id: 'first_task', 
    name: 'Getting Started', 
    description: 'Complete your first task', 
    icon: Star, 
    color: '#3B82F6',
    requirement: 1 
  },
  tasks_10: { 
    id: 'tasks_10', 
    name: 'Rising Star', 
    description: 'Complete 10 tasks', 
    icon: Sparkles, 
    color: '#8B5CF6',
    requirement: 10 
  },
  tasks_50: { 
    id: 'tasks_50', 
    name: 'Productive', 
    description: 'Complete 50 tasks', 
    icon: Target, 
    color: '#10B981',
    requirement: 50 
  },
  tasks_100: { 
    id: 'tasks_100', 
    name: 'Century Club', 
    description: 'Complete 100 tasks', 
    icon: Trophy, 
    color: '#F59E0B',
    requirement: 100 
  },
  tasks_500: { 
    id: 'tasks_500', 
    name: 'Powerhouse', 
    description: 'Complete 500 tasks', 
    icon: Crown, 
    color: '#EF4444',
    requirement: 500 
  },
  streak_7: { 
    id: 'streak_7', 
    name: 'Week Warrior', 
    description: '7-day completion streak', 
    icon: Flame, 
    color: '#F97316',
    requirement: 7 
  },
  streak_30: { 
    id: 'streak_30', 
    name: 'Unstoppable', 
    description: '30-day completion streak', 
    icon: Flame, 
    color: '#DC2626',
    requirement: 30 
  },
  speed_demon: { 
    id: 'speed_demon', 
    name: 'Speed Demon', 
    description: 'Complete 20 tasks early', 
    icon: Zap, 
    color: '#FBBF24',
    requirement: 20 
  },
  urgent_master: { 
    id: 'urgent_master', 
    name: 'Crisis Manager', 
    description: 'Complete 25 urgent tasks', 
    icon: Award, 
    color: '#DC2626',
    requirement: 25 
  },
  perfect_week: { 
    id: 'perfect_week', 
    name: 'Perfect Week', 
    description: 'Complete all tasks in a week', 
    icon: Trophy, 
    color: '#10B981',
    requirement: 1 
  },
};

export function AchievementBadge({ achievement, unlocked = false, compact = false }) {
  const { tokens } = useTheme();
  const config = ACHIEVEMENTS[achievement.id] || ACHIEVEMENTS.first_task;
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
          unlocked ? "opacity-100" : "opacity-40"
        )}
        style={{
          backgroundColor: unlocked ? `${config.color}20` : `${tokens.subtle}20`,
          color: unlocked ? config.color : tokens.subtle
        }}
      >
        <Icon className="w-3.5 h-3.5" />
        {config.name}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center p-4 rounded-2xl border-2 transition-all",
        unlocked ? "hover:scale-105" : "opacity-50"
      )}
      style={{
        borderColor: unlocked ? config.color : tokens.border,
        backgroundColor: unlocked ? `${config.color}10` : tokens.card
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
        style={{ backgroundColor: unlocked ? config.color : tokens.subtle }}
      >
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div className="text-center">
        <div className="font-bold text-sm mb-1" style={{ color: tokens.color }}>
          {config.name}
        </div>
        <div className="text-xs" style={{ color: tokens.subtle }}>
          {config.description}
        </div>
      </div>
    </div>
  );
}

export default AchievementBadge;