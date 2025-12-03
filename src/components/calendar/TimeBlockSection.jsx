import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickDatePicker } from './QuickDatePicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const TIME_BLOCKS = [
  { id: 'morning', label: 'Morning', icon: Sunrise, hours: '6am - 12pm', color: '#F59E0B' },
  { id: 'midday', label: 'Midday', icon: Sun, hours: '12pm - 5pm', color: '#3B82F6' },
  { id: 'evening', label: 'Evening', icon: Sunset, hours: '5pm - 9pm', color: '#8B5CF6' },
  { id: 'night', label: 'Night', icon: Moon, hours: '9pm+', color: '#6366F1' },
];

export function TimeBlockSection({ 
  block, 
  tasks, 
  onDropTask,
  onTaskClick,
  isDragOver,
  compact = false
}) {
  const { tokens } = useTheme();
  const blockConfig = TIME_BLOCKS.find(b => b.id === block);
  const Icon = blockConfig?.icon || Sun;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onDropTask?.(taskId, block);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "rounded-2xl border-2 border-dashed p-4 transition-all",
        isDragOver && "scale-[1.02] border-solid",
        compact && tasks.length === 0 ? "min-h-[60px]" : "min-h-[100px]"
      )}
      style={{
        borderColor: isDragOver ? blockConfig?.color : tokens.border,
        backgroundColor: isDragOver ? `${blockConfig?.color}10` : 'transparent'
      }}
    >
      {/* Block Header */}
      <div className="flex items-center gap-2 mb-3">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${blockConfig?.color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: blockConfig?.color }} />
        </div>
        <div>
          <div className="font-medium text-sm" style={{ color: tokens.color }}>
            {blockConfig?.label}
          </div>
          <div className="text-xs" style={{ color: tokens.subtle }}>
            {blockConfig?.hours}
          </div>
        </div>
        <div 
          className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: `${tokens.accent}20`,
            color: tokens.accent
          }}
        >
          {tasks.length} tasks
        </div>
      </div>

      {/* Tasks in this block */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div 
            className="text-center py-4 text-sm"
            style={{ color: tokens.subtle }}
          >
            Drop tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <TimeBlockTaskItem 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick?.(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TimeBlockTaskItem({ task, onClick }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [showQuickPicker, setShowQuickPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const [longPressTimer, setLongPressTimer] = useState(null);
  
  const priorityColors = {
    urgent: '#DC2626',
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981'
  };

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowQuickPicker(false);
    },
  });

  const handleLongPressStart = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const timer = setTimeout(() => {
      setPickerPosition({
        top: rect.top - 20,
        left: Math.min(rect.left, window.innerWidth - 340)
      });
      setShowQuickPicker(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleQuickReschedule = (newDate) => {
    const updatedDate = new Date(newDate);
    if (task.due_date) {
      const oldDate = new Date(task.due_date);
      updatedDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
    }
    updateTaskMutation.mutate({
      id: task.id,
      data: { due_date: updatedDate.toISOString() }
    });
  };

  const handleDragStart = (e) => {
    handleLongPressEnd();
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={(e) => {
          if (!showQuickPicker) onClick(e);
        }}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing",
          "hover:scale-[1.02] transition-all border",
          showQuickPicker && "ring-2"
        )}
        style={{
          backgroundColor: tokens.card,
          borderColor: tokens.border,
          ringColor: tokens.accent
        }}
      >
        <div 
          className="w-2 h-8 rounded-full"
          style={{ backgroundColor: priorityColors[task.priority] || priorityColors.medium }}
        />
        <div className="flex-1 min-w-0">
          <div 
            className="font-medium text-sm truncate"
            style={{ color: tokens.color }}
          >
            {task.title}
          </div>
          {task.estimated_minutes && (
            <div className="text-xs" style={{ color: tokens.subtle }}>
              {task.estimated_minutes} min
            </div>
          )}
        </div>
      </div>

      {showQuickPicker && (
        <QuickDatePicker
          position={pickerPosition}
          currentDate={task.due_date ? new Date(task.due_date) : new Date()}
          onSelectDate={handleQuickReschedule}
          onClose={() => setShowQuickPicker(false)}
        />
      )}
    </>
  );
}

export { TIME_BLOCKS };
export default TimeBlockSection;