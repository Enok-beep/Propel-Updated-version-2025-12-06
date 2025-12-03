import React, { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const AnalyticsContext = createContext(null);

// Event names
export const EVENTS = {
  // Task Events
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  TASK_DELETED: 'task_deleted',
  TASK_EDITED: 'task_edited',
  TASK_STATUS_CHANGED: 'task_status_changed',
  
  // Focus Events
  FOCUS_SESSION_STARTED: 'focus_session_started',
  FOCUS_SESSION_COMPLETED: 'focus_session_completed',
  FOCUS_SESSION_SKIPPED: 'focus_session_skipped',
  
  // Navigation
  PAGE_VIEW: 'page_view',
  
  // Features
  AI_TASK_PARSED: 'ai_task_parsed',
  BULK_ACTION: 'bulk_action',
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
  
  // Team
  TEAM_CREATED: 'team_created',
  TEAM_MEMBER_INVITED: 'team_member_invited',
  
  // Settings
  THEME_CHANGED: 'theme_changed',
  WORK_MODE_CHANGED: 'work_mode_changed',
};

export function AnalyticsProvider({ children }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    // Initialize analytics when user loads
    if (user) {
      identifyUser(user);
    }
  }, [user]);

  const trackEvent = (eventName, properties = {}) => {
    try {
      const eventData = {
        event: eventName,
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        ...properties
      };

      // Console log for development
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Analytics Event:', eventData);
      }

      // TODO: Send to analytics provider (Mixpanel/Amplitude)
      // Example for Mixpanel:
      // if (window.mixpanel) {
      //   window.mixpanel.track(eventName, properties);
      // }
      
      // Example for Amplitude:
      // if (window.amplitude) {
      //   window.amplitude.getInstance().logEvent(eventName, properties);
      // }

      // Store in localStorage for basic analytics
      storeLocalEvent(eventData);
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  };

  const identifyUser = (userData) => {
    try {
      const userProperties = {
        email: userData.email,
        name: userData.full_name,
        role: userData.role,
        created_at: userData.created_date,
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Analytics Identify:', userProperties);
      }

      // TODO: Identify user in analytics provider
      // if (window.mixpanel) {
      //   window.mixpanel.identify(userData.email);
      //   window.mixpanel.people.set(userProperties);
      // }
      
      // if (window.amplitude) {
      //   window.amplitude.getInstance().setUserId(userData.email);
      //   window.amplitude.getInstance().setUserProperties(userProperties);
      // }
    } catch (error) {
      console.error('Analytics identify error:', error);
    }
  };

  const trackPageView = (pageName) => {
    trackEvent(EVENTS.PAGE_VIEW, { page: pageName });
  };

  const value = {
    trackEvent,
    trackPageView,
    identifyUser,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
};

// Store events locally for basic analytics
function storeLocalEvent(event) {
  try {
    const key = 'propel_analytics_events';
    const stored = localStorage.getItem(key);
    const events = stored ? JSON.parse(stored) : [];
    
    events.push(event);
    
    // Keep last 1000 events
    if (events.length > 1000) {
      events.shift();
    }
    
    localStorage.setItem(key, JSON.stringify(events));
  } catch (error) {
    // Ignore localStorage errors
  }
}

// Get local analytics data
export function getLocalAnalytics() {
  try {
    const key = 'propel_analytics_events';
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

export default AnalyticsProvider;