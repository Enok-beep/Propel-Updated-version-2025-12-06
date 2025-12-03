import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui-custom/Card';
import { Button } from '@/components/ui/button';
import { Check, Sidebar, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NavigationStyleSelector() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const currentStyle = preferences[0]?.navigation_style || 'traditional';

  const updateStyleMutation = useMutation({
    mutationFn: async (style) => {
      if (preferences.length > 0) {
        return base44.entities.UserPreferences.update(preferences[0].id, {
          navigation_style: style
        });
      } else {
        return base44.entities.UserPreferences.create({
          navigation_style: style
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });

  const handleSelect = (style) => {
    updateStyleMutation.mutate(style);
  };

  const styles = [
    {
      id: 'traditional',
      name: 'Traditional',
      description: 'Classic sidebar & bottom navigation',
      icon: Sidebar,
      preview: (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border" style={{ borderColor: tokens.border }}>
          {/* Desktop Sidebar Preview */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-16 border-r hidden sm:block"
            style={{ backgroundColor: tokens.card, borderColor: tokens.border }}
          >
            <div className="p-2 space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div 
                  key={i}
                  className="w-full h-8 rounded-lg"
                  style={{ backgroundColor: `${tokens.accent}${i === 1 ? '30' : '10'}` }}
                />
              ))}
            </div>
          </div>
          {/* Mobile Bottom Bar Preview */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-12 border-t sm:hidden"
            style={{ backgroundColor: tokens.card, borderColor: tokens.border }}
          >
            <div className="flex justify-around items-center h-full px-2">
              {[1, 2, 3, 4].map(i => (
                <div 
                  key={i}
                  className="w-8 h-8 rounded-lg"
                  style={{ backgroundColor: `${tokens.accent}${i === 1 ? '30' : '10'}` }}
                />
              ))}
            </div>
          </div>
          {/* Content Area */}
          <div 
            className="absolute inset-0 sm:left-16 bottom-12 sm:bottom-0"
            style={{ backgroundColor: tokens.bg }}
          >
            <div className="p-3 space-y-2">
              {[1, 2, 3].map(i => (
                <div 
                  key={i}
                  className="h-3 rounded"
                  style={{ backgroundColor: tokens.card, width: `${90 - i * 10}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'circular',
      name: 'Circular Menu',
      description: 'Draggable semi-circular floating menu',
      icon: Circle,
      preview: (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border" style={{ borderColor: tokens.border, backgroundColor: tokens.bg }}>
          {/* Content Area */}
          <div className="absolute inset-0 p-3 space-y-2">
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                className="h-3 rounded"
                style={{ backgroundColor: tokens.card, width: `${90 - i * 10}%` }}
              />
            ))}
          </div>
          {/* Circular Menu Preview */}
          <div className="absolute top-2 right-2">
            <div className="relative" style={{ width: '60px', height: '60px' }}>
              {/* Center Button */}
              <div 
                className="absolute inset-0 rounded-full border-2 flex items-center justify-center"
                style={{ 
                  backgroundColor: tokens.card,
                  borderColor: tokens.border
                }}
              >
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tokens.accent }} />
              </div>
              {/* Orbiting Icons */}
              {[0, 1, 2, 3].map(i => {
                const angle = (i * 90) - 45;
                const radius = 25;
                const x = Math.cos(angle * Math.PI / 180) * radius;
                const y = Math.sin(angle * Math.PI / 180) * radius;
                return (
                  <div
                    key={i}
                    className="absolute w-4 h-4 rounded-full border"
                    style={{
                      backgroundColor: tokens.card,
                      borderColor: tokens.border,
                      left: `calc(50% + ${x}px - 8px)`,
                      top: `calc(50% + ${y}px - 8px)`,
                      opacity: 0.6
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1" style={{ color: tokens.color }}>
          Navigation Style
        </h3>
        <p className="text-sm" style={{ color: tokens.subtle }}>
          Choose how you want to navigate through the app
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {styles.map(style => {
          const Icon = style.icon;
          const isSelected = currentStyle === style.id;

          return (
            <Card 
              key={style.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                isSelected && "ring-2"
              )}
              style={{
                ringColor: isSelected ? tokens.accent : 'transparent'
              }}
              onClick={() => handleSelect(style.id)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" style={{ color: tokens.accent }} />
                    <div>
                      <h4 className="font-semibold" style={{ color: tokens.color }}>
                        {style.name}
                      </h4>
                      <p className="text-xs" style={{ color: tokens.subtle }}>
                        {style.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: tokens.accent }}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Visual Preview */}
                {style.preview}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default NavigationStyleSelector;