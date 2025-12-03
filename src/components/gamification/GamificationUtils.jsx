import { base44 } from '@/api/base44Client';
import { startOfDay, differenceInDays } from 'date-fns';

export const POINTS = {
  TASK_COMPLETE: 10,
  URGENT_COMPLETE: 25,
  HIGH_COMPLETE: 15,
  EARLY_COMPLETE: 20,
  STREAK_BONUS: 5,
};

export async function calculatePoints(task, completedEarly = false) {
  let points = POINTS.TASK_COMPLETE;

  if (task.priority === 'urgent') {
    points += POINTS.URGENT_COMPLETE;
  } else if (task.priority === 'high') {
    points += POINTS.HIGH_COMPLETE;
  }

  if (completedEarly && task.due_date) {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    if (now < dueDate) {
      points += POINTS.EARLY_COMPLETE;
    }
  }

  return points;
}

export async function updateUserStats(userEmail, task, pointsEarned) {
  try {
    const stats = await base44.entities.UserStats.filter({ user_email: userEmail });
    let userStats = stats[0];

    const today = startOfDay(new Date()).toISOString().split('T')[0];
    const lastCompletionDate = userStats?.last_completion_date;

    let newStreak = 1;
    if (lastCompletionDate) {
      const daysDiff = differenceInDays(
        startOfDay(new Date()),
        startOfDay(new Date(lastCompletionDate))
      );
      
      if (daysDiff === 0) {
        newStreak = userStats.current_streak;
      } else if (daysDiff === 1) {
        newStreak = userStats.current_streak + 1;
      } else {
        newStreak = 1;
      }
    }

    let streakBonus = 0;
    if (newStreak > 1) {
      streakBonus = POINTS.STREAK_BONUS * newStreak;
    }

    const totalPoints = (userStats?.total_points || 0) + pointsEarned + streakBonus;
    const tasksCompleted = (userStats?.tasks_completed || 0) + 1;
    const longestStreak = Math.max(newStreak, userStats?.longest_streak || 0);
    
    const speedBonusCount = (userStats?.speed_bonus_count || 0) + 
      (task.due_date && new Date() < new Date(task.due_date) ? 1 : 0);
    const urgentTasksCompleted = (userStats?.urgent_tasks_completed || 0) + 
      (task.priority === 'urgent' ? 1 : 0);

    const newAchievements = checkAchievements({
      tasks_completed: tasksCompleted,
      current_streak: newStreak,
      speed_bonus_count: speedBonusCount,
      urgent_tasks_completed: urgentTasksCompleted,
      achievements: userStats?.achievements || []
    });

    const updatedData = {
      user_email: userEmail,
      total_points: totalPoints,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_completion_date: today,
      tasks_completed: tasksCompleted,
      speed_bonus_count: speedBonusCount,
      urgent_tasks_completed: urgentTasksCompleted,
      achievements: newAchievements
    };

    if (userStats) {
      await base44.entities.UserStats.update(userStats.id, updatedData);
    } else {
      await base44.entities.UserStats.create(updatedData);
    }

    return { 
      pointsEarned: pointsEarned + streakBonus, 
      newStreak,
      unlockedAchievements: newAchievements.filter(a => 
        !userStats?.achievements?.includes(a)
      )
    };
  } catch (error) {
    console.error('Failed to update stats:', error);
    return { pointsEarned: 0, newStreak: 0, unlockedAchievements: [] };
  }
}

function checkAchievements(stats) {
  const unlocked = [...(stats.achievements || [])];
  
  if (stats.tasks_completed >= 1 && !unlocked.includes('first_task')) {
    unlocked.push('first_task');
  }
  if (stats.tasks_completed >= 10 && !unlocked.includes('tasks_10')) {
    unlocked.push('tasks_10');
  }
  if (stats.tasks_completed >= 50 && !unlocked.includes('tasks_50')) {
    unlocked.push('tasks_50');
  }
  if (stats.tasks_completed >= 100 && !unlocked.includes('tasks_100')) {
    unlocked.push('tasks_100');
  }
  if (stats.tasks_completed >= 500 && !unlocked.includes('tasks_500')) {
    unlocked.push('tasks_500');
  }

  if (stats.current_streak >= 7 && !unlocked.includes('streak_7')) {
    unlocked.push('streak_7');
  }
  if (stats.current_streak >= 30 && !unlocked.includes('streak_30')) {
    unlocked.push('streak_30');
  }

  if (stats.speed_bonus_count >= 20 && !unlocked.includes('speed_demon')) {
    unlocked.push('speed_demon');
  }
  if (stats.urgent_tasks_completed >= 25 && !unlocked.includes('urgent_master')) {
    unlocked.push('urgent_master');
  }

  return unlocked;
}