import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const REMINDER_TYPES = [
  { value: '5m', label: '5 minutes before' },
  { value: '15m', label: '15 minutes before' },
  { value: '30m', label: '30 minutes before' },
  { value: '1h', label: '1 hour before' },
  { value: '2h', label: '2 hours before' },
  { value: '1d', label: '1 day before' },
  { value: '2d', label: '2 days before' },
  { value: '1w', label: '1 week before' },
];

export function ReminderManager({ reminders = [], onChange }) {
  const { tokens } = useTheme();
  const [isAdding, setIsAdding] = useState(false);
  const [newReminder, setNewReminder] = useState('1h');
  
  const handleAdd = () => {
    onChange([...reminders, newReminder]);
    setIsAdding(false);
    setNewReminder('1h');
  };
  
  const handleRemove = (index) => {
    onChange(reminders.filter((_, i) => i !== index));
  };
  
  return (
    <div>
      <label className="text-sm font-medium mb-2 block" style={{ color: tokens.subtle }}>
        <Bell className="w-4 h-4 inline mr-1" />
        Reminders
      </label>
      
      <div className="space-y-2">
        {reminders.map((reminder, index) => {
          const label = REMINDER_TYPES.find(t => t.value === reminder)?.label || reminder;
          return (
            <div 
              key={index}
              className="flex items-center justify-between p-2 rounded-lg border"
              style={{ 
                backgroundColor: tokens.card,
                borderColor: tokens.border 
              }}
            >
              <span className="text-sm" style={{ color: tokens.color }}>
                {label}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1 rounded hover:bg-black/5"
                style={{ color: tokens.subtle }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        
        {isAdding ? (
          <div className="flex gap-2">
            <Select value={newReminder} onValueChange={setNewReminder}>
              <SelectTrigger style={{ borderColor: tokens.border }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              style={{ backgroundColor: tokens.accent }}
              className="text-white"
            >
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            style={{ borderColor: tokens.border }}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Reminder
          </Button>
        )}
      </div>
    </div>
  );
}

export default ReminderManager;