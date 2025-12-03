import React, { useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export function PresenceIndicator({ userEmail, showLabel = false, size = 'sm' }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();

  const { data: presence } = useQuery({
    queryKey: ['presence', userEmail],
    queryFn: async () => {
      const presences = await base44.entities.UserPresence.filter({ user_email: userEmail });
      return presences[0];
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const status = presence?.status || 'offline';

  const statusConfig = {
    online: { color: '#10B981', label: 'Online' },
    away: { color: '#F59E0B', label: 'Away' },
    busy: { color: '#EF4444', label: 'Busy' },
    offline: { color: '#9CA3AF', label: 'Offline' }
  };

  const config = statusConfig[status];
  const sizeClass = size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-1.5">
      <div 
        className={cn(sizeClass, "rounded-full")}
        style={{ backgroundColor: config.color }}
      />
      {showLabel && (
        <span className="text-xs" style={{ color: tokens.subtle }}>
          {config.label}
        </span>
      )}
      {presence?.custom_message && showLabel && (
        <span className="text-xs italic" style={{ color: tokens.subtle }}>
          - {presence.custom_message}
        </span>
      )}
    </div>
  );
}

export function PresenceUpdater() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const updatePresenceMutation = useMutation({
    mutationFn: async (status) => {
      if (!user) return;
      
      const existing = await base44.entities.UserPresence.filter({ user_email: user.email });
      
      if (existing.length > 0) {
        await base44.entities.UserPresence.update(existing[0].id, {
          status,
          last_seen: new Date().toISOString()
        });
      } else {
        await base44.entities.UserPresence.create({
          user_email: user.email,
          status,
          last_seen: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presence'] });
    }
  });

  // Update presence to online when in team mode
  useEffect(() => {
    if (user && preferences[0]?.work_mode === 'team') {
      updatePresenceMutation.mutate('online');

      // Update every 2 minutes
      const interval = setInterval(() => {
        updatePresenceMutation.mutate('online');
      }, 120000);

      return () => {
        clearInterval(interval);
        updatePresenceMutation.mutate('away');
      };
    }
  }, [user, preferences]);

  return null;
}

export default PresenceIndicator;