import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Clock, DollarSign } from 'lucide-react';
import { isToday, parseISO, format } from 'date-fns';

export function TimeTrackingWidget({ timeEntries = [] }) {
  const { tokens } = useTheme();

  const stats = useMemo(() => {
    const todayEntries = timeEntries.filter(e => 
      e.start_time && isToday(parseISO(e.start_time))
    );

    const totalMinutes = todayEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const billableMinutes = todayEntries
      .filter(e => e.is_billable)
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

    const revenue = todayEntries
      .filter(e => e.is_billable && e.hourly_rate)
      .reduce((sum, e) => sum + ((e.duration_minutes / 60) * e.hourly_rate), 0);

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      billableHours: (billableMinutes / 60).toFixed(1),
      revenue: revenue.toFixed(2),
      recentEntries: todayEntries.slice(0, 3)
    };
  }, [timeEntries]);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5" style={{ color: tokens.accent }} />
        <h3 className="font-semibold" style={{ color: tokens.color }}>
          Time Tracking
        </h3>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${tokens.accent}10` }}
          >
            <div className="text-xs mb-1" style={{ color: tokens.subtle }}>
              Total Today
            </div>
            <div className="text-2xl font-bold" style={{ color: tokens.accent }}>
              {stats.totalHours}h
            </div>
          </div>

          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${tokens.accent}10` }}
          >
            <div className="text-xs mb-1" style={{ color: tokens.subtle }}>
              Revenue
            </div>
            <div className="text-2xl font-bold flex items-center" style={{ color: tokens.accent }}>
              <DollarSign className="w-4 h-4" />
              {stats.revenue}
            </div>
          </div>
        </div>

        {stats.recentEntries.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: tokens.subtle }}>
              Recent Entries
            </div>
            <div className="space-y-1">
              {stats.recentEntries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-xs p-2 rounded"
                  style={{ backgroundColor: `${tokens.accent}05` }}
                >
                  <span style={{ color: tokens.color }}>
                    {format(parseISO(entry.start_time), 'h:mm a')}
                  </span>
                  <span style={{ color: tokens.subtle }}>
                    {entry.duration_minutes}m {entry.is_billable && '💰'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}