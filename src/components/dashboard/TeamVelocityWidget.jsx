import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { startOfWeek, format, subWeeks, isWithinInterval, parseISO } from 'date-fns';

export function TeamVelocityWidget({ tasks = [] }) {
  const { tokens } = useTheme();

  const velocityData = useMemo(() => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const completed = tasks.filter(t => 
        t.status === 'done' && 
        t.completed_at &&
        isWithinInterval(parseISO(t.completed_at), { start: weekStart, end: weekEnd })
      ).length;

      weeks.push({
        week: format(weekStart, 'MMM d'),
        completed
      });
    }
    return weeks;
  }, [tasks]);

  const avgVelocity = Math.round(
    velocityData.reduce((sum, w) => sum + w.completed, 0) / velocityData.length
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" style={{ color: tokens.accent }} />
          <h3 className="font-semibold" style={{ color: tokens.color }}>
            Team Velocity
          </h3>
        </div>
        <div className="text-2xl font-bold" style={{ color: tokens.accent }}>
          {avgVelocity}/wk
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={velocityData}>
          <XAxis 
            dataKey="week" 
            tick={{ fill: tokens.subtle, fontSize: 12 }}
          />
          <YAxis 
            tick={{ fill: tokens.subtle, fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: tokens.card,
              border: `1px solid ${tokens.border}`,
              borderRadius: '8px'
            }}
          />
          <Bar dataKey="completed" fill={tokens.accent} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}