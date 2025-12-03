# AI-Powered Video Meeting Architecture

## Overview
This document outlines the architecture for integrating real-time video meetings with AI participation in the Propel team collaboration platform.

## Tech Stack Recommendations

### Option 1: Daily.co (Recommended for Quick Start)
**Pros:**
- Easiest integration
- Built-in recording and transcription
- AI bot can join with SDK
- Great documentation
- Generous free tier

**Implementation:**
```javascript
// Backend endpoint to create room
const createDailyRoom = async (meetingId) => {
  const response = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: meetingId,
      privacy: 'private',
      properties: {
        enable_recording: 'cloud',
        enable_transcription: true
      }
    })
  });
  return response.json();
};

// Frontend - Join room
import DailyIframe from '@daily-co/daily-js';

const callFrame = DailyIframe.createFrame({
  iframeStyle: { width: '100%', height: '100%' }
});

callFrame.join({ url: roomUrl });
```

### Option 2: 100ms
**Pros:**
- Modern, developer-friendly
- Built-in recording, streaming, transcription
- AI can join as participant
- React SDK available

**Implementation:**
```javascript
import { useHMSActions } from '@100mslive/react-sdk';

const hmsActions = useHMSActions();
await hmsActions.join({
  userName: 'AI Assistant',
  authToken: token
});
```

### Option 3: Agora.io
**Pros:**
- Enterprise-grade
- Highly scalable
- Strong AI/ML features
- Great for large meetings

**Implementation:**
```javascript
import AgoraRTC from 'agora-rtc-sdk-ng';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
await client.join(appId, channelName, token, uid);
```

### Option 4: Twilio Video
**Pros:**
- Enterprise reliability
- Strong support
- Composable architecture

## AI Participant Architecture

### 1. AI Bot Setup
The AI joins as a virtual participant with specific permissions:

```javascript
// Backend - Create AI bot token
const createAIBotToken = async (roomId) => {
  return {
    room: roomId,
    user_id: 'ai-assistant',
    permissions: {
      canSpeak: true,
      canSendVideo: false,
      canRecord: true,
      canTranscribe: true
    }
  };
};
```

### 2. Transcription Pipeline
```javascript
// Real-time transcription flow
1. AI bot captures audio stream
2. Send to transcription service (Deepgram/AssemblyAI)
3. Receive real-time transcription
4. Store in Meeting.notes field
5. Generate summary on meeting end
```

### 3. Auto-Task Creation
```javascript
const processTranscript = async (meetingId, transcript) => {
  // 1. Send to LLM for analysis
  const analysis = await base44.integrations.Core.InvokeLLM({
    prompt: `Analyze this meeting transcript and extract action items...
    
    ${transcript}`,
    response_json_schema: {
      type: "object",
      properties: {
        action_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              task: { type: "string" },
              assignee: { type: "string" },
              due_date: { type: "string" },
              priority: { type: "string" }
            }
          }
        }
      }
    }
  });

  // 2. Create tasks automatically
  for (const item of analysis.action_items) {
    await base44.entities.Task.create({
      title: item.task,
      assigned_to: item.assignee,
      due_date: item.due_date,
      priority: item.priority,
      team_id: meeting.team_id,
      project_id: meeting.project_id
    });
  }
};
```

## Core Features

### 1. Video/Audio Streaming
- WebRTC-based real-time communication
- Adaptive bitrate for quality
- Noise cancellation
- Virtual backgrounds

### 2. AI Participant Capabilities
- **Automatic Joining**: AI joins when meeting starts
- **Real-time Transcription**: Live captions for all participants
- **Smart Summarization**: Post-meeting summaries
- **Action Item Detection**: Auto-create tasks
- **Sentiment Analysis**: Track meeting mood/engagement
- **Speaker Identification**: Who said what

### 3. Recording & Playback
- Cloud recording with timestamp markers
- Searchable transcripts
- Key moment detection
- Shareable clips

### 4. Collaboration Tools
- Screen sharing
- Collaborative whiteboard
- File sharing
- Polls and reactions

## Implementation Steps

### Phase 1: Basic Video (Week 1)
1. Enable Backend Functions in Base44
2. Choose video provider (Daily.co recommended)
3. Create backend endpoints for room management
4. Integrate video SDK in frontend
5. Basic join/leave functionality

