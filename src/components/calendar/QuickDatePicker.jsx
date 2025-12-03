import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar, X } from 'lucide-react';

export function QuickDatePicker({ position, onSelectDate, onClose, currentDate }) {
  const { tokens } = useTheme();
  const [selectedDate, setSelectedDate] = useState(currentDate || new Date());
  const overlayRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const quickDates = [
    { label: 'Today', date: new Date() },
    { label: 'Tomorrow', date: addDays(new Date(), 1) },
    { label: 'In 3 days', date: addDays(new Date(), 3) },
    { label: 'Next week', date: addDays(weekStart, 7) },
  ];

  // Generate 60 days (2 months) starting from today
  const datePills = Array.from({ length: 60 }, (_, i) => addDays(new Date(), i));

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    onSelectDate?.(date);
  };

  return (
    <div 
      ref={overlayRef}
      className="fixed z-50 rounded-2xl shadow-2xl backdrop-blur-xl border animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: position.top,
        left: position.left,
        backgroundColor: `${tokens.card}f5`,
        borderColor: tokens.border,
        maxWidth: '320px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: tokens.border }}>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: tokens.accent }} />
          <span className="text-sm font-semibold" style={{ color: tokens.color }}>
            Quick Reschedule
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 transition-colors"
          style={{ color: tokens.subtle }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Date Buttons */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {quickDates.map((item) => (
            <button
              key={item.label}
              onClick={() => handleSelectDate(item.date)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-105",
                isSameDay(selectedDate, item.date) && "ring-2"
              )}
              style={{
                backgroundColor: isSameDay(selectedDate, item.date) ? tokens.accent : `${tokens.accent}15`,
                color: isSameDay(selectedDate, item.date) ? '#FFFFFF' : tokens.color,
                ringColor: tokens.accent
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Date Pills */}
        <div className="pt-2 border-t" style={{ borderColor: tokens.border }}>
          <div className="text-xs font-medium mb-2" style={{ color: tokens.subtle }}>
            Or pick a date:
          </div>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {datePills.map((date) => {
              const isSelected = isSameDay(selectedDate, date);
              const isToday = isSameDay(date, new Date());
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleSelectDate(date)}
                  className={cn(
                    "flex flex-col items-center px-2 py-1.5 rounded-lg text-xs transition-all hover:scale-105",
                    isSelected && "ring-2"
                  )}
                  style={{
                    backgroundColor: isSelected ? tokens.accent : isToday ? `${tokens.accent}20` : `${tokens.accent}08`,
                    color: isSelected ? '#FFFFFF' : tokens.color,
                    ringColor: tokens.accent,
                    minWidth: '44px'
                  }}
                >
                  <span className="text-[10px] opacity-70 font-medium">
                    {format(date, 'EEE')}
                  </span>
                  <span className="text-sm font-bold">
                    {format(date, 'd')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickDatePicker;