import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Target, CheckCircle2 } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';

export function DailyGoalsWidget({ tasks = [], goalCount = 5 }) {
  const { tokens } = useTheme();

  const progress = useMemo(() => {
    const completedToday = tasks.filter(t => 
      t.status === 'done' && 
      t.completed_at && 
      isToday(parseISO(t.completed_at))
    ).length;

    const percentage = Math.min(Math.round((completedToday / goalCount) * 100), 100);

    return {
      completed: completedToday,
      goal: goalCount,
      percentage
    };
  }, [tasks, goalCount]);

  const isGoalMet = progress.completed >= progress.goal;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5" style={{ color: tokens.accent }} />
          <h3 className="font-semibold" style={{ color: tokens.color }}>
            Daily Goal
          </h3>
        </div>
        {isGoalMet && (
          <span className="text-2xl">🎉</span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: tokens.subtle }}>
            Tasks completed today
          </span>
          <div className="text-2xl font-bold" style={{ color: tokens.accent }}>
            {progress.completed}/{progress.goal}
          </div>
        </div>

        <div 
          className="h-3 rounded-full overflow-hidden"
          style={{ backgroundColor: `${tokens.accent}20` }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress.percentage}%`,
              backgroundColor: tokens.accent
            }}
          />
        </div>

        {isGoalMet && (
          <div 
            className="flex items-center gap-2 p-2 rounded-lg text-sm"
            style={{ backgroundColor: `${tokens.accent}10`, color: tokens.accent }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Goal achieved! Keep up the momentum!
          </div>
        )}
      </div>
    </Card>
  );
}