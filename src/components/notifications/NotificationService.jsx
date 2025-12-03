import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInHours, isPast, parseISO } from 'date-fns';
import { RateLimiter } from '../security/sanitize';

export function NotificationService() {
  const queryClient = useQueryClient();
  const sentEmailsRef = useRef(new Set());
  const lastCheckRef = useRef(Date.now());
  const notificationLimiterRef = useRef(new RateLimiter(10, 60000)); // Max 10 notifications per minute
  const emailLimiterRef = useRef(new RateLimiter(5, 300000)); // Max 5 emails per 5 minutes

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    enabled: !!currentUser,
    staleTime: 30000, // Cache for 30 seconds
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
    enabled: !!currentUser,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: existingNotifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
    staleTime: 30000, // Cache for 30 seconds
  });

  const createNotificationMutation = useMutation({
    mutationFn: (notificationData) => base44.entities.Notification.create(notificationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ to, subject, body }) => 
      base44.integrations.Core.SendEmail({ to, subject, body }),
    onError: (error) => {
      // Silently handle rate limit errors
      console.log('Email sending rate limited or failed');
    },
  });

  // Check for deadline notifications
  useEffect(() => {
    if (!currentUser || !preferences[0] || !preferences[0].notifications_enabled) return;

    const prefs = preferences[0];
    if (!prefs.notify_deadline_soon) return;

    // Debounce: Only check every 5 minutes
    const now = Date.now();
    if (now - lastCheckRef.current < 5 * 60 * 1000) return;
    lastCheckRef.current = now;

    const deadlineThresholdHours = prefs.deadline_reminder_hours || 24;

    // Only check tasks with due dates and not done
    const tasksToCheck = tasks.filter(t => t.due_date && t.status !== 'done').slice(0, 50);

    tasksToCheck.forEach(task => {
      const dueDate = parseISO(task.due_date);
      const hoursUntilDue = differenceInHours(dueDate, new Date());
      const isOverdue = isPast(dueDate);

      // Check if we already sent a notification for this task
      const alreadyNotified = existingNotifications.some(
        n => n.related_task_id === task.id && 
        (n.type === 'deadline_soon' || n.type === 'task_overdue')
      );

      if (alreadyNotified) return;

      // Create notification for upcoming deadline (with rate limiting)
      if (hoursUntilDue > 0 && hoursUntilDue <= deadlineThresholdHours) {
        if (!notificationLimiterRef.current.canCall()) {
          console.warn('Notification rate limit reached');
          return;
        }

        const notificationData = {
          user_email: task.assigned_to || task.created_by,
          type: 'deadline_soon',
          title: '⏰ Deadline Approaching',
          message: `"${task.title}" is due in ${Math.round(hoursUntilDue)} hours`,
          related_task_id: task.id,
          action_url: `/tasks?selected=${task.id}`,
        };

        createNotificationMutation.mutate(notificationData);

        // Send email for critical priorities (only once per task, with rate limiting)
        const emailKey = `deadline_${task.id}`;
        if ((task.priority === 'urgent' || task.priority === 'high') && 
            !sentEmailsRef.current.has(emailKey) && 
            emailLimiterRef.current.canCall()) {
          sentEmailsRef.current.add(emailKey);
          sendEmailMutation.mutate({
            to: task.assigned_to || task.created_by,
            subject: `⏰ Urgent: "${task.title}" deadline approaching`,
            body: `Your ${task.priority} priority task "${task.title}" is due in ${Math.round(hoursUntilDue)} hours.\n\nDue: ${dueDate.toLocaleString()}\n\nView task: ${window.location.origin}/tasks?selected=${task.id}`,
          });
        }
      }

      // Create notification for overdue tasks (with rate limiting)
      if (isOverdue) {
        if (!notificationLimiterRef.current.canCall()) {
          console.warn('Notification rate limit reached');
          return;
        }

        const notificationData = {
          user_email: task.assigned_to || task.created_by,
          type: 'task_overdue',
          title: '🚨 Task Overdue',
          message: `"${task.title}" was due ${Math.abs(Math.round(hoursUntilDue))} hours ago`,
          related_task_id: task.id,
          action_url: `/tasks?selected=${task.id}`,
        };

        createNotificationMutation.mutate(notificationData);

        // Send email for overdue tasks (only once per task, with rate limiting)
        const emailKey = `overdue_${task.id}`;
        if (!sentEmailsRef.current.has(emailKey) && emailLimiterRef.current.canCall()) {
          sentEmailsRef.current.add(emailKey);
          sendEmailMutation.mutate({
            to: task.assigned_to || task.created_by,
            subject: `🚨 Overdue: "${task.title}"`,
            body: `Your task "${task.title}" is now overdue.\n\nIt was due: ${dueDate.toLocaleString()}\n\nView task: ${window.location.origin}/tasks?selected=${task.id}`,
          });
        }
      }
    });
  }, [tasks, currentUser, preferences, existingNotifications]);

  return null; // This component doesn't render anything
}

