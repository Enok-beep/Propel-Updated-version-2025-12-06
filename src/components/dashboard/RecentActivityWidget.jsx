import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Activity, CheckCircle2, Edit2, MessageSquare, UserPlus } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function RecentActivityWidget({ tasks = [], comments = [], teamMembers = [] }) {
  const { tokens } = useTheme();

  const activities = useMemo(() => {
    const items = [];

    // Task completions
    tasks
      .filter(t => t.status === 'done' && t.completed_at)
      .slice(0, 3)
      .forEach(task => {
        items.push({
          id: `task-${task.id}`,
          type: 'completion',
          icon: CheckCircle2,
          text: `${task.created_by?.split('@')[0] || 'Someone'} completed "${task.title}"`,
          time: parseISO(task.completed_at),
          color: '#10B981'
        });
      });

    // Recent task updates
    tasks
      .filter(t => t.updated_date)
      .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
      .slice(0, 2)
      .forEach(task => {
        items.push({
          id: `update-${task.id}`,
          type: 'update',
          icon: Edit2,
          text: `${task.created_by?.split('@')[0] || 'Someone'} updated "${task.title}"`,
          time: parseISO(task.updated_date),
          color: tokens.accent
        });
      });

    // Recent comments
    comments.slice(0, 2).forEach(comment => {
      items.push({
        id: `comment-${comment.id}`,
        type: 'comment',
        icon: MessageSquare,
        text: `${comment.author_name} commented on a task`,
        time: parseISO(comment.created_date),
        color: '#3B82F6'
      });
    });

    // New team members
    teamMembers
      .filter(tm => tm.joined_date)
      .sort((a, b) => new Date(b.joined_date) - new Date(a.joined_date))
      .slice(0, 2)
      .forEach(member => {
        items.push({
          id: `member-${member.id}`,
          type: 'member',
          icon: UserPlus,
          text: `${member.user_email.split('@')[0]} joined the team`,
          time: parseISO(member.joined_date),
          color: '#8B5CF6'
        });
      });

    return items
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);
  }, [tasks, comments, teamMembers, tokens]);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5" style={{ color: tokens.accent }} />
        <h3 className="font-semibold" style={{ color: tokens.color }}>
          Recent Activity
        </h3>
      </div>

      <div className="space-y-3">
        {activities.map(activity => {
          const Icon = activity.icon;
          
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${activity.color}15` }}
              >
                <Icon className="w-4 h-4" style={{ color: activity.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm" style={{ color: tokens.color }}>
                  {activity.text}
                </div>
                <div className="text-xs mt-0.5" style={{ color: tokens.subtle }}>
                  {formatDistanceToNow(activity.time, { addSuffix: true })}
                </div>
              </div>
            </div>
          );
        })}

        {activities.length === 0 && (
          <div className="text-center py-6" style={{ color: tokens.subtle }}>
            No recent activity
          </div>
        )}
      </div>
    </Card>
  );
}