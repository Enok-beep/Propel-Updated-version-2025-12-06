import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Users, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export function TeamTasksWidget({ tasks = [], teamMembers = [] }) {
  const { tokens } = useTheme();

  const tasksByMember = teamMembers.map(member => {
    const memberTasks = tasks.filter(t => t.assigned_to === member.user_email);
    return {
      email: member.user_email,
      name: member.user_email.split('@')[0],
      total: memberTasks.length,
      completed: memberTasks.filter(t => t.status === 'done').length,
      inProgress: memberTasks.filter(t => t.status === 'in_progress').length,
      overdue: memberTasks.filter(t => 
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
      ).length
    };
  }).slice(0, 5);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5" style={{ color: tokens.accent }} />
        <h3 className="font-semibold" style={{ color: tokens.color }}>
          Team Tasks
        </h3>
      </div>

      <div className="space-y-3">
        {tasksByMember.map(member => (
          <div key={member.email} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-sm" style={{ color: tokens.color }}>
                {member.name}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs flex items-center gap-1" style={{ color: tokens.subtle }}>
                  <CheckCircle2 className="w-3 h-3" />
                  {member.completed}
                </span>
                <span className="text-xs flex items-center gap-1" style={{ color: tokens.subtle }}>
                  <Clock className="w-3 h-3" />
                  {member.inProgress}
                </span>
                {member.overdue > 0 && (
                  <span className="text-xs flex items-center gap-1 text-red-500">
                    <AlertTriangle className="w-3 h-3" />
                    {member.overdue}
                  </span>
                )}
              </div>
            </div>
            <div 
              className="text-lg font-bold"
              style={{ color: tokens.accent }}
            >
              {member.total}
            </div>
          </div>
        ))}

        {tasksByMember.length === 0 && (
          <div className="text-center py-4" style={{ color: tokens.subtle }}>
            No assigned tasks yet
          </div>
        )}
      </div>
    </Card>
  );
}