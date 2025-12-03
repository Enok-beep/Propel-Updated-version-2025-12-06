import React, { useState, useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '../ui-custom/Card';
import { Sparkles, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ResourceAllocation({ teamId, task }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

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

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const analyzeAllocation = async () => {
    setAnalyzing(true);
    
    try {
      const memberData = teamMembers.map(member => {
        const capacity = capacities.find(c => c.user_email === member.user_email);
        const userTasks = tasks.filter(t => 
          t.assigned_to === member.user_email && 
          t.status !== 'done' &&
          t.due_date
        );
        
        const totalMinutes = userTasks.reduce((sum, t) => sum + (t.estimated_minutes || 25), 0);
        const weeklyMinutes = (capacity?.weekly_hours || 40) * 60;
        const utilization = (totalMinutes / weeklyMinutes) * 100;
        
        return {
          email: member.user_email,
          role: member.role,
          capacity: capacity?.weekly_hours || 40,
          skills: capacity?.skills || [],
          currentTasks: userTasks.length,
          currentLoad: Math.round(totalMinutes / 60),
          utilization: Math.round(utilization),
          available: utilization < 100
        };
      });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a resource allocation expert. Analyze this task and recommend the best team member to assign it to.

Task: "${task.title}"
Description: "${task.description || 'No description'}"
Priority: ${task.priority}
Estimated Time: ${task.estimated_minutes || 25} minutes
Category: ${task.category}

Team Members:
${memberData.map(m => `
- ${m.email}
  Role: ${m.role}
  Capacity: ${m.capacity}h/week
  Skills: ${m.skills.map(s => `${s.name} (${s.level})`).join(', ') || 'No skills defined'}
  Current Load: ${m.currentLoad}h (${m.utilization}% utilization)
  Status: ${m.available ? 'Available' : 'Overallocated'}
`).join('\n')}

Provide your recommendation with reasoning.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_assignee: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            reasoning: { type: "string" },
            alternative_assignees: {
              type: "array",
              items: { type: "string" }
            },
            allocation_warnings: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setRecommendations({
        ...result,
        memberData
      });
    } catch (e) {
      console.error('Failed to analyze allocation:', e);
    }
    
    setAnalyzing(false);
  };

  const handleAssign = (email) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { assigned_to: email }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium" style={{ color: tokens.color }}>
          Smart Resource Allocation
        </h4>
        <Button
          onClick={analyzeAllocation}
          disabled={analyzing}
          size="sm"
          style={{ backgroundColor: tokens.accent }}
          className="text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {analyzing ? 'Analyzing...' : 'Analyze'}
        </Button>
      </div>

      {recommendations && (
        <div className="space-y-3">
          {/* Primary Recommendation */}
          <Card variant="accent">
            <div className="flex items-start gap-3">
              <UserCheck className="w-5 h-5 flex-shrink-0" style={{ color: tokens.accent }} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium" style={{ color: tokens.color }}>
                    Recommended: {recommendations.recommended_assignee}
                  </span>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: recommendations.confidence === 'high' ? '#10B98120' : '#F59E0B20',
                      color: recommendations.confidence === 'high' ? '#10B981' : '#F59E0B'
                    }}
                  >
                    {recommendations.confidence} confidence
                  </span>
                </div>
                <p className="text-sm mb-3" style={{ color: tokens.subtle }}>
                  {recommendations.reasoning}
                </p>
                <Button
                  onClick={() => handleAssign(recommendations.recommended_assignee)}
                  size="sm"
                  style={{ backgroundColor: tokens.accent }}
                  className="text-white"
                >
                  Assign to {recommendations.recommended_assignee.split('@')[0]}
                </Button>
              </div>
            </div>
          </Card>

          {/* Warnings */}
          {recommendations.allocation_warnings?.length > 0 && (
            <Card>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {recommendations.allocation_warnings.map((warning, idx) => (
                    <p key={idx} className="text-sm" style={{ color: tokens.subtle }}>
                      {warning}
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Alternative Options */}
          {recommendations.alternative_assignees?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: tokens.color }}>
                Alternative Options:
              </p>
              <div className="flex flex-wrap gap-2">
                {recommendations.alternative_assignees.map(email => {
                  const memberInfo = recommendations.memberData.find(m => m.email === email);
                  return (
                    <button
                      key={email}
                      onClick={() => handleAssign(email)}
                      className="px-3 py-2 rounded-lg border text-sm transition-all hover:shadow-md"
                      style={{
                        borderColor: tokens.border,
                        backgroundColor: tokens.card
                      }}
                    >
                      <div style={{ color: tokens.color }}>{email.split('@')[0]}</div>
                      {memberInfo && (
                        <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
                          {memberInfo.utilization}% utilized
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResourceAllocation;