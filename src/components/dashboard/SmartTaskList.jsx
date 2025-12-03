import React, { useState, useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui-custom/Card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Zap } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';

export function SmartTaskList({ tasks, currentEnergy, onTaskClick }) {
  const { tokens } = useTheme();
  const [sortedTasks, setSortedTasks] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const prioritizeTasks = async () => {
    setIsAnalyzing(true);
    try {
      const todayTasks = tasks.filter(t => 
        t.due_date && isToday(parseISO(t.due_date)) && t.status !== 'done'
      );

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Prioritize these tasks for optimal productivity:

User Energy Level: ${currentEnergy}
Time: ${new Date().getHours()}:00

Tasks:
${todayTasks.map((t, i) => `${i + 1}. ${t.title} - Priority: ${t.priority}, Energy: ${t.energy_level}, Estimate: ${t.estimated_minutes}min`).join('\n')}

Reorder tasks considering:
- Energy matching (high energy tasks when energy is high)
- Dependencies
- Time of day
- Priority level

Return task indices in optimal order with brief reasoning.`,
        response_json_schema: {
          type: "object",
          properties: {
            order: {
              type: "array",
              items: { type: "number" }
            },
            reasoning: { type: "string" }
          }
        }
      });

      const reordered = result.order.map(idx => todayTasks[idx]).filter(Boolean);
      setSortedTasks({ tasks: reordered, reasoning: result.reasoning });
    } catch (error) {
      console.error('Prioritization failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayTasks = sortedTasks?.tasks || tasks.filter(t => 
    t.due_date && isToday(parseISO(t.due_date)) && t.status !== 'done'
  ).slice(0, 5);

  const priorityColors = {
    urgent: '#DC2626',
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981'
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: tokens.color }}>
            📋 Today's Tasks
          </h3>
          <Button
            onClick={prioritizeTasks}
            disabled={isAnalyzing}
            size="sm"
            variant="outline"
            style={{ borderColor: tokens.border }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Sort
              </>
            )}
          </Button>
        </div>

        {sortedTasks?.reasoning && (
          <div 
            className="text-xs p-2 rounded-lg"
            style={{ backgroundColor: `${tokens.accent}10`, color: tokens.subtle }}
          >
            💡 {sortedTasks.reasoning}
          </div>
        )}

        {displayTasks.length > 0 ? (
          <div className="space-y-2">
            {displayTasks.map((task, idx) => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                style={{ borderColor: tokens.border }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {sortedTasks && (
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: tokens.accent }}
                        >
                          {idx + 1}
                        </div>
                      )}
                      <p className="font-medium text-sm truncate" style={{ color: tokens.color }}>
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: tokens.subtle }}>
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: priorityColors[task.priority] }}
                      />
                      <span className="capitalize">{task.priority}</span>
                      <span>•</span>
                      <Zap className="w-3 h-3" />
                      <span>{task.energy_level} energy</span>
                      <span>•</span>
                      <span>{task.estimated_minutes}min</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: tokens.subtle }}>
            <p className="text-sm">No tasks due today</p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default SmartTaskList;