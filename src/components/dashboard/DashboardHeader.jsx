import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import { CurrentEnergyBadge } from '../ui-custom/EnergySelector';
import { WidgetSelector } from './WidgetSelector';
import { format } from 'date-fns';

export function DashboardHeader({
  workMode,
  currentEnergy,
  activeWidgets,
  onEnergyClick,
  onNewTask,
  onWidgetsSave,
}) {
  const { tokens } = useTheme();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
      <div>
        <h1 
          className="text-3xl font-bold tracking-tight"
          style={{ color: tokens.color }}
        >
          Good {getGreeting()}
        </h1>
        <p style={{ color: tokens.subtle }} className="mt-1">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </div>
      
      <div className="flex items-center gap-3 flex-wrap">
        <WidgetSelector
          mode={workMode}
          selectedWidgets={activeWidgets}
          onSave={onWidgetsSave}
        />
        {workMode === 'personal' && (
          <CurrentEnergyBadge 
            energy={currentEnergy} 
            onClick={onEnergyClick} 
          />
        )}
        <Button
          onClick={onNewTask}
          style={{ backgroundColor: tokens.accent }}
          className="text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export default DashboardHeader;