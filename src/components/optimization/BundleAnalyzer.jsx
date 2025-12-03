import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Package, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';

/**
 * Bundle Size Monitor
 * Track and alert on bundle size in development
 */

const SIZE_LIMITS = {
  total: 200 * 1024, // 200KB
  vendor: 100 * 1024, // 100KB
  app: 100 * 1024, // 100KB
};

export function BundleAnalyzer() {
  const { tokens } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [bundleInfo, setBundleInfo] = useState(null);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !bundleInfo) {
      analyzeBundleSize();
    }
  }, [isOpen]);

  const analyzeBundleSize = async () => {
    try {
      // Estimate current bundle size
      const scripts = Array.from(document.scripts);
      let totalSize = 0;
      
      for (const script of scripts) {
        if (script.src) {
          try {
            const response = await fetch(script.src);
            const text = await response.text();
            totalSize += text.length;
          } catch (e) {
            // Skip failed requests
          }
        }
      }

      // Get performance metrics
      const performance = window.performance;
      const resources = performance.getEntriesByType('resource');
      
      const jsResources = resources.filter(r => r.name.endsWith('.js'));
      const cssResources = resources.filter(r => r.name.endsWith('.css'));
      
      setBundleInfo({
        totalSize,
        estimatedGzipped: Math.round(totalSize * 0.3), // Rough estimate
        jsCount: jsResources.length,
        cssCount: cssResources.length,
        largestJs: jsResources.sort((a, b) => b.transferSize - a.transferSize).slice(0, 5),
      });
    } catch (error) {
      console.error('Bundle analysis failed:', error);
    }
  };

  if (!isOpen || process.env.NODE_ENV !== 'development') return null;

  const isOverLimit = bundleInfo && bundleInfo.estimatedGzipped > SIZE_LIMITS.total;

  return (
    <div 
      className="fixed bottom-20 right-4 z-50 w-96 max-h-96 overflow-auto rounded-xl shadow-2xl"
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
          <Package className="w-5 h-5" style={{ color: tokens.accent }} />
          <span className="font-bold" style={{ color: tokens.color }}>
            Bundle Analyzer
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
        {!bundleInfo ? (
          <div className="text-center py-8" style={{ color: tokens.subtle }}>
            Analyzing bundle...
          </div>
        ) : (
          <>
            {/* Size Summary */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: tokens.color }}>
                  Bundle Size (Gzipped)
                </span>
                {isOverLimit ? (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="text-3xl font-bold mb-1" style={{ color: isOverLimit ? '#EF4444' : tokens.color }}>
                {Math.round(bundleInfo.estimatedGzipped / 1024)}KB
              </div>
              <div className="text-xs" style={{ color: tokens.subtle }}>
                Target: &lt;{SIZE_LIMITS.total / 1024}KB
              </div>
              
              {/* Progress Bar */}
              <div className="mt-2 h-2 rounded-full" style={{ backgroundColor: `${tokens.accent}20` }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${Math.min((bundleInfo.estimatedGzipped / SIZE_LIMITS.total) * 100, 100)}%`,
                    backgroundColor: isOverLimit ? '#EF4444' : tokens.accent
                  }}
                />
              </div>
            </div>

            {/* Resource Counts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${tokens.accent}10` }}>
                <div className="text-xs" style={{ color: tokens.subtle }}>JS Files</div>
                <div className="text-xl font-bold" style={{ color: tokens.color }}>
                  {bundleInfo.jsCount}
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${tokens.accent}10` }}>
                <div className="text-xs" style={{ color: tokens.subtle }}>CSS Files</div>
                <div className="text-xl font-bold" style={{ color: tokens.color }}>
                  {bundleInfo.cssCount}
                </div>
              </div>
            </div>

            {/* Optimization Tips */}
            {isOverLimit && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600 mt-0.5" />
                  <div className="text-xs text-red-800">
                    <div className="font-semibold mb-1">Bundle size exceeds target</div>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Enable code splitting</li>
                      <li>Lazy load heavy components</li>
                      <li>Remove unused dependencies</li>
                      <li>Use dynamic imports</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Largest Files */}
            <div>
              <div className="text-sm font-semibold mb-2" style={{ color: tokens.color }}>
                Largest JS Resources
              </div>
              <div className="space-y-2">
                {bundleInfo.largestJs.map((resource, i) => (
                  <div 
                    key={i}
                    className="text-xs p-2 rounded flex items-center justify-between"
                    style={{ backgroundColor: `${tokens.accent}10` }}
                  >
                    <span className="truncate flex-1" style={{ color: tokens.color }}>
                      {resource.name.split('/').pop()}
                    </span>
                    <span style={{ color: tokens.subtle }}>
                      {Math.round(resource.transferSize / 1024)}KB
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-center" style={{ color: tokens.subtle }}>
              Press Ctrl+Shift+B to close
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BundleAnalyzer;