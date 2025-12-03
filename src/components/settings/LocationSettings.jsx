import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MapPin, Navigation, Loader2, CheckCircle2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function LocationSettings() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const currentPrefs = preferences[0];
  const locationEnabled = currentPrefs?.location_enabled !== false;
  const savedLat = currentPrefs?.saved_latitude;
  const savedLon = currentPrefs?.saved_longitude;

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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus({ error: 'Geolocation not supported by browser' });
      return;
    }

    setGettingLocation(true);
    setLocationStatus(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updatePrefsMutation.mutate({
          saved_latitude: latitude,
          saved_longitude: longitude
        });
        setLocationStatus({ success: true, lat: latitude, lon: longitude });
        setGettingLocation(false);
      },
      (error) => {
        setLocationStatus({ error: error.message });
        setGettingLocation(false);
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: tokens.border }}>
        <div className="flex-1">
          <div className="font-medium text-sm mb-1" style={{ color: tokens.color }}>
            Location Services
          </div>
          <div className="text-xs" style={{ color: tokens.subtle }}>
            Show travel time and nearby task suggestions
          </div>
        </div>
        <Switch
          checked={locationEnabled}
          onCheckedChange={(checked) => updatePrefsMutation.mutate({ location_enabled: checked })}
        />
      </div>

      {locationEnabled && (
        <>
          <div className="p-4 rounded-xl border" style={{ borderColor: tokens.border }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4" style={{ color: tokens.accent }} />
                <span className="text-sm font-medium" style={{ color: tokens.color }}>
                  Current Location
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                style={{ borderColor: tokens.border }}
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Getting...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Get Location
                  </>
                )}
              </Button>
            </div>

            {savedLat && savedLon && (
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: `${tokens.accent}10`, color: tokens.color }}>
                <CheckCircle2 className="w-4 h-4 inline mr-1" style={{ color: tokens.accent }} />
                Location saved: {savedLat.toFixed(4)}, {savedLon.toFixed(4)}
              </div>
            )}

            {locationStatus?.error && (
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                ⚠️ {locationStatus.error}
              </div>
            )}

            {locationStatus?.success && (
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: `${tokens.accent}10`, color: tokens.accent }}>
                ✅ Location updated successfully
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg" style={{ borderColor: tokens.border }}>
              <Switch
                checked={currentPrefs?.auto_travel_time !== false}
                onCheckedChange={(checked) => updatePrefsMutation.mutate({ auto_travel_time: checked })}
              />
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: tokens.color }}>
                  Auto-calculate travel time
                </div>
                <div className="text-xs" style={{ color: tokens.subtle }}>
                  Show "Leave by X" for tasks with locations
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg" style={{ borderColor: tokens.border }}>
              <Switch
                checked={currentPrefs?.nearby_suggestions !== false}
                onCheckedChange={(checked) => updatePrefsMutation.mutate({ nearby_suggestions: checked })}
              />
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: tokens.color }}>
                  Nearby task suggestions
                </div>
                <div className="text-xs" style={{ color: tokens.subtle }}>
                  Group tasks by proximity when planning routes
                </div>
              </div>
            </label>
          </div>

          <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
            💡 <strong>Privacy:</strong> Uses browser geolocation API. Your location is stored in your preferences only.
          </div>
        </>
      )}
    </div>
  );
}