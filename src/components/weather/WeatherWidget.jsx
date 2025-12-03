import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Cloud, RefreshCw, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export function WeatherWidget() {
  const { tokens } = useTheme();
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const weatherEnabled = preferences[0]?.weather_enabled !== false;
  const location = preferences[0]?.default_location || 'current location';

  const fetchWeather = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Give me current weather for ${location}. Provide temperature in Celsius. Be realistic and accurate.`,
        response_json_schema: {
          type: "object",
          properties: {
            temperature_celsius: { type: "number" },
            condition: { type: "string" },
            condition_icon: { type: "string", description: "Single emoji representing weather" }
          }
        },
        add_context_from_internet: true
      });
      setWeather(result);
      setLastUpdate(new Date());
    } catch (e) {
      console.log('Weather fetch failed');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (weatherEnabled) {
      fetchWeather();
      
      // Auto-refresh every 30 minutes
      const interval = setInterval(() => {
        fetchWeather();
      }, 30 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [weatherEnabled, location]);

  if (!weatherEnabled) {
    return (
      <Card>
        <div className="text-center py-8">
          <Cloud className="w-8 h-8 mx-auto mb-2" style={{ color: tokens.subtle }} />
          <p className="text-sm" style={{ color: tokens.subtle }}>
            Weather disabled in settings
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-lg font-bold" style={{ color: tokens.color }}>
            Weather
          </div>
          <div className="text-xs mt-0.5" style={{ color: tokens.subtle }}>
            {location}
          </div>
        </div>
        <button
          onClick={fetchWeather}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-black/5 transition-all"
          style={{ color: tokens.subtle }}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading && !weather ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: tokens.accent }} />
        </div>
      ) : weather ? (
        <>
          {/* Main Weather Display */}
          <div className="flex items-start gap-6 mb-6">
            <div 
              className="text-7xl p-4 rounded-2xl"
              style={{ backgroundColor: `${tokens.accent}10` }}
            >
              {weather.condition_icon || '☁️'}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-6xl font-bold" style={{ color: tokens.color }}>
                  {Math.round(weather.temperature_celsius)}
                </span>
                <span className="text-3xl font-light" style={{ color: tokens.subtle }}>°C</span>
              </div>
              <div className="text-base font-medium" style={{ color: tokens.subtle }}>
                {weather.condition}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
            <div className="text-xs" style={{ color: tokens.subtle }}>
              Stay updated with accurate forecasts
            </div>
            {lastUpdate && (
              <div className="text-xs flex items-center gap-1" style={{ color: tokens.subtle }}>
                <RefreshCw className="w-3 h-3" />
                {format(lastUpdate, 'HH:mm')}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <Cloud className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: tokens.subtle }} />
          <p className="text-sm" style={{ color: tokens.subtle }}>
            Unable to fetch weather
          </p>
        </div>
      )}
    </Card>
  );
}

export default WeatherWidget;