### Phase 2: AI Integration (Week 2)
1. Set up transcription service (Deepgram recommended)
2. Create AI bot service
3. Implement real-time transcription
4. Store transcripts in Meeting entity
5. Basic summary generation

### Phase 3: Advanced Features (Week 3)
1. Automatic task creation from action items
2. Speaker identification
3. Meeting analytics
4. Recording playback
5. Search across transcripts

### Phase 4: Intelligence (Week 4)
1. Sentiment analysis
2. Engagement metrics
3. Meeting insights
4. Recommendation engine
5. Integration with calendar

## Database Schema Updates

```json
{
  "Meeting": {
    "video_room_id": "string",
    "video_provider": "string",
    "recording_url": "string",
    "transcript": "string",
    "ai_summary": "string",
    "ai_insights": {
      "engagement_score": "number",
      "sentiment": "string",
      "key_topics": ["array"],
      "speaking_time": "object"
    }
  }
}
```

## Security Considerations

1. **Authentication**: JWT tokens for room access
2. **Permissions**: Role-based access control
3. **Encryption**: End-to-end encryption for video
4. **Privacy**: User consent for recording
5. **Data Retention**: Configurable retention policies

## Cost Estimation

### Daily.co Pricing (Recommended)
- **Free Tier**: 50,000 participant minutes/month
- **Scale**: $0.0015/participant minute
- **Recording**: $0.004/minute
- **Transcription**: $0.006/minute

### Transcription (Deepgram)
- **Free Tier**: 12,000 minutes
- **Pay-as-you-go**: $0.0125/minute

### AI Processing (OpenAI)
- Using existing Base44 InvokeLLM integration
- Cost included in current usage

## Example Integration Code

### Create Meeting with Video
```javascript
const createMeetingWithVideo = async (meetingData) => {
  // 1. Create meeting in database
  const meeting = await base44.entities.Meeting.create(meetingData);
  
  // 2. Create video room
  const room = await fetch('/api/video/create-room', {
    method: 'POST',
    body: JSON.stringify({ meeting_id: meeting.id })
  }).then(r => r.json());
  
  // 3. Update meeting with room info
  await base44.entities.Meeting.update(meeting.id, {
    video_room_id: room.id,
    video_provider: 'daily'
  });
  
  return meeting;
};
```

### AI Bot Join Logic
```javascript
// Backend function
const inviteAIToMeeting = async (roomId) => {
  // 1. Create bot token
  const botToken = await createBotToken(roomId);
  
  // 2. Initialize AI bot
  const bot = await AIBot.create({
    room: roomId,
    token: botToken,
    capabilities: ['transcribe', 'record', 'summarize']
  });
  
  // 3. Join room
  await bot.join();
  
  // 4. Start transcription
  bot.on('speech', (transcript) => {
    // Store real-time transcript
    storeTranscript(roomId, transcript);
  });
  
  return bot;
};
```

## UI/UX Patterns

1. **Pre-Join Screen**: Test audio/video before joining
2. **Participant Grid**: Responsive layout for multiple participants
3. **AI Indicator**: Clear indication that AI is present
4. **Live Captions**: Real-time transcription display
5. **Smart Notifications**: Action items detected during call
6. **Post-Meeting Summary**: Auto-generated report

## Future Enhancements

1. **AI Meeting Insights**: Who spoke most, engagement levels
2. **Smart Scheduling**: AI suggests best meeting times
3. **Follow-up Automation**: Auto-send summaries and tasks
4. **Meeting Coaching**: AI tips for better meetings
5. **Integration with Calendar**: Automatic sync
6. **Breakout Rooms**: Small group discussions
7. **Multilingual Support**: Real-time translation

## Getting Started

To enable video meetings in your Propel app:

1. **Enable Backend Functions** in Base44 dashboard
2. **Choose a video provider** and sign up
3. **Add environment variables**:
   ```
   DAILY_API_KEY=your_key
   DEEPGRAM_API_KEY=your_key
   ```
4. **Deploy backend functions** for room management
5. **Test with video room component** already built
6. **Configure AI bot** to auto-join meetings
7. **Customize features** based on team needs

## Support & Resources

- Daily.co Docs: https://docs.daily.co
- 100ms Docs: https://www.100ms.live/docs
- Deepgram API: https://developers.deepgram.com
- WebRTC Guide: https://webrtc.org/getting-started

---

**Note**: The VideoMeetingRoom component is ready to use. Once you integrate a video provider's SDK, replace the placeholder UI with actual video streams.