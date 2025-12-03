import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Grid3x3, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PERSONAL_WIDGETS = [
  { id: 'energy_insights', name: 'Energy Insights', description: 'AI-powered task recommendations based on your energy' },
  { id: 'daily_goals', name: 'Daily Goals', description: 'Track progress towards daily task completion goals' },
  { id: 'focus_time', name: 'Focus Time', description: 'Pomodoro stats and focus session tracking' },
  { id: 'prioritized_tasks', name: 'Smart Task List', description: 'AI-prioritized tasks for today' },
  { id: 'achievements', name: 'Achievements', description: 'Recent unlocks and progress' },
  { id: 'quick_stats', name: 'Quick Stats', description: 'Overview of tasks, streak, and points' },
  { id: 'upcoming_calendar', name: 'Upcoming Events', description: 'Next tasks and calendar events' },
  { id: 'time_tracking', name: 'Time Tracking', description: 'Recent time entries and totals' },
  { id: 'weather', name: 'Weather', description: 'Current weather for your location' },
];

const TEAM_WIDGETS = [
  { id: 'team_velocity', name: 'Team Velocity', description: 'Burndown charts and completion rates' },
  { id: 'resource_utilization', name: 'Resource Utilization', description: 'Team capacity and workload distribution' },
  { id: 'project_timeline', name: 'Project Timeline', description: 'Active projects and milestones' },
  { id: 'team_tasks', name: 'Team Tasks', description: 'Assigned tasks across the team' },
  { id: 'upcoming_meetings', name: 'Upcoming Meetings', description: 'Next team meetings and action items' },
  { id: 'quick_stats', name: 'Quick Stats', description: 'Team overview metrics' },
  { id: 'recent_activity', name: 'Recent Activity', description: 'Latest team updates and changes' },
  { id: 'overdue_alerts', name: 'Overdue Alerts', description: 'Tasks and projects needing attention' },
];

export function WidgetSelector({ mode = 'personal', selectedWidgets = [], onSave }) {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);
  const [tempSelection, setTempSelection] = useState(selectedWidgets);

  const availableWidgets = mode === 'team' ? TEAM_WIDGETS : PERSONAL_WIDGETS;

  const toggleWidget = (widgetId) => {
    setTempSelection(prev => 
      prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const handleSave = () => {
    onSave(tempSelection);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setTempSelection(selectedWidgets);
          setOpen(true);
        }}
        style={{ borderColor: tokens.border }}
      >
        <Grid3x3 className="w-4 h-4 mr-2" />
        Customize Widgets
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className="max-w-2xl"
          style={{ backgroundColor: tokens.card }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: tokens.color }}>
              Customize {mode === 'team' ? 'Team' : 'Personal'} Dashboard
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {availableWidgets.map(widget => {
              const isSelected = tempSelection.includes(widget.id);
              
              return (
                <button
                  key={widget.id}
                  onClick={() => toggleWidget(widget.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
                    "hover:scale-[1.01]"
                  )}
                  style={{
                    backgroundColor: isSelected ? `${tokens.accent}10` : tokens.card,
                    borderColor: isSelected ? tokens.accent : tokens.border
                  }}
                >
                  <div 
                    className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                    )}
                    style={{
                      borderColor: isSelected ? tokens.accent : tokens.border,
                      backgroundColor: isSelected ? tokens.accent : 'transparent'
                    }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium mb-1" style={{ color: tokens.color }}>
                      {widget.name}
                    </div>
                    <div className="text-sm" style={{ color: tokens.subtle }}>
                      {widget.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: tokens.border }}>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              style={{ backgroundColor: tokens.accent }}
              className="text-white"
            >
              Save Layout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default WidgetSelector;