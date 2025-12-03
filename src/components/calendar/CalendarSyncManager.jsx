import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Unplug,
  ArrowRightLeft,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const PROVIDERS = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: '📅',
    color: '#4285F4',
    description: 'Sync with Google Calendar'
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    icon: '🍎',
    color: '#000000',
    description: 'Sync with iCloud Calendar'
  },
  {
    id: 'outlook',
    name: 'Outlook Calendar',
    icon: '📧',
    color: '#0078D4',
    description: 'Sync with Microsoft Outlook'
  }
];

export function CalendarSyncManager() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['calendarConnections'],
    queryFn: () => base44.entities.CalendarConnection.list(),
    enabled: !!user,
  });

  const { data: externalEvents = [] } = useQuery({
    queryKey: ['externalEvents'],
    queryFn: () => base44.entities.ExternalCalendarEvent.list('-start_time', 50),
    enabled: connections.length > 0,
  });

  const updateConnectionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarConnection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarConnections'] });
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarConnection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarConnections'] });
      queryClient.invalidateQueries({ queryKey: ['externalEvents'] });
    },
  });

  const handleConnect = async (provider) => {
    setConnecting(provider.id);
    // Placeholder: In production, this would redirect to OAuth flow
    alert(`Backend Functions Required: Enable in Settings → Backend Functions to connect ${provider.name}.\n\nOnce enabled, you'll be redirected to authorize calendar access.`);
    setConnecting(null);
  };

  const handleDisconnect = (connection) => {
    if (confirm(`Disconnect ${connection.provider} calendar? External events will no longer sync.`)) {
      deleteConnectionMutation.mutate(connection.id);
    }
  };

  const handleToggleSetting = (connection, setting, value) => {
    updateConnectionMutation.mutate({
      id: connection.id,
      data: { [setting]: value }
    });
  };

  const getConnection = (providerId) => {
    return connections.find(c => c.provider === providerId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold mb-1" style={{ color: tokens.color }}>
          Calendar Sync
        </h3>
        <p className="text-sm" style={{ color: tokens.subtle }}>
          Connect external calendars to view all events in one place
        </p>
      </div>

      {/* Backend Functions Notice */}
      <div 
        className="p-4 rounded-xl border"
        style={{ 
          backgroundColor: `${tokens.accent}08`,
          borderColor: tokens.border
        }}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: tokens.accent }} />
          <div>
            <div className="font-medium mb-1" style={{ color: tokens.color }}>
              Backend Functions Required
            </div>
            <p className="text-sm" style={{ color: tokens.subtle }}>
              Enable Backend Functions in <strong>Settings → Backend</strong> to activate calendar sync. 
              This enables OAuth connections to Google, Apple, and Outlook calendars with two-way sync.
            </p>
          </div>
        </div>
      </div>

      {/* Available Providers */}
      <div className="space-y-3">
        {PROVIDERS.map(provider => {
          const connection = getConnection(provider.id);
          const isConnected = !!connection;

          return (
            <div
              key={provider.id}
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: tokens.border }}
            >
              <div 
                className="p-4"
                style={{ backgroundColor: tokens.card }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${provider.color}15` }}
                    >
                      {provider.icon}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2" style={{ color: tokens.color }}>
                        {provider.name}
                        {isConnected && (
                          <Badge className="text-xs" style={{ 
                            backgroundColor: '#D1FAE5', 
                            color: '#10B981' 
                          }}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm" style={{ color: tokens.subtle }}>
                        {connection?.provider_email || provider.description}
                      </div>
                    </div>
                  </div>
                  
                  {!isConnected ? (
                    <Button
                      onClick={() => handleConnect(provider)}
                      disabled={connecting === provider.id}
                      style={{ backgroundColor: provider.color }}
                      className="text-white"
                    >
                      {connecting === provider.id ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4 mr-2" />
                      )}
                      Connect
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleDisconnect(connection)}
                      variant="outline"
                      className="text-red-500"
                      style={{ borderColor: tokens.border }}
                    >
                      <Unplug className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  )}
                </div>

                {/* Connection Settings */}
                {isConnected && (
                  <div 
                    className="space-y-3 pt-3 border-t"
                    style={{ borderColor: tokens.border }}
                  >
                    {/* Sync Enabled */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium" style={{ color: tokens.color }}>
                          Sync Enabled
                        </div>
                        <div className="text-xs" style={{ color: tokens.subtle }}>
                          Pull events from this calendar
                        </div>
                      </div>
                      <Switch
                        checked={connection.sync_enabled}
                        onCheckedChange={(val) => handleToggleSetting(connection, 'sync_enabled', val)}
                      />
                    </div>

                    {/* Two-Way Sync */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2" style={{ color: tokens.color }}>
                          <ArrowRightLeft className="w-4 h-4" />
                          Two-Way Sync
                        </div>
                        <div className="text-xs" style={{ color: tokens.subtle }}>
                          Push task changes back to calendar
                        </div>
                      </div>
                      <Switch
                        checked={connection.two_way_sync}
                        onCheckedChange={(val) => handleToggleSetting(connection, 'two_way_sync', val)}
                        disabled={!connection.sync_enabled}
                      />
                    </div>

                    {/* Auto Create Tasks */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2" style={{ color: tokens.color }}>
                          <Sparkles className="w-4 h-4" />
                          Auto-Create Tasks
                        </div>
                        <div className="text-xs" style={{ color: tokens.subtle }}>
                          Convert calendar events to tasks
                        </div>
                      </div>
                      <Switch
                        checked={connection.auto_create_tasks}
                        onCheckedChange={(val) => handleToggleSetting(connection, 'auto_create_tasks', val)}
                        disabled={!connection.sync_enabled}
                      />
                    </div>

                    {/* Last Sync */}
                    {connection.last_sync && (
                      <div className="text-xs pt-2" style={{ color: tokens.subtle }}>
                        Last synced: {format(new Date(connection.last_sync), 'PPp')}
                      </div>
                    )}

                    {connection.sync_error && (
                      <div 
                        className="text-xs p-2 rounded-lg flex items-center gap-2"
                        style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
                      >
                        <AlertCircle className="w-3 h-3" />
                        {connection.sync_error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Synced Events Summary */}
      {externalEvents.length > 0 && (
        <div 
          className="p-4 rounded-xl border"
          style={{ 
            backgroundColor: tokens.card,
            borderColor: tokens.border 
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium" style={{ color: tokens.color }}>
              Synced Events
            </div>
            <Badge variant="outline">
              {externalEvents.length} events
            </Badge>
          </div>
          <div className="space-y-2">
            {externalEvents.slice(0, 5).map(event => (
              <div 
                key={event.id}
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ backgroundColor: `${tokens.accent}05` }}
              >
                <div className="text-lg">{PROVIDERS.find(p => p.id === event.provider)?.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: tokens.color }}>
                    {event.title}
                  </div>
                  <div className="text-xs" style={{ color: tokens.subtle }}>
                    {format(new Date(event.start_time), 'PPp')}
                  </div>
                </div>
                {event.linked_task_id && (
                  <Badge className="text-xs" style={{ backgroundColor: '#D1FAE5', color: '#10B981' }}>
                    Task Created
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarSyncManager;