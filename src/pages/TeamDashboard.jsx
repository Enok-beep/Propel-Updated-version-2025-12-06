import React, { useMemo, useState } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui-custom/Card';
import { TeamTaskList } from '@/components/team/TeamTaskList';
import { TeamCalendar } from '@/components/team/TeamCalendar';
import { ProjectDashboard } from '@/components/team/ProjectDashboard';
import { PresenceIndicator, PresenceUpdater } from '@/components/team/PresenceIndicator';
import { AISearch } from '@/components/team/AISearch';
import { ResourceManager } from '@/components/resources/ResourceManager';
import { ResourceUtilizationReport } from '@/components/resources/ResourceUtilizationReport';
import { getUserTeamRole } from '@/components/utils/roleAccess';
import { Users, CheckCircle2, Clock, AlertTriangle, TrendingUp, List, BarChart3, Calendar, FolderKanban, Search, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TeamDashboard() {
  const { tokens } = useTheme();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'tasks', 'calendar', 'projects'
  const [showSearch, setShowSearch] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const activeTeamId = preferences[0]?.active_team_id;
  const activeTeam = teams.find(t => t.id === activeTeamId);
  const activeMembers = teamMembers.filter(m => m.team_id === activeTeamId && m.status === 'active');
  const teamTasks = allTasks.filter(t => t.team_id === activeTeamId);
  const userRole = user ? getUserTeamRole(teamMembers, activeTeamId, user.email) : null;

  const analytics = useMemo(() => {
    const thisWeekStart = startOfWeek(new Date());
    const thisWeekEnd = endOfWeek(new Date());

    const completed = teamTasks.filter(t => t.status === 'done').length;
    const inProgress = teamTasks.filter(t => t.status === 'in_progress').length;
    const overdue = teamTasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    ).length;

    const thisWeekTasks = teamTasks.filter(t => {
      if (!t.due_date) return false;
      return isWithinInterval(parseISO(t.due_date), { start: thisWeekStart, end: thisWeekEnd });
    });

    const memberStats = activeMembers.map(member => {
      const memberTasks = teamTasks.filter(t => t.assigned_to === member.user_email);
      const memberCompleted = memberTasks.filter(t => t.status === 'done').length;
      const memberTotal = memberTasks.length;
      const totalMinutes = memberTasks
        .filter(t => t.status !== 'done')
        .reduce((sum, t) => sum + (t.estimated_minutes || 25), 0);
      
      return {
        email: member.user_email,
        tasksTotal: memberTotal,
        tasksCompleted: memberCompleted,
        capacity: totalMinutes / 480, // 8 hours
        overloaded: totalMinutes > 480
      };
    });

    return {
      completed,
      inProgress,
      overdue,
      thisWeekCount: thisWeekTasks.length,
      memberStats
    };
  }, [teamTasks, activeMembers]);

  if (!activeTeam) {
    return (
      <div className="min-h-screen p-4 lg:p-6 flex items-center justify-center" style={{ backgroundColor: tokens.bg }}>
        <Card className="text-center py-12 max-w-md">
          <Users className="w-12 h-12 mx-auto mb-4" style={{ color: tokens.subtle }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: tokens.color }}>
            No Active Team
          </h3>
          <p className="text-sm" style={{ color: tokens.subtle }}>
            Switch to team mode in Settings to view team dashboard
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ backgroundColor: tokens.bg }}>
      <PresenceUpdater />
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${tokens.accent}20` }}
            >
              {activeTeam.avatar}
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: tokens.color }}>
                {activeTeam.name}
              </h1>
              <p className="text-sm" style={{ color: tokens.subtle }}>
                Team Dashboard • {activeMembers.length} members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowSearch(!showSearch)}
              variant="outline"
              size="sm"
              style={{ borderColor: tokens.border }}
            >
              <Search className="w-4 h-4 mr-2" />
              AI Search
            </Button>
          </div>
        </div>

        {/* AI Search */}
        {showSearch && (
          <div className="mb-2">
            <AISearch teamId={activeTeamId} />
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center justify-center">
          {/* Tab Switcher */}
          <div 
            className="flex rounded-xl p-1 border flex-wrap"
            style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
          >
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-3 py-2 rounded-lg transition-all text-xs sm:text-sm font-medium"
              )}
              style={{
                backgroundColor: activeTab === 'overview' ? tokens.accent : 'transparent',
                color: activeTab === 'overview' ? '#FFFFFF' : tokens.subtle
              }}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={cn(
                "px-3 py-2 rounded-lg transition-all text-xs sm:text-sm font-medium"
              )}
              style={{
                backgroundColor: activeTab === 'projects' ? tokens.accent : 'transparent',
                color: activeTab === 'projects' ? '#FFFFFF' : tokens.subtle
              }}
            >
              <FolderKanban className="w-4 h-4 inline mr-1" />
              Projects
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={cn(
                "px-3 py-2 rounded-lg transition-all text-xs sm:text-sm font-medium"
              )}
              style={{
                backgroundColor: activeTab === 'calendar' ? tokens.accent : 'transparent',
                color: activeTab === 'calendar' ? '#FFFFFF' : tokens.subtle
              }}
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={cn(
                "px-3 py-2 rounded-lg transition-all text-xs sm:text-sm font-medium"
              )}
              style={{
                backgroundColor: activeTab === 'tasks' ? tokens.accent : 'transparent',
                color: activeTab === 'tasks' ? '#FFFFFF' : tokens.subtle
              }}
            >
              <List className="w-4 h-4 inline mr-1" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={cn(
                "px-3 py-2 rounded-lg transition-all text-xs sm:text-sm font-medium"
              )}
              style={{
                backgroundColor: activeTab === 'resources' ? tokens.accent : 'transparent',
                color: activeTab === 'resources' ? '#FFFFFF' : tokens.subtle
              }}
            >
              <UserCog className="w-4 h-4 inline mr-1" />
              Resources
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8" style={{ color: '#10B981' }} />
                  <div>
                    <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                      {analytics.completed}
                    </div>
                    <div className="text-xs" style={{ color: tokens.subtle }}>Completed</div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8" style={{ color: '#3B82F6' }} />
                  <div>
                    <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                      {analytics.inProgress}
                    </div>
                    <div className="text-xs" style={{ color: tokens.subtle }}>In Progress</div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8" style={{ color: '#EF4444' }} />
                  <div>
                    <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                      {analytics.overdue}
                    </div>
                    <div className="text-xs" style={{ color: tokens.subtle }}>Overdue</div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8" style={{ color: tokens.accent }} />
                  <div>
                    <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                      {analytics.thisWeekCount}
                    </div>
                    <div className="text-xs" style={{ color: tokens.subtle }}>This Week</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Member Capacity */}
            <Card>
              <h2 className="text-lg font-semibold mb-4" style={{ color: tokens.color }}>
                Team Workload & Availability
              </h2>
              <div className="space-y-3">
                {analytics.memberStats.length === 0 ? (
                  <p className="text-center py-4" style={{ color: tokens.subtle }}>
                    No team members yet
                  </p>
                ) : (
                  analytics.memberStats.map(member => (
                    <div key={member.email} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white relative"
                            style={{ backgroundColor: tokens.accent }}
                          >
                            {member.email.charAt(0).toUpperCase()}
                            <div className="absolute -bottom-1 -right-1">
                              <PresenceIndicator userEmail={member.email} size="sm" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: tokens.color }}>
                                {member.email.split('@')[0]}
                              </span>
                              <PresenceIndicator userEmail={member.email} showLabel size="sm" />
                            </div>
                            <div className="text-xs" style={{ color: tokens.subtle }}>
                              {member.tasksCompleted} / {member.tasksTotal} tasks completed
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span 
                            className="text-sm font-bold block"
                            style={{ color: member.overloaded ? '#EF4444' : tokens.color }}
                          >
                            {Math.round(member.capacity * 100)}%
                          </span>
                          <span className="text-xs" style={{ color: tokens.subtle }}>
                            {member.overloaded ? 'Overloaded' : 'Available'}
                          </span>
                        </div>
                      </div>
                      <div 
                        className="h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: '#E5E7EB' }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(member.capacity * 100, 100)}%`,
                            backgroundColor: member.overloaded ? '#EF4444' : tokens.accent
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </>
        ) : activeTab === 'projects' ? (
          <ProjectDashboard teamId={activeTeamId} userRole={userRole} />
        ) : activeTab === 'calendar' ? (
          <TeamCalendar teamId={activeTeamId} teamMembers={activeMembers} />
        ) : activeTab === 'resources' ? (
          <div className="space-y-6">
            <ResourceUtilizationReport teamId={activeTeamId} />
            <ResourceManager teamId={activeTeamId} />
          </div>
        ) : (
          /* Tasks Tab */
          <TeamTaskList teamId={activeTeamId} teamMembers={activeMembers} userRole={userRole} />
        )}
      </div>
    </div>
  );
}