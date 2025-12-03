import React, { useState } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui-custom/Card';
import { MeetingSummary } from '@/components/team/MeetingSummary';
import { AIScheduler } from '@/components/team/AIScheduler';
import { QuickMeetingSummary } from '@/components/team/QuickMeetingSummary';
import { MeetingRecorder } from '@/components/team/MeetingRecorder';
import { VideoMeetingRoom } from '@/components/team/VideoMeetingRoom';
import { Plus, Calendar, Users, Sparkles, Zap, Video } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Meetings() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showQuickSummary, setShowQuickSummary] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [activeVideoMeeting, setActiveVideoMeeting] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: allTeamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const activeTeamId = preferences[0]?.active_team_id;

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', activeTeamId],
    queryFn: () => base44.entities.Meeting.filter({ team_id: activeTeamId }, '-date'),
    enabled: !!activeTeamId,
  });

  const createMeetingMutation = useMutation({
    mutationFn: (data) => base44.entities.Meeting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setShowForm(false);
    },
  });

  const [formData, setFormData] = useState({
    title: '',
    project_id: '',
    date: new Date().toISOString().slice(0, 16),
    attendees: [],
    notes: ''
  });

  const teamMembers = allTeamMembers.filter(tm => 
    tm.team_id === activeTeamId && tm.status === 'active'
  );

  const teamProjects = projects.filter(p => p.team_id === activeTeamId);

  const handleSubmit = (e) => {
    e.preventDefault();
    createMeetingMutation.mutate({
      ...formData,
      team_id: activeTeamId,
      date: new Date(formData.date).toISOString()
    });
  };

  if (!activeTeamId) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <p style={{ color: tokens.subtle }}>
              Switch to team mode to access meetings
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" style={{ color: tokens.color }}>
          Team Meetings
        </h1>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setShowQuickSummary(!showQuickSummary)}
            variant="outline"
            style={{ borderColor: tokens.border }}
          >
            <Zap className="w-4 h-4 mr-2" />
            Quick Summary
          </Button>
          <Button
            onClick={() => setShowScheduler(!showScheduler)}
            variant="outline"
            style={{ borderColor: tokens.border }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Scheduler
          </Button>
          <Button
            onClick={() => {
              setFormData({
                title: '',
                project_id: '',
                date: new Date().toISOString().slice(0, 16),
                attendees: [],
                notes: ''
              });
              setShowForm(true);
            }}
            style={{ backgroundColor: tokens.accent }}
            className="text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Meeting
          </Button>
        </div>
      </div>

      {/* Quick Summary */}
      {showQuickSummary && (
        <div className="mb-6">
          <QuickMeetingSummary
            teamId={activeTeamId}
            onSummaryGenerated={() => {
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
            }}
          />
        </div>
      )}

      {/* AI Scheduler */}
      {showScheduler && (
        <div className="mb-6">
          <AIScheduler
            teamId={activeTeamId}
            onScheduleSuggested={(data) => {
              setFormData({
                ...data,
                title: data.title,
                project_id: '',
                date: new Date(data.date).toISOString().slice(0, 16)
              });
              setShowScheduler(false);
              setShowForm(true);
            }}
          />
        </div>
      )}

      {/* Meetings List */}
      <div className="space-y-4">
        {meetings.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: tokens.subtle }} />
              <p style={{ color: tokens.subtle }}>
                No meetings yet. Create one to get started!
              </p>
            </div>
          </Card>
        ) : (
          meetings.map(meeting => (
            <div key={meeting.id}>
              <Card 
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => setSelectedMeeting(meeting)}
              >
                <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2" style={{ color: tokens.color }}>
                    {meeting.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: tokens.subtle }}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(meeting.date), 'PPP')}
                    </div>
                    {meeting.attendees && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {meeting.attendees.length} attendees
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveVideoMeeting(meeting);
                  }}
                  size="sm"
                  style={{ backgroundColor: tokens.accent }}
                  className="text-white"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join Video
                </Button>
                </div>
              </Card>

              {selectedMeeting?.id === meeting.id && (
                <div className="mt-4 space-y-4">
                  <MeetingRecorder
                    meetingId={meeting.id}
                    onNotesReady={(transcript) => {
                      // Update meeting notes with transcript
                      const updatedMeeting = { ...meeting, notes: transcript };
                      setSelectedMeeting(updatedMeeting);
                      
                      // Optionally update in database
                      fetch(`/api/meetings/${meeting.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ notes: transcript })
                      });
                    }}
                  />
                  
                  <MeetingSummary 
                    meeting={meeting}
                    onActionItemCreated={() => {
                      queryClient.invalidateQueries({ queryKey: ['tasks'] });
                    }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Meeting Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent style={{ backgroundColor: tokens.card, borderColor: tokens.border }}>
          <DialogHeader>
            <DialogTitle style={{ color: tokens.color }}>New Meeting</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Sprint Planning Meeting"
                required
                style={{ borderColor: tokens.border }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
                Project (optional)
              </label>
              <Select
                value={formData.project_id}
                onValueChange={(val) => setFormData(prev => ({ ...prev, project_id: val }))}
              >
                <SelectTrigger style={{ borderColor: tokens.border }}>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No project</SelectItem>
                  {teamProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
                Date & Time
              </label>
              <Input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
                style={{ borderColor: tokens.border }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
                Notes / Agenda
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Meeting notes, agenda, or transcript..."
                className="min-h-[120px]"
                style={{ borderColor: tokens.border }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button 
                type="submit"
                style={{ backgroundColor: tokens.accent }}
                className="text-white"
              >
                Create Meeting
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Video Meeting Room */}
      {activeVideoMeeting && (
        <VideoMeetingRoom
          meeting={activeVideoMeeting}
          onLeave={() => {
            setActiveVideoMeeting(null);
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
          }}
        />
      )}
    </div>
  );
}