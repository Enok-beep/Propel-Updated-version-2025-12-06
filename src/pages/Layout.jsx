
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { ThemeProvider, useTheme } from './components/theme/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AnalyticsProvider } from './components/analytics/AnalyticsProvider';
import { SecurityProvider } from './components/security/SecurityProvider';
import { AccessibilityProvider } from './components/accessibility/AccessibilityProvider';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Timer, 
  BarChart3, 
  Settings,
  Sparkles,
  CalendarDays,
  TrendingUp,
  Users
} from 'lucide-react';
import { NotificationBell } from './components/notifications/NotificationBell';
import { SemiCircularNav } from './components/layout/SemiCircularNav';
import { CommandPalette } from './components/search/CommandPalette';
import { NotificationService } from './components/notifications/NotificationService';
import { LoadingBar } from './components/ui-custom/LoadingBar';
import { UndoProvider } from './components/undo/UndoManager';
import { OfflineManager } from './components/offline/OfflineManager';
import { ServiceWorkerRegistration } from './components/offline/ServiceWorkerRegistration';
import { KeyboardShortcutsHelp } from './components/keyboard/KeyboardShortcuts';
import { PerformanceMonitor } from './components/performance/PerformanceMonitor';
import { PerformanceDebugger } from './components/performance/PerformanceDebugger';
import { BundleAnalyzer } from './components/optimization/BundleAnalyzer';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const getNavItems = (workMode) => {
  const baseItems = [
    { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
    { name: 'Calendar', page: 'Calendar', icon: CalendarDays },
    { name: 'Tasks', page: 'Tasks', icon: CheckSquare },
    { name: 'Contacts', page: 'Contacts', icon: Users },
    { name: 'Reminders', page: 'Reminders', icon: Sparkles },
  ];

  const modeSpecificItems = workMode === 'team' 
    ? [
        { name: 'Team Board', page: 'TeamDashboard', icon: TrendingUp },
        { name: 'Meetings', page: 'Meetings', icon: Users },
        { name: 'Time Tracking', page: 'TimeTracking', icon: Timer }
      ]
    : [
        { name: 'Focus', page: 'Focus', icon: Timer },
        { name: 'Time Tracking', page: 'TimeTracking', icon: Timer }
      ];

  return [
    ...baseItems,
    ...modeSpecificItems,
    { name: 'Settings', page: 'Settings', icon: Settings },
  ];
};

function LayoutContent({ children, currentPageName }) {
  const { tokens, isLoaded } = useTheme();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const workMode = preferences[0]?.work_mode || 'personal';
  const navItems = getNavItems(workMode);
  const navigationStyle = preferences[0]?.navigation_style || 'traditional';

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Command palette (Cmd+K / Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      // Keyboard shortcuts help (?)
      else if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const isTyping = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
        if (!isTyping) {
          e.preventDefault();
          setShowKeyboardHelp(true);
        }
      }
      // Close dialogs (Escape)
      else if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setShowKeyboardHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isLoaded) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0A0B0F' }}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
          <span className="text-xl font-bold text-white">Propel</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: tokens.bg }}
      >
      {/* Global Loading Bar */}
      <LoadingBar />

      {/* Toast Notifications */}
      <Toaster position="top-right" />

      {/* Notification Service */}
      <NotificationService />

      {/* Offline Manager */}
      <OfflineManager />

      {/* Service Worker Registration */}
      <ServiceWorkerRegistration />

      {/* Performance Monitoring */}
      <PerformanceMonitor />

      {/* Performance Debugger (Dev Only) */}
      {process.env.NODE_ENV === 'development' && <PerformanceDebugger />}

      {/* Bundle Analyzer (Dev Only) */}
      {process.env.NODE_ENV === 'development' && <BundleAnalyzer />}

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp 
        open={showKeyboardHelp} 
        onClose={() => setShowKeyboardHelp(false)} 
      />

      {/* Command Palette */}
      <CommandPalette 
        open={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />
      {/* Circular Navigation */}
      {navigationStyle === 'circular' && (
        <SemiCircularNav currentPageName={currentPageName} />
      )}

      {/* Desktop Sidebar */}
      {navigationStyle === 'traditional' && (
        <aside 
        className="fixed left-0 top-0 bottom-0 w-64 hidden lg:flex flex-col border-r z-40"
        style={{ 
          backgroundColor: tokens.card,
          borderColor: tokens.border 
        }}
      >
        {/* Logo */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: tokens.accent }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span 
              className="text-xl font-bold tracking-tight"
              style={{ color: tokens.color }}
            >
              Propel
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="p-1.5 rounded-lg hover:bg-opacity-10 hover:bg-white transition-all"
              title="Search (Cmd+K)"
            >
              <kbd 
                className="px-1.5 py-0.5 text-[10px] rounded border"
                style={{ borderColor: tokens.border, color: tokens.subtle }}
              >
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="p-1.5 rounded-lg hover:bg-opacity-10 hover:bg-white transition-all"
              title="Keyboard Shortcuts (?)"
            >
              <kbd 
                className="px-1.5 py-0.5 text-[10px] rounded border"
                style={{ borderColor: tokens.border, color: tokens.subtle }}
              >
                ?
              </kbd>
            </button>
            <NotificationBell />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              
              return (
                <li key={item.page}>
                  <Link
                    to={createPageUrl(item.page)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                      "hover:translate-x-1"
                    )}
                    style={{
                      backgroundColor: isActive ? `${tokens.accent}15` : 'transparent',
                      color: isActive ? tokens.accent : tokens.subtle
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div 
          className="p-4 border-t text-center"
          style={{ borderColor: tokens.border }}
        >
          <p className="text-xs" style={{ color: tokens.subtle }}>
            Focus. Execute. Propel.
          </p>
        </div>
      </aside>
      )}

      {/* Mobile Bottom Nav */}
      {navigationStyle === 'traditional' && (
        <nav 
        className="fixed bottom-0 left-0 right-0 lg:hidden border-t z-50 safe-area-inset-bottom"
        style={{ 
          backgroundColor: tokens.card,
          borderColor: tokens.border 
        }}
      >
        <ul className="flex justify-around py-1.5 px-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            
            return (
              <li key={item.page} className="flex-1 max-w-[80px]">
                <Link
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 rounded-xl transition-all touch-manipulation"
                  )}
                  style={{
                    color: isActive ? tokens.accent : tokens.subtle
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium truncate max-w-full px-1">{item.name}</span>
                </Link>
              </li>
            );
            })}
            </ul>
            </nav>
            )}

            {/* Main Content */}
            <main 
              id="main-content"
              className={cn(
                "min-h-screen transition-all",
                navigationStyle === 'traditional' ? "lg:ml-64 pb-20 lg:pb-0" : "pb-0"
              )}
              role="main"
            >
              {children}
            </main>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <SecurityProvider>
          <ThemeProvider>
            <AnalyticsProvider>
              <UndoProvider>
                <LayoutContent currentPageName={currentPageName}>
                  {children}
                </LayoutContent>
              </UndoProvider>
            </AnalyticsProvider>
          </ThemeProvider>
        </SecurityProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}
