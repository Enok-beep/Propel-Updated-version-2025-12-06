import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Lightbulb, X, Eye, EyeOff, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function ReminderBubble({ reminder, onDismiss, compact = false }) {
  const { tokens } = useTheme();
  const [isBlurred, setIsBlurred] = useState(reminder.is_sensitive);
  const [isExpanded, setIsExpanded] = useState(!compact);

  const priorityColors = {
    critical: { bg: '#DC2626', text: '#FFFFFF' },
    high: { bg: '#EF4444', text: '#FFFFFF' },
    medium: { bg: '#F59E0B', text: '#FFFFFF' },
    low: { bg: '#10B981', text: '#FFFFFF' }
  };

  const typeIcons = {
    serial_number: '🔢',
    password: '🔐',
    contact_info: '📞',
    key_phrase: '💬',
    instruction: '📋',
    other: '💡'
  };

  const priority = priorityColors[reminder.priority] || priorityColors.medium;

  const handleCopy = () => {
    navigator.clipboard.writeText(reminder.content);
    toast.success('Copied to clipboard');
  };

  return (
    <div 
      className={cn(
        "rounded-2xl p-4 shadow-lg border-l-4 transition-all",
        !isExpanded && "cursor-pointer hover:scale-[1.02]"
      )}
      style={{ 
        backgroundColor: tokens.card,
        borderLeftColor: priority.bg,
        borderTop: `1px solid ${tokens.border}`,
        borderRight: `1px solid ${tokens.border}`,
        borderBottom: `1px solid ${tokens.border}`
      }}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">{typeIcons[reminder.type]}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate" style={{ color: tokens.color }}>
              {reminder.title}
            </div>
            {reminder.contact_names?.length > 0 && (
              <div className="text-xs mt-0.5" style={{ color: tokens.subtle }}>
                📱 {reminder.contact_names.join(', ')}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isExpanded && (
            <>
              {reminder.is_sensitive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBlurred(!isBlurred);
                  }}
                  className="p-1.5 rounded-lg hover:bg-black/5"
                  style={{ color: tokens.subtle }}
                >
                  {isBlurred ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="p-1.5 rounded-lg hover:bg-black/5"
                style={{ color: tokens.subtle }}
              >
                <Copy className="w-4 h-4" />
              </button>
            </>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isExpanded) {
                setIsExpanded(false);
              } else {
                onDismiss?.();
              }
            }}
            className="p-1.5 rounded-lg hover:bg-black/5"
            style={{ color: tokens.subtle }}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div 
          className={cn(
            "rounded-xl p-3 font-mono text-sm transition-all",
            isBlurred && "blur-sm select-none"
          )}
          style={{ 
            backgroundColor: `${priority.bg}15`,
            color: tokens.color
          }}
        >
          {reminder.content}
        </div>
      )}

      {/* Tags */}
      {isExpanded && reminder.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {reminder.tags.map((tag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-lg text-xs"
              style={{ 
                backgroundColor: `${tokens.accent}15`,
                color: tokens.accent
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReminderBubble;