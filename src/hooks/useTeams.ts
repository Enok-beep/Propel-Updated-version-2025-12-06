import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TeamRepository, type Team } from '@/lib/repositories/TeamRepository';
import { toast } from 'sonner';

/**
 * Fetch all teams for current user
 */
export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => TeamRepository.listTeams(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create team
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (team: { name: string; description?: string }) =>
      TeamRepository.createTeam(team),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create team');
    },
  });
}

/**
 * Update team
 */
export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Team> }) =>
      TeamRepository.updateTeam(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team updated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update team');
    },
  });
}

/**
 * Delete team
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TeamRepository.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete team');
    },
  });
}

/**
 * Fetch team members
 */
export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ['teams', teamId, 'members'],
    queryFn: () => teamId ? TeamRepository.getTeamMembers(teamId) : null,
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Invite user to team
 */
export function useInviteToTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, email, role }: { teamId: string; email: string; role: 'admin' | 'member' | 'guest' }) =>
      TeamRepository.inviteToTeam(teamId, email, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId, 'invitations'] });
      toast.success('Invitation sent!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });
}

/**
 * Accept team invitation
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => TeamRepository.acceptInvitation(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Invitation accepted! Welcome to the team!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept invitation');
    },
  });
}

/**
 * Remove team member
 */
export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      TeamRepository.removeMember(teamId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId, 'members'] });
      toast.success('Member removed from team!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });
}

/**
 * Update member role
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, userId, role }: { teamId: string; userId: string; role: 'admin' | 'member' | 'guest' }) =>
      TeamRepository.updateMemberRole(teamId, userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId, 'members'] });
      toast.success('Member role updated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update role');
    },
  });
}
