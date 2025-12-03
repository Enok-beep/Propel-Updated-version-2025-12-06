import React, { useState } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui-custom/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, Plus, Settings, UserPlus, Crown, Shield, 
  Eye, Trash2, Mail, Check, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TEAM_AVATARS = ['👥', '🚀', '💼', '🎯', '⚡', '🌟', '🔥', '💡', '🎨', '🏆'];
const ROLES = [
  { id: 'owner', label: 'Owner', icon: Crown, color: '#F59E0B' },
  { id: 'admin', label: 'Admin', icon: Shield, color: '#3B82F6' },
  { id: 'member', label: 'Member', icon: Users, color: '#10B981' },
  { id: 'viewer', label: 'Viewer', icon: Eye, color: '#6B7280' }
];

export default function Teams() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeamData, setNewTeamData] = useState({ name: '', description: '', avatar: '👥' });
  const [inviteEmail, setInviteEmail] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const createTeamMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.create(data),
    onSuccess: async (team) => {
      await base44.entities.TeamMember.create({
        team_id: team.id,
        user_email: user.email,
        role: 'owner',
        status: 'active',
        joined_date: new Date().toISOString()
      });
      queryClient.invalidateQueries(['teams']);
      queryClient.invalidateQueries(['teamMembers']);
      setShowCreateDialog(false);
      setNewTeamData({ name: '', description: '', avatar: '👥' });
    }
  });

  const inviteMemberMutation = useMutation({
    mutationFn: ({ teamId, email }) => base44.entities.TeamMember.create({
      team_id: teamId,
      user_email: email,
      role: 'member',
      status: 'invited',
      invited_by: user.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['teamMembers']);
      setInviteEmail('');
    }
  });

  const handleCreateTeam = () => {
    if (!newTeamData.name.trim()) return;
    createTeamMutation.mutate({
      ...newTeamData,
      owner_email: user.email
    });
  };

  const getTeamMembers = (teamId) => {
    return teamMembers.filter(m => m.team_id === teamId);
  };

  const myTeams = teams.filter(team => 
    teamMembers.some(m => m.team_id === team.id && m.user_email === user?.email)
  );

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ backgroundColor: tokens.bg }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: tokens.color }}>
              Teams
            </h1>
            <p className="text-sm mt-1" style={{ color: tokens.subtle }}>
              Collaborate and manage tasks together
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            style={{ backgroundColor: tokens.accent }}
            className="text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        </div>

        {/* Teams Grid */}
        {myTeams.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4" style={{ color: tokens.subtle }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: tokens.color }}>
              No teams yet
            </h3>
            <p className="text-sm mb-4" style={{ color: tokens.subtle }}>
              Create your first team to start collaborating
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              variant="outline"
              style={{ borderColor: tokens.border }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myTeams.map(team => {
              const members = getTeamMembers(team.id);
              const myMembership = members.find(m => m.user_email === user?.email);
              
              return (
                <Card key={team.id} className="cursor-pointer hover:scale-[1.02] transition-all">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                      style={{ backgroundColor: `${tokens.accent}20` }}
                    >
                      {team.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate" style={{ color: tokens.color }}>
                        {team.name}
                      </h3>
                      {team.description && (
                        <p className="text-sm mt-1 line-clamp-2" style={{ color: tokens.subtle }}>
                          {team.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" style={{ color: tokens.subtle }} />
                          <span className="text-sm" style={{ color: tokens.subtle }}>
                            {members.filter(m => m.status === 'active').length} members
                          </span>
                        </div>
                        {myMembership && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${ROLES.find(r => r.id === myMembership.role)?.color}20`,
                              color: ROLES.find(r => r.id === myMembership.role)?.color
                            }}
                          >
                            {myMembership.role}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTeam(team);
                      }}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent style={{ backgroundColor: tokens.card, borderColor: tokens.border }}>
          <DialogHeader>
            <DialogTitle style={{ color: tokens.color }}>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
                Team Avatar
              </label>
              <div className="grid grid-cols-5 gap-2">
                {TEAM_AVATARS.map(avatar => (
                  <button
                    key={avatar}
                    onClick={() => setNewTeamData(prev => ({ ...prev, avatar }))}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110"
                    style={{
                      backgroundColor: newTeamData.avatar === avatar ? `${tokens.accent}20` : `${tokens.subtle}10`,
                      border: newTeamData.avatar === avatar ? `2px solid ${tokens.accent}` : 'none'
                    }}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
                Team Name
              </label>
              <Input
                placeholder="e.g., Product Team, Marketing Crew"
                value={newTeamData.name}
                onChange={(e) => setNewTeamData(prev => ({ ...prev, name: e.target.value }))}
                style={{ borderColor: tokens.border }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
                Description (optional)
              </label>
              <Textarea
                placeholder="What does this team work on?"
                value={newTeamData.description}
                onChange={(e) => setNewTeamData(prev => ({ ...prev, description: e.target.value }))}
                style={{ borderColor: tokens.border }}
                className="h-20"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={!newTeamData.name.trim() || createTeamMutation.isLoading}
                style={{ backgroundColor: tokens.accent }}
                className="text-white"
              >
                Create Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Detail Dialog */}
      {selectedTeam && (
        <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
          <DialogContent className="max-w-2xl" style={{ backgroundColor: tokens.card, borderColor: tokens.border }}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${tokens.accent}20` }}
                >
                  {selectedTeam.avatar}
                </div>
                <DialogTitle style={{ color: tokens.color }}>{selectedTeam.name}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Invite Members */}
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: tokens.color }}>
                  Invite Members
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    style={{ borderColor: tokens.border }}
                    type="email"
                  />
                  <Button
                    onClick={() => inviteMemberMutation.mutate({ teamId: selectedTeam.id, email: inviteEmail })}
                    disabled={!inviteEmail.includes('@')}
                    style={{ backgroundColor: tokens.accent }}
                    className="text-white"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                </div>
              </div>

              {/* Members List */}
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: tokens.color }}>
                  Team Members
                </h4>
                <div className="space-y-2">
                  {getTeamMembers(selectedTeam.id).map(member => {
                    const roleConfig = ROLES.find(r => r.id === member.role);
                    const RoleIcon = roleConfig?.icon || Users;
                    
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-xl border"
                        style={{ borderColor: tokens.border }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                            style={{ backgroundColor: tokens.accent }}
                          >
                            {member.user_email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium" style={{ color: tokens.color }}>
                              {member.user_email}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <RoleIcon className="w-3 h-3" style={{ color: roleConfig?.color }} />
                              <span className="text-xs" style={{ color: tokens.subtle }}>
                                {roleConfig?.label}
                              </span>
                              {member.status === 'invited' && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}>
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {member.role !== 'owner' && (
                          <Button variant="ghost" size="sm" className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}