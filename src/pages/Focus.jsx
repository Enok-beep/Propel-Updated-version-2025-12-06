import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui-custom/Card';
import { Button } from '@/components/ui/button';
import {
  Play, Pause, RotateCcw, Coffee,
  Target, Volume2, VolumeX, Maximize2,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/components/mobile/TouchGestures';

const TIMER_MODES = {
  focus: { label: 'Focus', duration: 25, color: '#EF4444' },
  shortBreak: { label: 'Short Break', duration: 5, color: '#10B981' },
  longBreak: { label: 'Long Break', duration: 15, color: '#3B82F6' },
};

export default function Focus() {
  const { tokens } = useTheme();
  const { trackEvent } = useAnalytics();
  const queryClient = useQueryClient();

  // Track page view
  useEffect(() => {
    trackEvent('page_view', { page: 'Focus' });
  }, [trackEvent]);
  
  const [mode, setMode] = useState('focus');
  const [timeLeft, setTimeLeft] = useState(TIMER_MODES.focus.duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const intervalRef = useRef(null);
  const audioRef = useRef(null);
  const touchStartRef = useRef({ y: 0, x: 0 });
  const containerRef = useRef(null);

  // Fetch pending tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    select: (data) => data.filter(t => t.status !== 'done'),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('Failed to update task:', error);
    },
  });

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    // Play sound
    if (!isMuted && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    
    if (mode === 'focus') {
      const newCount = pomodorosCompleted + 1;
      setPomodorosCompleted(newCount);
      
      trackEvent(EVENTS.FOCUS_SESSION_COMPLETED, {
        pomodoro_count: newCount,
        had_task: !!selectedTask,
      });
      
      // Update task pomodoros
      if (selectedTask) {
        updateTaskMutation.mutate({
          id: selectedTask.id,
          data: { pomodoros_completed: (selectedTask.pomodoros_completed || 0) + 1 }
        });
      }
      
      // Switch to break
      const newMode = newCount % 4 === 0 ? 'longBreak' : 'shortBreak';
      setMode(newMode);
      setTimeLeft(TIMER_MODES[newMode].duration * 60);
    } else {
      // Switch back to focus
      setMode('focus');
      setTimeLeft(TIMER_MODES.focus.duration * 60);
    }
  };

  const toggleTimer = () => {
    if (!isRunning && mode === 'focus') {
      trackEvent(EVENTS.FOCUS_SESSION_STARTED, {
        duration_minutes: TIMER_MODES.focus.duration,
        has_task: !!selectedTask,
      });
    }
    setIsRunning(!isRunning);
  };
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_MODES[mode].duration * 60);
  };

  const switchMode = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(TIMER_MODES[newMode].duration * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - (timeLeft / (TIMER_MODES[mode].duration * 60));
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);

  // Pull to refresh
  usePullToRefresh({
    onRefresh: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    enabled: true
  });

  // Keyboard shortcuts for Focus page
  useEffect(() => {
    const handleKeyPress = (e) => {
      const isTyping = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isTyping) return;

      if (e.key === ' ' || e.key === 'p') {
        e.preventDefault();
        toggleTimer();
      } else if (e.key === 'r') {
        e.preventDefault();
        resetTimer();
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        e.preventDefault();
        setIsMuted(!isMuted);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRunning, isMuted]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Gesture handlers
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      y: e.touches[0].clientY,
      x: e.touches[0].clientX,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    const touchEnd = {
      y: e.changedTouches[0].clientY,
      x: e.changedTouches[0].clientX,
      time: Date.now()
    };

    const deltaY = touchEnd.y - touchStartRef.current.y;
    const deltaX = Math.abs(touchEnd.x - touchStartRef.current.x);
    const timeDiff = touchEnd.time - touchStartRef.current.time;

    // Swipe detection (fast swipe, > 80px, < 300ms, mostly vertical)
    if (timeDiff < 300 && Math.abs(deltaY) > 80 && deltaX < 50) {
      if (deltaY < 0 && !isRunning && selectedTask) {
        // Swipe up - Start focus session
        setMode('focus');
        setTimeLeft(TIMER_MODES.focus.duration * 60);
        setIsRunning(true);
      } else if (deltaY > 0 && isRunning && mode === 'focus') {
        // Swipe down - Quick break (5 min)
        setMode('shortBreak');
        setTimeLeft(TIMER_MODES.shortBreak.duration * 60);
        setIsRunning(true);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "min-h-screen flex flex-col items-center justify-center p-4 sm:p-6",
        isFullscreen && "fixed inset-0 z-50"
      )}
      style={{ backgroundColor: tokens.bg }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Audio element for notification */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
      
      {/* Mode Selector */}
      <div 
        className="flex rounded-2xl p-1 mb-8 border"
        style={{ backgroundColor: tokens.card, borderColor: tokens.border }}
      >
        {Object.entries(TIMER_MODES).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className={cn(
              "px-6 py-3 rounded-xl font-medium transition-all",
              mode === key && "text-white"
            )}
            style={{
              backgroundColor: mode === key ? tokens.accent : 'transparent',
              color: mode === key ? '#FFFFFF' : tokens.subtle
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="relative mb-8">
        <svg width="320" height="320" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="none"
            stroke={tokens.border}
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="none"
            stroke={tokens.accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000"
          />
        </svg>
        
        {/* Time Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div 
            className="text-6xl font-bold tracking-tight"
            style={{ color: tokens.color }}
          >
            {formatTime(timeLeft)}
          </div>
          <div className="text-lg mt-2" style={{ color: tokens.subtle }}>
            {TIMER_MODES[mode].label}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          size="icon"
          onClick={resetTimer}
          className="w-12 h-12 rounded-full"
          style={{ borderColor: tokens.border }}
        >
          <RotateCcw className="w-5 h-5" style={{ color: tokens.subtle }} />
        </Button>
        
        <Button
          onClick={toggleTimer}
          className="w-20 h-20 rounded-full text-white"
          style={{ backgroundColor: tokens.accent }}
        >
          {isRunning ? (
            <Pause className="w-8 h-8" />
          ) : (
            <Play className="w-8 h-8 ml-1" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="w-12 h-12 rounded-full"
          style={{ borderColor: tokens.border }}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" style={{ color: tokens.subtle }} />
          ) : (
            <Volume2 className="w-5 h-5" style={{ color: tokens.subtle }} />
          )}
        </Button>
      </div>

      {/* Pomodoro Count */}
      <div 
        className="flex items-center gap-2 mb-8"
        style={{ color: tokens.subtle }}
      >
        <Target className="w-4 h-4" />
        <span>{pomodorosCompleted} pomodoros completed</span>
      </div>

      {/* Task Selector */}
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: tokens.subtle }}>
            Working on
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            style={{ color: tokens.subtle }}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        
        {selectedTask ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium" style={{ color: tokens.color }}>
                {selectedTask.title}
              </div>
              <div className="text-sm" style={{ color: tokens.subtle }}>
                {selectedTask.pomodoros_completed || 0} pomodoros
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTask(null)}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {tasks.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: tokens.subtle }}>
                No pending tasks
              </p>
            ) : (
              tasks.slice(0, 5).map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02]"
                  style={{ 
                    borderColor: tokens.border,
                    backgroundColor: 'transparent'
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" style={{ color: tokens.subtle }} />
                  <span className="flex-1 text-left text-sm" style={{ color: tokens.color }}>
                    {task.title}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}