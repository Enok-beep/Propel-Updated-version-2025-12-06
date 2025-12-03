import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export async function createNotification({
  userEmail,
  type,
  title,
  message,
  actionUrl,
  relatedTaskId,
  relatedTeamId,
  metadata
}) {
  try {
    // Check user preferences
    const prefs = await base44.entities.UserPreferences.filter({ user_email: userEmail });
    const userPrefs = prefs[0];

    if (!userPrefs?.notifications_enabled) return;

    // Check specific notification type preference
    const typePrefs = {
      task_assigned: userPrefs?.notify_task_assigned,
      comment_mention: userPrefs?.notify_comment_mention,
      deadline_soon: userPrefs?.notify_deadline_soon,
      team_activity: userPrefs?.notify_team_activity,
      achievement_unlocked: userPrefs?.notify_achievements,
    };

    if (typePrefs[type] === false) return;

    await base44.entities.Notification.create({
      user_email: userEmail,
      type,
      title,
      message,
      action_url: actionUrl,
      related_task_id: relatedTaskId,
      related_team_id: relatedTeamId,
      metadata,
      read: false
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function notifyTaskAssigned(taskTitle, assigneeEmail, assignerName, taskId) {
  await createNotification({
    userEmail: assigneeEmail,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `${assignerName} assigned you "${taskTitle}"`,
    actionUrl: createPageUrl('Tasks'),
    relatedTaskId: taskId
  });
}

export async function notifyCommentMention(taskTitle, mentionedEmail, commenterName, taskId) {
  await createNotification({
    userEmail: mentionedEmail,
    type: 'comment_mention',
    title: 'You were mentioned',
    message: `${commenterName} mentioned you in "${taskTitle}"`,
    actionUrl: createPageUrl('Tasks'),
    relatedTaskId: taskId
  });
}

export async function notifyDeadlineSoon(taskTitle, userEmail, taskId, hoursRemaining) {
  await createNotification({
    userEmail,
    type: 'deadline_soon',
    title: 'Deadline Approaching',
    message: `"${taskTitle}" is due in ${hoursRemaining} hours`,
    actionUrl: createPageUrl('Tasks'),
    relatedTaskId: taskId
  });
}

export async function notifyTaskStatusChange(taskTitle, assigneeEmail, newStatus, changerName, taskId) {
  await createNotification({
    userEmail: assigneeEmail,
    type: 'team_activity',
    title: 'Task Status Updated',
    message: `${changerName} changed "${taskTitle}" to ${newStatus}`,
    actionUrl: createPageUrl('Tasks'),
    relatedTaskId: taskId
  });
}

export async function notifyWatchers(taskTitle, watcherEmails, action, actorName, taskId) {
  for (const email of watcherEmails) {
    await createNotification({
      userEmail: email,
      type: 'team_activity',
      title: 'Task Update',
      message: `${actorName} ${action} on "${taskTitle}"`,
      actionUrl: createPageUrl('Tasks'),
      relatedTaskId: taskId
    });
  }
}

export async function notifyProjectMilestone(projectName, teamMemberEmails, milestone, teamId) {
  for (const email of teamMemberEmails) {
    await createNotification({
      userEmail: email,
      type: 'team_activity',
      title: '🎯 Project Milestone',
      message: `${projectName}: ${milestone}`,
      actionUrl: createPageUrl('TeamDashboard'),
      relatedTeamId: teamId
    });
  }
}

export async function notifyTeamActivity(teamName, activityMessage, teamMemberEmails, teamId) {
  for (const email of teamMemberEmails) {
    await createNotification({
      userEmail: email,
      type: 'team_activity',
      title: `${teamName} Activity`,
      message: activityMessage,
      actionUrl: createPageUrl('TeamDashboard'),
      relatedTeamId: teamId
    });
  }
}

export async function notifyAchievementUnlocked(achievementName, achievementDesc, userEmail) {
  await createNotification({
    userEmail,
    type: 'achievement_unlocked',
    title: '🏆 Achievement Unlocked!',
    message: `${achievementName}: ${achievementDesc}`,
    actionUrl: createPageUrl('Dashboard')
  });
}