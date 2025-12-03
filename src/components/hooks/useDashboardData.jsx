import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Centralized dashboard data fetching hook
 * Reduces duplication and manages data dependencies
 */
export function useDashboardData(workMode) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
  });

  const { data: prefs = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const { data: userStats = [] } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.UserStats.filter({ user_email: user.email });
    },
    enabled: !!user?.email,
  });

  // Team-specific data
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

  return {
    user,
    tasks,
    prefs,
    userStats,
    teams,
    teamMembers,
    projects,
    timeEntries,
    meetings,
    capacities,
    comments,
    isLoading: tasksLoading,
  };
}

export default useDashboardData;