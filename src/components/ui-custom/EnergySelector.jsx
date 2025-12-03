import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Battery, BatteryMedium, BatteryFull, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const energyLevels = [
  { id: 'low', label: 'Low', icon: Battery, description: 'Simple tasks, routine work' },
  { id: 'medium', label: 'Medium', icon: BatteryMedium, description: 'Regular focus work' },
  { id: 'high', label: 'High', icon: BatteryFull, description: 'Deep work, complex tasks' },
];

export function EnergySelector({ value, onChange, size = 'default' }) {
  const { tokens } = useTheme();
  
  return (
    <div className="flex gap-2">
      {energyLevels.map((level) => {
        const Icon = level.icon;
        const isSelected = value === level.id;
        
        return (
          <button
            key={level.id}
            onClick={() => onChange(level.id)}
            className={cn(
              "flex items-center gap-2 rounded-xl transition-all duration-200",
              "border hover:scale-105 active:scale-95",
              size === 'compact' ? "px-3 py-2" : "px-4 py-3 flex-1"
            )}
            style={{
              backgroundColor: isSelected ? tokens.accent : 'transparent',
              borderColor: isSelected ? tokens.accent : tokens.border,
              color: isSelected ? '#FFFFFF' : tokens.color
            }}
          >
            <Icon className={cn(
              "transition-all",
              size === 'compact' ? "w-4 h-4" : "w-5 h-5"
            )} />
            {size !== 'compact' && (
              <div className="text-left">
                <div className="font-medium text-sm">{level.label}</div>
                <div className="text-xs opacity-70">{level.description}</div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CurrentEnergyBadge({ energy, onClick }) {
  const { tokens } = useTheme();
  const level = energyLevels.find(l => l.id === energy) || energyLevels[1];
  const Icon = level.icon;
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all hover:scale-105"
      style={{ borderColor: tokens.border, color: tokens.color }}
    >
      <Zap className="w-4 h-4" style={{ color: tokens.accent }} />
      <span className="text-sm font-medium">Energy: {level.label}</span>
    </button>
  );
}

export default EnergySelector;