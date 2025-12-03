import React, { useMemo } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui-custom/Card';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Tooltip
} from 'recharts';
import { 
  TrendingUp, CheckCircle2, Clock, Flame, 
  Target, Calendar, Zap
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export default function Analytics() {
  const { tokens } = useTheme();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(now, 6 - i);
      return {
        date,
        label: format(date, 'EEE'),
        completed: 0,
        created: 0,
      };
    });

    // Count tasks per day
    tasks.forEach((task) => {
      const createdDate = new Date(task.created_date);
      const completedDate = task.completed_at ? new Date(task.completed_at) : null;

      last7Days.forEach((day) => {
        const interval = { start: startOfDay(day.date), end: endOfDay(day.date) };
        
        if (isWithinInterval(createdDate, interval)) {
          day.created++;
        }
        if (completedDate && isWithinInterval(completedDate, interval)) {
          day.completed++;
        }
      });
    });

    // Category breakdown
    const categoryCount = {};
    const completedTasks = tasks.filter(t => t.status === 'done');
    completedTasks.forEach((task) => {
      categoryCount[task.category || 'personal'] = (categoryCount[task.category || 'personal'] || 0) + 1;
    });

    const categoryData = Object.entries(categoryCount).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

    // Priority completion rate
    const priorityStats = {};
    ['low', 'medium', 'high', 'urgent'].forEach((p) => {
      const all = tasks.filter(t => t.priority === p);
      const done = all.filter(t => t.status === 'done');
      priorityStats[p] = {
        total: all.length,
        completed: done.length,
        rate: all.length > 0 ? Math.round((done.length / all.length) * 100) : 0,
      };
    });

    // Energy distribution
    const energyCount = { low: 0, medium: 0, high: 0 };
    completedTasks.forEach((task) => {
      energyCount[task.energy_level || 'medium']++;
    });

    // Totals
    const totalCompleted = completedTasks.length;
    const totalPending = tasks.filter(t => t.status !== 'done').length;
    const totalPomodoros = tasks.reduce((sum, t) => sum + (t.pomodoros_completed || 0), 0);
    const avgCompletionTime = completedTasks.length > 0
      ? Math.round(completedTasks.reduce((sum, t) => sum + (t.estimated_minutes || 25), 0) / completedTasks.length)
      : 0;

    return {
      weeklyData: last7Days,
      categoryData,
      priorityStats,
      energyCount,
      totalCompleted,
      totalPending,
      totalPomodoros,
      avgCompletionTime,
    };
  }, [tasks]);

  const COLORS = [tokens.accent, '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <p style={{ color: tokens.subtle }}>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 
          className="text-3xl font-bold tracking-tight"
          style={{ color: tokens.color }}
        >
          Analytics
        </h1>
        <p style={{ color: tokens.subtle }} className="mt-1">
          Track your productivity and progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${tokens.accent}20` }}
            >
              <CheckCircle2 className="w-5 h-5" style={{ color: tokens.accent }} />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                {analytics.totalCompleted}
              </div>
              <div className="text-sm" style={{ color: tokens.subtle }}>Completed</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${tokens.accent}20` }}
            >
              <Target className="w-5 h-5" style={{ color: tokens.accent }} />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                {analytics.totalPending}
              </div>
              <div className="text-sm" style={{ color: tokens.subtle }}>Pending</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${tokens.accent}20` }}
            >
              <Zap className="w-5 h-5" style={{ color: tokens.accent }} />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                {analytics.totalPomodoros}
              </div>
              <div className="text-sm" style={{ color: tokens.subtle }}>Pomodoros</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${tokens.accent}20` }}
            >
              <Clock className="w-5 h-5" style={{ color: tokens.accent }} />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                {analytics.avgCompletionTime}m
              </div>
              <div className="text-sm" style={{ color: tokens.subtle }}>Avg Time</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Progress */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" style={{ color: tokens.accent }} />
            <h3 className="font-semibold" style={{ color: tokens.color }}>
              Weekly Progress
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.weeklyData}>
              <XAxis 
                dataKey="label" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: tokens.subtle, fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: tokens.subtle, fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tokens.card,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: '12px',
                }}
              />
              <Bar 
                dataKey="completed" 
                fill={tokens.accent} 
                radius={[6, 6, 0, 0]}
                name="Completed"
              />
              <Bar 
                dataKey="created" 
                fill={tokens.subtle} 
                radius={[6, 6, 0, 0]}
                name="Created"
                opacity={0.5}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Distribution */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: tokens.accent }} />
            <h3 className="font-semibold" style={{ color: tokens.color }}>
              By Category
            </h3>
          </div>
          {analytics.categoryData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={analytics.categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={4}
                  >
                    {analytics.categoryData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {analytics.categoryData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm" style={{ color: tokens.color }}>
                      {item.name}
                    </span>
                    <span className="text-sm ml-auto" style={{ color: tokens.subtle }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: tokens.subtle }}>
              Complete some tasks to see category breakdown
            </p>
          )}
        </Card>
      </div>

      {/* Priority Completion Rates */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5" style={{ color: tokens.accent }} />
          <h3 className="font-semibold" style={{ color: tokens.color }}>
            Completion by Priority
          </h3>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(analytics.priorityStats).map(([priority, stats]) => (
            <div 
              key={priority}
              className="text-center p-4 rounded-xl"
              style={{ backgroundColor: `${tokens.accent}10` }}
            >
              <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                {stats.rate}%
              </div>
              <div className="text-sm capitalize mt-1" style={{ color: tokens.subtle }}>
                {priority}
              </div>
              <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
                {stats.completed}/{stats.total}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}