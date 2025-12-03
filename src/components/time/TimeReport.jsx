import React, { useMemo, useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui-custom/Card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Clock, DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export function TimeReport({ teamId = null, userId = null }) {
  const { tokens } = useTheme();
  const [dateRange, setDateRange] = useState('week'); // 'week', 'month', 'all'

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date', 200),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const filteredEntries = useMemo(() => {
    let entries = allEntries;

    // Filter by user
    if (userId) {
      entries = entries.filter(e => e.user_email === userId);
    } else if (user) {
      entries = entries.filter(e => e.user_email === user.email);
    }

    // Filter by team
    if (teamId) {
      entries = entries.filter(e => e.team_id === teamId);
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      const start = dateRange === 'week' ? startOfWeek(now) : startOfMonth(now);
      const end = dateRange === 'week' ? endOfWeek(now) : endOfMonth(now);
      
      entries = entries.filter(e => {
        if (!e.start_time) return false;
        return isWithinInterval(parseISO(e.start_time), { start, end });
      });
    }

    return entries;
  }, [allEntries, userId, user, teamId, dateRange]);

  const analytics = useMemo(() => {
    const totalMinutes = filteredEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const billableMinutes = filteredEntries
      .filter(e => e.is_billable)
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    
    const totalRevenue = filteredEntries
      .filter(e => e.is_billable && e.hourly_rate)
      .reduce((sum, e) => sum + ((e.duration_minutes / 60) * e.hourly_rate), 0);

    // Group by date
    const byDate = {};
    filteredEntries.forEach(entry => {
      const date = format(parseISO(entry.start_time), 'MMM dd');
      if (!byDate[date]) byDate[date] = 0;
      byDate[date] += entry.duration_minutes / 60;
    });

    const dailyData = Object.entries(byDate)
      .map(([date, hours]) => ({ date, hours: parseFloat(hours.toFixed(1)) }))
      .slice(-7);

    // Group by task
    const byTask = {};
    filteredEntries.forEach(entry => {
      const task = tasks.find(t => t.id === entry.task_id);
      const taskName = task?.title || 'Unknown Task';
      if (!byTask[taskName]) byTask[taskName] = 0;
      byTask[taskName] += entry.duration_minutes;
    });

    const taskData = Object.entries(byTask)
      .map(([name, minutes]) => ({ 
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        hours: parseFloat((minutes / 60).toFixed(1)),
        value: minutes
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      billableHours: (billableMinutes / 60).toFixed(1),
      totalRevenue: totalRevenue.toFixed(2),
      billablePercentage: totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0,
      entriesCount: filteredEntries.length,
      dailyData,
      taskData
    };
  }, [filteredEntries, tasks]);

  const COLORS = [tokens.accent, '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: tokens.color }}>
            Time Report
          </h2>
          <p className="text-sm" style={{ color: tokens.subtle }}>
            Track and analyze your time entries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            style={{ borderColor: tokens.border }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8" style={{ color: tokens.accent }} />
            <div>
              <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                {analytics.totalHours}h
              </div>
              <div className="text-xs" style={{ color: tokens.subtle }}>Total Time</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8" style={{ color: '#10B981' }} />
            <div>
              <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                {analytics.billableHours}h
              </div>
              <div className="text-xs" style={{ color: tokens.subtle }}>Billable</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8" style={{ color: '#3B82F6' }} />
            <div>
              <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                ${analytics.totalRevenue}
              </div>
              <div className="text-xs" style={{ color: tokens.subtle }}>Revenue</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8" style={{ color: '#F59E0B' }} />
            <div>
              <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                {analytics.entriesCount}
              </div>
              <div className="text-xs" style={{ color: tokens.subtle }}>Entries</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Hours */}
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: tokens.color }}>
            Daily Hours Tracked
          </h3>
          {analytics.dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.dailyData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: tokens.subtle, fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: tokens.subtle, fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tokens.card, 
                    border: `1px solid ${tokens.border}`,
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="hours" fill={tokens.accent} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center" style={{ color: tokens.subtle }}>
              No data for selected period
            </div>
          )}
        </Card>

        {/* Time by Task */}
        <Card>
          <h3 className="font-semibold mb-4" style={{ color: tokens.color }}>
            Time by Task (Top 5)
          </h3>
          {analytics.taskData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={analytics.taskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analytics.taskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {analytics.taskData.map((task, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span style={{ color: tokens.color }}>{task.name}</span>
                    </div>
                    <span className="font-medium" style={{ color: tokens.accent }}>
                      {task.hours}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center" style={{ color: tokens.subtle }}>
              No task data available
            </div>
          )}
        </Card>
      </div>

      {/* Billable Percentage */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{ color: tokens.color }}>
            Billable vs Non-Billable
          </h3>
          <span 
            className="text-2xl font-bold"
            style={{ color: tokens.accent }}
          >
            {analytics.billablePercentage}%
          </span>
        </div>
        <div 
          className="h-4 rounded-full overflow-hidden"
          style={{ backgroundColor: `${tokens.accent}20` }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${analytics.billablePercentage}%`,
              backgroundColor: tokens.accent
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-2" style={{ color: tokens.subtle }}>
          <span>Billable: {analytics.billableHours}h</span>
          <span>Non-billable: {(analytics.totalHours - analytics.billableHours).toFixed(1)}h</span>
        </div>
      </Card>
    </div>
  );
}

export default TimeReport;