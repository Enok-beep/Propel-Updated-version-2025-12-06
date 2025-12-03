import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AIAssignmentSuggestion({ task, teamMembers, onAssign }) {
  const { tokens } = useTheme();
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const getSuggestions = async () => {
    setIsLoading(true);
    try {
      // Get workload and performance history for each member
      const allTasks = await base44.entities.Task.list();
      const teamTasks = allTasks.filter(t => t.team_id === task.team_id);
      
      const memberWorkload = teamMembers.map(member => {
        const assignedTasks = teamTasks.filter(t => t.assigned_to === member.user_email);
        const completedTasks = assignedTasks.filter(t => t.status === 'done');
        const avgCompletionTime = completedTasks.length > 0
          ? completedTasks.reduce((acc, t) => {
              const created = new Date(t.created_date);
              const completed = new Date(t.completed_at);
              return acc + (completed - created) / (1000 * 60 * 60 * 24); // days
            }, 0) / completedTasks.length
          : 0;

        // Categorize tasks by type for skill inference
        const taskCategories = assignedTasks.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + 1;
          return acc;
        }, {});

        return {
          email: member.user_email,
          role: member.role,
          current_tasks: assignedTasks.filter(t => t.status !== 'done').length,
          total_completed: completedTasks.length,
          avg_completion_days: Math.round(avgCompletionTime * 10) / 10,
          task_categories: taskCategories,
          recent_tasks: assignedTasks.slice(-3).map(t => ({
            title: t.title,
            category: t.category,
            priority: t.priority
          }))
        };
      });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant helping assign tasks to team members based on skills, performance, and workload.

Task to assign:
- Title: ${task.title}
- Description: ${task.description || 'N/A'}
- Priority: ${task.priority}
- Energy Level: ${task.energy_level}
- Estimated Time: ${task.estimated_minutes || 25} minutes
- Category: ${task.category}

Team Members - Performance & Skills:
${JSON.stringify(memberWorkload, null, 2)}

Suggest the top 3 best team members to assign this task to, considering:
1. **Skills & Experience**: Match task category with member's past work
2. **Past Performance**: Consider completion rate and average completion time
3. **Current Workload**: Balance work distribution
4. **Task Complexity**: Match priority/energy with member capacity

Provide reasoning for each suggestion and confidence score (0-100).`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  member_email: { type: "string" },
                  confidence: { type: "number" },
                  reasoning: { type: "string" },
                  match_score: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result?.suggestions?.length > 0) {
        setSuggestions(result.suggestions);
      }
    } catch (error) {
      console.error('AI assignment unavailable:', error);
      // Silently fail - feature is optional
    } finally {
      setIsLoading(false);
    }
  };

  if (teamMembers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold" style={{ color: tokens.color }}>
          ✨ AI Assignment Suggestions
        </h4>
        
        {!suggestions && (
          <Button
            onClick={getSuggestions}
            disabled={isLoading}
            size="sm"
            variant="outline"
            style={{ borderColor: tokens.border }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <UserPlus className="w-3 h-3 mr-2" />
                Get Suggestions
              </>
            )}
          </Button>
        )}
      </div>

      {suggestions && (
        <div className="space-y-2">
          {suggestions.map((suggestion, idx) => {
            const member = teamMembers.find(m => m.user_email === suggestion.member_email);
            if (!member) return null;

            const confidenceColor = 
              suggestion.confidence >= 80 ? '#10B981' :
              suggestion.confidence >= 60 ? '#F59E0B' : '#6B7280';

            return (
              <div
                key={member.user_email}
                className="p-3 rounded-lg border"
                style={{ borderColor: tokens.border }}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: confidenceColor, color: 'white' }}
                  >
                    {idx + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm" style={{ color: tokens.color }}>
                        {member.user_email.split('@')[0]}
                      </span>
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: `${confidenceColor}20`,
                          color: confidenceColor
                        }}
                      >
                        {suggestion.confidence}% match
                      </span>
                    </div>
                    
                    <p className="text-xs mb-2" style={{ color: tokens.subtle }}>
                      {suggestion.reasoning}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: tokens.accent }}>
                        {suggestion.match_score}
                      </span>
                      
                      <Button
                        onClick={() => onAssign?.(member.user_email)}
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Assign
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AIAssignmentSuggestion;