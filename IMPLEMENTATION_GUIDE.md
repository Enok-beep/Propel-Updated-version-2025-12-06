# Propel - Integration Implementation Guide

## ✅ What's Been Done

1. **Dark Mode Fixed** - Theme CSS variables now apply correctly to all cards and components
2. **Supabase Database Schema** - Complete schema for calendar, weather, and team features
3. **TypeScript Repositories** - Type-safe data access layers for all integrations
4. **Base Task CRUD** - Tasks can be created, read, updated, deleted via Supabase

## 🚀 What Needs Implementation

### 1. Run the Database Migration

```bash
# In your Supabase SQL Editor, run:
supabase_integrations_schema.sql
```

This creates all tables for:
- Calendar integrations (Google/Apple/Outlook)
- Weather & location
- Team mode & collaboration

### 2. Create Supabase Edge Functions

These serverless functions handle OAuth, API calls, and background jobs:

#### **a) Calendar OAuth Functions**

Create in Supabase Dashboard → Edge Functions:

**`functions/oauth-google-callback/index.ts`**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  // Exchange code for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
      redirect_uri: Deno.env.get('GOOGLE_REDIRECT_URI'),
      grant_type: 'authorization_code'
    })
  })

  const tokens = await tokenResponse.json()

  // Save to database
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('calendar_connections')
    .insert({
      user_id: req.headers.get('x-user-id'), // Pass from frontend
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    })
    .select()
    .single()

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Repeat for:**
- `functions/oauth-apple-callback/index.ts`
- `functions/oauth-outlook-callback/index.ts`

#### **b) Calendar Sync Function**

**`functions/calendar-sync/index.ts`**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { connection_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get connection
  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('id', connection_id)
    .single()

  // Fetch events from Google Calendar API
  const eventsResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}`,
    {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`
      }
    }
  )

  const { items } = await eventsResponse.json()

  // Save events to database
  for (const event of items) {
    await supabase
      .from('external_events')
      .upsert({
        connection_id,
        user_id: connection.user_id,
        external_event_id: event.id,
        title: event.summary,
        description: event.description,
        start_time: event.start.dateTime || event.start.date,
        end_time: event.end.dateTime || event.end.date,
        location: event.location,
        is_all_day: !!event.start.date,
        raw_data: event
      }, { onConflict: 'connection_id,external_event_id' })
  }

  // Update last_sync_at
  await supabase
    .from('calendar_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', connection_id)

  return new Response(JSON.stringify({ synced: items.length }))
})
```

#### **c) Weather Function**

**`functions/weather-fetch/index.ts`**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { latitude, longitude } = await req.json()

  // Call OpenWeatherMap API (or your preferred provider)
  const weatherResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${Deno.env.get('OPENWEATHER_API_KEY')}&units=metric`
  )

  const weather = await weatherResponse.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Cache weather data
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

  await supabase
    .from('weather_cache')
    .insert({
      latitude,
      longitude,
      temperature: weather.main.temp,
      feels_like: weather.main.feels_like,
      condition: weather.weather[0].main,
      description: weather.weather[0].description,
      humidity: weather.main.humidity,
      wind_speed: weather.wind.speed,
      icon_code: weather.weather[0].icon,
      expires_at: expiresAt.toISOString(),
      raw_data: weather
    })

  return new Response(JSON.stringify({
    temperature: weather.main.temp,
    feels_like: weather.main.feels_like,
    condition: weather.weather[0].main,
    description: weather.weather[0].description,
    humidity: weather.main.humidity,
    wind_speed: weather.wind.speed,
    icon_code: weather.weather[0].icon
  }))
})
```

#### **d) Team Invitation Email Function**

**`functions/team-invite/index.ts`**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { invitation_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: invitation } = await supabase
    .from('team_invitations')
    .select('*, teams(*)')
    .eq('id', invitation_id)
    .single()

  // Send email (using Resend, SendGrid, or Supabase's email service)
  const inviteLink = `https://yourapp.com/invite/${invitation.token}`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Propel <noreply@yourapp.com>',
      to: invitation.email,
      subject: `You've been invited to join ${invitation.teams.name}`,
      html: `
        <h2>Team Invitation</h2>
        <p>You've been invited to join ${invitation.teams.name} on Propel.</p>
        <p><a href="${inviteLink}">Accept Invitation</a></p>
        <p>This link expires in 7 days.</p>
      `
    })
  })

  return new Response(JSON.stringify({ sent: true }))
})
```

### 3. Environment Variables

Add to Supabase Dashboard → Settings → Edge Functions:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-project-ref.supabase.co/functions/v1/oauth-google-callback

# Apple Calendar OAuth
APPLE_CLIENT_ID=your_apple_client_id
APPLE_CLIENT_SECRET=your_apple_client_secret
APPLE_REDIRECT_URI=...

# Microsoft/Outlook OAuth
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=...

# Weather API
OPENWEATHER_API_KEY=your_openweather_api_key

# Email Service
RESEND_API_KEY=your_resend_api_key
```

### 4. OAuth Provider Setup

#### **Google Calendar**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://your-project-ref.supabase.co/functions/v1/oauth-google-callback`
6. Copy Client ID and Secret

#### **Apple Calendar**
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create App ID with Sign in with Apple capability
3. Create Service ID for Calendar access
4. Configure redirect URI
5. Generate client secret (JWT)

#### **Microsoft Outlook**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register application
3. Add Calendars.Read permission
4. Configure redirect URI
5. Copy Application ID and Secret

### 5. Frontend Integration

Update Settings page to trigger OAuth flows:

```typescript
// Example: Trigger Google Calendar OAuth
const connectGoogleCalendar = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-google-callback`
  const scope = 'https://www.googleapis.com/auth/calendar.readonly'

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`

  window.location.href = authUrl
}
```

### 6. Scheduled Calendar Sync

Create a Supabase cron job (via pg_cron extension):

```sql
-- Run calendar sync every 15 minutes
SELECT cron.schedule(
  'calendar-sync-all',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/calendar-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

## 🎯 Priority Order

1. **Weather** (Easiest) - Just needs OpenWeatherMap API key
2. **Team Mode** (Medium) - Database is ready, just need UI flows
3. **Calendar Sync** (Complex) - Requires OAuth setup for 3 providers

## 📝 Next Steps

1. Run `supabase_integrations_schema.sql` in your Supabase SQL editor
2. Set up one provider (start with Google Calendar)
3. Create the Edge Functions
4. Test OAuth flow
5. Implement UI components to trigger integrations

---

**Note:** All database schema, repositories, and types are ready. You just need to:
- Deploy Edge Functions
- Configure OAuth providers
- Add environment variables
- Update Settings UI to trigger OAuth flows