// Helper function to create task assignment notification
export async function notifyTaskAssignment(task, assignedToEmail, assignedByEmail) {
  try {
    const prefs = await base44.entities.UserPreferences.filter({ created_by: assignedToEmail });
    if (!prefs[0]?.notifications_enabled || !prefs[0]?.notify_task_assigned) return;

    await base44.entities.Notification.create({
      user_email: assignedToEmail,
      type: 'task_assigned',
      title: '📋 New Task Assigned',
      message: `You were assigned "${task.title}" by ${assignedByEmail.split('@')[0]}`,
      related_task_id: task.id,
      related_team_id: task.team_id,
      action_url: `/tasks?selected=${task.id}`,
    });

    // Send email notification (with rate limit handling)
    await base44.integrations.Core.SendEmail({
      to: assignedToEmail,
      subject: `📋 New Task: "${task.title}"`,
      body: `You have been assigned a new task by ${assignedByEmail}.\n\nTask: ${task.title}\nPriority: ${task.priority}\n${task.due_date ? `Due: ${new Date(task.due_date).toLocaleString()}\n` : ''}\nView task: ${window.location.origin}/tasks?selected=${task.id}`,
    }).catch(() => {});
  } catch (error) {
    console.error('Failed to send task assignment notification:', error);
  }
}

// Helper function to create status change notification
export async function notifyStatusChange(task, oldStatus, newStatus, changedByEmail) {
  try {
    // Notify watchers and assigned user
    const recipients = new Set([
      task.assigned_to,
      task.created_by,
      ...(task.watchers || [])
    ].filter(Boolean));

    // Remove the person who made the change
    recipients.delete(changedByEmail);

    for (const userEmail of recipients) {
      const prefs = await base44.entities.UserPreferences.filter({ created_by: userEmail });
      if (!prefs[0]?.notifications_enabled || !prefs[0]?.notify_team_activity) continue;

      await base44.entities.Notification.create({
        user_email: userEmail,
        type: 'team_activity',
        title: '🔄 Task Status Updated',
        message: `"${task.title}" moved from ${oldStatus} to ${newStatus} by ${changedByEmail.split('@')[0]}`,
        related_task_id: task.id,
        related_team_id: task.team_id,
        action_url: `/tasks?selected=${task.id}`,
      });

      // Send email for completion of urgent/high priority tasks (with rate limit handling)
      if (newStatus === 'done' && (task.priority === 'urgent' || task.priority === 'high')) {
        await base44.integrations.Core.SendEmail({
          to: userEmail,
          subject: `✅ Task Completed: "${task.title}"`,
          body: `${changedByEmail.split('@')[0]} completed the task "${task.title}".\n\nView task: ${window.location.origin}/tasks?selected=${task.id}`,
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Failed to send status change notification:', error);
  }
}

// Helper function to notify about comments mentioning users
export async function notifyCommentMention(task, mentionedEmails, commenterEmail, commentText) {
  try {
    for (const userEmail of mentionedEmails) {
      if (userEmail === commenterEmail) continue;

      const prefs = await base44.entities.UserPreferences.filter({ created_by: userEmail });
      if (!prefs[0]?.notifications_enabled || !prefs[0]?.notify_comment_mention) continue;

      await base44.entities.Notification.create({
        user_email: userEmail,
        type: 'comment_mention',
        title: '💬 You were mentioned',
        message: `${commenterEmail.split('@')[0]} mentioned you in "${task.title}"`,
        related_task_id: task.id,
        action_url: `/tasks?selected=${task.id}`,
      });

      // Send email notification (with rate limit handling)
      await base44.integrations.Core.SendEmail({
        to: userEmail,
        subject: `💬 Mentioned in "${task.title}"`,
        body: `${commenterEmail} mentioned you in a comment:\n\n"${commentText.substring(0, 200)}${commentText.length > 200 ? '...' : ''}"\n\nView task: ${window.location.origin}/tasks?selected=${task.id}`,
      }).catch(() => {});
    }
  } catch (error) {
    console.error('Failed to send mention notification:', error);
  }
}

export default NotificationService;