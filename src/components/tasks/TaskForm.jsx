import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EnergySelector } from '../ui-custom/EnergySelector';
import { AITaskInput } from './AITaskInput';
import { TaskDependencies } from './TaskDependencies';
import { RecurrenceSelector } from './RecurrenceSelector';
import { AIAssignmentSuggestion } from '../ai/AIAssignmentSuggestion';
import { AITaskBreakdown } from '../ai/AITaskBreakdown';
import { ReminderManager } from '../calendar/ReminderManager';
import { FileUploader, AttachmentList } from '../attachments/FileUploader';
import { Calendar as CalendarIcon, X, Sparkles, Wand2, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { notifyTaskAssignment } from '../notifications/NotificationService';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema } from '../validation/schemas';

const categories = [
  { id: 'work', label: 'Work', emoji: '💼' },
  { id: 'personal', label: 'Personal', emoji: '🏠' },
  { id: 'health', label: 'Health', emoji: '💪' },
  { id: 'learning', label: 'Learning', emoji: '📚' },
  { id: 'errands', label: 'Errands', emoji: '🛒' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
];

const priorities = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
];

const durations = [
  { value: 15, label: '15 min' },
  { value: 25, label: '25 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

export function TaskForm({ task, onSubmit, onCancel, isLoading }) {
  const { tokens } = useTheme();
  const [showAIInput, setShowAIInput] = useState(!task);
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const {
    control,
    handleSubmit: handleFormSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || 'todo',
      priority: task?.priority || 'medium',
      energy_level: task?.energy_level || 'medium',
      category: task?.category || 'personal',
      due_date: task?.due_date || '',
      estimated_minutes: task?.estimated_minutes || 25,
      location: task?.location || '',
      tags: task?.tags || [],
      team_id: task?.team_id || '',
      assigned_to: task?.assigned_to || '',
    }
  });

  const [pendingSubTasks, setPendingSubTasks] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [extraFormData, setExtraFormData] = useState({
    depends_on: task?.depends_on || [],
    is_recurring: task?.is_recurring || false,
    recurrence_pattern: task?.recurrence_pattern || null,
    recurrence_interval: task?.recurrence_interval || 1,
    recurrence_end_date: task?.recurrence_end_date || null,
    recurrence_count: task?.recurrence_count || null,
    watchers: task?.watchers || [],
    reminders: task?.reminders || []
  });

  const formValues = watch();

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
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
    enabled: teams.length > 0,
  });

  const workMode = preferences[0]?.work_mode || 'personal';
  const activeTeamId = preferences[0]?.active_team_id;
  
  const teamMembers = allTeamMembers.filter(tm => 
    tm.team_id === (formValues.team_id || activeTeamId) && tm.status === 'active'
  );

  const handleAIParsed = (parsedData) => {
    Object.keys(parsedData).forEach(key => {
      if (key in formValues) {
        setValue(key, parsedData[key]);
      }
    });
    setShowAIInput(false);
  };

  const onSubmitForm = (data) => {
    const taskData = {
      ...data,
      ...extraFormData,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      recurrence_end_date: extraFormData.recurrence_end_date ? new Date(extraFormData.recurrence_end_date).toISOString() : null,
      team_id: data.team_id || null,
      assigned_to: data.assigned_to || null,
    };

    const submissionData = {
      taskData,
      attachments: pendingAttachments,
      subTasks: pendingSubTasks
    };
    
    onSubmit(submissionData);
  };

  const handleSubTasksGenerated = (subTasks) => {
    setPendingSubTasks(subTasks);
  };

  return (
    <form onSubmit={handleFormSubmit(onSubmitForm)} className="space-y-5">
      {/* AI Input Toggle */}
      {!task && (
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: tokens.border }}>
          <span className="text-sm font-medium" style={{ color: tokens.color }}>
            {showAIInput ? '🤖 AI-Powered Input' : '✏️ Manual Input'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAIInput(!showAIInput)}
            style={{ borderColor: tokens.border }}
          >
            <Wand2 className="w-3 h-3 mr-1" />
            {showAIInput ? 'Switch to Manual' : 'Use AI'}
          </Button>
        </div>
      )}

      {/* AI Input Mode */}
      {showAIInput && !task && (
        <AITaskInput
          onTaskParsed={handleAIParsed}
          onCancel={onCancel}
        />
      )}

      {/* Manual Form (hidden when AI input is active) */}
      {(!showAIInput || task) && (
        <>
          {/* Title */}
          <div>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <>
                  <Input
                    {...field}
                    placeholder="What needs to be done?"
                    className={cn(
                      "text-lg font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0",
                      errors.title && "border-red-500"
                    )}
                    style={{ 
                      backgroundColor: 'transparent',
                      borderColor: errors.title ? '#EF4444' : tokens.border,
                      color: tokens.color
                    }}
                    autoFocus
                  />
                  {errors.title && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                      <AlertCircle className="w-3 h-3" />
                      {errors.title.message}
                    </div>
                  )}
                </>
              )}
            />
          </div>

      {/* Description */}
      <div>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <>
              <Textarea
                {...field}
                placeholder="Add details..."
                className={cn(
                  "min-h-[80px] resize-none border rounded-xl",
                  errors.description && "border-red-500"
                )}
                style={{ 
                  backgroundColor: 'transparent',
                  borderColor: errors.description ? '#EF4444' : tokens.border,
                  color: tokens.color
                }}
              />
              {errors.description && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  {errors.description.message}
                </div>
              )}
            </>
          )}
        />
      </div>

      {/* Energy Level */}
      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
          Energy Required
        </label>
        <Controller
          name="energy_level"
          control={control}
          render={({ field }) => (
            <EnergySelector
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Category & Priority Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
            Category
          </label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger style={{ borderColor: tokens.border }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
            Priority
          </label>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger style={{ borderColor: tokens.border }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Duration & Due Date Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
            Estimated Time
          </label>
          <Controller
            name="estimated_minutes"
            control={control}
            render={({ field }) => (
              <>
                <Select 
                  value={String(field.value)} 
                  onValueChange={(val) => field.onChange(Number(val))}
                >
                  <SelectTrigger style={{ borderColor: tokens.border }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map(d => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.estimated_minutes && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                    <AlertCircle className="w-3 h-3" />
                    {errors.estimated_minutes.message}
                  </div>
                )}
              </>
            )}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
            Due Date
          </label>
          <Controller
            name="due_date"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    style={{ borderColor: tokens.border }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(new Date(field.value), 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date?.toISOString())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
          📍 Location (optional)
        </label>
        <Controller
          name="location"
          control={control}
          render={({ field }) => (
            <>
              <Input
                {...field}
                placeholder="e.g., Soho House, Office, Home"
                className={cn(errors.location && "border-red-500")}
                style={{ 
                  borderColor: errors.location ? '#EF4444' : tokens.border, 
                  color: tokens.color 
                }}
              />
              {errors.location && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  {errors.location.message}
                </div>
              )}
              {field.value && !errors.location && (
                <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
                  💡 Enable Backend Functions for "Leave by X" travel time calculations
                </div>
              )}
            </>
          )}
        />
      </div>

      {/* Dependencies */}
      <TaskDependencies
        dependencies={extraFormData.depends_on}
        allTasks={allTasks}
        currentTaskId={task?.id}
        onChange={(deps) => setExtraFormData(prev => ({ ...prev, depends_on: deps }))}
      />

      {/* Reminders */}
      <ReminderManager
        reminders={extraFormData.reminders}
        onChange={(reminders) => setExtraFormData(prev => ({ ...prev, reminders }))}
      />

      {/* File Attachments */}
      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
          📎 Attachments
        </label>
        <FileUploader
          multiple
          onUpload={(files) => setPendingAttachments(prev => [...prev, ...files])}
        />
        {pendingAttachments.length > 0 && (
          <div className="mt-2">
            <AttachmentList
              attachments={pendingAttachments}
              onRemove={(att) => setPendingAttachments(prev => prev.filter(a => a !== att))}
              compact
            />
          </div>
        )}
      </div>

      {/* Recurrence */}
      <RecurrenceSelector
        value={{
          is_recurring: extraFormData.is_recurring,
          recurrence_pattern: extraFormData.recurrence_pattern,
          recurrence_interval: extraFormData.recurrence_interval,
          recurrence_end_date: extraFormData.recurrence_end_date,
          recurrence_count: extraFormData.recurrence_count
        }}
        onChange={(recurrence) => {
          setExtraFormData(prev => ({
            ...prev,
            is_recurring: recurrence.is_recurring,
            recurrence_pattern: recurrence.recurrence_pattern,
            recurrence_interval: recurrence.recurrence_interval,
            recurrence_end_date: recurrence.recurrence_end_date,
            recurrence_count: recurrence.recurrence_count
          }));
        }}
      />

      {/* AI Task Breakdown - Only for new tasks */}
      {!task && formValues.title?.trim() && (
        <div className="pt-4 border-t" style={{ borderColor: tokens.border }}>
          <AITaskBreakdown
            taskTitle={formValues.title}
            taskDescription={formValues.description}
            onSubTasksGenerated={handleSubTasksGenerated}
          />
          {pendingSubTasks.length > 0 && (
            <div 
              className="mt-2 p-2 rounded-lg text-xs"
              style={{ backgroundColor: `${tokens.accent}10`, color: tokens.accent }}
            >
              ✓ {pendingSubTasks.length} sub-tasks will be created after saving
            </div>
          )}
        </div>
      )}

      {/* Team Collaboration - Only in Team Mode */}
      {workMode === 'team' && teams.length > 0 && (
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: tokens.border }}>
          <h4 className="text-sm font-semibold" style={{ color: tokens.color }}>
            👥 Team Collaboration
          </h4>
          
          {/* Team Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
              Team
            </label>
            <Controller
              name="team_id"
              control={control}
              render={({ field }) => (
                <Select 
                  value={field.value || activeTeamId || ''} 
                  onValueChange={(val) => {
                    field.onChange(val || '');
                    setValue('assigned_to', '');
                    setExtraFormData(prev => ({ ...prev, watchers: [] }));
                  }}
                >
                  <SelectTrigger style={{ borderColor: tokens.border }}>
                    <SelectValue placeholder="Select team (or keep personal)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Personal (No Team)</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.avatar} {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Assign To */}
          {(formValues.team_id || activeTeamId) && teamMembers.length > 0 && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
                  Assign To
                </label>
                <Controller
                  name="assigned_to"
                  control={control}
                  render={({ field }) => (
                    <>
                      <Select 
                        value={field.value || ''} 
                        onValueChange={(val) => field.onChange(val || '')}
                      >
                        <SelectTrigger 
                          className={cn(errors.assigned_to && "border-red-500")}
                          style={{ borderColor: errors.assigned_to ? '#EF4444' : tokens.border }}
                        >
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Unassigned</SelectItem>
                          {teamMembers.map(member => (
                            <SelectItem key={member.user_email} value={member.user_email}>
                              {member.user_email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.assigned_to && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                          <AlertCircle className="w-3 h-3" />
                          {errors.assigned_to.message}
                        </div>
                      )}
                    </>
                  )}
                />
              </div>

              {/* AI Assignment Suggestion */}
              {!task && !formValues.assigned_to && (
                <AIAssignmentSuggestion
                  task={formValues}
                  teamMembers={teamMembers}
                  onAssign={(email) => setValue('assigned_to', email)}
                />
              )}
            </div>
          )}

          {/* Watchers */}
          {(formValues.team_id || activeTeamId) && teamMembers.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
                Watchers (will be notified of updates)
              </label>
              <div className="flex flex-wrap gap-2">
                {teamMembers.map(member => {
                  const isWatcher = extraFormData.watchers.includes(member.user_email);
                  return (
                    <button
                      key={member.user_email}
                      type="button"
                      onClick={() => {
                        const newWatchers = isWatcher
                          ? extraFormData.watchers.filter(w => w !== member.user_email)
                          : [...extraFormData.watchers, member.user_email];
                        setExtraFormData(prev => ({ ...prev, watchers: newWatchers }));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                        isWatcher && "ring-2"
                      )}
                      style={{
                        backgroundColor: isWatcher ? `${tokens.accent}20` : tokens.card,
                        borderColor: isWatcher ? tokens.accent : tokens.border,
                        color: isWatcher ? tokens.accent : tokens.subtle,
                        ringColor: tokens.accent
                      }}
                    >
                      {member.user_email.split('@')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: tokens.accent }}
              className="text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

export default TaskForm;