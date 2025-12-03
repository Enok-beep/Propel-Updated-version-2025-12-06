import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Star, TrendingUp, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PointsDisplay({ points, streak, compact = false }) {
  const { tokens } = useTheme();

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Star className="w-4 h-4" style={{ color: '#F59E0B' }} />
          <span className="font-bold text-sm" style={{ color: tokens.color }}>
            {points.toLocaleString()}
          </span>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4" style={{ color: '#F97316' }} />
            <span className="font-bold text-sm" style={{ color: tokens.color }}>
              {streak}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div
        className="flex-1 p-4 rounded-2xl border"
        style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5" style={{ color: '#F59E0B' }} />
          <span className="text-xs font-medium" style={{ color: tokens.subtle }}>
            Total Points
          </span>
        </div>
        <div className="text-2xl font-bold" style={{ color: tokens.color }}>
          {points.toLocaleString()}
        </div>
      </div>

      {streak > 0 && (
        <div
          className="flex-1 p-4 rounded-2xl border"
          style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5" style={{ color: '#F97316' }} />
            <span className="text-xs font-medium" style={{ color: tokens.subtle }}>
              Day Streak
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: tokens.color }}>
            {streak}
          </div>
        </div>
      )}
    </div>
  );
}

export default PointsDisplay;