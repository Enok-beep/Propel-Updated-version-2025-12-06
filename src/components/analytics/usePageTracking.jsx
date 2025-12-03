import { useEffect } from 'react';
import { useAnalytics } from './AnalyticsProvider';

/**
 * Hook to automatically track page views
 */
export function usePageTracking(pageName) {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(pageName);
  }, [pageName, trackPageView]);
}

export default usePageTracking;