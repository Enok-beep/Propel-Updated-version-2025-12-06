import React, { Suspense, lazy } from 'react';
import { LoadingSkeleton } from '../ui-custom/LoadingSkeleton';

/**
 * Lazy loading utilities for code splitting
 * Reduces initial bundle size
 */

// Lazy load heavy components
export const LazyDashboard = lazy(() => import('../../pages/Dashboard'));
export const LazyTasks = lazy(() => import('../../pages/Tasks'));
export const LazyCalendar = lazy(() => import('../../pages/Calendar'));
export const LazyFocus = lazy(() => import('../../pages/Focus'));
export const LazySettings = lazy(() => import('../../pages/Settings'));
export const LazyTeams = lazy(() => import('../../pages/Teams'));
export const LazyMeetings = lazy(() => import('../../pages/Meetings'));
export const LazyAnalytics = lazy(() => import('../../pages/Analytics'));
export const LazyInsights = lazy(() => import('../../pages/Insights'));

// Lazy load heavy widgets
export const LazyMindMapView = lazy(() => import('../tasks/MindMapView'));
export const LazyKanbanBoard = lazy(() => import('../tasks/KanbanBoard'));
export const LazyDependencyGraph = lazy(() => import('../tasks/TaskDependencyGraph'));
export const LazyGanttChart = lazy(() => import('../projects/GanttChart'));

// HOC for lazy loading with custom fallback
export function withLazyLoad(importFunc, FallbackComponent = LoadingSkeleton) {
  const LazyComponent = lazy(importFunc);
  
  return function LazyLoadedComponent(props) {
    return (
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Preload function for better UX
export function preloadComponent(importFunc) {
  return importFunc();
}

// Route-based code splitting helper
export function LazyRoute({ component: Component, fallback = null, ...props }) {
  return (
    <Suspense fallback={fallback || <LoadingSkeleton />}>
      <Component {...props} />
    </Suspense>
  );
}

export default LazyRoute;