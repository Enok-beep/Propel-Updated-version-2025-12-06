import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Timer, TrendingUp } from 'lucide-react';
import { startOfDay, isToday, parseISO } from 'date-fns';

export function FocusTimeWidget({ timeEntries = [] }) {
  const { tokens } = useTheme();

  const stats = useMemo(() => {
    const todayEntries = timeEntries.filter(e => 
      e.start_time && isToday(parseISO(e.start_time))
    );

    const totalMinutesToday = todayEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const totalHoursToday = (totalMinutesToday / 60).toFixed(1);

    // Last 7 days average
    const weekEntries = timeEntries.filter(e => {
      if (!e.start_time) return false;
      const date = parseISO(e.start_time);
      const daysDiff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7;
    });

    const avgHoursPerDay = weekEntries.length > 0
      ? ((weekEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60) / 7).toFixed(1)
      : 0;

    return {
      todayHours: totalHoursToday,
      avgHours: avgHoursPerDay,
      sessions: todayEntries.length
    };
  }, [timeEntries]);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Timer className="w-5 h-5" style={{ color: tokens.accent }} />
        <h3 className="font-semibold" style={{ color: tokens.color }}>
          Focus Time
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: tokens.subtle }}>
            Today
          </span>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: tokens.accent }}>
              {stats.todayHours}h
            </div>
            <div className="text-xs" style={{ color: tokens.subtle }}>
              {stats.sessions} sessions
            </div>
          </div>
        </div>

        <div 
          className="flex items-center justify-between p-3 rounded-lg"
          style={{ backgroundColor: `${tokens.accent}10` }}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: tokens.accent }} />
            <span className="text-sm" style={{ color: tokens.color }}>
              7-day average
            </span>
          </div>
          <span className="font-semibold" style={{ color: tokens.accent }}>
            {stats.avgHours}h/day
          </span>
        </div>
      </div>
    </Card>
  );
}