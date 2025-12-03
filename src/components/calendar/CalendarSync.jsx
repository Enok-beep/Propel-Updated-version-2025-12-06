import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CalendarSync({ tasks = [], onSyncTask }) {
  const { tokens } = useTheme();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({});

  const syncableTasksCount = tasks.filter(t => t.due_date && t.status !== 'done').length;

  const handleSync = async (task) => {
    setSyncing(true);
    try {
      // Placeholder for actual sync logic
      // When backend functions are enabled, this would call the Google Calendar API
      setSyncStatus(prev => ({ ...prev, [task.id]: 'synced' }));
      onSyncTask?.(task);
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, [task.id]: 'error' }));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        className="flex items-center justify-between p-4 rounded-xl border"
        style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${tokens.accent}20` }}
          >
            <Calendar className="w-5 h-5" style={{ color: tokens.accent }} />
          </div>
          <div>
            <div className="font-medium" style={{ color: tokens.color }}>
              Calendar Sync
            </div>
            <div className="text-sm" style={{ color: tokens.subtle }}>
              {syncableTasksCount} tasks with due dates
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={syncing}
          style={{ borderColor: tokens.border }}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
          Sync All
        </Button>
      </div>

      <div 
        className="p-4 rounded-xl border text-sm"
        style={{ 
          backgroundColor: `${tokens.accent}08`,
          borderColor: tokens.border,
          color: tokens.subtle 
        }}
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: tokens.accent }} />
          <div>
            <div className="font-medium mb-1" style={{ color: tokens.color }}>
              Backend Functions Required
            </div>
            <div className="text-xs">
              Enable Backend Functions in Settings to activate bidirectional calendar sync with 
              Google Calendar. This will sync task due dates, time blocks, and completions automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskSyncBadge({ task, isSynced }) {
  const { tokens } = useTheme();
  
  if (!task.due_date) return null;

  return (
    <Badge 
      variant="outline" 
      className="text-xs"
      style={{
        borderColor: isSynced ? '#10B981' : tokens.border,
        backgroundColor: isSynced ? '#D1FAE5' : 'transparent',
        color: isSynced ? '#10B981' : tokens.subtle
      }}
    >
      <Calendar className="w-3 h-3 mr-1" />
      {isSynced ? 'Synced' : 'Local'}
    </Badge>
  );
}

export default CalendarSync;