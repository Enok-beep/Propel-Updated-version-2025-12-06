import React, { useState, useMemo } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui-custom/Card';
import { TaskCard } from '@/components/tasks/TaskCard';
import { EnergySelector, CurrentEnergyBadge } from '@/components/ui-custom/EnergySelector';
import { Button } from '@/components/ui/button';
import { 
  Plus, Sparkles, Target, Flame, CheckCircle2, 
  TrendingUp, Zap, ArrowRight, BarChart3, Trophy
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TaskForm from '@/components/tasks/TaskForm';
import { PointsDisplay } from '@/components/gamification/PointsDisplay';
import { AchievementBadge, ACHIEVEMENTS } from '@/components/gamification/AchievementBadge';
import { Leaderboard } from '@/components/gamification/Leaderboard';
import { calculatePoints, updateUserStats } from '@/components/gamification/GamificationUtils';
import { AIPrioritization } from '@/components/ai/AIPrioritization';
import { TaskDetailSheet } from '@/components/calendar/TaskDetailSheet';
import { AIInsights } from '@/components/dashboard/AIInsights';
import { DashboardCustomizer } from '@/components/dashboard/DashboardCustomizer';
import { SmartTaskList } from '@/components/dashboard/SmartTaskList';
import { DashboardSkeleton, StatCardSkeleton, WidgetSkeleton, ListSkeleton } from '@/components/ui-custom/LoadingSkeleton';
import { WidgetSelector } from '@/components/dashboard/WidgetSelector';
import { TeamVelocityWidget } from '@/components/dashboard/TeamVelocityWidget';
import { TeamTasksWidget } from '@/components/dashboard/TeamTasksWidget';
import { ProjectTimelineWidget } from '@/components/dashboard/ProjectTimelineWidget';
import { FocusTimeWidget } from '@/components/dashboard/FocusTimeWidget';
import { DailyGoalsWidget } from '@/components/dashboard/DailyGoalsWidget';
import { UpcomingCalendarWidget } from '@/components/dashboard/UpcomingCalendarWidget';
import { TimeTrackingWidget } from '@/components/dashboard/TimeTrackingWidget';
import { ResourceUtilizationWidget } from '@/components/dashboard/ResourceUtilizationWidget';
import { UpcomingMeetingsWidget } from '@/components/dashboard/UpcomingMeetingsWidget';
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget';
import { OverdueAlertsWidget } from '@/components/dashboard/OverdueAlertsWidget';
import { WeatherWidget } from '@/components/weather/WeatherWidget';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { ConfirmDialog } from '@/components/ui-custom/ConfirmDialog';
import { useUndo } from '@/components/undo/UndoManager';
import { usePullToRefresh } from '@/components/mobile/TouchGestures';
import { useKeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';
import { usePageTracking } from '@/components/analytics/usePageTracking';
import { useAnalytics, EVENTS } from '@/components/analytics/AnalyticsProvider';

export default function Dashboard() {
  const { tokens } = useTheme();
  const { trackEvent } = useAnalytics();
  const queryClient = useQueryClient();
  const { addToUndoStack } = useUndo();
  
  usePageTracking('Dashboard');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEnergyPicker, setShowEnergyPicker] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentEnergy, setCurrentEnergy] = useState('medium');
  const [workMode, setWorkMode] = useState('personal');
  const [activeWidgets, setActiveWidgets] = useState([]);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
  });

  // Fetch preferences
  const { data: prefs = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  // Fetch user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch user stats
  const { data: userStats = [] } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.UserStats.filter({ user_email: user.email });
    },
    enabled: !!user?.email,
  });

  // Fetch team data (for team mode)
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    enabled: workMode === 'team',
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    enabled: workMode === 'team' && teams.length > 0,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: workMode === 'team',
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date', 100),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-date', 50),
  });

  const { data: capacities = [] } = useQuery({
    queryKey: ['capacities'],
    queryFn: () => base44.entities.UserCapacity.list(),
    enabled: workMode === 'team',
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments'],
    queryFn: () => base44.entities.TaskComment.list('-created_date', 50),
    enabled: workMode === 'team',
  });

  React.useEffect(() => {
    if (prefs.length > 0) {
      if (prefs[0].current_energy) {
        setCurrentEnergy(prefs[0].current_energy);
      }
      const mode = prefs[0].work_mode || 'personal';
      setWorkMode(mode);
      
      const widgetKey = mode === 'team' ? 'dashboard_widgets_team' : 'dashboard_widgets_personal';
      if (prefs[0][widgetKey]) {
        setActiveWidgets(prefs[0][widgetKey]);
      }

      // Check if onboarding is needed
      if (!prefs[0].onboarding_completed) {
        setShowOnboarding(true);
      }
    }
  }, [prefs]);

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (submission) => {
      trackEvent(EVENTS.TASK_CREATED, {
        priority: submission.taskData.priority,
        category: submission.taskData.category,
      });
      
      const task = await base44.entities.Task.create(submission.taskData);
      
      // Create attachments
      if (submission.attachments?.length > 0) {
        await Promise.all(
          submission.attachments.map(att =>
            base44.entities.Attachment.create({
              task_id: task.id,
              ...att,
              uploaded_by: user?.email
            })
          )
        );
      }

      // Create sub-tasks
      if (submission.subTasks?.length > 0) {
        await Promise.all(
          submission.subTasks.map(subTask =>
            base44.entities.Task.create({
              ...subTask,
              parent_task_id: task.id
            })
          )
        );
      }

      return task;
    },
    onMutate: async (submission) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(['tasks']);

      // Optimistically update
      queryClient.setQueryData(['tasks'], (old = []) => [
        {
          id: `temp-${Date.now()}`,
          ...submission.taskData,
          created_date: new Date().toISOString(),
          created_by: user?.email
        },
        ...old
      ]);

      return { previousTasks };
    },
    onError: (error, submission, context) => {
      // Rollback on error
      queryClient.setQueryData(['tasks'], context.previousTasks);
      console.error('Failed to create task:', error);
      toast.error('Failed to create task. Please try again.');
    },
    onSuccess: () => {
      setShowTaskForm(false);
      toast.success('Task created successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);

      // Optimistically update
      queryClient.setQueryData(['tasks'], (old = []) =>
        old.map(task => task.id === id ? { ...task, ...data } : task)
      );

      return { previousTasks };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['tasks'], context.previousTasks);
      console.error('Failed to update task:', error);
      toast.error('Failed to update task. Please try again.');
    },
    onSuccess: () => {
      toast.success('Task updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateEnergyMutation = useMutation({
    mutationFn: async (energy) => {
      if (prefs.length > 0) {
        return base44.entities.UserPreferences.update(prefs[0].id, { current_energy: energy });
      }
      return base44.entities.UserPreferences.create({ current_energy: energy });
    },
    onMutate: async (energy) => {
      await queryClient.cancelQueries({ queryKey: ['preferences'] });
      const previousPrefs = queryClient.getQueryData(['preferences']);

      // Optimistically update
      queryClient.setQueryData(['preferences'], (old = []) => {
        if (old.length > 0) {
          return [{ ...old[0], current_energy: energy }];
        }
        return [{ current_energy: energy }];
      });

      return { previousPrefs };
    },
    onError: (error, energy, context) => {
      queryClient.setQueryData(['preferences'], context.previousPrefs);
      console.error('Failed to update energy:', error);
      toast.error('Failed to update energy. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });

  const handleEnergyChange = (energy) => {
    setCurrentEnergy(energy);
    updateEnergyMutation.mutate(energy);
    setShowEnergyPicker(false);
  };

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const completedToday = tasks.filter(t => 
      t.status === 'done' && 
      t.completed_at && 
      new Date(t.completed_at).toDateString() === today
    ).length;
    const pending = tasks.filter(t => t.status !== 'done').length;
    const highPriority = tasks.filter(t => 
      t.status !== 'done' && 
      (t.priority === 'high' || t.priority === 'urgent')
    ).length;
    
    return { completedToday, pending, highPriority };
  }, [tasks]);

  // Energy-matched recommendations
  const recommendedTasks = useMemo(() => {
    const pending = tasks.filter(t => t.status !== 'done');
    
    // Score tasks based on energy match, priority, and due date
    const scored = pending.map(task => {
      let score = 0;
      
      // Energy match (most important)
      if (task.energy_level === currentEnergy) score += 100;
      else if (
        (currentEnergy === 'high' && task.energy_level === 'medium') ||
        (currentEnergy === 'medium' && task.energy_level === 'low')
      ) score += 50;
      
      // Priority boost
      if (task.priority === 'urgent') score += 80;
      else if (task.priority === 'high') score += 60;
      else if (task.priority === 'medium') score += 30;
      
      // Due date urgency
      if (task.due_date) {
        const daysUntil = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 0) score += 100;
        else if (daysUntil <= 1) score += 70;
        else if (daysUntil <= 3) score += 40;
      }
      
      return { ...task, score };
    });
    
    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [tasks, currentEnergy]);

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    
    if (newStatus === 'done' && user?.email) {
      const completedEarly = task.due_date && new Date() < new Date(task.due_date);
      const points = await calculatePoints(task, completedEarly);
      await updateUserStats(user.email, task, points);
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    }
    
    updateTaskMutation.mutate({
      id: task.id,
      data: { 
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      }
    });
  };

  const deleteTaskMutation = useMutation({
    mutationFn: (task) => {
      // Optimistically remove from UI
      queryClient.setQueryData(['tasks'], (old = []) => old.filter(t => t.id !== task.id));
      
      // Add to undo stack instead of deleting immediately
      addToUndoStack({
        type: 'DELETE_TASK',
        data: task,
        message: `Task "${task.title}" deleted`,
      });
      
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const currentStats = userStats[0];
  const recentAchievements = currentStats?.achievements?.slice(-3) || [];

  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    tasks: pendingTasks,
    selectedIndex: selectedTaskIndex,
    onSelectTask: (index) => {
      setSelectedTaskIndex(index);
      const task = pendingTasks[index];
      if (task) {
        setSelectedTask(task);
        setShowTaskDetail(true);
      }
    },
    onToggleStatus: toggleTaskStatus,
    onEditTask: (task) => {
      setSelectedTask(task);
      setShowTaskDetail(true);
    },
    onDeleteTask: (task) => setTaskToDelete(task),
    onNewTask: () => setShowTaskForm(true),
    enabled: !showTaskForm && !showTaskDetail
  });

  // Pull to refresh
  usePullToRefresh({
    onRefresh: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
    enabled: true
  });

  // Show loading skeleton while initial data is loading
  if (isLoading && tasks.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h1 
            className="text-3xl font-bold tracking-tight"
            style={{ color: tokens.color }}
          >
            Good {getGreeting()}
          </h1>
          <p style={{ color: tokens.subtle }} className="mt-1">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <WidgetSelector
            mode={workMode}
            selectedWidgets={activeWidgets}
            onSave={async (widgets) => {
              setActiveWidgets(widgets);
              if (prefs.length > 0) {
                const widgetKey = workMode === 'team' ? 'dashboard_widgets_team' : 'dashboard_widgets_personal';
                await base44.entities.UserPreferences.update(prefs[0].id, {
                  [widgetKey]: widgets
                });
                queryClient.invalidateQueries({ queryKey: ['preferences'] });
              }
            }}
          />
          {workMode === 'personal' && (
            <CurrentEnergyBadge 
              energy={currentEnergy} 
              onClick={() => setShowEnergyPicker(true)} 
            />
          )}
          <Button
            onClick={() => setShowTaskForm(true)}
            style={{ backgroundColor: tokens.accent }}
            className="text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* AI Insights - Personal Mode */}
      {workMode === 'personal' && activeWidgets.includes('energy_insights') && (
        <div className="mb-8">
          <AIInsights 
            tasks={tasks.filter(t => t.status !== 'done')} 
            meetings={[]}
          />
        </div>
      )}

      {/* Stats Row */}
      {activeWidgets.includes('quick_stats') && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="text-center py-6">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: tokens.accent }} />
            <div className="text-3xl font-bold" style={{ color: tokens.color }}>
              {stats.completedToday}
            </div>
            <div className="text-sm" style={{ color: tokens.subtle }}>Done Today</div>
          </Card>
          
          <Card className="text-center py-6">
            <Target className="w-8 h-8 mx-auto mb-2" style={{ color: tokens.accent }} />
            <div className="text-3xl font-bold" style={{ color: tokens.color }}>
              {stats.pending}
            </div>
            <div className="text-sm" style={{ color: tokens.subtle }}>Pending</div>
          </Card>
          
          <Card className="text-center py-6">
            <Flame className="w-8 h-8 mx-auto mb-2" style={{ color: '#EF4444' }} />
            <div className="text-3xl font-bold" style={{ color: tokens.color }}>
              {stats.highPriority}
            </div>
            <div className="text-sm" style={{ color: tokens.subtle }}>High Priority</div>
          </Card>
        </div>
      )}

      {/* Smart Task List */}
      {activeWidgets.includes('prioritized_tasks') && (
        <div className="mb-8">
          <SmartTaskList
            tasks={tasks.filter(t => t.status !== 'done')}
            currentEnergy={workMode === 'personal' ? currentEnergy : null}
            onTaskClick={(task) => {
              setSelectedTask(task);
              setShowTaskDetail(true);
            }}
          />
        </div>
      )}

      {/* Gamification Section - Personal Mode */}
      {workMode === 'personal' && activeWidgets.includes('achievements') && currentStats && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Points & Achievements */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5" style={{ color: tokens.accent }} />
              <h3 className="text-lg font-semibold" style={{ color: tokens.color }}>
                Your Progress
              </h3>
            </div>
            
            <PointsDisplay 
              points={currentStats.total_points} 
              streak={currentStats.current_streak}
            />

            {recentAchievements.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium mb-2" style={{ color: tokens.subtle }}>
                  Recent Achievements
                </div>
                <div className="flex gap-2 flex-wrap">
                  {recentAchievements.map(achievementId => (
                    <AchievementBadge 
                      key={achievementId}
                      achievement={{ id: achievementId }}
                      unlocked
                      compact
                    />
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Leaderboard */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" style={{ color: tokens.accent }} />
                <h3 className="text-lg font-semibold" style={{ color: tokens.color }}>
                  Leaderboard
                </h3>
              </div>
            </div>
            <Leaderboard limit={5} />
          </Card>
        </div>
      )}

      {/* Personal Mode Widgets */}
      {workMode === 'personal' && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {activeWidgets.includes('daily_goals') && (
            <DailyGoalsWidget 
              tasks={tasks} 
              goalCount={prefs[0]?.daily_goal_tasks || 5} 
            />
          )}
          {activeWidgets.includes('focus_time') && (
            <FocusTimeWidget timeEntries={timeEntries} />
          )}
          {activeWidgets.includes('upcoming_calendar') && (
            <UpcomingCalendarWidget tasks={tasks} meetings={meetings} />
          )}
          {activeWidgets.includes('time_tracking') && (
            <TimeTrackingWidget timeEntries={timeEntries} />
          )}
          {activeWidgets.includes('weather') && (
            <WeatherWidget />
          )}
        </div>
      )}

      {/* Team Mode Widgets */}
      {workMode === 'team' && (
        <>
          {activeWidgets.includes('team_velocity') && (
            <div className="mb-8">
              <TeamVelocityWidget tasks={tasks} />
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {activeWidgets.includes('team_tasks') && (
              <TeamTasksWidget 
                tasks={tasks.filter(t => t.team_id)} 
                teamMembers={teamMembers.filter(tm => tm.status === 'active')}
              />
            )}
            {activeWidgets.includes('project_timeline') && (
              <ProjectTimelineWidget projects={projects} />
            )}
            {activeWidgets.includes('resource_utilization') && (
              <ResourceUtilizationWidget 
                tasks={tasks.filter(t => t.team_id)} 
                teamMembers={teamMembers.filter(tm => tm.status === 'active')}
                capacities={capacities}
              />
            )}
            {activeWidgets.includes('upcoming_meetings') && (
              <UpcomingMeetingsWidget meetings={meetings} />
            )}
            {activeWidgets.includes('recent_activity') && (
              <RecentActivityWidget 
                tasks={tasks.filter(t => t.team_id)}
                comments={comments}
                teamMembers={teamMembers}
              />
            )}
            {activeWidgets.includes('overdue_alerts') && (
              <OverdueAlertsWidget 
                tasks={tasks.filter(t => t.team_id)}
                projects={projects}
              />
            )}
          </div>
        </>
      )}



      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to={createPageUrl('Insights')}>
          <Card className="hover:scale-[1.02] transition-transform cursor-pointer">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${tokens.accent}20` }}
              >
                <TrendingUp className="w-6 h-6" style={{ color: tokens.accent }} />
              </div>
              <div>
                <div className="font-semibold" style={{ color: tokens.color }}>
                  View Insights
                </div>
                <div className="text-sm" style={{ color: tokens.subtle }}>
                  Productivity patterns
                </div>
              </div>
            </div>
          </Card>
        </Link>
        
        <Link to={createPageUrl('Analytics')}>
          <Card className="hover:scale-[1.02] transition-transform cursor-pointer">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${tokens.accent}20` }}
              >
                <BarChart3 className="w-6 h-6" style={{ color: tokens.accent }} />
              </div>
              <div>
                <div className="font-semibold" style={{ color: tokens.color }}>
                  View Analytics
                </div>
                <div className="text-sm" style={{ color: tokens.subtle }}>
                  Track your progress
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Energy Picker Dialog */}
      <Dialog open={showEnergyPicker} onOpenChange={setShowEnergyPicker}>
        <DialogContent style={{ backgroundColor: tokens.card, borderColor: tokens.border }}>
          <DialogHeader>
            <DialogTitle style={{ color: tokens.color }}>
              How's your energy right now?
            </DialogTitle>
          </DialogHeader>
          <EnergySelector value={currentEnergy} onChange={handleEnergyChange} />
        </DialogContent>
      </Dialog>

      {/* Task Form Dialog */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent 
          className="max-w-lg max-h-[85vh] overflow-y-auto"
          style={{ backgroundColor: tokens.card, borderColor: tokens.border }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: tokens.color }}>
              Create New Task
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            onSubmit={(data) => createTaskMutation.mutate(data)}
            onCancel={() => setShowTaskForm(false)}
            isLoading={createTaskMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Task Detail Sheet */}
      {selectedTask && showTaskDetail && (
        <TaskDetailSheet
          task={selectedTask}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          onEdit={() => {}}
          onDelete={() => {}}
          onComplete={toggleTaskStatus}
        />
      )}

      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false);
            queryClient.invalidateQueries({ queryKey: ['preferences'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="Delete Task"
        description={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (taskToDelete) {
            deleteTaskMutation.mutate(taskToDelete);
            setTaskToDelete(null);
            setShowTaskDetail(false);
          }
        }}
      />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}