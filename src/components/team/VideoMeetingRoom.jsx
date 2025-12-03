import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '../ui-custom/Card';
import { Input } from '@/components/ui/input';
import { 
  Video, VideoOff, Mic, MicOff, Monitor, Users, 
  MessageSquare, Sparkles, PhoneOff, Settings, Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * VIDEO MEETING ARCHITECTURE
 * 
 * Tech Stack Options:
 * 1. Daily.co - Easiest integration, handles everything
 * 2. Agora.io - Powerful, scalable, good docs
 * 3. Twilio Video - Reliable, enterprise-grade
 * 4. 100ms - Modern, great developer experience
 * 
 * Core Features:
 * - Real-time video/audio streams (WebRTC)
 * - Screen sharing
 * - AI participant that joins automatically
 * - Live transcription
 * - Chat sidebar
 * - Recording with AI summary
 * 
 * Implementation Steps:
 * 1. Enable Backend Functions
 * 2. Choose video provider (recommend Daily.co or 100ms)
 * 3. Create backend endpoints for room management
 * 4. Integrate AI transcription (Deepgram, AssemblyAI, or provider's native)
 * 5. Store transcripts in Meeting entity
 */

export function VideoMeetingRoom({ meeting, onLeave }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [aiParticipant, setAiParticipant] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Meeting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  // Simulate AI joining the meeting
  useEffect(() => {
    const timer = setTimeout(() => {
      setAiParticipant({
        name: 'AI Assistant',
        status: 'recording',
        capabilities: ['transcription', 'summarization', 'action_items']
      });
      
      // Simulate live transcription
      const transcriptionTimer = setInterval(() => {
        if (Math.random() > 0.7) {
          setTranscript(prev => [...prev, {
            speaker: 'Participant',
            text: 'Sample transcription text...',
            timestamp: new Date()
          }]);
        }
      }, 3000);

      return () => clearInterval(transcriptionTimer);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const toggleVideo = () => setIsVideoOn(!isVideoOn);
  const toggleAudio = () => setIsAudioOn(!isAudioOn);
  
  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    // In production: navigator.mediaDevices.getDisplayMedia()
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    
    setChatMessages(prev => [...prev, {
      sender: user?.full_name || user?.email || 'You',
      message: chatInput,
      timestamp: new Date()
    }]);
    setChatInput('');
  };

  const endMeeting = async () => {
    // Save transcript to meeting
    const transcriptText = transcript
      .map(t => `[${t.speaker}]: ${t.text}`)
      .join('\n');
    
    await updateMeetingMutation.mutateAsync({
      id: meeting.id,
      data: { notes: transcriptText }
    });
    
    onLeave?.();
  };

  // Simulated participants
  const participants = [
    { id: 1, name: user?.full_name || 'You', isLocal: true },
    { id: 2, name: 'Team Member 1', isLocal: false },
    { id: 3, name: 'Team Member 2', isLocal: false },
  ];

  return (
    <div 
      className="fixed inset-0 z-50"
      style={{ backgroundColor: '#0A0B0F' }}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div 
          className="px-6 py-4 border-b"
          style={{ borderColor: tokens.border }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {meeting.title}
              </h2>
              <p className="text-sm text-gray-400">
                {participants.length} participants • Recording in progress
              </p>
            </div>
            
            {aiParticipant && (
              <div 
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: `${tokens.accent}20` }}
              >
                <div 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: '#EF4444' }}
                />
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm text-white font-medium">
                  AI Assistant Active
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video Grid */}
          <div className="flex-1 p-4">
            <div className="h-full grid grid-cols-2 gap-4">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="relative rounded-2xl overflow-hidden"
                  style={{ backgroundColor: '#1F2937' }}
                >
                  {/* Placeholder for video stream */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {participant.isLocal && !isVideoOn ? (
                      <VideoOff className="w-12 h-12 text-gray-500" />
                    ) : (
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                        style={{ backgroundColor: tokens.accent }}
                      >
                        {participant.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  {/* Name Badge */}
                  <div 
                    className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-sm"
                  >
                    <span className="text-sm text-white font-medium">
                      {participant.name}
                      {participant.isLocal && ' (You)'}
                    </span>
                  </div>

                  {/* Mute Indicator */}
                  {participant.isLocal && !isAudioOn && (
                    <div className="absolute top-4 right-4">
                      <MicOff className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
              ))}

              {/* AI Participant */}
              {aiParticipant && (
                <div
                  className="relative rounded-2xl overflow-hidden border-2"
                  style={{ 
                    backgroundColor: '#1F2937',
                    borderColor: tokens.accent
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-12 h-12" style={{ color: tokens.accent }} />
                  </div>
                  
                  <div 
                    className="absolute bottom-4 left-4 px-3 py-1 rounded-lg"
                    style={{ backgroundColor: `${tokens.accent}40`, backdropFilter: 'blur(8px)' }}
                  >
                    <span className="text-sm text-white font-medium">
                      {aiParticipant.name}
                    </span>
                  </div>

                  {/* AI Status */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <div 
                      className="px-2 py-1 rounded text-xs bg-black/60 text-white flex items-center gap-1"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Recording
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Chat & Transcript */}
          {showChat && (
            <div 
              className="w-80 border-l flex flex-col"
              style={{ 
                borderColor: tokens.border,
                backgroundColor: tokens.card
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: tokens.border }}>
                <h3 className="font-semibold" style={{ color: tokens.color }}>
                  Live Transcript & Chat
                </h3>
              </div>

              {/* Transcript */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {transcript.map((entry, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="font-medium text-xs" style={{ color: tokens.subtle }}>
                      {entry.speaker}
                    </div>
                    <p style={{ color: tokens.color }}>{entry.text}</p>
                  </div>
                ))}
                
                {transcript.length === 0 && (
                  <div className="text-center py-8" style={{ color: tokens.subtle }}>
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Waiting for audio...</p>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t" style={{ borderColor: tokens.border }}>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    style={{ borderColor: tokens.border }}
                  />
                  <Button onClick={sendMessage} size="sm" style={{ backgroundColor: tokens.accent }}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div 
          className="px-6 py-4 border-t"
          style={{ borderColor: tokens.border }}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Meeting in progress
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={toggleAudio}
                size="icon"
                className={cn(
                  "rounded-full w-12 h-12",
                  !isAudioOn && "bg-red-500 hover:bg-red-600"
                )}
                style={{ backgroundColor: isAudioOn ? '#374151' : undefined }}
              >
                {isAudioOn ? (
                  <Mic className="w-5 h-5 text-white" />
                ) : (
                  <MicOff className="w-5 h-5 text-white" />
                )}
              </Button>

              <Button
                onClick={toggleVideo}
                size="icon"
                className={cn(
                  "rounded-full w-12 h-12",
                  !isVideoOn && "bg-red-500 hover:bg-red-600"
                )}
                style={{ backgroundColor: isVideoOn ? '#374151' : undefined }}
              >
                {isVideoOn ? (
                  <Video className="w-5 h-5 text-white" />
                ) : (
                  <VideoOff className="w-5 h-5 text-white" />
                )}
              </Button>

              <Button
                onClick={toggleScreenShare}
                size="icon"
                className={cn(
                  "rounded-full w-12 h-12",
                  isScreenSharing && "bg-blue-500"
                )}
                style={{ backgroundColor: !isScreenSharing ? '#374151' : undefined }}
              >
                <Monitor className="w-5 h-5 text-white" />
              </Button>

              <Button
                onClick={() => setShowChat(!showChat)}
                size="icon"
                className="rounded-full w-12 h-12"
                style={{ backgroundColor: '#374151' }}
              >
                <MessageSquare className="w-5 h-5 text-white" />
              </Button>

              <div className="w-px h-8 bg-gray-700" />

              <Button
                onClick={endMeeting}
                className="bg-red-500 hover:bg-red-600 text-white px-6 rounded-full"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                End Meeting
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Notice */}
      <div 
        className="fixed bottom-20 left-6 p-4 rounded-lg max-w-md"
        style={{ backgroundColor: `${tokens.accent}20`, backdropFilter: 'blur(8px)' }}
      >
        <p className="text-xs text-white mb-2">
          <strong>🚀 To Enable Real Video:</strong>
        </p>
        <p className="text-xs text-gray-300">
          1. Enable Backend Functions<br/>
          2. Integrate Daily.co, 100ms, or Agora<br/>
          3. AI joins via their API with recording permissions<br/>
          4. Transcripts auto-save to meetings
        </p>
      </div>
    </div>
  );
}

export default VideoMeetingRoom;