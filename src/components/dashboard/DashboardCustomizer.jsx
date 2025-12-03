import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '../ui-custom/Card';
import { Settings, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AVAILABLE_WIDGETS = [
  { id: 'ai_insights', label: 'AI Daily Insights', description: 'Personalized recommendations and priorities' },
  { id: 'quick_stats', label: 'Quick Stats', description: 'Today\'s task completion and progress' },
  { id: 'prioritized_tasks', label: 'Prioritized Tasks', description: 'AI-sorted task list for today' },
  { id: 'upcoming_meetings', label: 'Upcoming Meetings', description: 'Today\'s scheduled meetings' },
  { id: 'energy_matcher', label: 'Energy Task Matcher', description: 'Tasks matching your current energy' },
  { id: 'achievements', label: 'Achievements', description: 'Gamification progress and badges' },
  { id: 'team_activity', label: 'Team Activity', description: 'Recent team updates (team mode only)' },
];

export function DashboardCustomizer({ currentWidgets = [], onWidgetsChange }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWidgets, setSelectedWidgets] = useState(currentWidgets);

  const updatePreferencesMutation = useMutation({
    mutationFn: async (widgets) => {
      const prefs = await base44.entities.UserPreferences.list();
      if (prefs.length > 0) {
        return base44.entities.UserPreferences.update(prefs[0].id, {
          dashboard_widgets: widgets
        });
      } else {
        return base44.entities.UserPreferences.create({
          dashboard_widgets: widgets
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      onWidgetsChange?.(selectedWidgets);
      setIsOpen(false);
    },
  });

  const toggleWidget = (widgetId) => {
    setSelectedWidgets(prev =>
      prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const handleSave = () => {
    updatePreferencesMutation.mutate(selectedWidgets);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        style={{ borderColor: tokens.border }}
      >
        <Settings className="w-4 h-4 mr-2" />
        Customize
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent style={{ backgroundColor: tokens.card, borderColor: tokens.border }}>
          <DialogHeader>
            <DialogTitle style={{ color: tokens.color }}>Customize Dashboard</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm" style={{ color: tokens.subtle }}>
              Choose which widgets to display on your dashboard
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {AVAILABLE_WIDGETS.map(widget => (
                <div
                  key={widget.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-opacity-50 transition-all"
                  style={{ borderColor: tokens.border }}
                >
                  <Checkbox
                    checked={selectedWidgets.includes(widget.id)}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm" style={{ color: tokens.color }}>
                      {widget.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: tokens.subtle }}>
                      {widget.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: tokens.border }}>
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                style={{ borderColor: tokens.border }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                style={{ backgroundColor: tokens.accent }}
                className="text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DashboardCustomizer;