import { useEffect } from 'react';
import { useAnalytics, EVENTS } from '../analytics/AnalyticsProvider';

/**
 * Performance monitoring component using Web Vitals API
 * Tracks: LCP, FID, CLS, FCP, TTFB
 */
export function PerformanceMonitor() {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Track Web Vitals metrics
    if ('web-vital' in window || typeof window !== 'undefined') {
      // Largest Contentful Paint (LCP)
      observeLCP((metric) => {
        trackEvent('web_vital_lcp', {
          value: metric.value,
          rating: getRating('LCP', metric.value),
        });
      });

      // First Input Delay (FID)
      observeFID((metric) => {
        trackEvent('web_vital_fid', {
          value: metric.value,
          rating: getRating('FID', metric.value),
        });
      });

      // Cumulative Layout Shift (CLS)
      observeCLS((metric) => {
        trackEvent('web_vital_cls', {
          value: metric.value,
          rating: getRating('CLS', metric.value),
        });
      });

      // First Contentful Paint (FCP)
      observeFCP((metric) => {
        trackEvent('web_vital_fcp', {
          value: metric.value,
          rating: getRating('FCP', metric.value),
        });
      });

      // Time to First Byte (TTFB)
      observeTTFB((metric) => {
        trackEvent('web_vital_ttfb', {
          value: metric.value,
          rating: getRating('TTFB', metric.value),
        });
      });
    }

    // Track long tasks (> 50ms)
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              trackEvent('long_task', {
                duration: entry.duration,
                name: entry.name,
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });

        return () => longTaskObserver.disconnect();
      } catch (e) {
        // Long task observer not supported
      }
    }
  }, [trackEvent]);

  // Track React errors
  useEffect(() => {
    const handleError = (event) => {
      trackEvent('javascript_error', {
        message: event.error?.message || 'Unknown error',
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event) => {
      trackEvent('unhandled_rejection', {
        reason: event.reason?.message || event.reason,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackEvent]);

  return null; // This is a non-visual component
}

// Web Vitals observers
function observeLCP(callback) {
  if (!('PerformanceObserver' in window)) return;
  
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      callback({ value: lastEntry.renderTime || lastEntry.loadTime });
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    // Not supported
  }
}

function observeFID(callback) {
  if (!('PerformanceObserver' in window)) return;
  
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        callback({ value: entry.processingStart - entry.startTime });
      });
    });
    observer.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    // Not supported
  }
}

function observeCLS(callback) {
  if (!('PerformanceObserver' in window)) return;
  
  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          callback({ value: clsValue });
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // Not supported
  }
}

function observeFCP(callback) {
  if (!('PerformanceObserver' in window)) return;
  
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          callback({ value: entry.startTime });
        }
      });
    });
    observer.observe({ type: 'paint', buffered: true });
  } catch (e) {
    // Not supported
  }
}

function observeTTFB(callback) {
  if (!('PerformanceObserver' in window)) return;
  
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        callback({ value: entry.responseStart - entry.requestStart });
      });
    });
    observer.observe({ type: 'navigation', buffered: true });
  } catch (e) {
    // Not supported
  }
}

// Rating thresholds based on Web Vitals standards
function getRating(metric, value) {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[metric];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

export default PerformanceMonitor;