import { useState, useEffect, useCallback, useRef } from "react";
import { useOfflineStorage } from "./use-offline-storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

interface GeolocationState {
  location: GeolocationPosition | null;
  accuracy: number | null;
  isTracking: boolean;
  error: string | null;
  isSupported: boolean;
}

export function useGeolocation(deviceId: number = 1) {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    accuracy: null,
    isTracking: false,
    error: null,
    isSupported: "geolocation" in navigator,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);
  const { addOfflineLocation, syncOfflineData } = useOfflineStorage();
  const queryClient = useQueryClient();

  // Send location to server
  const locationMutation = useMutation({
    mutationFn: async (locationData: any) => {
      return await apiRequest("POST", "/api/locations", locationData);
    },
    onSuccess: () => {
      // Sync any offline data when online
      syncOfflineData();
    },
    onError: (error) => {
      console.error("Failed to send location:", error);
      // Store offline if API fails
      if (state.location) {
        addOfflineLocation({
          deviceId,
          latitude: state.location.latitude.toString(),
          longitude: state.location.longitude.toString(),
          accuracy: state.accuracy || 0,
          isOfflineRecord: true,
        });
      }
    },
  });

  const handleLocationSuccess = useCallback((position: GeolocationPosition) => {
    const newLocation: GeolocationPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      location: newLocation,
      accuracy: position.coords.accuracy,
      error: null,
    }));

    // Throttle API calls to every 30 seconds
    const now = Date.now();
    if (now - lastSyncRef.current > 30000) {
      lastSyncRef.current = now;

      const locationData = {
        deviceId,
        latitude: newLocation.latitude.toString(),
        longitude: newLocation.longitude.toString(),
        accuracy: Math.round(position.coords.accuracy),
        isOfflineRecord: false,
      };

      if (navigator.onLine) {
        locationMutation.mutate(locationData);
      } else {
        addOfflineLocation({
          ...locationData,
          isOfflineRecord: true,
        });
      }
    }
  }, [deviceId, locationMutation, addOfflineLocation]);

  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = "Failed to get location";
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location access denied by user";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location information unavailable";
        break;
      case error.TIMEOUT:
        errorMessage = "Location request timed out";
        break;
    }

    setState(prev => ({
      ...prev,
      error: errorMessage,
      isTracking: false,
    }));

    console.error("Geolocation error:", error);
  }, []);

  const startTracking = useCallback(() => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: "Geolocation is not supported by this browser",
      }));
      return;
    }

    if (watchIdRef.current !== null) {
      return; // Already tracking
    }

    setState(prev => ({ ...prev, isTracking: true, error: null }));

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // Cache for 1 minute
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      handleLocationError,
      options
    );

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationSuccess,
      handleLocationError,
      options
    );
  }, [state.isSupported, handleLocationSuccess, handleLocationError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setState(prev => ({ ...prev, isTracking: false }));
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!state.isSupported) {
      return Promise.reject(new Error("Geolocation not supported"));
    }

    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: GeolocationPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
          resolve(location);
        },
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, [state.isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineData();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncOfflineData]);

  return {
    ...state,
    startTracking,
    stopTracking,
    getCurrentPosition,
  };
}
