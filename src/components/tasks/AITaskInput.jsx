import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, MapPin, Clock } from 'lucide-react';
import { parseISO, addDays, setHours, setMinutes } from 'date-fns';

export function AITaskInput({ onTaskParsed, onCancel }) {
  const { tokens } = useTheme();
  const [input, setInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);

  const parseTask = async () => {
    if (!input.trim()) return;

    setIsParsing(true);
    setError(null);

    try {
      const now = new Date();
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Parse this natural language task into structured data.

Current date and time: ${now.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
Current ISO: ${now.toISOString()}

User input: "${input}"

Parse and extract:
- title (string): Clean, concise task title without date/time/location
- description (string): Optional longer description if provided
- due_date (ISO 8601 datetime): Full datetime when task is due
  * Handle relative dates: "tomorrow", "next Monday", "Friday", "EOD" (5pm today), "next week"
  * Handle times: "1pm", "10:30am", "morning" (9am), "afternoon" (2pm), "evening" (6pm)
  * If only date given, default to 9am that day
  * If "EOD" or "end of day", use 5pm today
- location (string): Any place, venue, or address mentioned
- priority (string): Infer from urgency cues
  * "urgent" if: "ASAP", "urgent", "critical", "emergency", "now"
  * "high" if: "important", "priority", "soon", deadline today/tomorrow
  * "medium" if: general task or no urgency
  * "low" if: "when I can", "someday", "eventually"
- category (string): Best fit from: "work", "personal", "health", "learning", "errands", "creative"
  * "work": meetings, projects, reports, calls
  * "personal": family, friends, social
  * "health": gym, doctor, fitness, wellness
  * "learning": study, course, reading, research
  * "errands": shopping, appointments, tasks
  * "creative": art, music, design, writing
- energy_level (string): "low", "medium", or "high" - estimate energy required
- estimated_minutes (number): Realistic time estimate (15, 25, 45, 60, 90, 120)
- confidence (number): 0-1, how confident in the parsing

Examples:
"Lunch with Alex tomorrow 1pm Soho House" → title: "Lunch with Alex", due_date: tomorrow 1pm ISO, location: "Soho House", category: "personal", estimated_minutes: 60
"Urgent: Fix production bug by EOD" → title: "Fix production bug", priority: "urgent", due_date: today 5pm ISO, category: "work", estimated_minutes: 120
"Gym tomorrow morning" → title: "Gym session", due_date: tomorrow 9am ISO, category: "health", energy_level: "high", estimated_minutes: 45
"Read chapter 5 by Friday" → title: "Read chapter 5", due_date: next Friday 9am ISO, category: "learning", energy_level: "low", estimated_minutes: 45`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            due_date: { type: "string" },
            location: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            category: { type: "string", enum: ["work", "personal", "health", "learning", "errands", "creative"] },
            energy_level: { type: "string", enum: ["low", "medium", "high"] },
            estimated_minutes: { type: "number" },
            confidence: { type: "number" }
          },
          required: ["title", "confidence"]
        }
      });

      if (result.confidence < 0.5) {
        setError('Could not understand the task. Try being more specific.');
        return;
      }

      // Clean up the parsed data
      const taskData = {
        title: result.title,
        description: result.description || input,
        priority: result.priority || 'medium',
        category: result.category || 'personal',
        energy_level: result.energy_level || 'medium',
        estimated_minutes: result.estimated_minutes || 25,
        ...(result.due_date && { due_date: result.due_date }),
        ...(result.location && { location: result.location })
      };

      onTaskParsed(taskData);
      setInput('');
    } catch (err) {
      setError('AI parsing unavailable. Switch to manual input to continue.');
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      parseTask();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type naturally... e.g., 'Team standup tomorrow 10am'"
          className="min-h-[100px] text-base"
          style={{
            borderColor: tokens.border,
            color: tokens.color
          }}
          autoFocus
          disabled={isParsing}
        />
        <div className="text-xs mt-2" style={{ color: tokens.subtle }}>
          Press ⌘/Ctrl + Enter to parse with AI
        </div>
      </div>

      {error && (
        <div 
          className="p-3 rounded-lg text-sm"
          style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
        >
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isParsing}
        >
          Cancel
        </Button>
        <Button
          onClick={parseTask}
          disabled={!input.trim() || isParsing}
          style={{ backgroundColor: tokens.accent }}
          className="text-white"
        >
          {isParsing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Parse with AI
            </>
          )}
        </Button>
      </div>

      {/* Info banner for geo features */}
      <div 
        className="p-3 rounded-lg text-xs border"
        style={{ 
          backgroundColor: `${tokens.accent}08`,
          borderColor: tokens.border,
          color: tokens.subtle 
        }}
      >
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: tokens.accent }} />
          <div>
            <div className="font-medium mb-1" style={{ color: tokens.color }}>
              🚀 Coming Soon: Smart Travel Time
            </div>
            <div>
              Enable Backend Functions to unlock "Leave by X" calculations with real-time traffic, 
              geocoding, and automatic travel time estimation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AITaskInput;