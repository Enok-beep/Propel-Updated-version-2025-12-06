import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { 
  X, MapPin, Clock, Cloud, Navigation, 
  Car, AlertTriangle, CheckCircle2, Edit2, Trash2, Loader2, Train, TrendingUp, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TaskComments } from '../tasks/TaskComments';
import { SubTaskList } from '../tasks/SubTaskList';
import { DependencyVisualization } from '../tasks/DependencyVisualization';
import { ResourceAllocation } from '../resources/ResourceAllocation';
import { TimeTracker } from '../time/TimeTracker';
import { AttachmentList } from '../attachments/FileUploader';
import { ContextReminders } from '../reminders/ContextReminders';
import { useQuery } from '@tanstack/react-query';
import { notifyStatusChange } from '../notifications/NotificationService';

export function TaskDetailSheet({ task, onClose, onEdit, onDelete, onComplete, isBeingDragged = false }) {
  const { tokens } = useTheme();
  const [weather, setWeather] = useState(null);
  const [travelInfo, setTravelInfo] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', task?.id],
    queryFn: () => base44.entities.Attachment.filter({ task_id: task.id }),
    enabled: !!task?.id,
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const { data: externalEvents = [] } = useQuery({
    queryKey: ['externalEvents'],
    queryFn: () => base44.entities.ExternalCalendarEvent.list('-start_time', 100),
    enabled: !!task?.due_date,
  });

  useEffect(() => {
    if (task?.due_date) {
      fetchWeatherForTask();
    }
  }, [task]);

  const fetchWeatherForTask = async () => {
    if (!task?.due_date) return;
    setIsLoadingWeather(true);
    
    try {
      const dueDate = format(new Date(task.due_date), 'MMMM d, yyyy h:mm a');
      const locationInfo = task.location ? `at ${task.location}` : '';
      
      // Get user's real-time GPS location
      let userLocation = preferences[0]?.default_location || 'current location';
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        userLocation = `${position.coords.latitude}, ${position.coords.longitude}`;
      } catch (gpsError) {
        console.log('GPS unavailable, using saved location');
      }

      // Check for calendar conflicts
      const taskTime = new Date(task.due_date);
      const taskEndTime = new Date(taskTime.getTime() + (task.estimated_minutes || 30) * 60000);
      const conflicts = externalEvents.filter(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = event.end_time ? new Date(event.end_time) : new Date(eventStart.getTime() + 3600000);
        return (
          (taskTime >= eventStart && taskTime < eventEnd) ||
          (taskEndTime > eventStart && taskEndTime <= eventEnd) ||
          (taskTime <= eventStart && taskEndTime >= eventEnd)
        );
      });

      const conflictInfo = conflicts.length > 0 
        ? `\n\nCALENDAR CONFLICTS DETECTED: There are ${conflicts.length} calendar event(s) at this time: ${conflicts.map(e => `"${e.title}" (${format(new Date(e.start_time), 'h:mm a')})`).join(', ')}. Factor this into travel time recommendations.`
        : '\n\nNo calendar conflicts detected at this time.';
      
      // Fetch weather
      const weatherResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Give me weather forecast for ${dueDate} ${locationInfo}. Provide temperature in Celsius. Be realistic.`,
        response_json_schema: {
          type: "object",
          properties: {
            temperature_celsius: { type: "number" },
            condition: { type: "string" },
            condition_icon: { type: "string", description: "Single emoji" },
            precipitation_chance: { type: "number" },
            recommendation: { type: "string" }
          }
        },
        add_context_from_internet: true
      });
      setWeather(weatherResult);
      
      // Fetch travel options if location exists
      if (task.location) {
        const appointmentTime = new Date(task.due_date);
        const appointmentDay = format(appointmentTime, 'EEEE');
        const appointmentHour = appointmentTime.getHours();

        const travelResult = await base44.integrations.Core.InvokeLLM({
          prompt: `SMART TRAVEL ASSISTANT - Analyze travel from "${userLocation}" to "${task.location}" for ${dueDate}.

        CONTEXT ANALYSIS:
        - Day: ${appointmentDay}, Time: ${format(appointmentTime, 'h:mm a')}
        - Consider typical traffic patterns for this day/time
        - Predict potential delays and issues proactively
        - Priority: ${task.priority} (adjust buffer accordingly)
        ${conflictInfo}

        INTELLIGENT RECOMMENDATIONS:
        1. **Predict Issues**: Analyze rush hour patterns, construction zones, transit delays
        2. **Risk Assessment**: Rate each option's reliability (high/medium/low)
        3. **Proactive Alternatives**: Suggest backup routes if primary option has risks
        4. **Smart Timing**: Recommend departure time with intelligent buffer based on:
        - Traffic volatility at this time
        - Transit reliability
        - Appointment priority (${task.priority})
        - Weather conditions
        - Calendar conflicts (if any)

        DETAILED OPTIONS:
        **Car:**
        - Duration & real-time traffic status
        - Route with potential bottlenecks
        - Alternative routes if main route has high delay risk
        - Recommended departure with safety buffer (account for any calendar conflicts)
        - Risk level & reason

        **Public Transit:**
        - Primary route with stations & line numbers
        - 3 departure times arriving BEFORE appointment
        - Service reliability at this time (delays common?)
        - Alternative routes if primary line has issues
        - "Leave by" time with buffer (account for any calendar conflicts)

        **Walking:** Duration if <60 min

        Be proactive - warn about potential issues before they happen and suggest the most reliable option. If calendar conflicts exist, adjust recommendations accordingly.`,
          response_json_schema: {
            type: "object",
            properties: {
              smart_recommendation: { 
                type: "string",
                description: "AI's recommended option and why"
              },
              overall_risk: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Risk of being late"
              },
              car: {
                type: "object",
                properties: {
                  duration_minutes: { type: "number" },
                  traffic_status: { type: "string" },
                  route_description: { type: "string" },
                  traffic_alert: { type: "string" },
                  alternative_route: { type: "string" },
                  risk_level: { type: "string", enum: ["low", "medium", "high"] },
                  recommended_departure: { type: "string" }
                }
              },
              public_transit: {
                type: "object",
                properties: {
                  duration_minutes: { type: "number" },
                  route_description: { type: "string" },
                  next_departures: { type: "array", items: { type: "string" } },
                  leave_by: { type: "string" },
                  reliability_note: { type: "string" },
                  alternative_route: { type: "string" },
                  risk_level: { type: "string", enum: ["low", "medium", "high"] }
                }
              },
              walking: {
                type: "object",
                properties: {
                  duration_minutes: { type: "number" }
                }
              },
              proactive_alerts: {
                type: "array",
                items: { type: "string" },
                description: "Warnings about potential issues"
              }
            }
          },
          add_context_from_internet: true
        });
        setTravelInfo(travelResult);
      }
    } catch (e) {
      console.log('Weather fetch failed');
    }
    setIsLoadingWeather(false);
  };

  if (!task) return null;

  const priorityConfig = {
    urgent: { color: '#DC2626', label: 'Urgent', bg: '#FEE2E2' },
    high: { color: '#EF4444', label: 'High Priority', bg: '#FEE2E2' },
    medium: { color: '#F59E0B', label: 'Medium Priority', bg: '#FEF3C7' },
    low: { color: '#10B981', label: 'Low Priority', bg: '#D1FAE5' }
  };

  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-hidden"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Sheet */}
      <div 
        className={cn(
          "relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto",
          "rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom",
          "shadow-2xl"
        )}
        style={{ backgroundColor: tokens.card }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-12 h-1 rounded-full mx-auto mb-4 sm:hidden" 
          style={{ backgroundColor: tokens.border }} 
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5"
          style={{ color: tokens.subtle }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Priority Badge */}
        <div 
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4"
          style={{ backgroundColor: priority.bg, color: priority.color }}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          {priority.label}
        </div>

        {/* Title */}
        <h2 
          className="text-2xl font-bold mb-2"
          style={{ color: tokens.color }}
        >
          {task.title}
        </h2>

        {/* Description */}
        {task.description && (
          <p className="mb-4" style={{ color: tokens.subtle }}>
            {task.description}
          </p>
        )}

        {/* Meta Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {task.due_date && (
            <div 
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl transition-all duration-300",
                isBeingDragged && "animate-pulse scale-105 shadow-lg"
              )}
              style={{ 
                backgroundColor: isBeingDragged ? 'rgba(6, 182, 212, 0.15)' : `${tokens.accent}10`,
                border: isBeingDragged ? '2px solid #06B6D4' : 'none'
              }}
            >
              <Clock 
                className={cn("w-4 h-4 transition-colors", isBeingDragged && "animate-bounce")} 
                style={{ color: isBeingDragged ? '#06B6D4' : tokens.accent }} 
              />
              <div>
                <div className="text-xs font-semibold" style={{ color: isBeingDragged ? '#06B6D4' : tokens.subtle }}>
                  {isBeingDragged ? '📅 Rescheduling...' : 'Due'}
                </div>
                <div className="font-medium text-sm" style={{ color: isBeingDragged ? '#06B6D4' : tokens.color }}>
                  {format(new Date(task.due_date), 'MMM d, h:mm a')}
                </div>
              </div>
            </div>
          )}

          {task.estimated_minutes && (
            <div 
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{ backgroundColor: `${tokens.accent}10` }}
            >
              <Clock className="w-4 h-4" style={{ color: tokens.accent }} />
              <div>
                <div className="text-xs" style={{ color: tokens.subtle }}>Duration</div>
                <div className="font-medium text-sm" style={{ color: tokens.color }}>
                  {task.estimated_minutes} minutes
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Weather & Travel Card */}
        {task.due_date && (
          <div 
            className="rounded-2xl p-5 mb-4"
            style={{ 
              backgroundColor: tokens.card,
              border: `1px solid ${tokens.border}`
            }}
          >
            {isLoadingWeather ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: tokens.subtle }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading weather...
              </div>
            ) : weather ? (
              <>
                {/* Weather Display */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-6xl">{weather.condition_icon || '☁️'}</div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold" style={{ color: tokens.color }}>
                        {Math.round(weather.temperature_celsius)}°
                      </span>
                    </div>
                    <div className="text-sm mt-1" style={{ color: tokens.subtle }}>
                      {weather.condition}
                    </div>
                    {weather.precipitation_chance > 0 && (
                      <div className="text-sm mt-1" style={{ color: tokens.subtle }}>
                        {weather.precipitation_chance}% chance of rain
                      </div>
                    )}
                  </div>
                </div>

                {/* Travel Options */}
                {travelInfo && (
                  <div className="space-y-3 mt-6">
                    {/* AI Recommendation - Minimalist */}
                    {travelInfo.smart_recommendation && (
                      <div 
                        className="p-4 rounded-2xl"
                        style={{ 
                          backgroundColor: tokens.bg,
                          border: `1px solid ${tokens.border}`
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${tokens.accent}15` }}
                          >
                            <Sparkles className="w-4 h-4" style={{ color: tokens.accent }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: tokens.subtle }}>
                              Recommended
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: tokens.color }}>
                              {travelInfo.smart_recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Proactive Alerts - Subtle & Polished */}
                    {travelInfo.proactive_alerts?.length > 0 && (
                      <div 
                        className="p-4 rounded-2xl"
                        style={{ 
                          backgroundColor: tokens.bg,
                          border: `1px solid ${tokens.border}`
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                          >
                            <AlertTriangle className="w-4 h-4" style={{ color: '#EF4444' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: tokens.subtle }}>
                              Be Aware
                            </div>
                            <ul className="space-y-1.5">
                              {travelInfo.proactive_alerts.map((alert, i) => (
                                <li key={i} className="text-sm" style={{ color: tokens.color }}>
                                  • {alert}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section Header */}
                    <div className="flex items-center gap-2 mt-6 mb-3">
                      <div 
                        className="h-px flex-1"
                        style={{ backgroundColor: tokens.border }}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: tokens.subtle }}>
                        Travel Options
                      </span>
                      <div 
                        className="h-px flex-1"
                        style={{ backgroundColor: tokens.border }}
                      />
                    </div>
                    
                    {/* Car Option - Clean & Minimal */}
                    {travelInfo.car && (
                      <div 
                        className="rounded-2xl overflow-hidden"
                        style={{ 
                          backgroundColor: tokens.bg,
                          border: `1px solid ${tokens.border}`
                        }}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${tokens.accent}10` }}
                              >
                                <Car className="w-5 h-5" style={{ color: tokens.accent }} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold" style={{ color: tokens.color }}>
                                  Car
                                </div>
                                <div className="text-xs" style={{ color: tokens.subtle }}>
                                  {travelInfo.car.duration_minutes} minutes
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {travelInfo.car.risk_level && (
                                <div 
                                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                                  style={{ 
                                    backgroundColor: travelInfo.car.risk_level === 'low' ? 'rgba(16, 185, 129, 0.1)' :
                                                     travelInfo.car.risk_level === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: travelInfo.car.risk_level === 'low' ? '#10B981' :
                                           travelInfo.car.risk_level === 'high' ? '#EF4444' : '#F59E0B'
                                  }}
                                >
                                  {travelInfo.car.risk_level === 'low' ? '●' : travelInfo.car.risk_level === 'high' ? '●●●' : '●●'}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            {travelInfo.car.route_description && (
                              <p className="text-xs leading-relaxed" style={{ color: tokens.subtle }}>
                                {travelInfo.car.route_description}
                              </p>
                            )}
                            
                            {travelInfo.car.recommended_departure && (
                              <div 
                                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                style={{ backgroundColor: `${tokens.accent}08` }}
                              >
                                <Clock className="w-3.5 h-3.5" style={{ color: tokens.accent }} />
                                <span className="text-xs font-medium" style={{ color: tokens.accent }}>
                                  Leave by {travelInfo.car.recommended_departure}
                                </span>
                              </div>
                            )}

                            {travelInfo.car.traffic_alert && (
                              <div 
                                className="flex items-start gap-2 px-3 py-2 rounded-lg"
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                                <span className="text-xs" style={{ color: '#EF4444' }}>
                                  {travelInfo.car.traffic_alert}
                                </span>
                              </div>
                            )}

                            {travelInfo.car.alternative_route && (
                              <details className="group">
                                <summary 
                                  className="text-xs font-medium cursor-pointer list-none flex items-center gap-1.5 py-2"
                                  style={{ color: tokens.subtle }}
                                >
                                  <span className="group-open:rotate-90 transition-transform">▶</span>
                                  Alternative route
                                </summary>
                                <p 
                                  className="text-xs leading-relaxed pl-5 pb-2"
                                  style={{ color: tokens.subtle }}
                                >
                                  {travelInfo.car.alternative_route}
                                </p>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Public Transit Option - Clean & Minimal */}
                    {travelInfo.public_transit && (
                      <div 
                        className="rounded-2xl overflow-hidden"
                        style={{ 
                          backgroundColor: tokens.bg,
                          border: `1px solid ${tokens.border}`
                        }}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${tokens.accent}10` }}
                              >
                                <Train className="w-5 h-5" style={{ color: tokens.accent }} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold" style={{ color: tokens.color }}>
                                  Transit
                                </div>
                                <div className="text-xs" style={{ color: tokens.subtle }}>
                                  {travelInfo.public_transit.duration_minutes} minutes
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {travelInfo.public_transit.risk_level && (
                                <div 
                                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                                  style={{ 
                                    backgroundColor: travelInfo.public_transit.risk_level === 'low' ? 'rgba(16, 185, 129, 0.1)' :
                                                     travelInfo.public_transit.risk_level === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: travelInfo.public_transit.risk_level === 'low' ? '#10B981' :
                                           travelInfo.public_transit.risk_level === 'high' ? '#EF4444' : '#F59E0B'
                                  }}
                                >
                                  {travelInfo.public_transit.risk_level === 'low' ? '●' : travelInfo.public_transit.risk_level === 'high' ? '●●●' : '●●'}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs leading-relaxed" style={{ color: tokens.subtle }}>
                              {travelInfo.public_transit.route_description}
                            </p>

                            {travelInfo.public_transit.reliability_note && (
                              <div 
                                className="px-3 py-2 rounded-lg"
                                style={{ backgroundColor: `${tokens.accent}05` }}
                              >
                                <p className="text-xs italic" style={{ color: tokens.subtle }}>
                                  {travelInfo.public_transit.reliability_note}
                                </p>
                              </div>
                            )}
                            
                            {travelInfo.public_transit.next_departures?.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {travelInfo.public_transit.next_departures.slice(0, 3).map((time, i) => (
                                  <span 
                                    key={i}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                                    style={{ 
                                      backgroundColor: tokens.bg,
                                      color: tokens.color,
                                      border: `1px solid ${tokens.border}`
                                    }}
                                  >
                                    {time}
                                  </span>
                                ))}
                              </div>
                            )}

                            {travelInfo.public_transit.leave_by && (
                              <div 
                                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                style={{ backgroundColor: `${tokens.accent}08` }}
                              >
                                <Clock className="w-3.5 h-3.5" style={{ color: tokens.accent }} />
                                <span className="text-xs font-medium" style={{ color: tokens.accent }}>
                                  Leave by {travelInfo.public_transit.leave_by}
                                </span>
                              </div>
                            )}

                            {travelInfo.public_transit.alternative_route && (
                              <details className="group">
                                <summary 
                                  className="text-xs font-medium cursor-pointer list-none flex items-center gap-1.5 py-2"
                                  style={{ color: tokens.subtle }}
                                >
                                  <span className="group-open:rotate-90 transition-transform">▶</span>
                                  Alternative route
                                </summary>
                                <p 
                                  className="text-xs leading-relaxed pl-5 pb-2"
                                  style={{ color: tokens.subtle }}
                                >
                                  {travelInfo.public_transit.alternative_route}
                                </p>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Walking Option */}
                    {travelInfo.walking && travelInfo.walking.duration_minutes < 60 && (
                      <div 
                        className="p-4 rounded-2xl"
                        style={{ 
                          backgroundColor: tokens.bg,
                          border: `1px solid ${tokens.border}`
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${tokens.accent}10` }}
                          >
                            <span className="text-lg">🚶</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: tokens.color }}>
                              Walking
                            </div>
                            <div className="text-xs" style={{ color: tokens.subtle }}>
                              {travelInfo.walking.duration_minutes} minutes
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {weather.recommendation && (
                  <div 
                    className="p-4 rounded-2xl mt-4"
                    style={{ 
                      backgroundColor: tokens.bg,
                      border: `1px solid ${tokens.border}`
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${tokens.accent}15` }}
                      >
                        <span className="text-base">💡</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: tokens.subtle }}>
                          Weather Tip
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: tokens.color }}>
                          {weather.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Calendar Conflicts Warning */}
                {externalEvents.length > 0 && (() => {
                  const taskTime = new Date(task.due_date);
                  const taskEndTime = new Date(taskTime.getTime() + (task.estimated_minutes || 30) * 60000);
                  const conflicts = externalEvents.filter(event => {
                    const eventStart = new Date(event.start_time);
                    const eventEnd = event.end_time ? new Date(event.end_time) : new Date(eventStart.getTime() + 3600000);
                    return (
                      (taskTime >= eventStart && taskTime < eventEnd) ||
                      (taskEndTime > eventStart && taskEndTime <= eventEnd) ||
                      (taskTime <= eventStart && taskEndTime >= eventEnd)
                    );
                  });

                  if (conflicts.length > 0) {
                    return (
                      <div 
                        className="p-4 rounded-2xl mt-4"
                        style={{ 
                          backgroundColor: tokens.bg,
                          border: `1px solid ${tokens.border}`
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                          >
                            <AlertTriangle className="w-4 h-4" style={{ color: '#EF4444' }} />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: tokens.subtle }}>
                              Scheduling Conflict
                            </div>
                            <div className="space-y-1.5">
                              {conflicts.map((event, i) => (
                                <div key={i} className="text-xs" style={{ color: tokens.color }}>
                                  • {event.title} at {format(new Date(event.start_time), 'h:mm a')}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                </>
                ) : (
                <div className="text-sm text-center py-4" style={{ color: tokens.subtle }}>
                Weather data unavailable
                </div>
                )}
                </div>
                )}

        {/* Location & Traffic (placeholder for future implementation) */}
        {task.location && (
          <div 
            className="rounded-2xl p-4 mb-4 border"
            style={{ borderColor: tokens.border }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5" style={{ color: '#EF4444' }} />
              <span className="font-medium" style={{ color: tokens.color }}>
                Location
              </span>
            </div>
            <p className="text-sm" style={{ color: tokens.subtle }}>
              {task.location}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Car className="w-4 h-4" style={{ color: tokens.subtle }} />
              <span className="text-sm" style={{ color: tokens.subtle }}>
                Traffic info available with location services
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onEdit?.(task)}
            style={{ borderColor: tokens.border }}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          
          <Button
            variant="outline"
            onClick={() => onDelete?.(task)}
            className="text-red-500 hover:bg-red-50"
            style={{ borderColor: tokens.border }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          
          <Button
            className="flex-1 text-white"
            style={{ backgroundColor: tokens.accent }}
            onClick={async () => {
              const newStatus = task.status === 'done' ? 'todo' : 'done';
              const user = await base44.auth.me();

              // Send notification about status change
              if (task.status !== newStatus) {
                await notifyStatusChange(task, task.status, newStatus, user?.email);
              }

              onComplete?.(task);
            }}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {task.status === 'done' ? 'Reopen' : 'Complete'}
          </Button>
        </div>

        {/* Team Info & Resource Allocation */}
        {task.team_id && (
          <div className="pt-4 mt-4 border-t space-y-4" style={{ borderColor: tokens.border }}>
            {!task.assigned_to && (
              <ResourceAllocation teamId={task.team_id} task={task} />
            )}

            <div className="space-y-2">
              {task.assigned_to && (
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: tokens.subtle }}>Assigned to:</span>
                  <span className="text-sm font-medium" style={{ color: tokens.accent }}>
                    {task.assigned_to}
                  </span>
                </div>
              )}
              {task.watchers?.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: tokens.subtle }}>Watchers:</span>
                  <div className="flex gap-1 flex-wrap">
                    {task.watchers.map(email => (
                      <span 
                        key={email}
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{ backgroundColor: `${tokens.accent}15`, color: tokens.accent }}
                      >
                        {email.split('@')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Context Reminders */}
        <div className="pt-6 border-t mt-6" style={{ borderColor: tokens.border }}>
          <ContextReminders 
            taskId={task.id}
            projectId={task.project_id}
            teamId={task.team_id}
          />
        </div>

        {/* Attachments Section */}
        {attachments.length > 0 && (
          <div className="pt-6 border-t mt-6" style={{ borderColor: tokens.border }}>
            <h4 className="font-medium mb-3" style={{ color: tokens.color }}>
              📎 Attachments
            </h4>
            <AttachmentList attachments={attachments} />
          </div>
        )}

        {/* Time Tracking Section */}
        <div className="pt-6 border-t mt-6" style={{ borderColor: tokens.border }}>
          <TimeTracker task={task} />
        </div>

        {/* Sub-tasks Section */}
        {!task.parent_task_id && (
          <div className="pt-6 border-t mt-6" style={{ borderColor: tokens.border }}>
            <SubTaskList parentTask={task} />
          </div>
        )}

        {/* Dependencies Section */}
        {(task.depends_on?.length > 0 || task.blocked_by) && (
          <div className="pt-6 border-t mt-6" style={{ borderColor: tokens.border }}>
            <DependencyVisualization task={task} onTaskClick={(t) => {
              onClose();
              setTimeout(() => {
                const event = new CustomEvent('openTaskDetail', { detail: t });
                window.dispatchEvent(event);
              }, 100);
            }} />
          </div>
        )}

        {/* Comments Section */}
        <div className="pt-6 border-t mt-6" style={{ borderColor: tokens.border }}>
          <TaskComments taskId={task.id} task={task} />
        </div>
      </div>
    </div>
  );
}

export default TaskDetailSheet;