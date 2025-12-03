import React, { useEffect, useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export function LoadingBar() {
  const { tokens } = useTheme();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const isLoading = isFetching > 0 || isMutating > 0;

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setProgress(0);
      
      // Start progress animation
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);

      return () => clearInterval(interval);
    } else {
      // Complete the progress bar
      setProgress(100);
      
      // Hide after animation completes
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1"
      style={{ backgroundColor: `${tokens.accent}20` }}
    >
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: tokens.accent,
          boxShadow: `0 0 10px ${tokens.accent}80`
        }}
      />
    </div>
  );
}

export default LoadingBar;