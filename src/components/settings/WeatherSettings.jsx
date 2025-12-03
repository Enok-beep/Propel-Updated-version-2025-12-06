import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Cloud, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function WeatherSettings() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [testingWeather, setTestingWeather] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [localLocation, setLocalLocation] = useState('');

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const currentPrefs = preferences[0];
  const weatherEnabled = currentPrefs?.weather_enabled !== false;
  const defaultLocation = currentPrefs?.default_location || '';

  React.useEffect(() => {
    setLocalLocation(defaultLocation);
  }, [defaultLocation]);

  const updatePrefsMutation = useMutation({
    mutationFn: async (updates) => {
      if (currentPrefs) {
        return base44.entities.UserPreferences.update(currentPrefs.id, updates);
      } else {
        return base44.entities.UserPreferences.create(updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['preferences']);
    }
  });

  const testWeather = async () => {
    setTestingWeather(true);
    setTestResult(null);
    
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Give me weather forecast for ${localLocation || 'current location'} tomorrow. Provide temperature in Celsius. Be realistic.`,
        response_json_schema: {
          type: "object",
          properties: {
            location: { type: "string" },
            temperature_celsius: { type: "number" },
            condition: { type: "string" },
            precipitation_chance: { type: "number" },
            recommendation: { type: "string" }
          }
        },
        add_context_from_internet: true
      });
      
      setTestResult(result);
    } catch (e) {
      setTestResult({ error: 'Weather service unavailable - will retry when viewing tasks' });
    }
    
    setTestingWeather(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: tokens.border }}>
        <div className="flex-1">
          <div className="font-medium text-sm mb-1" style={{ color: tokens.color }}>
            Weather Forecasts
          </div>
          <div className="text-xs" style={{ color: tokens.subtle }}>
            Show weather conditions for tasks with due dates
          </div>
        </div>
        <Switch
          checked={weatherEnabled}
          onCheckedChange={(checked) => updatePrefsMutation.mutate({ weather_enabled: checked })}
        />
      </div>

      {weatherEnabled && (
        <>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: tokens.color }}>
              <MapPin className="w-4 h-4 inline mr-1" />
              Default Location
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., San Francisco, CA"
                value={localLocation}
                onChange={(e) => setLocalLocation(e.target.value)}
                onBlur={() => updatePrefsMutation.mutate({ default_location: localLocation })}
                style={{ borderColor: tokens.border, color: tokens.color, backgroundColor: tokens.card }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={testWeather}
                disabled={testingWeather}
                style={{ borderColor: tokens.border }}
              >
                {testingWeather ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
            <p className="text-xs mt-1" style={{ color: tokens.subtle }}>
              Weather data is fetched automatically using Base44's AI—no API keys needed!
            </p>
          </div>

          {testResult && !testResult.error && (
            <div className="p-4 rounded-xl border animate-in slide-in-from-top" style={{ borderColor: tokens.accent, backgroundColor: `${tokens.accent}10` }}>
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-5 h-5" style={{ color: tokens.accent }} />
                <span className="font-medium text-sm" style={{ color: tokens.color }}>
                  Weather Preview
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs" style={{ color: tokens.subtle }}>Location</div>
                  <div style={{ color: tokens.color }}>{testResult.location}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: tokens.subtle }}>Temperature</div>
                  <div style={{ color: tokens.color }}>{testResult.temperature_celsius}°C</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: tokens.subtle }}>Condition</div>
                  <div style={{ color: tokens.color }}>{testResult.condition}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: tokens.subtle }}>Rain Chance</div>
                  <div style={{ color: tokens.color }}>{testResult.precipitation_chance}%</div>
                </div>
              </div>
              {testResult.recommendation && (
                <div className="mt-2 text-xs p-2 rounded" style={{ backgroundColor: `${tokens.accent}20`, color: tokens.color }}>
                  💡 {testResult.recommendation}
                </div>
              )}
            </div>
          )}

          {testResult?.error && (
            <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              ⚠️ {testResult.error}
            </div>
          )}
        </>
      )}
    </div>
  );
}