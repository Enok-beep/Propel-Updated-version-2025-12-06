import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '../ui-custom/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Trash2, Calendar, Clock, Award, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', color: '#94A3B8' },
  { id: 'intermediate', label: 'Intermediate', color: '#3B82F6' },
  { id: 'advanced', label: 'Advanced', color: '#8B5CF6' },
  { id: 'expert', label: 'Expert', color: '#F59E0B' }
];

export function ResourceManager({ teamId }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState(null);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', teamId],
    queryFn: () => base44.entities.TeamMember.filter({ team_id: teamId, status: 'active' }),
  });

  const { data: capacities = [] } = useQuery({
    queryKey: ['userCapacities', teamId],
    queryFn: () => base44.entities.UserCapacity.filter({ team_id: teamId }),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  // Calculate current workload for each user
  const getUserWorkload = (userEmail) => {
    const userTasks = tasks.filter(t => 
      t.assigned_to === userEmail && 
      t.team_id === teamId && 
      t.status !== 'done' &&
      t.due_date
    );
    
    const totalMinutes = userTasks.reduce((sum, t) => sum + (t.estimated_minutes || 25), 0);
    const capacity = capacities.find(c => c.user_email === userEmail);
    const weeklyMinutes = (capacity?.weekly_hours || 40) * 60;
    
    return {
      tasks: userTasks.length,
      hours: Math.round(totalMinutes / 60),
      utilizationPercent: Math.round((totalMinutes / weeklyMinutes) * 100),
      isOverallocated: totalMinutes > weeklyMinutes
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" style={{ color: tokens.accent }} />
          <h3 className="text-lg font-semibold" style={{ color: tokens.color }}>
            Resource Management
          </h3>
        </div>
      </div>

      <div className="grid gap-3">
        {teamMembers.map(member => {
          const capacity = capacities.find(c => c.user_email === member.user_email);
          const workload = getUserWorkload(member.user_email);
          
          return (
            <Card key={member.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium" style={{ color: tokens.color }}>
                      {member.user_email.split('@')[0]}
                    </h4>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `${tokens.accent}15`,
                        color: tokens.accent 
                      }}
                    >
                      {member.role}
                    </span>
                  </div>

                  {/* Capacity Info */}
                  <div className="flex items-center gap-4 text-xs mb-3" style={{ color: tokens.subtle }}>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {capacity?.weekly_hours || 40}h/week
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {capacity?.skills?.length || 0} skills
                    </div>
                  </div>

                  {/* Workload Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: tokens.subtle }}>
                        Current: {workload.tasks} tasks • {workload.hours}h
                      </span>
                      <span 
                        className="font-bold"
                        style={{ 
                          color: workload.isOverallocated ? '#EF4444' : tokens.accent 
                        }}
                      >
                        {workload.utilizationPercent}%
                      </span>
                    </div>
                    <div 
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: `${tokens.accent}15` }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(workload.utilizationPercent, 100)}%`,
                          backgroundColor: workload.isOverallocated ? '#EF4444' : tokens.accent
                        }}
                      />
                    </div>
                    {workload.isOverallocated && (
                      <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        Overallocated
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {capacity?.skills && capacity.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {capacity.skills.map((skill, idx) => {
                        const level = SKILL_LEVELS.find(l => l.id === skill.level);
                        return (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{
                              backgroundColor: `${level?.color}20`,
                              color: level?.color
                            }}
                          >
                            {skill.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingUser(member)}
                >
                  Edit
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {editingUser && (
        <CapacityEditor
          teamId={teamId}
          member={editingUser}
          capacity={capacities.find(c => c.user_email === editingUser.user_email)}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}

function CapacityEditor({ teamId, member, capacity, onClose }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [weeklyHours, setWeeklyHours] = useState(capacity?.weekly_hours || 40);
  const [skills, setSkills] = useState(capacity?.skills || []);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('intermediate');

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (capacity) {
        return base44.entities.UserCapacity.update(capacity.id, data);
      }
      return base44.entities.UserCapacity.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCapacities'] });
      onClose();
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      user_email: member.user_email,
      team_id: teamId,
      weekly_hours: weeklyHours,
      daily_hours: weeklyHours / 5,
      skills
    });
  };

  const addSkill = () => {
    if (newSkillName.trim()) {
      setSkills([...skills, { name: newSkillName.trim(), level: newSkillLevel }]);
      setNewSkillName('');
    }
  };

  const removeSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent style={{ backgroundColor: tokens.card }}>
        <DialogHeader>
          <DialogTitle style={{ color: tokens.color }}>
            Manage Capacity: {member.user_email.split('@')[0]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
              Weekly Hours
            </label>
            <Input
              type="number"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              min={1}
              max={80}
              style={{ borderColor: tokens.border }}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
              Skills
            </label>
            
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Skill name"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                style={{ borderColor: tokens.border }}
              />
              <select
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value)}
                className="px-3 py-2 rounded border"
                style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
              >
                {SKILL_LEVELS.map(level => (
                  <option key={level.id} value={level.id}>{level.label}</option>
                ))}
              </select>
              <Button onClick={addSkill} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {skills.map((skill, index) => {
                const level = SKILL_LEVELS.find(l => l.id === skill.level);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg border"
                    style={{ borderColor: tokens.border }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: tokens.color }}>{skill.name}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${level?.color}20`,
                          color: level?.color
                        }}
                      >
                        {level?.label}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSkill(index)}
                      className="text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleSave}
              disabled={saveMutation.isPending}
              style={{ backgroundColor: tokens.accent }}
              className="text-white"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ResourceManager;