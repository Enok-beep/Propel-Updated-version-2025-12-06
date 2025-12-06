import { supabase } from '../supabase';

export interface UserLocation {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timezone?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeatherData {
  temperature: number;
  feels_like: number;
  condition: string;
  description: string;
  humidity: number;
  wind_speed: number;
  icon_code: string;
  fetched_at: string;
}

export class WeatherRepository {
  // Get user's saved locations
  static async listLocations(): Promise<UserLocation[]> {
    const { data, error } = await supabase
      .from('user_locations')
      .select('*')
      .order('is_primary', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Add a new location
  static async createLocation(location: Omit<UserLocation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_locations')
      .insert({ ...location, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Set primary location
  static async setPrimaryLocation(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Unset all primary locations
    await supabase
      .from('user_locations')
      .update({ is_primary: false })
      .eq('user_id', user.id);

    // Set this one as primary
    const { data, error } = await supabase
      .from('user_locations')
      .update({ is_primary: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete location
  static async deleteLocation(id: string) {
    const { error } = await supabase
      .from('user_locations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Get weather for a location (checks cache first)
  static async getWeather(latitude: number, longitude: number): Promise<WeatherData> {
    // Check cache first
    const { data: cached } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('latitude', latitude)
      .eq('longitude', longitude)
      .gt('expires_at', new Date().toISOString())
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      return {
        temperature: cached.temperature,
        feels_like: cached.feels_like,
        condition: cached.condition,
        description: cached.description,
        humidity: cached.humidity,
        wind_speed: cached.wind_speed,
        icon_code: cached.icon_code,
        fetched_at: cached.fetched_at
      };
    }

    // Fetch fresh weather from Edge Function
    const { data, error } = await supabase.functions.invoke('weather-fetch', {
      body: { latitude, longitude }
    });

    if (error) throw error;
    return data;
  }

  // Request browser geolocation
  static async getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }

  // Reverse geocode coordinates to get city/country
  static async reverseGeocode(latitude: number, longitude: number) {
    const { data, error } = await supabase.functions.invoke('reverse-geocode', {
      body: { latitude, longitude }
    });

    if (error) throw error;
    return data;
  }
}
