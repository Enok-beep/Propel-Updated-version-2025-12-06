import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, Check, CheckCheck, Trash2, User, 
  MessageSquare, Calendar, Users, Trophy, ExternalLink 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const NOTIFICATION_ICONS = {
  task_assigned: User,
  comment_mention: MessageSquare,
  deadline_soon: Calendar,
  team_activity: Users,
  achievement_unlocked: Trophy,
};

const NOTIFICATION_COLORS = {
  task_assigned: '#3B82F6',
  comment_mention: '#8B5CF6',
  deadline_soon: '#F59E0B',
  team_activity: '#10B981',
  achievement_unlocked: '#EF4444',
};

export function NotificationCenter() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => 
        base44.entities.Notification.update(n.id, { read: true })
      ));
    },
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div 
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: tokens.border }}
      >
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" style={{ color: tokens.accent }} />
          <h2 className="text-xl font-bold" style={{ color: tokens.color }}>
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: tokens.accent, color: 'white' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div 
        className="flex gap-2 px-4 py-2 border-b"
        style={{ borderColor: tokens.border }}
      >
        {['all', 'unread', 'read'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
              filter === f && "ring-2"
            )}
            style={{
              backgroundColor: filter === f ? `${tokens.accent}15` : 'transparent',
              color: filter === f ? tokens.accent : tokens.subtle,
              ringColor: tokens.accent
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: tokens.subtle }}>
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center" style={{ color: tokens.subtle }}>
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <div className="font-medium mb-1">No notifications</div>
            <div className="text-sm">You're all caught up!</div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: tokens.border }}>
            {filteredNotifications.map(notification => {
              const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
              const color = NOTIFICATION_COLORS[notification.type] || tokens.accent;
              
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 transition-all hover:bg-opacity-50",
                    !notification.read && "bg-opacity-20"
                  )}
                  style={{
                    backgroundColor: !notification.read ? `${color}08` : 'transparent'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="font-semibold text-sm" style={{ color: tokens.color }}>
                          {notification.title}
                        </div>
                        <div className="text-xs flex-shrink-0" style={{ color: tokens.subtle }}>
                          {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                        </div>
                      </div>
                      
                      <div className="text-sm mb-2" style={{ color: tokens.subtle }}>
                        {notification.message}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {notification.action_url && (
                          <Link
                            to={notification.action_url}
                            className="text-xs font-medium flex items-center gap-1 hover:underline"
                            style={{ color: tokens.accent }}
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        
                        {!notification.read && (
                          <button
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            className="text-xs font-medium hover:underline"
                            style={{ color: tokens.accent }}
                          >
                            Mark as read
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteNotificationMutation.mutate(notification.id)}
                          className="text-xs text-red-500 hover:underline ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default NotificationCenter;