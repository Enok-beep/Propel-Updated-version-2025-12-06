import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '../ui-custom/Card';
import { Sparkles, Loader2, CheckCircle2, Calendar, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';

export function MeetingSummary({ meeting, onActionItemCreated }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Meeting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onActionItemCreated?.();
    },
  });

  const generateSummary = async (autoCreateTasks = false) => {
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant helping summarize meeting notes. Analyze this meeting and provide:

Meeting: ${meeting.title}
Date: ${format(new Date(meeting.date), 'PPP')}
Attendees: ${meeting.attendees?.join(', ') || 'N/A'}

Notes:
${meeting.notes}

Extract:
1. A concise summary (2-3 paragraphs)
2. Action items with suggested assignees and priority levels
3. Key decisions made

Be specific and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            action_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  assignee: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }
                }
              }
            },
            key_decisions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      // Auto-create tasks if requested
      if (autoCreateTasks && result.action_items?.length > 0) {
        const taskPromises = result.action_items.map(item =>
          createTaskMutation.mutateAsync({
            title: item.task,
            team_id: meeting.team_id,
            project_id: meeting.project_id,
            assigned_to: item.assignee,
            priority: item.priority || 'medium',
            status: 'todo'
          })
        );
        
        const createdTasks = await Promise.all(taskPromises);
        
        // Mark action items with created task IDs
        const actionItemsWithTaskIds = result.action_items.map((item, idx) => ({
          ...item,
          created_task_id: createdTasks[idx].id
        }));

        updateMeetingMutation.mutate({
          id: meeting.id,
          data: {
            ai_summary: result.summary,
            action_items: actionItemsWithTaskIds,
            key_decisions: result.key_decisions
          }
        });
      } else {
        updateMeetingMutation.mutate({
          id: meeting.id,
          data: {
            ai_summary: result.summary,
            action_items: result.action_items,
            key_decisions: result.key_decisions
          }
        });
      }
    } catch (error) {
      console.error('Summary generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const createTaskFromAction = async (actionItem, index) => {
    await createTaskMutation.mutateAsync({
      title: actionItem.task,
      team_id: meeting.team_id,
      project_id: meeting.project_id,
      assigned_to: actionItem.assignee,
      status: 'todo',
      priority: 'medium'
    });

    // Update meeting to mark action item as created
    const updatedActionItems = [...(meeting.action_items || [])];
    updatedActionItems[index].created_task_id = 'created';
    updateMeetingMutation.mutate({
      id: meeting.id,
      data: { action_items: updatedActionItems }
    });
  };

  const hasSummary = meeting.ai_summary;

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: tokens.accent }} />
            <h3 className="font-semibold" style={{ color: tokens.color }}>
              AI Meeting Summary
            </h3>
          </div>
          
          {!hasSummary && meeting.notes && (
            <div className="flex gap-2">
              <Button
                onClick={() => generateSummary(false)}
                disabled={isGenerating}
                size="sm"
                variant="outline"
                style={{ borderColor: tokens.border }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>
              <Button
                onClick={() => generateSummary(true)}
                disabled={isGenerating}
                size="sm"
                style={{ backgroundColor: tokens.accent }}
                className="text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Tasks...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Summarize & Create Tasks
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Meeting Info */}
        <div className="flex flex-wrap gap-4 text-sm" style={{ color: tokens.subtle }}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(new Date(meeting.date), 'PPP')}
          </div>
          {meeting.attendees && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {meeting.attendees.length} attendees
            </div>
          )}
        </div>

        {/* Summary */}
        {hasSummary && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: tokens.color }}>
                📝 Summary
              </h4>
              <p className="text-sm whitespace-pre-wrap" style={{ color: tokens.subtle }}>
                {meeting.ai_summary}
              </p>
            </div>

            {/* Key Decisions */}
            {meeting.key_decisions?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: tokens.color }}>
                  🎯 Key Decisions
                </h4>
                <ul className="space-y-1">
                  {meeting.key_decisions.map((decision, idx) => (
                    <li 
                      key={idx}
                      className="text-sm flex items-start gap-2"
                      style={{ color: tokens.subtle }}
                    >
                      <span>•</span>
                      <span>{decision}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {meeting.action_items?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: tokens.color }}>
                  ✅ Action Items
                </h4>
                <div className="space-y-2">
                  {meeting.action_items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border flex items-center justify-between"
                      style={{ borderColor: tokens.border }}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: tokens.color }}>
                          {item.task}
                        </p>
                        {item.assignee && (
                          <p className="text-xs mt-1" style={{ color: tokens.subtle }}>
                            Assignee: {item.assignee}
                          </p>
                        )}
                      </div>
                      
                      {item.created_task_id ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Button
                          onClick={() => createTaskFromAction(item, idx)}
                          size="sm"
                          variant="ghost"
                          disabled={createTaskMutation.isPending}
                        >
                          Create Task
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!hasSummary && !meeting.notes && (
          <div className="text-center py-8" style={{ color: tokens.subtle }}>
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Add meeting notes to generate an AI summary</p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default MeetingSummary;