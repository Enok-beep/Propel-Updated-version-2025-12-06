import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Users, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function ResourceUtilizationWidget({ tasks = [], teamMembers = [], capacities = [] }) {
  const { tokens } = useTheme();

  const utilization = useMemo(() => {
    return teamMembers.slice(0, 5).map(member => {
      const capacity = capacities.find(c => c.user_email === member.user_email);
      const weeklyHours = capacity?.weekly_hours || 40;

      const memberTasks = tasks.filter(t => 
        t.assigned_to === member.user_email && t.status !== 'done'
      );

      const allocatedHours = memberTasks.reduce((sum, t) => 
        sum + ((t.estimated_minutes || 25) / 60), 0
      );

      const utilizationPercent = Math.round((allocatedHours / weeklyHours) * 100);
      const isOverallocated = utilizationPercent > 100;

      return {
        email: member.user_email,
        name: member.user_email.split('@')[0],
        allocated: allocatedHours.toFixed(1),
        capacity: weeklyHours,
        percentage: utilizationPercent,
        isOverallocated
      };
    });
  }, [tasks, teamMembers, capacities]);

  const getBarColor = (percentage) => {
    if (percentage > 100) return '#DC2626';
    if (percentage > 80) return '#F59E0B';
    return tokens.accent;
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5" style={{ color: tokens.accent }} />
        <h3 className="font-semibold" style={{ color: tokens.color }}>
          Resource Utilization
        </h3>
      </div>

      <div className="space-y-3">
        {utilization.map(member => (
          <div key={member.email}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: tokens.color }}>
                  {member.name}
                </span>
                {member.isOverallocated && (
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                )}
              </div>
              <span className="text-xs" style={{ color: tokens.subtle }}>
                {member.allocated}h / {member.capacity}h
              </span>
            </div>
            <div 
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: `${tokens.accent}20` }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(member.percentage, 100)}%`,
                  backgroundColor: getBarColor(member.percentage)
                }}
              />
            </div>
          </div>
        ))}

        {utilization.length === 0 && (
          <div className="text-center py-4" style={{ color: tokens.subtle }}>
            No team members yet
          </div>
        )}
      </div>
    </Card>
  );
}