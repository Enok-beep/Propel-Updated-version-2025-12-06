import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, ExternalLink, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PROVIDER_CONFIG = {
  google: { icon: '📅', color: '#4285F4', name: 'Google' },
  apple: { icon: '🍎', color: '#000000', name: 'Apple' },
  outlook: { icon: '📧', color: '#0078D4', name: 'Outlook' }
};

export function ExternalEventCard({ event, onClick, compact = false }) {
  const { tokens } = useTheme();
  const provider = PROVIDER_CONFIG[event.provider] || PROVIDER_CONFIG.google;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border transition-all hover:scale-[1.01]",
        compact ? "p-2" : "p-3"
      )}
      style={{
        backgroundColor: tokens.card,
        borderColor: `${provider.color}40`,
        borderLeftWidth: '3px',
        borderLeftColor: provider.color
      }}
    >
      <div className="flex items-start gap-2">
        <div className="text-lg flex-shrink-0">{provider.icon}</div>
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-medium truncate flex items-center gap-2",
            compact ? "text-sm" : "text-base"
          )} style={{ color: tokens.color }}>
            {event.title}
            {event.linked_task_id && (
              <CheckCircle2 className="w-3 h-3 text-green-500" />
            )}
          </div>
          
          <div className={cn("flex items-center gap-2 flex-wrap", compact ? "text-xs" : "text-sm")} 
            style={{ color: tokens.subtle }}>
            <span>
              {format(new Date(event.start_time), 'h:mm a')}
              {event.end_time && ` - ${format(new Date(event.end_time), 'h:mm a')}`}
            </span>
            
            {event.location && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {event.location}
                </span>
              </>
            )}
            
            {event.attendees?.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {event.attendees.length}
                </span>
              </>
            )}
          </div>

          {event.linked_task_id && (
            <Badge 
              className="text-xs mt-1"
              style={{ backgroundColor: '#D1FAE5', color: '#10B981' }}
            >
              Converted to Task
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

export default ExternalEventCard;