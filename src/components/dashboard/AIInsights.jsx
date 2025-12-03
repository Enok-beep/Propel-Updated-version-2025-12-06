import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui-custom/Card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Calendar, Zap } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

export function AIInsights({ tasks, meetings }) {
  const { tokens } = useTheme();
  const [insights, setInsights] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const { data: userStats = [] } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => base44.entities.UserStats.list(),
  });

  const generateInsights = async () => {
    setIsGenerating(true);
    try {
      const currentEnergy = preferences[0]?.current_energy || 'medium';
      const stats = userStats[0] || {};
      
      // Prepare context
      const todayTasks = tasks.filter(t => 
        t.due_date && isToday(parseISO(t.due_date)) && t.status !== 'done'
      );
      
      const upcomingTasks = tasks.filter(t => 
        t.due_date && isTomorrow(parseISO(t.due_date)) && t.status !== 'done'
      );

      const overdueTasks = tasks.filter(t => 
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
      );

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI productivity coach. Analyze the user's tasks and provide personalized insights.

Current Time: ${format(new Date(), 'EEEE, MMMM d, h:mm a')}
User Energy Level: ${currentEnergy}
Current Streak: ${stats.current_streak || 0} days
Total Completed: ${stats.tasks_completed || 0} tasks

Today's Tasks (${todayTasks.length}):
${todayTasks.map(t => `- ${t.title} (${t.priority}, ${t.energy_level} energy)`).join('\n')}

Upcoming Tomorrow (${upcomingTasks.length}):
${upcomingTasks.map(t => `- ${t.title} (${t.priority})`).join('\n')}

Overdue (${overdueTasks.length}):
${overdueTasks.map(t => `- ${t.title} (${t.priority})`).join('\n')}

Today's Meetings:
${meetings?.length > 0 ? meetings.map(m => `- ${m.title} at ${format(parseISO(m.date), 'h:mm a')}`).join('\n') : 'None'}

Provide:
1. A motivational daily message (1-2 sentences)
2. Top 3 priority recommendations for today
3. A productivity tip based on their energy level
4. Warning about any risks (overdue, overload, etc.)`,
        response_json_schema: {
          type: "object",
          properties: {
            daily_message: { type: "string" },
            priorities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  reason: { type: "string" },
                  icon: { type: "string" }
                }
              }
            },
            productivity_tip: { type: "string" },
            warnings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  severity: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result?.daily_message) {
        setInsights(result);
      }
    } catch (error) {
      console.error('AI insights unavailable:', error);
      setInsights({ 
        daily_message: 'AI insights temporarily unavailable. Your tasks and progress are still tracked!',
        priorities: [],
        warnings: []
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: tokens.accent }} />
            <h3 className="font-semibold" style={{ color: tokens.color }}>
              AI Daily Insights
            </h3>
          </div>
          
          <Button
            onClick={generateInsights}
            disabled={isGenerating}
            size="sm"
            style={{ backgroundColor: tokens.accent }}
            className="text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>

        {insights ? (
          <div className="space-y-4">
            {/* Daily Message */}
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: `${tokens.accent}10` }}
            >
              <p className="text-sm font-medium" style={{ color: tokens.color }}>
                {insights.daily_message}
              </p>
            </div>

            {/* Warnings */}
            {insights.warnings?.length > 0 && (
              <div className="space-y-2">
                {insights.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg flex items-start gap-2"
                    style={{ 
                      backgroundColor: warning.severity === 'high' ? '#FEE2E2' : '#FEF3C7',
                      color: warning.severity === 'high' ? '#991B1B' : '#92400E'
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{warning.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Priorities */}
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: tokens.color }}>
                🎯 Today's Priorities
              </h4>
              <div className="space-y-2">
                {insights.priorities?.map((priority, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border"
                    style={{ borderColor: tokens.border }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{priority.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: tokens.color }}>
                          {priority.action}
                        </p>
                        <p className="text-xs mt-1" style={{ color: tokens.subtle }}>
                          {priority.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Productivity Tip */}
            <div 
              className="p-3 rounded-lg flex items-start gap-2"
              style={{ backgroundColor: `${tokens.accent}05` }}
            >
              <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: tokens.accent }} />
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: tokens.accent }}>
                  💡 Productivity Tip
                </p>
                <p className="text-sm" style={{ color: tokens.subtle }}>
                  {insights.productivity_tip}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: tokens.subtle }}>
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click Generate to get your personalized insights</p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default AIInsights;