import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '../ui-custom/Card';
import { Sparkles, Loader2, FileText, Zap } from 'lucide-react';

export function QuickMeetingSummary({ teamId, onSummaryGenerated }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const generateQuickSummary = async (autoCreateTasks = false) => {
    if (!notes.trim()) return;

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant that summarizes meeting notes. A user has pasted notes from a discussion or meeting.

Notes:
${notes}

Analyze and extract:
1. A concise summary (2-3 paragraphs)
2. Action items with suggested assignees (use email format if mentioned, otherwise "unassigned")
3. Key decisions made
4. Meeting context (infer the topic/purpose)

Be specific and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            meeting_topic: { type: "string" },
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
            team_id: teamId,
            assigned_to: item.assignee !== 'unassigned' ? item.assignee : null,
            priority: item.priority || 'medium',
            status: 'todo'
          })
        );
        
        await Promise.all(taskPromises);
        
        result.tasks_created = true;
      }

      setSummary(result);
      onSummaryGenerated?.(result);
    } catch (error) {
      console.error('Quick summary failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setNotes('');
    setSummary(null);
  };

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5" style={{ color: tokens.accent }} />
          <h3 className="font-semibold" style={{ color: tokens.color }}>
            Quick Meeting Summary
          </h3>
        </div>

        <p className="text-sm" style={{ color: tokens.subtle }}>
          Paste your meeting notes or discussion transcript below for instant AI summarization.
        </p>

        {!summary ? (
          <>
            {/* Input */}
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste meeting notes, discussion transcript, or chat log here...

Example:
- Discussed Q1 roadmap
- John suggested moving API redesign to next sprint
- Sarah will prototype the new dashboard
- Need to review security concerns by Friday"
              className="min-h-[200px] font-mono text-sm"
              style={{ borderColor: tokens.border }}
            />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => generateQuickSummary(false)}
                disabled={!notes.trim() || isGenerating}
                variant="outline"
                style={{ borderColor: tokens.border }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Summarize Only
                  </>
                )}
              </Button>
              <Button
                onClick={() => generateQuickSummary(true)}
                disabled={!notes.trim() || isGenerating}
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
          </>
        ) : (
          <>
            {/* Summary Results */}
            <div className="space-y-4">
              {summary.tasks_created && (
                <div 
                  className="p-3 rounded-lg text-sm"
                  style={{ backgroundColor: '#DEF7EC', color: '#03543F' }}
                >
                  ✓ Tasks automatically created from action items!
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: tokens.color }}>
                  📝 Meeting: {summary.meeting_topic}
                </h4>
                <p className="text-sm whitespace-pre-wrap" style={{ color: tokens.subtle }}>
                  {summary.summary}
                </p>
              </div>

              {summary.key_decisions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: tokens.color }}>
                    🎯 Key Decisions
                  </h4>
                  <ul className="space-y-1">
                    {summary.key_decisions.map((decision, idx) => (
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

              {summary.action_items?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: tokens.color }}>
                    ✅ Action Items
                  </h4>
                  <div className="space-y-2">
                    {summary.action_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border"
                        style={{ borderColor: tokens.border }}
                      >
                        <p className="text-sm font-medium" style={{ color: tokens.color }}>
                          {item.task}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: tokens.subtle }}>
                          <span>Assignee: {item.assignee}</span>
                          <span>•</span>
                          <span className="capitalize">{item.priority} priority</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full"
              style={{ borderColor: tokens.border }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Summarize Another
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export default QuickMeetingSummary;