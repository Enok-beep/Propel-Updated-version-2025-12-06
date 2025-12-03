import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Repeat, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function RecurrenceSelector({ value, onChange }) {
  const { tokens } = useTheme();
  const [isEnabled, setIsEnabled] = useState(value?.is_recurring || false);

  const recurrence = value || {
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_interval: 1,
    recurrence_end_date: null,
    recurrence_count: null
  };

  const updateRecurrence = (updates) => {
    onChange({ ...recurrence, ...updates });
  };

  const toggleRecurrence = () => {
    if (isEnabled) {
      setIsEnabled(false);
      onChange({
        is_recurring: false,
        recurrence_pattern: null,
        recurrence_interval: null,
        recurrence_end_date: null,
        recurrence_count: null
      });
    } else {
      setIsEnabled(true);
      updateRecurrence({ is_recurring: true });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2" style={{ color: tokens.color }}>
          <Repeat className="w-4 h-4" />
          Recurring Task
        </label>
        <Button
          type="button"
          variant={isEnabled ? "default" : "outline"}
          size="sm"
          onClick={toggleRecurrence}
          style={isEnabled ? { backgroundColor: tokens.accent, color: '#FFFFFF' } : { borderColor: tokens.border }}
        >
          {isEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      {isEnabled && (
        <div className="space-y-3 pl-6 border-l-2" style={{ borderColor: tokens.border }}>
          {/* Pattern and Interval */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: tokens.subtle }}>
                Repeats
              </label>
              <Select 
                value={recurrence.recurrence_pattern} 
                onValueChange={(val) => updateRecurrence({ recurrence_pattern: val })}
              >
                <SelectTrigger style={{ borderColor: tokens.border }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: tokens.subtle }}>
                Every
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={recurrence.recurrence_interval}
                  onChange={(e) => updateRecurrence({ recurrence_interval: parseInt(e.target.value) || 1 })}
                  className="w-20"
                  style={{ borderColor: tokens.border }}
                />
                <span className="text-sm" style={{ color: tokens.subtle }}>
                  {recurrence.recurrence_pattern === 'daily' && 'day(s)'}
                  {recurrence.recurrence_pattern === 'weekly' && 'week(s)'}
                  {recurrence.recurrence_pattern === 'monthly' && 'month(s)'}
                  {recurrence.recurrence_pattern === 'yearly' && 'year(s)'}
                </span>
              </div>
            </div>
          </div>

          {/* End condition */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: tokens.subtle }}>
              Ends
            </label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !recurrence.recurrence_end_date && "text-muted-foreground"
                    )}
                    style={{ borderColor: tokens.border }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {recurrence.recurrence_end_date ? format(new Date(recurrence.recurrence_end_date), 'PPP') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={recurrence.recurrence_end_date ? new Date(recurrence.recurrence_end_date) : undefined}
                    onSelect={(date) => updateRecurrence({ recurrence_end_date: date, recurrence_count: null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {recurrence.recurrence_end_date && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => updateRecurrence({ recurrence_end_date: null })}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs" style={{ color: tokens.subtle }}>or after</span>
              <Input
                type="number"
                min="1"
                placeholder="Count"
                value={recurrence.recurrence_count || ''}
                onChange={(e) => updateRecurrence({ 
                  recurrence_count: parseInt(e.target.value) || null,
                  recurrence_end_date: null 
                })}
                className="w-20"
                style={{ borderColor: tokens.border }}
              />
              <span className="text-xs" style={{ color: tokens.subtle }}>occurrences</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecurrenceSelector;