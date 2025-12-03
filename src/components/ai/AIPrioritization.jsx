import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '../ui-custom/Card';
import { Sparkles, TrendingUp, Zap, Calendar, Link as LinkIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function AIPrioritization({ tasks, currentEnergy, onTaskClick, projects = [], autoRefresh = true }) {
  const { tokens } = useTheme();
  const [prioritizedTasks, setPrioritizedTasks] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastEnergy, setLastEnergy] = useState(currentEnergy);
  const [taskScores, setTaskScores] = useState({});

  // Calculate dynamic scores locally
  const calculateDynamicScore = (task) => {
    let score = 0;
    const now = new Date();

    // 1. Energy Match (0-40 points)
    if (task.energy_level === currentEnergy) {
      score += 40;
    } else if (
      (currentEnergy === 'high' && task.energy_level === 'medium') ||
      (currentEnergy === 'medium' && task.energy_level === 'low')
    ) {
      score += 20;
    }

    // 2. Priority (0-30 points)
    const priorityScores = { urgent: 30, high: 22, medium: 15, low: 8 };
    score += priorityScores[task.priority] || 0;

    // 3. Deadline Urgency (0-25 points)
    if (task.due_date) {
      const hoursUntil = (new Date(task.due_date) - now) / (1000 * 60 * 60);
      if (hoursUntil < 0) score += 25; // Overdue
      else if (hoursUntil <= 4) score += 23;
      else if (hoursUntil <= 24) score += 18;
      else if (hoursUntil <= 72) score += 12;
      else if (hoursUntil <= 168) score += 6;
    }

    // 4. Dependency Impact (0-20 points)
    const blockedTasks = tasks.filter(t => t.depends_on?.includes(task.id));
    score += Math.min(blockedTasks.length * 7, 20);

    // 5. Project Deadline (0-15 points)
    if (task.project_id && projects.length > 0) {
      const project = projects.find(p => p.id === task.project_id);
      if (project?.end_date) {
        const projectHoursLeft = (new Date(project.end_date) - now) / (1000 * 60 * 60);
        if (projectHoursLeft < 168) score += 15;
        else if (projectHoursLeft < 336) score += 10;
      }
    }

    // 6. Quick Win Bonus (0-10 points)
    if (task.estimated_minutes && task.estimated_minutes <= 15) {
      score += 10;
    }

    return Math.round(score);
  };

  const analyzeTasks = async () => {
    setIsLoading(true);
    try {
      // Calculate scores for all tasks
      const scores = {};
      tasks.forEach(t => {
        scores[t.id] = calculateDynamicScore(t);
      });
      setTaskScores(scores);

      // Get dependency graph info
      const blockerInfo = {};
      tasks.forEach(t => {
        if (t.depends_on?.length > 0) {
          const blockedBy = t.depends_on
            .map(depId => tasks.find(task => task.id === depId))
            .filter(Boolean)
            .filter(dep => dep.status !== 'done');
          blockerInfo[t.id] = blockedBy;
        }
      });

      const taskData = tasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        energy_level: t.energy_level,
        due_date: t.due_date,
        estimated_minutes: t.estimated_minutes,
        depends_on: t.depends_on || [],
        project_id: t.project_id,
        dynamic_score: scores[t.id],
        blocks_count: tasks.filter(task => task.depends_on?.includes(t.id)).length,
        is_blocked: blockerInfo[t.id]?.length > 0,
        blocker_titles: blockerInfo[t.id]?.map(b => b.title) || []
      }));

      const projectData = projects.map(p => ({
        id: p.id,
        name: p.name,
        end_date: p.end_date,
        status: p.status
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an advanced productivity AI. Analyze tasks with pre-calculated dynamic scores and provide strategic recommendations.

CONTEXT:
- Current user energy: ${currentEnergy}
- Time: ${new Date().toLocaleString()}
- User just completed: ${tasks.filter(t => t.status === 'done').length} tasks

SCORING BREAKDOWN (pre-calculated):
- Energy Match: 0-40 pts (perfect match = 40)
- Priority Level: 0-30 pts (urgent = 30)
- Deadline Urgency: 0-25 pts (overdue = 25)
- Dependency Impact: 0-20 pts (blocking others)
- Project Deadline: 0-15 pts (project ending soon)
- Quick Win: 0-10 pts (≤15min tasks)

TASKS (sorted by score):
${taskData.sort((a, b) => b.dynamic_score - a.dynamic_score).map((t, i) => 
  `${i+1}. "${t.title}" [Score: ${t.dynamic_score}]
   - Priority: ${t.priority} | Energy: ${t.energy_level} | Due: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'none'}
   - Blocks ${t.blocks_count} tasks | ${t.is_blocked ? `Blocked by: ${t.blocker_titles.join(', ')}` : 'Not blocked'}
   - Est: ${t.estimated_minutes}min${t.project_id ? ` | Project task` : ''}`
).join('\n')}

PROJECTS:
${projectData.length > 0 ? projectData.map(p => `- ${p.name}: ${p.status} (due ${p.end_date})`).join('\n') : 'No active projects'}

TASK: Recommend the top 5 most impactful tasks considering:
1. Real-time adaptation: If energy changed, adjust energy-match weight
2. Dependency chains: Unblock critical paths first
3. Strategic balance: Mix urgent + quick wins + high-impact
4. Momentum: Consider task completion psychology

For each task provide: score justification, impact analysis, and specific action recommendation.`,
        response_json_schema: {
          type: "object",
          properties: {
            prioritized_tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_id: { type: "string" },
                  rank: { type: "number" },
                  adjusted_score: { type: "number" },
                  score_breakdown: { type: "string" },
                  impact_analysis: { type: "string" },
                  action_recommendation: { type: "string" },
                  best_time: { type: "string" }
                }
              }
            },
            overall_strategy: { type: "string" },
            energy_shift_detected: { type: "boolean" },
            critical_blockers: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setPrioritizedTasks(result);
      setLastEnergy(currentEnergy);
    } catch (error) {
      console.error('AI prioritization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh when energy changes
  React.useEffect(() => {
    if (autoRefresh && prioritizedTasks && currentEnergy !== lastEnergy) {
      analyzeTasks();
    }
  }, [currentEnergy]);

  const getTaskById = (id) => tasks.find(t => t.id === id);

  const priorityIcons = {
    urgent: '🔥',
    high: '⚡',
    medium: '📌',
    low: '💡'
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: tokens.accent }} />
            <h3 className="font-semibold" style={{ color: tokens.color }}>
              AI Task Prioritization
            </h3>
          </div>
          
          <Button
            onClick={analyzeTasks}
            disabled={isLoading || tasks.length === 0}
            size="sm"
            style={{ backgroundColor: tokens.accent }}
            className="text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Prioritize
              </>
            )}
          </Button>
        </div>

        {!prioritizedTasks && !isLoading && (
          <div className="text-center py-8" style={{ color: tokens.subtle }}>
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click "Prioritize" to get AI-powered task recommendations</p>
          </div>
        )}

        {prioritizedTasks && (
          <div className="space-y-4">
            {/* Energy Shift Alert */}
            {prioritizedTasks.energy_shift_detected && (
              <div 
                className="p-3 rounded-lg border-l-4"
                style={{ 
                  backgroundColor: '#FEF3C7',
                  borderColor: '#F59E0B'
                }}
              >
                <p className="text-sm font-medium mb-1" style={{ color: '#92400E' }}>
                  ⚡ Energy Level Changed
                </p>
                <p className="text-xs" style={{ color: '#78350F' }}>
                  Task recommendations adapted to your current {currentEnergy} energy state
                </p>
              </div>
            )}

            {/* Critical Blockers */}
            {prioritizedTasks.critical_blockers?.length > 0 && (
              <div 
                className="p-3 rounded-lg border-l-4"
                style={{ 
                  backgroundColor: '#FEE2E2',
                  borderColor: '#DC2626'
                }}
              >
                <p className="text-sm font-medium mb-1" style={{ color: '#991B1B' }}>
                  🚨 Critical Blockers Detected
                </p>
                <p className="text-xs" style={{ color: '#7F1D1D' }}>
                  {prioritizedTasks.critical_blockers.join(' • ')}
                </p>
              </div>
            )}

            {/* Strategy */}
            <div 
              className="p-3 rounded-lg border-l-4"
              style={{ 
                backgroundColor: `${tokens.accent}10`,
                borderColor: tokens.accent
              }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: tokens.color }}>
                📋 Strategic Plan
              </p>
              <p className="text-sm" style={{ color: tokens.subtle }}>
                {prioritizedTasks.overall_strategy}
              </p>
            </div>

            {/* Prioritized Tasks */}
            <div className="space-y-2">
              {prioritizedTasks.prioritized_tasks.map((item, idx) => {
                const task = getTaskById(item.task_id);
                if (!task) return null;

                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className="w-full text-left p-3 rounded-xl border transition-all hover:shadow-md"
                    style={{ borderColor: tokens.border }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ 
                          backgroundColor: tokens.accent,
                          color: 'white'
                        }}
                      >
                        {idx + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{priorityIcons[task.priority]}</span>
                          <h4 className="font-semibold text-sm" style={{ color: tokens.color }}>
                            {task.title}
                          </h4>
                          <span 
                            className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{ 
                              backgroundColor: `${tokens.accent}20`,
                              color: tokens.accent
                            }}
                          >
                            {item.adjusted_score || taskScores[task.id] || 0}
                          </span>
                        </div>
                        
                        <p className="text-xs mb-2" style={{ color: tokens.subtle }}>
                          <strong>Impact:</strong> {item.impact_analysis || item.reasoning}
                        </p>

                        {item.score_breakdown && (
                          <p className="text-xs mb-2 opacity-75" style={{ color: tokens.subtle }}>
                            {item.score_breakdown}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs" style={{ color: tokens.subtle }}>
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(task.due_date), 'MMM d')}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {task.energy_level}
                          </div>
                          {task.depends_on?.length > 0 && (
                            <div className="flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" />
                              {task.depends_on.length} deps
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2 space-y-1">
                          <div 
                            className="px-2 py-1 rounded text-xs inline-block"
                            style={{ 
                              backgroundColor: `${tokens.accent}15`,
                              color: tokens.accent
                            }}
                          >
                            💡 {item.action_recommendation || item.recommendation}
                          </div>
                          {item.best_time && (
                            <div className="text-xs" style={{ color: tokens.subtle }}>
                              ⏰ Best time: {item.best_time}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default AIPrioritization;