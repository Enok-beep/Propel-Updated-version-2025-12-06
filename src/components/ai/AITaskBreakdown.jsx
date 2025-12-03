import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Wand2, Loader2, Plus } from 'lucide-react';

export function AITaskBreakdown({ taskTitle, taskDescription, onSubTasksGenerated }) {
  const { tokens } = useTheme();
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubTasks, setSelectedSubTasks] = useState([]);

  const generateBreakdown = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a productivity AI assistant. Break down this task into actionable sub-tasks.

Task: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ''}

Create 3-6 specific, actionable sub-tasks that:
1. Are concrete and measurable
2. Follow a logical sequence
3. Are individually completable in 15-45 minutes
4. Cover all aspects of the main task

Return sub-tasks with estimated time in minutes.`,
        response_json_schema: {
          type: "object",
          properties: {
            sub_tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  estimated_minutes: { type: "number" },
                  priority: { type: "string", enum: ["low", "medium", "high"] }
                }
              }
            }
          }
        }
      });

      if (result?.sub_tasks?.length > 0) {
        setSuggestions(result.sub_tasks);
        setSelectedSubTasks(result.sub_tasks.map((_, idx) => idx));
      }
    } catch (error) {
      console.error('AI breakdown unavailable:', error);
      // Silently fail - feature is optional
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    const selected = selectedSubTasks.map(idx => suggestions[idx]);
    onSubTasksGenerated?.(selected);
    setSuggestions(null);
    setSelectedSubTasks([]);
  };

  const toggleSubTask = (idx) => {
    setSelectedSubTasks(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold" style={{ color: tokens.color }}>
          ✨ AI Task Breakdown
        </h4>
        
        {!suggestions && (
          <Button
            onClick={generateBreakdown}
            disabled={isLoading || !taskTitle.trim()}
            size="sm"
            variant="outline"
            style={{ borderColor: tokens.border }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-3 h-3 mr-2" />
                Break Down Task
              </>
            )}
          </Button>
        )}
      </div>

      {suggestions && (
        <div className="space-y-3">
          <div 
            className="p-2 rounded-lg text-xs"
            style={{ 
              backgroundColor: `${tokens.accent}10`,
              color: tokens.subtle
            }}
          >
            💡 Select sub-tasks to add (you can edit them later)
          </div>

          <div className="space-y-2">
            {suggestions.map((subTask, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg border"
                style={{ borderColor: tokens.border }}
              >
                <Checkbox
                  checked={selectedSubTasks.includes(idx)}
                  onCheckedChange={() => toggleSubTask(idx)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: tokens.color }}>
                    {subTask.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: tokens.subtle }}>
                    <span>⏱️ {subTask.estimated_minutes} min</span>
                    <span>•</span>
                    <span className="capitalize">{subTask.priority} priority</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleApply}
              disabled={selectedSubTasks.length === 0}
              size="sm"
              style={{ backgroundColor: tokens.accent }}
              className="text-white flex-1"
            >
              <Plus className="w-3 h-3 mr-2" />
              Add {selectedSubTasks.length} Sub-tasks
            </Button>
            
            <Button
              onClick={() => setSuggestions(null)}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AITaskBreakdown;