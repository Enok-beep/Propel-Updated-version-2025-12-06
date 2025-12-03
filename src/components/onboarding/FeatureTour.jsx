import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOUR_STEPS = [
  {
    id: 'energy',
    title: '⚡ Energy-Based Task Matching',
    description: 'Propel matches tasks to your current energy level. High energy? Tackle those challenging tasks. Low energy? We\'ll suggest lighter ones.',
    highlight: 'Feel like you can conquer the world or just want to check off easy wins? Set your energy and we\'ll do the rest.',
  },
  {
    id: 'ai',
    title: '🤖 Natural Language Input',
    description: 'Just type what you need to do, naturally. "Email John by tomorrow afternoon" becomes a fully scheduled task with priority, category, and time.',
    highlight: 'No more forms. Just tell Propel what needs to be done.',
  },
  {
    id: 'focus',
    title: '🎯 Pomodoro Focus Timer',
    description: 'Built-in Pomodoro timer to help you focus. 25 minutes of work, 5-minute breaks, and automatic task tracking.',
    highlight: 'Stay focused and build momentum with proven time-blocking techniques.',
  },
  {
    id: 'calendar',
    title: '📅 Time Blocking',
    description: 'Schedule tasks in time blocks: morning, midday, evening, or night. Drag and drop to reschedule with ease.',
    highlight: 'Visualize your day and never miss a deadline.',
  },
  {
    id: 'team',
    title: '👥 Team Collaboration',
    description: 'Switch to team mode to collaborate on projects, assign tasks, track progress, and stay aligned with your team.',
    highlight: 'From solo productivity to team coordination in one click.',
  },
];

export function FeatureTour({ onComplete, onSkip }) {
  const { tokens } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
    >
      <div 
        className="max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: tokens.card }}
      >
        {/* Progress Bar */}
        <div className="h-1 w-full" style={{ backgroundColor: `${tokens.accent}20` }}>
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${progress}%`,
              backgroundColor: tokens.accent 
            }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-black/10 transition-colors"
          style={{ color: tokens.subtle }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">{step.title.split(' ')[0]}</div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: tokens.color }}>
              {step.title.split(' ').slice(1).join(' ')}
            </h2>
            <p className="text-lg mb-4" style={{ color: tokens.subtle }}>
              {step.description}
            </p>
            <div 
              className="p-4 rounded-xl text-sm italic"
              style={{ 
                backgroundColor: `${tokens.accent}10`,
                color: tokens.color 
              }}
            >
              💡 {step.highlight}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              style={{ color: tokens.subtle }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <div className="flex gap-2">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentStep ? "w-6" : ""
                  )}
                  style={{
                    backgroundColor: idx === currentStep ? tokens.accent : `${tokens.accent}30`
                  }}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="text-white"
              style={{ backgroundColor: tokens.accent }}
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                'Get Started'
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureTour;