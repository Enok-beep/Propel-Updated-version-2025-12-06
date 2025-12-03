import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Feature Flags System
 * Production-ready with LaunchDarkly-compatible API
 * Can be upgraded to LaunchDarkly SDK later
 */

const FeatureFlagsContext = createContext(null);

const DEFAULT_FLAGS = {
  // Core features
  'ai-task-input': true,
  'team-collaboration': true,
  'gamification': true,
  'offline-mode': true,
  
  // Experimental features
  'ai-scheduler': false,
  'video-meetings': false,
  'advanced-analytics': false,
  'calendar-sync': true,
  
  // UI features
  'mind-map-view': true,
  'circular-navigation': true,
  'weather-widget': true,
  
  // Performance
  'lazy-load-widgets': true,
  'optimistic-updates': true,
};

export function FeatureFlagsProvider({ children }) {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      // Fetch user for context
      const currentUser = await base44.auth.me().catch(() => null);
      setUser(currentUser);

      // In production, this would call LaunchDarkly or your backend
      // For now, we can store overrides in localStorage
      const stored = localStorage.getItem('feature-flags');
      if (stored) {
        const overrides = JSON.parse(stored);
        setFlags({ ...DEFAULT_FLAGS, ...overrides });
      }
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = (flagKey) => {
    return flags[flagKey] ?? false;
  };

  const setFlag = (flagKey, value) => {
    const newFlags = { ...flags, [flagKey]: value };
    setFlags(newFlags);
    
    // Persist overrides
    const overrides = {};
    Object.keys(newFlags).forEach(key => {
      if (newFlags[key] !== DEFAULT_FLAGS[key]) {
        overrides[key] = newFlags[key];
      }
    });
    localStorage.setItem('feature-flags', JSON.stringify(overrides));
  };

  const getAllFlags = () => flags;

  const value = {
    flags,
    isEnabled,
    setFlag,
    getAllFlags,
    loading,
    user,
  };

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlag(flagKey) {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlag must be used within FeatureFlagsProvider');
  }
  return context.isEnabled(flagKey);
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return context;
}

// HOC for feature-gated components
export function withFeatureFlag(flagKey, Component, FallbackComponent = null) {
  return function FeatureGatedComponent(props) {
    const isEnabled = useFeatureFlag(flagKey);
    
    if (!isEnabled) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }
    
    return <Component {...props} />;
  };
}

// Component wrapper for conditional rendering
export function FeatureGate({ flag, children, fallback = null }) {
  const isEnabled = useFeatureFlag(flag);
  return isEnabled ? children : fallback;
}

export default FeatureFlagsProvider;