import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WeatherRepository, type UserLocation } from '@/lib/repositories/WeatherRepository';
import { toast } from 'sonner';

/**
 * Fetch user's saved locations
 */
export function useUserLocations() {
  return useQuery({
    queryKey: ['weather', 'locations'],
    queryFn: () => WeatherRepository.listLocations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create user location
 */
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (location: Omit<UserLocation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      WeatherRepository.createLocation(location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather', 'locations'] });
      toast.success('Location added!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add location');
    },
  });
}

/**
 * Set primary location
 */
export function useSetPrimaryLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => WeatherRepository.setPrimaryLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather', 'locations'] });
      toast.success('Primary location updated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to set primary location');
    },
  });
}

/**
 * Delete user location
 */
export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => WeatherRepository.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather', 'locations'] });
      toast.success('Location removed!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove location');
    },
  });
}

/**
 * Fetch weather for coordinates
 */
export function useWeather(latitude: number | null, longitude: number | null) {
  return useQuery({
    queryKey: ['weather', 'data', latitude, longitude],
    queryFn: () => latitude && longitude ? WeatherRepository.getWeather(latitude, longitude) : null,
    enabled: !!latitude && !!longitude,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Get current browser geolocation
 */
export function useCurrentPosition() {
  return useQuery({
    queryKey: ['weather', 'current-position'],
    queryFn: () => WeatherRepository.getCurrentPosition(),
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry geolocation if user denies permission
    enabled: false, // Only fetch when explicitly requested
  });
}

/**
 * Reverse geocode coordinates
 */
export function useReverseGeocode(latitude: number | null, longitude: number | null) {
  return useQuery({
    queryKey: ['weather', 'geocode', latitude, longitude],
    queryFn: () => latitude && longitude ? WeatherRepository.reverseGeocode(latitude, longitude) : null,
    enabled: !!latitude && !!longitude,
    staleTime: 60 * 60 * 1000, // 1 hour (locations don't change)
  });
}
