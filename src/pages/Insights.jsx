import React, { useMemo } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui-custom/Card';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Battery, BatteryWarning, Clock, Zap, Link2, Lock 
} from 'lucide-react';
import { format, addDays, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Insights() {
  const { tokens } = useTheme();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  // Build dependency graph and calculate critical paths
  const dependencyGraph = useMemo(() => {
    const graph = new Map();
    const inDegree = new Map();
    
    tasks.forEach(task => {
      graph.set(task.id, []);
      inDegree.set(task.id, 0);
    });
    
    tasks.forEach(task => {
      if (task.depends_on && task.depends_on.length > 0) {
        task.depends_on.forEach(depId => {
          if (graph.has(depId)) {
            graph.get(depId).push(task.id);
            inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
          }
        });
      }
    });
    
    return { graph, inDegree };
  }, [tasks]);

  // Calculate critical path using topological sort
  const criticalPathInfo = useMemo(() => {
    const { graph, inDegree } = dependencyGraph;
    const queue = [];
    const earliestStart = new Map();
    const criticalTasks = new Set();
    
    tasks.forEach(task => {
      if ((inDegree.get(task.id) || 0) === 0) {
        queue.push(task.id);
        earliestStart.set(task.id, 0);
      }
    });
    
    let maxPath = 0;
    while (queue.length > 0) {
      const taskId = queue.shift();
      const task = tasks.find(t => t.id === taskId);
      const currentStart = earliestStart.get(taskId) || 0;
      const duration = task?.estimated_minutes || 25;
      const finish = currentStart + duration;
      
      if (finish > maxPath) {
        maxPath = finish;
      }
      
      (graph.get(taskId) || []).forEach(nextId => {
        const newDegree = (inDegree.get(nextId) || 1) - 1;
        inDegree.set(nextId, newDegree);
        
        const newStart = Math.max(earliestStart.get(nextId) || 0, finish);
        earliestStart.set(nextId, newStart);
        
        if (newDegree === 0) {
          queue.push(nextId);
        }
      });
    }
    
    // Mark tasks on critical path
    const visited = new Set();
    const findCriticalPath = (taskId, currentPath) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      
      const task = tasks.find(t => t.id === taskId);
      const duration = task?.estimated_minutes || 25;
      
      if (currentPath + duration >= maxPath * 0.8) {
        criticalTasks.add(taskId);
      }
      
      (graph.get(taskId) || []).forEach(nextId => {
        findCriticalPath(nextId, currentPath + duration);
      });
    };
    
    tasks.forEach(task => {
      if ((inDegree.get(task.id) || 0) === 0) {
        findCriticalPath(task.id, 0);
      }
    });
    
    return {
      criticalTasks,
      totalCriticalPathMinutes: maxPath,
      blockedTasks: tasks.filter(t => {
        const deps = t.depends_on || [];
        return deps.length > 0 && deps.some(depId => {
          const depTask = tasks.find(dt => dt.id === depId);
          return depTask && depTask.status !== 'done';
        });
      }).length
    };
  }, [tasks, dependencyGraph]);

  // Calculate 7-day capacity forecast
  const forecast = useMemo(() => {
    const today = startOfDay(new Date());
    const next7Days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

    // Historical completion rate (last 14 days)
    const past14Days = Array.from({ length: 14 }, (_, i) => addDays(today, -i - 1));
    const historicalTasks = tasks.filter(t => {
      if (!t.created_date) return false;
      const created = parseISO(t.created_date);
      return past14Days.some(d => isSameDay(created, d));
    });
    
    const completedHistorical = historicalTasks.filter(t => t.status === 'done').length;
    const avgCompletionRate = historicalTasks.length > 0 
      ? completedHistorical / historicalTasks.length 
      : 0.7;

    // Calculate forecast for each day
    return next7Days.map((day, index) => {
      const dayTasks = tasks.filter(t => {
        if (!t.due_date) return false;
        return isSameDay(parseISO(t.due_date), day);
      });

      const totalMinutes = dayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 25), 0);
      const highPriorityCount = dayTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
      const highEnergyCount = dayTasks.filter(t => t.energy_level === 'high').length;
      const criticalPathTasks = dayTasks.filter(t => criticalPathInfo.criticalTasks.has(t.id)).length;
      const blockedTasks = dayTasks.filter(t => {
        const deps = t.depends_on || [];
        return deps.some(depId => {
          const depTask = tasks.find(dt => dt.id === depId);
          return depTask && depTask.status !== 'done';
        });
      }).length;

      // Available capacity (assume 8 productive hours per day)
      const availableMinutes = 480;
      const capacityUsage = totalMinutes / availableMinutes;

      // Energy demand score (0-100)
      const energyDemand = (highEnergyCount / Math.max(dayTasks.length, 1)) * 100;

      // Forecast status
      let status = 'healthy';
      let timeDebt = 0;
      let energyDeficit = 0;

      if (capacityUsage > 1.2) {
        status = 'overload';
        timeDebt = totalMinutes - availableMinutes;
      } else if (capacityUsage > 0.9) {
        status = 'warning';
        timeDebt = totalMinutes - (availableMinutes * 0.9);
      }

      if (energyDemand > 70 && highEnergyCount > 3) {
        energyDeficit = highEnergyCount - 3;
        if (status === 'healthy') status = 'warning';
      }

      return {
        date: day,
        dayName: format(day, 'EEE'),
        fullDate: format(day, 'MMM d'),
        isToday: index === 0,
        taskCount: dayTasks.length,
        totalMinutes,
        availableMinutes,
        capacityUsage,
        highPriorityCount,
        highEnergyCount,
        energyDemand,
        status,
        timeDebt: Math.max(0, timeDebt),
        energyDeficit: Math.max(0, energyDeficit),
        completionForecast: avgCompletionRate * 100,
        criticalPathTasks,
        blockedTasks
      };
    });
  }, [tasks]);

  // Overall insights
  const overallInsights = useMemo(() => {
    const criticalDays = forecast.filter(d => d.status === 'overload').length;
    const warningDays = forecast.filter(d => d.status === 'warning').length;
    const totalTimeDebt = forecast.reduce((sum, d) => sum + d.timeDebt, 0);
    const avgCapacity = forecast.reduce((sum, d) => sum + d.capacityUsage, 0) / 7;
    const peakDay = forecast.reduce((max, d) => d.capacityUsage > max.capacityUsage ? d : max, forecast[0]);

    return {
      criticalDays,
      warningDays,
      totalTimeDebt,
      avgCapacity,
      peakDay,
      burnoutRisk: criticalDays >= 2 || warningDays >= 4
    };
  }, [forecast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: tokens.accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ backgroundColor: tokens.bg }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: tokens.color }}>
              Capacity Insights
            </h1>
            <p className="text-sm mt-1" style={{ color: tokens.subtle }}>
              7-day forecast • Prevent burnout before it happens
            </p>
          </div>
        </div>

        {/* Alert Banner */}
        {overallInsights.burnoutRisk && (
          <div 
            className="flex items-start gap-3 p-4 rounded-2xl border-2"
            style={{ 
              backgroundColor: '#FEF2F2',
              borderColor: '#FCA5A5',
              color: '#991B1B'
            }}
          >
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Burnout Risk Detected</div>
              <div className="text-sm mt-1">
                You have {overallInsights.criticalDays} critical overload day(s) and {overallInsights.warningDays} warning day(s) ahead.
                Consider rescheduling tasks or blocking recovery time.
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${tokens.accent}20` }}
              >
                <TrendingUp className="w-5 h-5" style={{ color: tokens.accent }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                  {Math.round(overallInsights.avgCapacity * 100)}%
                </div>
                <div className="text-xs" style={{ color: tokens.subtle }}>Avg Capacity</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${tokens.accent}20` }}
              >
                <Link2 className="w-5 h-5" style={{ color: tokens.accent }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                  {Math.round(criticalPathInfo.totalCriticalPathMinutes / 60)}h
                </div>
                <div className="text-xs" style={{ color: tokens.subtle }}>Critical Path</div>
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
                  {Math.round(overallInsights.totalTimeDebt / 60)}h
                </div>
                <div className="text-xs" style={{ color: tokens.subtle }}>Time Debt</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${tokens.accent}20` }}
              >
                <AlertTriangle className="w-5 h-5" style={{ color: tokens.accent }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: tokens.color }}>
                  {overallInsights.warningDays}
                </div>
                <div className="text-xs" style={{ color: tokens.subtle }}>Warning Days</div>
              </div>
            </div>
          </Card>

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
                  {forecast[0].completionForecast.toFixed(0)}%
                </div>
                <div className="text-xs" style={{ color: tokens.subtle }}>Est. Completion</div>
              </div>
            </div>
          </Card>
        </div>

        {/* 7-Day Forecast */}
        <Card>
          <h2 className="text-lg font-semibold mb-4" style={{ color: tokens.color }}>
            7-Day Capacity Forecast
          </h2>
          <div className="space-y-3">
            {forecast.map((day) => {
              const statusConfig = {
                healthy: { bg: tokens.card, border: tokens.border, icon: CheckCircle2, label: 'Healthy', color: '#10B981' },
                warning: { bg: tokens.card, border: tokens.border, icon: AlertTriangle, label: 'Warning', color: '#F59E0B' },
                overload: { bg: tokens.card, border: tokens.border, icon: BatteryWarning, label: 'Overload', color: '#EF4444' }
              }[day.status];

              const Icon = statusConfig.icon;

              return (
                <div
                  key={day.date.toISOString()}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border transition-all",
                    day.isToday && "ring-2 ring-offset-2"
                  )}
                  style={{
                    backgroundColor: statusConfig.bg,
                    borderColor: statusConfig.border,
                    ringColor: tokens.accent
                  }}
                >
                  {/* Date */}
                  <div className="flex-shrink-0 text-center" style={{ minWidth: '60px' }}>
                    <div className="font-bold text-sm" style={{ color: tokens.color }}>
                      {day.dayName}
                    </div>
                    <div className="text-xs" style={{ color: tokens.subtle }}>
                      {day.fullDate}
                    </div>
                    {day.isToday && (
                      <div className="text-[10px] font-medium mt-1" style={{ color: tokens.accent }}>
                        TODAY
                      </div>
                    )}
                  </div>

                  {/* Capacity Bar */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: tokens.color }}>
                        {day.taskCount} tasks • {Math.round(day.totalMinutes / 60)}h {day.totalMinutes % 60}m
                      </span>
                      <span className="text-xs font-bold" style={{ color: statusConfig.color }}>
                        {Math.round(day.capacityUsage * 100)}%
                      </span>
                    </div>
                    <div 
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: '#E5E7EB' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(day.capacityUsage * 100, 100)}%`,
                          backgroundColor: statusConfig.color
                        }}
                      />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: statusConfig.color }} />
                    <span className="text-xs font-medium" style={{ color: statusConfig.color }}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Warnings */}
                  {(day.timeDebt > 0 || day.energyDeficit > 0 || day.criticalPathTasks > 0 || day.blockedTasks > 0) && (
                    <div className="text-xs space-y-1">
                      {day.timeDebt > 0 && (
                        <div style={{ color: '#DC2626' }}>
                          ⏱️ {Math.round(day.timeDebt / 60)}h overtime
                        </div>
                      )}
                      {day.energyDeficit > 0 && (
                        <div style={{ color: '#F59E0B' }}>
                          ⚡ {day.energyDeficit} excess high-energy tasks
                        </div>
                      )}
                      {day.criticalPathTasks > 0 && (
                        <div style={{ color: '#3B82F6' }}>
                          🔗 {day.criticalPathTasks} critical path tasks
                        </div>
                      )}
                      {day.blockedTasks > 0 && (
                        <div style={{ color: '#F59E0B' }}>
                          🔒 {day.blockedTasks} blocked tasks
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recommendations */}
        {overallInsights.peakDay && (
          <Card>
            <h2 className="text-lg font-semibold mb-4" style={{ color: tokens.color }}>
              💡 Smart Recommendations
            </h2>
            <div className="space-y-3">
              {overallInsights.avgCapacity > 0.9 && (
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: `${tokens.accent}10` }}>
                  <TrendingDown className="w-5 h-5 mt-0.5" style={{ color: tokens.accent }} />
                  <div>
                    <div className="font-medium text-sm" style={{ color: tokens.color }}>
                      Reduce Weekly Load
                    </div>
                    <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
                      You're at {Math.round(overallInsights.avgCapacity * 100)}% capacity. Consider deferring low-priority tasks.
                    </div>
                  </div>
                </div>
              )}
              
              {overallInsights.peakDay.status === 'overload' && (
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: `${tokens.accent}10` }}>
                  <Battery className="w-5 h-5 mt-0.5" style={{ color: tokens.accent }} />
                  <div>
                    <div className="font-medium text-sm" style={{ color: tokens.color }}>
                      Reschedule {overallInsights.peakDay.fullDate}
                    </div>
                    <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
                      Peak day at {Math.round(overallInsights.peakDay.capacityUsage * 100)}%. 
                      Move {overallInsights.peakDay.highPriorityCount} tasks to lighter days.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: `${tokens.accent}10` }}>
                <Zap className="w-5 h-5 mt-0.5" style={{ color: tokens.accent }} />
                <div>
                  <div className="font-medium text-sm" style={{ color: tokens.color }}>
                    Energy Management
                  </div>
                  <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
                    Schedule high-energy tasks during your peak energy windows to maximize performance.
                  </div>
                </div>
              </div>

              {criticalPathInfo.blockedTasks > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: `${tokens.accent}10` }}>
                  <Lock className="w-5 h-5 mt-0.5" style={{ color: tokens.accent }} />
                  <div>
                    <div className="font-medium text-sm" style={{ color: tokens.color }}>
                      Unblock {criticalPathInfo.blockedTasks} Tasks
                    </div>
                    <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
                      Complete dependency tasks to unlock blocked work and maintain momentum.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}