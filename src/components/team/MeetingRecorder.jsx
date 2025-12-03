import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Button } from '@/components/ui/button';
import { Mic, Square, Upload, Loader2, CheckCircle2 } from 'lucide-react';

export function MeetingRecorder({ meetingId, onNotesReady }) {
  const { tokens } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulated recording functionality
  // In a real implementation, this would integrate with browser MediaRecorder API
  // or third-party transcription services
  
  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    
    // Simulate recording timer
    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    // Store interval ID for cleanup
    window.recordingInterval = interval;
  };

  const stopRecording = async () => {
    setIsRecording(false);
    clearInterval(window.recordingInterval);
    
    setIsProcessing(true);
    
    // Simulate processing
    setTimeout(() => {
      const simulatedTranscript = `[Simulated Transcript - ${recordingTime}s recording]

This is a placeholder for meeting transcription. In production, this would contain:
- Real-time speech-to-text transcription
- Speaker identification
- Timestamps for key moments

To enable this feature:
1. Integrate with services like Google Speech-to-Text, AWS Transcribe, or Deepgram
2. Or use browser MediaRecorder API with client-side processing
3. Enable Backend Functions for server-side transcription processing`;

      onNotesReady?.(simulatedTranscript);
      setIsProcessing(false);
      setRecordingTime(0);
    }, 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm mb-1" style={{ color: tokens.color }}>
              AI Meeting Recorder
            </h4>
            <p className="text-xs" style={{ color: tokens.subtle }}>
              {isRecording 
                ? 'Recording in progress...' 
                : 'Click to start recording and transcription'}
            </p>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: '#EF4444' }}
              />
              <span className="text-sm font-medium" style={{ color: tokens.color }}>
                {formatTime(recordingTime)}
              </span>
            </div>
            <div 
              className="flex-1 h-8 rounded-lg overflow-hidden"
              style={{ backgroundColor: `${tokens.accent}10` }}
            >
              <div 
                className="h-full transition-all"
                style={{ 
                  width: `${Math.min((recordingTime / 300) * 100, 100)}%`,
                  backgroundColor: tokens.accent 
                }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={isProcessing}
              style={{ backgroundColor: tokens.accent }}
              className="text-white flex-1"
            >
              <Mic className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              style={{ backgroundColor: '#EF4444' }}
              className="text-white flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop & Transcribe
            </Button>
          )}
        </div>

        {isProcessing && (
          <div 
            className="flex items-center gap-2 p-3 rounded-lg"
            style={{ backgroundColor: `${tokens.accent}10` }}
          >
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: tokens.accent }} />
            <span className="text-sm" style={{ color: tokens.accent }}>
              Transcribing audio...
            </span>
          </div>
        )}

        <div 
          className="p-3 rounded-lg text-xs"
          style={{ backgroundColor: `${tokens.accent}05`, color: tokens.subtle }}
        >
          <strong>Note:</strong> This is a placeholder UI. Enable Backend Functions to integrate with real transcription services like Google Speech-to-Text or Deepgram.
        </div>
      </div>
    </Card>
  );
}

export default MeetingRecorder;