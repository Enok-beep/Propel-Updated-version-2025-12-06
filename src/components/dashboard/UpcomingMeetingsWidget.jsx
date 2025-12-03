import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Video, Calendar } from 'lucide-react';
import { format, parseISO, isFuture, isToday, isTomorrow } from 'date-fns';

export function UpcomingMeetingsWidget({ meetings = [] }) {
  const { tokens } = useTheme();

  const upcomingMeetings = useMemo(() => {
    return meetings
      .filter(m => m.date && isFuture(parseISO(m.date)))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 4);
  }, [meetings]);

  const getTimeLabel = (time) => {
    if (isToday(time)) return 'Today';
    if (isTomorrow(time)) return 'Tomorrow';
    return format(time, 'MMM d');
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Video className="w-5 h-5" style={{ color: tokens.accent }} />
        <h3 className="font-semibold" style={{ color: tokens.color }}>
          Upcoming Meetings
        </h3>
      </div>

      <div className="space-y-2">
        {upcomingMeetings.map(meeting => {
          const meetingTime = parseISO(meeting.date);
          
          return (
            <div 
              key={meeting.id}
              className="p-3 rounded-lg border"
              style={{ borderColor: tokens.border }}
            >
              <div className="font-medium text-sm mb-1" style={{ color: tokens.color }}>
                {meeting.title}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: tokens.subtle }}>
                <Calendar className="w-3 h-3" />
                {getTimeLabel(meetingTime)} • {format(meetingTime, 'h:mm a')}
              </div>
              {meeting.attendees && meeting.attendees.length > 0 && (
                <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
                  {meeting.attendees.length} attendees
                </div>
              )}
            </div>
          );
        })}

        {upcomingMeetings.length === 0 && (
          <div className="text-center py-6" style={{ color: tokens.subtle }}>
            No upcoming meetings
          </div>
        )}
      </div>
    </Card>
  );
}