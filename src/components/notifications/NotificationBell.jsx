import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="w-5 h-5" style={{ color: tokens.color }} />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                "text-[10px] font-bold text-white"
              )}
              style={{ backgroundColor: '#EF4444' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] h-[600px] p-0"
        align="end"
        style={{ backgroundColor: tokens.card, borderColor: tokens.border }}
      >
        <NotificationCenter />
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;