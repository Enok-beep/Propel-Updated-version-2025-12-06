import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';

export function NotificationSettings({ currentPrefs }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates) => {
      if (currentPrefs) {
        return base44.entities.UserPreferences.update(currentPrefs.id, updates);
      } else {
        return base44.entities.UserPreferences.create(updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });

  const handleToggle = (field, value) => {
    updatePreferencesMutation.mutate({ [field]: value });
  };

  const notificationTypes = [
    {
      id: 'notify_task_assigned',
      label: 'Task Assignments',
      description: 'When someone assigns you a task'
    },
    {
      id: 'notify_comment_mention',
      label: 'Mentions',
      description: 'When someone mentions you in a comment'
    },
    {
      id: 'notify_deadline_soon',
      label: 'Deadline Reminders',
      description: 'When a task deadline is approaching'
    },
    {
      id: 'notify_team_activity',
      label: 'Team Activity',
      description: 'Updates from your team members'
    },
    {
      id: 'notify_achievements',
      label: 'Achievements',
      description: 'When you unlock new achievements'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Master Toggle */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: tokens.border }}>
        <div>
          <div className="font-medium text-sm" style={{ color: tokens.color }}>
            Enable Notifications
          </div>
          <div className="text-xs mt-0.5" style={{ color: tokens.subtle }}>
            Master control for all notifications
          </div>
        </div>
        <Switch
          checked={currentPrefs?.notifications_enabled ?? true}
          onCheckedChange={(checked) => handleToggle('notifications_enabled', checked)}
        />
      </div>

      {/* Individual Notification Types */}
      <div className="space-y-3">
        {notificationTypes.map(type => (
          <div
            key={type.id}
            className="flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: tokens.color }}>
                {type.label}
              </div>
              <div className="text-xs mt-0.5" style={{ color: tokens.subtle }}>
                {type.description}
              </div>
            </div>
            <Switch
              checked={currentPrefs?.[type.id] ?? true}
              onCheckedChange={(checked) => handleToggle(type.id, checked)}
              disabled={!currentPrefs?.notifications_enabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationSettings;