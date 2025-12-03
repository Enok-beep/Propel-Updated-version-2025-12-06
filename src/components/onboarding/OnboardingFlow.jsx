import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { format, addDays, setHours } from 'date-fns';

export function OnboardingFlow({ onComplete }) {
  const { tokens } = useTheme();
  const [step, setStep] = useState(1);
  const [taskInput, setTaskInput] = useState('');
  const [parsedTask, setParsedTask] = useState(null);
  const [isParsing, setIsParsing] = useState(false);

  const exampleInput = "Email John by tomorrow afternoon";
  const [showExample, setShowExample] = useState(true);

  const handleParseTask = async () => {
    if (!taskInput.trim()) return;

    setIsParsing(true);
    setShowExample(false);

    try {
      const now = new Date();
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Parse this natural language task into structured data.

Current date and time: ${now.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}

User input: "${taskInput}"

Extract:
- title: Clean task title
- due_date: ISO datetime (tomorrow afternoon = tomorrow 2pm)
- priority: urgent/high/medium/low
- category: work/personal/health/learning/errands/creative
- energy_level: low/medium/high
- estimated_minutes: 15/25/45/60/90`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            due_date: { type: "string" },
            priority: { type: "string" },
            category: { type: "string" },
            energy_level: { type: "string" },
            estimated_minutes: { type: "number" }
          },
          required: ["title"]
        }
      });

      setParsedTask(result);
      setStep(2);
    } catch (err) {
      console.error('Parsing error:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleCreateTask = async () => {
    if (!parsedTask) return;

    try {
      await base44.entities.Task.create({
        title: parsedTask.title,
        priority: parsedTask.priority || 'medium',
        category: parsedTask.category || 'personal',
        energy_level: parsedTask.energy_level || 'medium',
        estimated_minutes: parsedTask.estimated_minutes || 25,
        ...(parsedTask.due_date && { due_date: parsedTask.due_date }),
        status: 'todo'
      });

      // Mark onboarding as completed
      const prefs = await base44.entities.UserPreferences.list();
      if (prefs.length > 0) {
        await base44.entities.UserPreferences.update(prefs[0].id, {
          onboarding_completed: true
        });
      } else {
        await base44.entities.UserPreferences.create({
          onboarding_completed: true
        });
      }

      setStep(3);
    } catch (err) {
      console.error('Task creation error:', err);
    }
  };

  const handleSkip = async () => {
    try {
      const prefs = await base44.entities.UserPreferences.list();
      if (prefs.length > 0) {
        await base44.entities.UserPreferences.update(prefs[0].id, {
          onboarding_completed: true
        });
      } else {
        await base44.entities.UserPreferences.create({
          onboarding_completed: true
        });
      }
      onComplete?.();
    } catch (err) {
      console.error('Skip error:', err);
      onComplete?.();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
    >
      <div 
        className="max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: tokens.card }}
      >
        {/* Header */}
        <div 
          className="p-8 text-center"
          style={{ 
            background: `linear-gradient(135deg, ${tokens.accent}20 0%, ${tokens.accent}05 100%)`
          }}
        >
          <div 
            className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: tokens.accent }}
          >
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: tokens.color }}>
            Welcome to Propel
          </h1>
          <p className="text-lg" style={{ color: tokens.subtle }}>
            Let's get you started with your first task
          </p>
        </div>

        {/* Step 1: Input Task */}
        {step === 1 && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2" style={{ color: tokens.color }}>
                Let's add your first task
              </h2>
              <p className="text-sm" style={{ color: tokens.subtle }}>
                Try natural language - Propel understands how you think
              </p>
            </div>

            <div className="space-y-4">
              {/* Example suggestion */}
              {showExample && (
                <div 
                  className="p-4 rounded-xl border cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{ 
                    borderColor: tokens.border,
                    backgroundColor: `${tokens.accent}08`
                  }}
                  onClick={() => setTaskInput(exampleInput)}
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5" style={{ color: tokens.accent }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1" style={{ color: tokens.color }}>
                        Try this example:
                      </div>
                      <div className="text-sm" style={{ color: tokens.subtle }}>
                        "{exampleInput}"
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="e.g., Call Sarah about project by Friday morning"
                className="text-lg py-6"
                style={{ 
                  borderColor: tokens.border,
                  backgroundColor: tokens.bg,
                  color: tokens.color
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isParsing) {
                    handleParseTask();
                  }
                }}
                autoFocus
              />

              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  style={{ color: tokens.subtle }}
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleParseTask}
                  disabled={!taskInput.trim() || isParsing}
                  className="text-white px-8"
                  style={{ backgroundColor: tokens.accent }}
                >
                  {isParsing ? (
                    <>Parsing...</>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Show Parsed Result */}
        {step === 2 && parsedTask && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2" style={{ color: tokens.color }}>
                Look what Propel understood! ✨
              </h2>
              <p className="text-sm" style={{ color: tokens.subtle }}>
                Your task is ready to go
              </p>
            </div>

            <div 
              className="rounded-2xl p-6 mb-6"
              style={{ 
                backgroundColor: `${tokens.accent}10`,
                borderLeft: `4px solid ${tokens.accent}`
              }}
            >
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: tokens.subtle }}>
                    TASK
                  </div>
                  <div className="text-lg font-bold" style={{ color: tokens.color }}>
                    ✓ {parsedTask.title}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  {parsedTask.due_date && (
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: tokens.subtle }}>
                        DUE
                      </div>
                      <div className="text-sm font-semibold" style={{ color: tokens.color }}>
                        📅 {format(new Date(parsedTask.due_date), 'EEEE, h:mm a')}
                      </div>
                    </div>
                  )}
                  
                  {parsedTask.energy_level && (
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: tokens.subtle }}>
                        ENERGY
                      </div>
                      <div className="text-sm font-semibold" style={{ color: tokens.color }}>
                        ⚡ {parsedTask.energy_level}
                      </div>
                    </div>
                  )}

                  {parsedTask.priority && (
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: tokens.subtle }}>
                        PRIORITY
                      </div>
                      <div className="text-sm font-semibold" style={{ color: tokens.color }}>
                        🎯 {parsedTask.priority}
                      </div>
                    </div>
                  )}

                  {parsedTask.estimated_minutes && (
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: tokens.subtle }}>
                        TIME
                      </div>
                      <div className="text-sm font-semibold" style={{ color: tokens.color }}>
                        ⏱️ {parsedTask.estimated_minutes} min
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreateTask}
              className="w-full py-6 text-lg text-white font-semibold"
              style={{ backgroundColor: tokens.accent }}
            >
              Wow, that was easy! Let's go →
            </Button>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="p-8 text-center">
            <div 
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: '#D1FAE5' }}
            >
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold mb-3" style={{ color: tokens.color }}>
              You're all set! 🎉
            </h2>
            <p className="text-lg mb-8" style={{ color: tokens.subtle }}>
              Your first task is created. Propel will help you stay organized and focused.
            </p>

            <Button
              onClick={onComplete}
              className="px-8 py-6 text-lg text-white font-semibold"
              style={{ backgroundColor: tokens.accent }}
            >
              Start using Propel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingFlow;