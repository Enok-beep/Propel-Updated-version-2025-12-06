import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { CheckCircle2, Target, Flame } from 'lucide-react';

export function DashboardStats({ stats }) {
  const { tokens } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <Card className="text-center py-6">
        <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: tokens.accent }} />
        <div className="text-3xl font-bold" style={{ color: tokens.color }}>
          {stats.completedToday}
        </div>
        <div className="text-sm" style={{ color: tokens.subtle }}>Done Today</div>
      </Card>
      
      <Card className="text-center py-6">
        <Target className="w-8 h-8 mx-auto mb-2" style={{ color: tokens.accent }} />
        <div className="text-3xl font-bold" style={{ color: tokens.color }}>
          {stats.pending}
        </div>
        <div className="text-sm" style={{ color: tokens.subtle }}>Pending</div>
      </Card>
      
      <Card className="text-center py-6">
        <Flame className="w-8 h-8 mx-auto mb-2" style={{ color: '#EF4444' }} />
        <div className="text-3xl font-bold" style={{ color: tokens.color }}>
          {stats.highPriority}
        </div>
        <div className="text-sm" style={{ color: tokens.subtle }}>High Priority</div>
      </Card>
    </div>
  );
}

export default DashboardStats;