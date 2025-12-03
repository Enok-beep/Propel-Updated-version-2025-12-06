import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui-custom/Card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export function ResourceUtilizationReport({ teamId }) {
  const { tokens } = useTheme();

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', teamId],
    queryFn: () => base44.entities.TeamMember.filter({ team_id: teamId, status: 'active' }),
  });

  const { data: capacities = [] } = useQuery({
    queryKey: ['userCapacities', teamId],
    queryFn: () => base44.entities.UserCapacity.filter({ team_id: teamId }),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const report = useMemo(() => {
    const memberStats = teamMembers.map(member => {
      const capacity = capacities.find(c => c.user_email === member.user_email);
      const userTasks = tasks.filter(t => 
        t.assigned_to === member.user_email && 
        t.team_id === teamId && 
        t.status !== 'done' &&
        t.due_date
      );
      
      const totalMinutes = userTasks.reduce((sum, t) => sum + (t.estimated_minutes || 25), 0);
      const weeklyMinutes = (capacity?.weekly_hours || 40) * 60;
      const utilization = (totalMinutes / weeklyMinutes) * 100;
      
      return {
        name: member.user_email.split('@')[0],
        email: member.user_email,
        capacity: capacity?.weekly_hours || 40,
        allocatedHours: Math.round(totalMinutes / 60),
        utilization: Math.round(utilization),
        tasks: userTasks.length,
        skills: capacity?.skills || [],
        status: utilization > 100 ? 'overallocated' : utilization > 85 ? 'high' : 'normal'
      };
    });

    const avgUtilization = memberStats.reduce((sum, m) => sum + m.utilization, 0) / memberStats.length;
    const overallocated = memberStats.filter(m => m.status === 'overallocated');
    const underutilized = memberStats.filter(m => m.utilization < 50);
    const totalCapacity = memberStats.reduce((sum, m) => sum + m.capacity, 0);
    const totalAllocated = memberStats.reduce((sum, m) => sum + m.allocatedHours, 0);

    return {
      memberStats: memberStats.sort((a, b) => b.utilization - a.utilization),
      avgUtilization: Math.round(avgUtilization),
      overallocated: overallocated.length,
      underutilized: underutilized.length,
      totalCapacity,
      totalAllocated,
      teamUtilization: Math.round((totalAllocated / totalCapacity) * 100)
    };
  }, [teamMembers, capacities, tasks, teamId]);

  const getBarColor = (utilization) => {
    if (utilization > 100) return '#EF4444';
    if (utilization > 85) return '#F59E0B';
    return tokens.accent;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5" style={{ color: tokens.accent }} />
        <h3 className="text-lg font-semibold" style={{ color: tokens.color }}>
          Resource Utilization Report
        </h3>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: tokens.accent }} />
            <div>
              <div className="text-xl font-bold" style={{ color: tokens.color }}>
                {report.avgUtilization}%
              </div>
              <div className="text-xs" style={{ color: tokens.subtle }}>Avg Utilization</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: tokens.accent }} />
            <div>
              <div className="text-xl font-bold" style={{ color: tokens.color }}>
                {report.totalAllocated}/{report.totalCapacity}h
              </div>
              <div className="text-xs" style={{ color: tokens.subtle }}>Team Capacity</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <div>
              <div className="text-xl font-bold text-red-500">
                {report.overallocated}
              </div>
              <div className="text-xs" style={{ color: tokens.subtle }}>Overallocated</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-xl font-bold text-green-500">
                {report.memberStats.length - report.overallocated}
              </div>
              <div className="text-xs" style={{ color: tokens.subtle }}>Available</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Utilization Chart */}
      <Card>
        <h4 className="font-medium mb-4" style={{ color: tokens.color }}>
          Team Member Utilization
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={report.memberStats}>
            <XAxis 
              dataKey="name" 
              tick={{ fill: tokens.subtle, fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: tokens.subtle, fontSize: 12 }}
              label={{ value: 'Utilization %', angle: -90, position: 'insideLeft', fill: tokens.subtle }}
            />
            <Bar dataKey="utilization" radius={[8, 8, 0, 0]}>
              {report.memberStats.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.utilization)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed Member List */}
      <Card>
        <h4 className="font-medium mb-3" style={{ color: tokens.color }}>
          Member Details
        </h4>
        <div className="space-y-2">
          {report.memberStats.map(member => (
            <div
              key={member.email}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: `${tokens.accent}05` }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium" style={{ color: tokens.color }}>
                    {member.name}
                  </span>
                  {member.status === 'overallocated' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600">
                      Overallocated
                    </span>
                  )}
                </div>
                <div className="text-xs" style={{ color: tokens.subtle }}>
                  {member.tasks} tasks • {member.allocatedHours}/{member.capacity}h • {member.skills.length} skills
                </div>
              </div>
              <div className="text-right">
                <div 
                  className="text-xl font-bold"
                  style={{ color: getBarColor(member.utilization) }}
                >
                  {member.utilization}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      {(report.overallocated > 0 || report.underutilized > 0) && (
        <Card>
          <h4 className="font-medium mb-3" style={{ color: tokens.color }}>
            💡 Recommendations
          </h4>
          <div className="space-y-2 text-sm">
            {report.overallocated > 0 && (
              <div 
                className="flex items-start gap-2 p-3 rounded-lg"
                style={{ backgroundColor: '#FEF2F2' }}
              >
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p style={{ color: '#991B1B' }}>
                  {report.overallocated} team member(s) are overallocated. 
                  Consider redistributing tasks or extending deadlines.
                </p>
              </div>
            )}
            {report.underutilized > 0 && (
              <div 
                className="flex items-start gap-2 p-3 rounded-lg"
                style={{ backgroundColor: '#ECFDF5' }}
              >
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p style={{ color: '#065F46' }}>
                  {report.underutilized} team member(s) have capacity. 
                  Consider assigning them additional tasks from overallocated members.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default ResourceUtilizationReport;