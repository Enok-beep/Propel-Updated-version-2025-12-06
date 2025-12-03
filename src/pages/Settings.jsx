import React, { useState } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { NavigationStyleSelector } from '@/components/settings/NavigationStyleSelector';
import { Card } from '@/components/ui-custom/Card';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Palette, User, Bell, Clock, 
  LogOut, Shield, Sparkles, ChevronDown, ChevronRight,
  CreditCard, HelpCircle, Globe, Upload, Mail, Key, Users, CalendarDays, Cloud
} from 'lucide-react';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { WeatherSettings } from '@/components/settings/WeatherSettings';
import { LocationSettings } from '@/components/settings/LocationSettings';
import { CalendarSyncManager } from '@/components/calendar/CalendarSyncManager';
import { ExportImport } from '@/components/import-export/ExportImport';
import { Button } from '@/components/ui/button';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { usePageTracking } from '@/components/analytics/usePageTracking';
import { useAnalytics, EVENTS } from '@/components/analytics/AnalyticsProvider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

const AVATARS = ['👤', '🦸', '🧙', '👨‍💻', '👩‍🎨', '🦊', '🐼', '🦁', '🐸', '🚀', '⚡', '🌟'];

export default function Settings() {
  const { tokens } = useTheme();
  const { trackEvent } = useAnalytics();
  const queryClient = useQueryClient();
  const [selectedAvatar, setSelectedAvatar] = useState('👤');
  
  usePageTracking('Settings');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const currentPrefs = preferences[0];
  const selectedLanguage = currentPrefs?.language || 'en';

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const myTeams = teams.filter(team => 
    teamMembers.some(m => m.team_id === team.id && m.user_email === user?.email)
  );

  const workMode = currentPrefs?.work_mode || 'personal';
  const activeTeamId = currentPrefs?.active_team_id;

  const updateLanguageMutation = useMutation({
    mutationFn: async (language) => {
      if (currentPrefs) {
        return base44.entities.UserPreferences.update(currentPrefs.id, { language });
      } else {
        return base44.entities.UserPreferences.create({ language });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['preferences']);
    }
  });

  const updateWorkModeMutation = useMutation({
    mutationFn: async ({ mode, teamId }) => {
      if (currentPrefs) {
        return base44.entities.UserPreferences.update(currentPrefs.id, {
          work_mode: mode,
          active_team_id: teamId
        });
      } else {
        return base44.entities.UserPreferences.create({
          work_mode: mode,
          active_team_id: teamId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['preferences']);
    }
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 
          className="text-3xl font-bold tracking-tight"
          style={{ color: tokens.color }}
        >
          Settings
        </h1>
        <p style={{ color: tokens.subtle }} className="mt-1 text-sm">
          Customize your Propel experience
        </p>
      </div>

      {/* Quick Profile Card */}
      {user && (
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${tokens.accent}20` }}
              >
                {selectedAvatar}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg truncate" style={{ color: tokens.color }}>
                {user.full_name || 'User'}
              </div>
              <div className="text-sm truncate" style={{ color: tokens.subtle }}>
                {user.email}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </Card>
      )}

      {/* Collapsible Settings */}
      <Accordion type="multiple" className="space-y-3" defaultValue={['appearance']}>
        
        {/* Profile & Avatar */}
        <AccordionItem value="profile" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Profile & Avatar</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
                  Choose Avatar
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {AVATARS.map(avatar => (
                    <button
                      key={avatar}
                      onClick={() => setSelectedAvatar(avatar)}
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
                      style={{
                        backgroundColor: selectedAvatar === avatar ? `${tokens.accent}20` : `${tokens.subtle}10`,
                        border: selectedAvatar === avatar ? `2px solid ${tokens.accent}` : 'none'
                      }}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
                  Upload Profile Picture
                </label>
                <Button variant="outline" className="w-full" style={{ borderColor: tokens.border }}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
                <p className="text-xs mt-1" style={{ color: tokens.subtle }}>
                  Coming soon: Upload custom profile pictures
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Navigation Style */}
        <AccordionItem value="navigation" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Navigation Style</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <NavigationStyleSelector />
          </AccordionContent>
        </AccordionItem>

        {/* Appearance */}
        <AccordionItem value="appearance" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Appearance</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <ThemePicker />
          </AccordionContent>
        </AccordionItem>

        {/* Notifications */}
        <AccordionItem value="notifications" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Notifications</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <NotificationSettings currentPrefs={currentPrefs} />
          </AccordionContent>
        </AccordionItem>

        {/* Work Mode */}
        <AccordionItem value="workmode" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Work Mode</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => updateWorkModeMutation.mutate({ mode: 'personal', teamId: null })}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left active:scale-98",
                    workMode === 'personal' && "ring-2"
                  )}
                  style={{
                    borderColor: workMode === 'personal' ? tokens.accent : tokens.border,
                    backgroundColor: workMode === 'personal' ? `${tokens.accent}10` : 'transparent',
                    ringColor: tokens.accent
                  }}
                >
                  <div className="text-2xl mb-2">👤</div>
                  <div className="font-semibold text-sm" style={{ color: tokens.color }}>
                    Personal
                  </div>
                  <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
                    Solo productivity
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (myTeams.length > 0) {
                      updateWorkModeMutation.mutate({ 
                        mode: 'team', 
                        teamId: activeTeamId || myTeams[0].id 
                      });
                    }
                  }}
                  disabled={myTeams.length === 0}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    workMode === 'team' && "ring-2",
                    myTeams.length === 0 && "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    borderColor: workMode === 'team' ? tokens.accent : tokens.border,
                    backgroundColor: workMode === 'team' ? `${tokens.accent}10` : 'transparent',
                    ringColor: tokens.accent
                  }}
                >
                  <div className="text-2xl mb-2">👥</div>
                  <div className="font-semibold text-sm" style={{ color: tokens.color }}>
                    Team
                  </div>
                  <div className="text-xs mt-1" style={{ color: tokens.subtle }}>
                    Collaborative work
                  </div>
                </button>
              </div>

              {workMode === 'team' && myTeams.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
                    Active Team
                  </label>
                  <Select 
                    value={activeTeamId || myTeams[0].id} 
                    onValueChange={(teamId) => updateWorkModeMutation.mutate({ mode: 'team', teamId })}
                  >
                    <SelectTrigger style={{ borderColor: tokens.border }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {myTeams.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.avatar} {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {myTeams.length === 0 && (
                <div 
                  className="p-3 rounded-xl text-xs"
                  style={{ backgroundColor: `${tokens.accent}10`, color: tokens.subtle }}
                >
                  💡 Create a team first to enable team mode
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Calendar Integration */}
        <AccordionItem value="calendar" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Calendar Integration</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <CalendarSyncManager />
          </AccordionContent>
        </AccordionItem>

        {/* Language */}
        <AccordionItem value="language" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Language</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <Select value={selectedLanguage} onValueChange={(lang) => updateLanguageMutation.mutate(lang)}>
              <SelectTrigger style={{ borderColor: tokens.border }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div 
              className="p-3 rounded-xl text-xs mt-3"
              style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
            >
              <div className="font-medium mb-1">⚠️ Coming Soon: Full Translation</div>
              <div>
                Your language preference is saved, but the app interface is currently only available in English. 
                Full multi-language support with {LANGUAGES.find(l => l.code === selectedLanguage)?.name} is coming in a future update.
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Account & Billing */}
        <AccordionItem value="account" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Account & Billing</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <div className="space-y-4">
              <div className="p-4 rounded-xl border" style={{ borderColor: tokens.border }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm" style={{ color: tokens.color }}>Current Plan</span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${tokens.accent}20`, color: tokens.accent }}>
                    Free
                  </span>
                </div>
                <p className="text-xs" style={{ color: tokens.subtle }}>
                  Upgrade to unlock advanced features
                </p>
              </div>
              
              <Button variant="outline" className="w-full" style={{ borderColor: tokens.border }}>
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Subscription
              </Button>
              
              <p className="text-xs text-center" style={{ color: tokens.subtle }}>
                Coming soon: Premium plans with unlimited tasks, integrations, and AI features
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Weather & Location */}
        <AccordionItem value="weather" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Weather & Location</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <div className="space-y-6">
              <WeatherSettings />
              <div className="border-t pt-6" style={{ borderColor: tokens.border }}>
                <LocationSettings />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Integrations */}
        <AccordionItem value="integrations" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Integrations</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <div className="space-y-4">
              <div 
                className="p-4 rounded-xl text-sm"
                style={{ backgroundColor: `${tokens.accent}10`, color: tokens.color }}
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5" style={{ color: tokens.accent }} />
                  <div>
                    <div className="font-medium mb-1">Powered by Base44</div>
                    <div className="text-xs" style={{ color: tokens.subtle }}>
                      Weather, AI task parsing, and smart features work automatically—no setup needed!
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3" style={{ color: tokens.color }}>
                  🔗 Available Integrations
                </h4>
                <div className="space-y-2">
                  {[
                    { icon: '💻', name: 'VSCode', desc: 'Auto-log TODOs and commits' },
                    { icon: '🐙', name: 'GitHub', desc: 'Sync issues and PRs' },
                    { icon: '🎨', name: 'Figma', desc: 'Track design handoffs' }
                  ].map(int => (
                    <div key={int.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border" style={{ borderColor: tokens.border }}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{int.icon}</span>
                        <div>
                          <div className="text-sm font-medium" style={{ color: tokens.color }}>{int.name}</div>
                          <div className="text-xs" style={{ color: tokens.subtle }}>{int.desc}</div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded self-start sm:self-auto" style={{ backgroundColor: `${tokens.subtle}20`, color: tokens.subtle }}>
                        Backend Required
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div 
                className="p-4 rounded-xl border text-xs"
                style={{ borderColor: tokens.border }}
              >
                <div className="font-medium mb-2" style={{ color: tokens.color }}>
                  🚀 Enable Backend Functions
                </div>
                <p style={{ color: tokens.subtle }}>
                  Go to Base44 Dashboard → Settings → Enable Backend Functions for:
                </p>
                <ul className="mt-2 space-y-1 ml-4" style={{ color: tokens.subtle }}>
                  <li>• OAuth calendar sync (Google, Apple)</li>
                  <li>• Third-party app connections</li>
                  <li>• Advanced automation workflows</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Support */}
        <AccordionItem value="support" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Support & Help</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" style={{ borderColor: tokens.border }}>
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="outline" className="w-full justify-start" style={{ borderColor: tokens.border }}>
                <HelpCircle className="w-4 h-4 mr-2" />
                Documentation
              </Button>
              <div className="pt-2 border-t" style={{ borderColor: tokens.border }}>
                <p className="text-xs" style={{ color: tokens.subtle }}>
                  Need help? We're here for you. Reach out anytime.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Data Management */}
        <AccordionItem value="data" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>Data Management</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <ExportImport />
          </AccordionContent>
        </AccordionItem>

        {/* About */}
        <AccordionItem value="about" className="border rounded-2xl px-5" style={{ borderColor: tokens.border, backgroundColor: tokens.card }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" style={{ color: tokens.accent }} />
              <span className="font-semibold" style={{ color: tokens.color }}>About Propel</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <div className="space-y-3 text-sm" style={{ color: tokens.subtle }}>
              <p>
                Propel is designed for minds that work differently. Built with ADHD-friendly features 
                like energy-based task matching and the Pomodoro technique to help you focus and execute.
              </p>
              <div className="pt-2 border-t" style={{ borderColor: tokens.border }}>
                <div className="text-xs font-medium">Version 1.0.0</div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}