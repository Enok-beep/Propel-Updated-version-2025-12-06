import React from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { TimeReport } from '@/components/time/TimeReport';

export default function TimeTracking() {
  const { tokens } = useTheme();

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ backgroundColor: tokens.bg }}>
      <div className="max-w-6xl mx-auto">
        <TimeReport />
      </div>
    </div>
  );
}