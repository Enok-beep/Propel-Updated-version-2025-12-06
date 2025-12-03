import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Pause, Square, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function TimeTracker({ task, compact = false }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const intervalRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries', task?.id],
    queryFn: () => base44.entities.TimeEntry.filter({ task_id: task?.id }),
    enabled: !!task?.id,
  });

  const createTimeEntry = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success('Time logged successfully');
    },
  });

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    setStartTime(new Date());
    toast.success('Timer started');
  };

  const handlePause = () => {
    setIsRunning(false);
    toast.info('Timer paused');
  };

  const handleStop = () => {
    if (elapsedSeconds < 60) {
      toast.error('Minimum 1 minute required');
      return;
    }

    const endTime = new Date();
    const durationMinutes = Math.round(elapsedSeconds / 60);

    createTimeEntry.mutate({
      task_id: task?.id,
      user_email: user?.email,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
      description: `Worked on: ${task?.title}`,
      is_billable: true,
      is_manual: false,
      team_id: task?.team_id,
      project_id: task?.project_id,
    });

    setIsRunning(false);
    setElapsedSeconds(0);
    setStartTime(null);
  };

  const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" style={{ color: tokens.subtle }} />
        <span className="text-sm font-medium" style={{ color: tokens.color }}>
          {totalHours}h
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Timer Display */}
      <div 
        className="rounded-xl p-4 text-center"
        style={{ backgroundColor: `${tokens.accent}10` }}
      >
        <div 
          className="text-3xl font-mono font-bold mb-2"
          style={{ color: isRunning ? tokens.accent : tokens.color }}
        >
          {formatTime(elapsedSeconds)}
        </div>
        
        <div className="flex items-center justify-center gap-2">
          {!isRunning && elapsedSeconds === 0 && (
            <Button
              onClick={handleStart}
              style={{ backgroundColor: tokens.accent }}
              className="text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Timer
            </Button>
          )}

          {isRunning && (
            <Button
              onClick={handlePause}
              variant="outline"
              style={{ borderColor: tokens.border }}
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}

          {!isRunning && elapsedSeconds > 0 && (
            <>
              <Button
                onClick={handleStart}
                style={{ backgroundColor: tokens.accent }}
                className="text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button
                onClick={handleStop}
                variant="outline"
                style={{ borderColor: tokens.border }}
                disabled={elapsedSeconds < 60}
              >
                <Square className="w-4 h-4 mr-2" />
                Stop & Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2" style={{ color: tokens.subtle }}>
          <Clock className="w-4 h-4" />
          <span>Total tracked: {totalHours}h</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowManualEntry(true)}
        >
          + Manual Entry
        </Button>
      </div>

      {/* Time Entries List */}
      {timeEntries.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium" style={{ color: tokens.subtle }}>
            Recent entries
          </div>
          {timeEntries.slice(0, 3).map(entry => (
            <div
              key={entry.id}
              className="flex items-center justify-between text-xs p-2 rounded-lg"
              style={{ backgroundColor: `${tokens.accent}05` }}
            >
              <span style={{ color: tokens.color }}>
                {new Date(entry.start_time).toLocaleDateString()}
              </span>
              <span style={{ color: tokens.subtle }}>
                {entry.duration_minutes}m
                {entry.is_billable && ' 💰'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Manual Entry Dialog */}
      {showManualEntry && (
        <ManualTimeEntry
          task={task}
          onClose={() => setShowManualEntry(false)}
        />
      )}
    </div>
  );
}

function ManualTimeEntry({ task, onClose }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createTimeEntry = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success('Time entry added');
      onClose();
    },
  });

  const handleSubmit = () => {
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMinutes === 0) {
      toast.error('Please enter time duration');
      return;
    }

    const now = new Date();
    const startTime = new Date(now.getTime() - totalMinutes * 60000);

    createTimeEntry.mutate({
      task_id: task?.id,
      user_email: user?.email,
      start_time: startTime.toISOString(),
      end_time: now.toISOString(),
      duration_minutes: totalMinutes,
      description: description || `Worked on: ${task?.title}`,
      is_billable: isBillable,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      is_manual: true,
      team_id: task?.team_id,
      project_id: task?.project_id,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent style={{ backgroundColor: tokens.card }}>
        <DialogHeader>
          <DialogTitle style={{ color: tokens.color }}>
            Add Manual Time Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm mb-1 block" style={{ color: tokens.subtle }}>
                Hours
              </label>
              <Input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                style={{ borderColor: tokens.border }}
              />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: tokens.subtle }}>
                Minutes
              </label>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                style={{ borderColor: tokens.border }}
              />
            </div>
          </div>

          <div>
            <label className="text-sm mb-1 block" style={{ color: tokens.subtle }}>
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              style={{ borderColor: tokens.border }}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isBillable}
              onChange={(e) => setIsBillable(e.target.checked)}
              className="rounded"
            />
            <label className="text-sm" style={{ color: tokens.color }}>
              Billable time
            </label>
          </div>

          {isBillable && (
            <div>
              <label className="text-sm mb-1 block" style={{ color: tokens.subtle }}>
                Hourly Rate (optional)
              </label>
              <div className="relative">
                <DollarSign 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: tokens.subtle }}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="0.00"
                  className="pl-9"
                  style={{ borderColor: tokens.border }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              style={{ backgroundColor: tokens.accent }}
              className="text-white"
            >
              Add Time Entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TimeTracker;