import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { getLocalAnalytics } from '../analytics/AnalyticsProvider';
import { Activity, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Debug panel to view performance metrics in development
 * Toggle with Ctrl+Shift+P
 */
export function PerformanceDebugger() {
  const { tokens } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState([]);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updateMetrics = () => {
      const events = getLocalAnalytics();
      const webVitals = events.filter(e => e.event.startsWith('web_vital_'));
      const errorEvents = events.filter(e => 
        e.event === 'javascript_error' || e.event === 'unhandled_rejection'
      );
      
      setMetrics(webVitals.slice(-10));
      setErrors(errorEvents.slice(-5));
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto rounded-xl shadow-2xl"
      style={{ backgroundColor: tokens.card, border: `2px solid ${tokens.accent}` }}
    >
      <div 
        className="sticky top-0 p-4 flex items-center justify-between border-b"
        style={{ 
          backgroundColor: tokens.card,
          borderColor: tokens.border 
        }}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" style={{ color: tokens.accent }} />
          <span className="font-bold" style={{ color: tokens.color }}>
            Performance Monitor
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-sm px-2 py-1 rounded hover:bg-black/10"
          style={{ color: tokens.subtle }}
        >
          Close
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Web Vitals */}
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: tokens.color }}>
            <Zap className="w-4 h-4" />
            Web Vitals (Last 10)
          </h3>
          <div className="space-y-2">
            {metrics.length === 0 ? (
              <p className="text-xs" style={{ color: tokens.subtle }}>
                No metrics collected yet
              </p>
            ) : (
              metrics.map((metric, i) => {
                const name = metric.event.replace('web_vital_', '').toUpperCase();
                const rating = metric.rating;
                const color = rating === 'good' ? '#10B981' : 
                             rating === 'needs-improvement' ? '#F59E0B' : '#EF4444';
                
                return (
                  <div 
                    key={i}
                    className="flex items-center justify-between text-xs p-2 rounded"
                    style={{ backgroundColor: `${color}10` }}
                  >
                    <span style={{ color: tokens.color }}>
                      {name}: {Math.round(metric.value)}ms
                    </span>
                    <span className={cn("px-2 py-0.5 rounded text-white text-[10px]")}
                      style={{ backgroundColor: color }}
                    >
                      {rating}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-4 h-4" />
              Recent Errors ({errors.length})
            </h3>
            <div className="space-y-2">
              {errors.map((error, i) => (
                <div 
                  key={i}
                  className="text-xs p-2 rounded"
                  style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
                >
                  <div className="font-semibold">{error.message}</div>
                  <div className="text-[10px] mt-1 opacity-75">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bundle Info */}
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: tokens.color }}>
            <CheckCircle className="w-4 h-4" />
            Bundle Info
          </h3>
          <div className="text-xs space-y-1" style={{ color: tokens.subtle }}>
            <div>React: {React.version}</div>
            <div>Mode: {process.env.NODE_ENV}</div>
            <div className="pt-2 text-[10px] opacity-75">
              Press Ctrl+Shift+P to close
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerformanceDebugger;