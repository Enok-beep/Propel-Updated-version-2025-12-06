import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ReminderBubble } from './ReminderBubble';
import { Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ContextReminders({ taskId, projectId, teamId, phoneNumber, contactName }) {
  const { tokens } = useTheme();
  const [dismissedIds, setDismissedIds] = useState([]);

  const { data: allReminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.QuickReminder.list('-priority', 100),
  });

  // Filter reminders based on context
  const contextReminders = allReminders.filter(reminder => {
    if (dismissedIds.includes(reminder.id)) return false;

    // Match by task
    if (taskId && reminder.task_ids?.includes(taskId)) return true;

    // Match by project
    if (projectId && reminder.project_ids?.includes(projectId)) return true;

    // Match by team
    if (teamId && reminder.team_id === teamId) return true;

    // Match by phone number
    if (phoneNumber && reminder.phone_numbers?.some(p => p.includes(phoneNumber))) return true;

    // Match by contact name
    if (contactName && reminder.contact_names?.some(c => 
      c.toLowerCase().includes(contactName.toLowerCase())
    )) return true;

    return false;
  });

  const handleDismiss = (id) => {
    setDismissedIds([...dismissedIds, id]);
  };

  // Reset dismissed when context changes
  useEffect(() => {
    setDismissedIds([]);
  }, [taskId, projectId, teamId, phoneNumber, contactName]);

  if (contextReminders.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-5 h-5" style={{ color: tokens.accent }} />
        <span className="text-sm font-semibold" style={{ color: tokens.color }}>
          Quick Reminders
        </span>
      </div>
      {contextReminders.map(reminder => (
        <ReminderBubble
          key={reminder.id}
          reminder={reminder}
          onDismiss={() => handleDismiss(reminder.id)}
        />
      ))}
    </div>
  );
}

export default ContextReminders;