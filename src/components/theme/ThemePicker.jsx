import React from 'react';
import { useTheme, palettes } from './ThemeProvider';
import { Check, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemePicker({ compact = false }) {
  const { tokens, paletteId, mode, setPalette, setMode } = useTheme();

  const modeOptions = [
    { id: 'light', icon: Sun, label: 'Light' },
    { id: 'dark', icon: Moon, label: 'Dark' },
    { id: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: tokens.subtle }}>
          Appearance
        </span>
        <div 
          className="flex rounded-xl p-1 border"
          style={{ borderColor: tokens.border }}
        >
          {modeOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = mode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                )}
                style={{
                  backgroundColor: isActive ? tokens.accent : 'transparent',
                  color: isActive ? '#FFFFFF' : tokens.subtle
                }}
              >
                <Icon className="w-4 h-4" />
                {!compact && opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Palette Grid */}
      <div>
        <span className="text-sm font-medium mb-3 block" style={{ color: tokens.subtle }}>
          Color Theme
        </span>
        <div className={cn(
          "grid gap-3",
          compact ? "grid-cols-5" : "grid-cols-3"
        )}>
          {palettes.map((palette) => {
            const isActive = paletteId === palette.id;
            const variant = palette.variants.dark; // Show dark variant in preview
            
            return (
              <button
                key={palette.id}
                onClick={() => setPalette(palette.id)}
                className={cn(
                  "relative rounded-xl p-3 border transition-all",
                  "hover:scale-105 active:scale-95",
                  isActive && "ring-2 ring-offset-2"
                )}
                style={{
                  borderColor: isActive ? tokens.accent : tokens.border,
                  ringColor: tokens.accent
                }}
              >
                {/* Color Preview */}
                <div className="flex gap-1 mb-2">
                  <div 
                    className="h-6 flex-1 rounded-md"
                    style={{ backgroundColor: variant.accent }}
                  />
                  <div 
                    className="h-6 flex-1 rounded-md"
                    style={{ backgroundColor: variant.subtle }}
                  />
                </div>
                
                {!compact && (
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-xs font-medium"
                      style={{ color: tokens.color }}
                    >
                      {palette.name}
                    </span>
                    {isActive && (
                      <Check 
                        className="w-4 h-4" 
                        style={{ color: tokens.accent }} 
                      />
                    )}
                  </div>
                )}
                
                {compact && isActive && (
                  <div 
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: tokens.accent }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ThemePicker;