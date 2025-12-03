import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '../ui-custom/Card';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, Calendar, Users, Clock, Target } from 'lucide-react';
import { format, addDays, setHours, setMinutes } from 'date-fns';

export function AIScheduler({ teamId, projectId, onScheduleSuggested }) {
  const { tokens } = useTheme();
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: allTeamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: allMeetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list(),
  });

  const teamMembers = allTeamMembers.filter(tm => 
    tm.team_id === teamId && tm.status === 'active'
  );

  const generateSchedule = async () => {
    if (selectedAttendees.length === 0) return;

    setIsAnalyzing(true);
    try {
      // Analyze each attendee's workload and schedule
      const attendeeAnalysis = selectedAttendees.map(email => {
        const userTasks = allTasks.filter(t => 
          t.assigned_to === email && t.status !== 'done'
        );
        const userMeetings = allMeetings.filter(m => 
          m.attendees?.includes(email)
        );

        const urgentTasks = userTasks.filter(t => 
          t.priority === 'urgent' || t.priority === 'high'
        );

        const upcomingDeadlines = userTasks.filter(t => {
          if (!t.due_date) return false;
          const daysUntil = (new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24);
          return daysUntil >= 0 && daysUntil <= 7;
        });

        return {
          email,
          total_tasks: userTasks.length,
          urgent_tasks: urgentTasks.length,
          upcoming_deadlines: upcomingDeadlines.length,
          recent_meetings: userMeetings.filter(m => 
            new Date(m.date) > new Date()
          ).length,
          task_details: upcomingDeadlines.map(t => ({
            title: t.title,
            due_date: t.due_date,
            priority: t.priority
          }))
        };
      });

      // Project-level context
      const projectTasks = projectId 
        ? allTasks.filter(t => t.project_id === projectId)
        : allTasks.filter(t => t.team_id === teamId);

      const blockedTasks = projectTasks.filter(t => {
        const hasUncompletedDeps = t.depends_on?.some(depId => {
          const depTask = allTasks.find(dt => dt.id === depId);
          return depTask && depTask.status !== 'done';
        });
        return hasUncompletedDeps;
      });

      const projectContext = {
        total_tasks: projectTasks.length,
        completed: projectTasks.filter(t => t.status === 'done').length,
        in_progress: projectTasks.filter(t => t.status === 'in_progress').length,
        blocked_tasks: blockedTasks.length,
        high_priority_count: projectTasks.filter(t => 
          t.priority === 'urgent' || t.priority === 'high'
        ).length
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI meeting scheduler. Analyze team availability and project needs to suggest optimal meeting times and agenda.

Attendees Analysis:
${JSON.stringify(attendeeAnalysis, null, 2)}

Project Context:
${JSON.stringify(projectContext, null, 2)}

Current date: ${format(new Date(), 'PPP')}

Consider:
1. Team workload - avoid scheduling when people have urgent deadlines
2. Meeting fatigue - check recent meeting count
3. Project blockers - prioritize discussing blocked tasks
4. Time of day - suggest morning for high-energy discussions, afternoon for status updates

Suggest:
- Top 3 optimal time slots (date + time) within the next 2 weeks
- Estimated duration (30/60/90 minutes)
- Meeting agenda with 3-5 specific discussion points based on project needs
- Priority level (high/medium/low)

Be specific and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_times: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  time: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            },
            duration_minutes: { type: "number" },
            agenda: {
              type: "array",
              items: { type: "string" }
            },
            priority: { type: "string", enum: ["high", "medium", "low"] },
            meeting_type: { type: "string" },
            preparation_notes: { type: "string" }
          }
        }
      });

      setSuggestion(result);
    } catch (error) {
      console.error('Scheduling failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleAttendee = (email) => {
    setSelectedAttendees(prev =>
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const applySchedule = (timeSlot) => {
    const [month, day] = timeSlot.date.split(' ');
    const [hour, minute, period] = timeSlot.time.match(/(\d+):(\d+)\s*(AM|PM)/).slice(1);
    
    let hours = parseInt(hour);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const scheduledDate = setMinutes(setHours(new Date(), hours), parseInt(minute));
    
    onScheduleSuggested?.({
      date: scheduledDate.toISOString(),
      attendees: selectedAttendees,
      title: suggestion.meeting_type || 'Team Meeting',
      notes: `Agenda:\n${suggestion.agenda.join('\n')}\n\nPreparation:\n${suggestion.preparation_notes}`
    });
  };

  const priorityColors = {
    high: '#DC2626',
    medium: '#F59E0B',
    low: '#10B981'
  };

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: tokens.accent }} />
          <h3 className="font-semibold" style={{ color: tokens.color }}>
            AI Meeting Scheduler
          </h3>
        </div>

        {/* Attendee Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
            Select Attendees
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {teamMembers.map(member => (
              <div key={member.user_email} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedAttendees.includes(member.user_email)}
                  onCheckedChange={() => toggleAttendee(member.user_email)}
                />
                <span className="text-sm" style={{ color: tokens.color }}>
                  {member.user_email}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateSchedule}
          disabled={selectedAttendees.length === 0 || isAnalyzing}
          className="w-full"
          style={{ backgroundColor: tokens.accent }}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing schedules...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Find Optimal Time
            </>
          )}
        </Button>

        {/* Suggestions */}
        {suggestion && (
          <div className="space-y-4 pt-4 border-t" style={{ borderColor: tokens.border }}>
            {/* Meeting Info */}
            <div className="flex items-center gap-4 flex-wrap">
              <div 
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${priorityColors[suggestion.priority]}20`,
                  color: priorityColors[suggestion.priority]
                }}
              >
                {suggestion.priority} priority
              </div>
              <div className="flex items-center gap-1 text-sm" style={{ color: tokens.subtle }}>
                <Clock className="w-4 h-4" />
                {suggestion.duration_minutes} min
              </div>
              <div className="flex items-center gap-1 text-sm" style={{ color: tokens.subtle }}>
                <Users className="w-4 h-4" />
                {selectedAttendees.length} attendees
              </div>
            </div>

            {/* Suggested Times */}
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: tokens.color }}>
                📅 Suggested Times
              </h4>
              <div className="space-y-2">
                {suggestion.suggested_times.map((slot, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border"
                    style={{ borderColor: tokens.border }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm" style={{ color: tokens.color }}>
                          {slot.date} at {slot.time}
                        </div>
                        <p className="text-xs mt-1" style={{ color: tokens.subtle }}>
                          {slot.reasoning}
                        </p>
                      </div>
                      <Button
                        onClick={() => applySchedule(slot)}
                        size="sm"
                        variant="outline"
                        style={{ borderColor: tokens.border }}
                      >
                        Use This
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agenda */}
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: tokens.color }}>
                📋 Proposed Agenda
              </h4>
              <ul className="space-y-1">
                {suggestion.agenda.map((item, idx) => (
                  <li 
                    key={idx}
                    className="text-sm flex items-start gap-2"
                    style={{ color: tokens.subtle }}
                  >
                    <span>{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Preparation Notes */}
            {suggestion.preparation_notes && (
              <div 
                className="p-3 rounded-lg text-sm"
                style={{ 
                  backgroundColor: `${tokens.accent}10`,
                  color: tokens.subtle
                }}
              >
                <div className="font-medium mb-1" style={{ color: tokens.color }}>
                  💡 Preparation
                </div>
                {suggestion.preparation_notes}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export default AIScheduler;