import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { offlineStorage } from "@/lib/offline-storage";

interface OfflineLocation {
  deviceId: number;
  latitude: string;
  longitude: string;
  accuracy: number;
  isOfflineRecord: boolean;
  timestamp?: string;
}

export function useOfflineStorage() {
  const [offlineCount, setOfflineCount] = useState(0);
  const [storageSize, setStorageSize] = useState(0);
  const queryClient = useQueryClient();

  // Sync offline data mutation
  const syncMutation = useMutation({
    mutationFn: async (locations: OfflineLocation[]) => {
      return await apiRequest("POST", "/api/locations/sync", locations);
    },
    onSuccess: (response) => {
      console.log(`Synced ${response.synced} offline locations`);
      // Clear synced data from offline storage
      offlineStorage.clearLocations();
      updateStorageStats();
    },
    onError: (error) => {
      console.error("Failed to sync offline data:", error);
    },
  });

  const updateStorageStats = useCallback(async () => {
    try {
      const locations = await offlineStorage.getLocations();
      setOfflineCount(locations.length);
      
      // Estimate storage size
      const dataSize = JSON.stringify(locations).length;
      setStorageSize(dataSize);
    } catch (error) {
      console.error("Failed to update storage stats:", error);
    }
  }, []);

  const addOfflineLocation = useCallback(async (location: OfflineLocation) => {
    try {
      await offlineStorage.addLocation({
        ...location,
        timestamp: location.timestamp || new Date().toISOString(),
      });
      updateStorageStats();
    } catch (error) {
      console.error("Failed to store offline location:", error);
    }
  }, [updateStorageStats]);

  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine) {
      console.log("Cannot sync: offline");
      return;
    }

    try {
      const locations = await offlineStorage.getLocations();
      if (locations.length === 0) {
        console.log("No offline data to sync");
        return;
      }

      console.log(`Syncing ${locations.length} offline locations`);
      syncMutation.mutate(locations);
    } catch (error) {
      console.error("Failed to sync offline data:", error);
    }
  }, [syncMutation]);

  const clearOfflineData = useCallback(async () => {
    try {
      await offlineStorage.clearLocations();
      updateStorageStats();
    } catch (error) {
      console.error("Failed to clear offline data:", error);
    }
  }, [updateStorageStats]);

  const getOfflineLocations = useCallback(async () => {
    try {
      return await offlineStorage.getLocations();
    } catch (error) {
      console.error("Failed to get offline locations:", error);
      return [];
    }
  }, []);

  // Initialize storage stats
  useEffect(() => {
    updateStorageStats();
  }, [updateStorageStats]);

  // Auto-sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      console.log("Device came online, attempting to sync offline data");
      syncOfflineData();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncOfflineData]);

  // Periodic sync attempt (every 5 minutes when online)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (navigator.onLine && offlineCount > 0) {
        syncOfflineData();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(syncInterval);
  }, [syncOfflineData, offlineCount]);

  // Clean up old offline data (older than 7 days)
  useEffect(() => {
    const cleanupOldData = async () => {
      try {
        const locations = await offlineStorage.getLocations();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentLocations = locations.filter(location => {
          const locationDate = new Date(location.timestamp || 0);
          return locationDate > sevenDaysAgo;
        });

        if (recentLocations.length !== locations.length) {
          await offlineStorage.clearLocations();
          for (const location of recentLocations) {
            await offlineStorage.addLocation(location);
          }
          updateStorageStats();
          console.log(`Cleaned up ${locations.length - recentLocations.length} old offline records`);
        }
      } catch (error) {
        console.error("Failed to cleanup old data:", error);
      }
    };

    // Run cleanup daily
    const cleanupInterval = setInterval(cleanupOldData, 24 * 60 * 60 * 1000);
    
    // Run initial cleanup
    cleanupOldData();

    return () => clearInterval(cleanupInterval);
  }, [updateStorageStats]);

  return {
    offlineCount,
    storageSize,
    issyncing: syncMutation.isPending,
    addOfflineLocation,
    syncOfflineData,
    clearOfflineData,
    getOfflineLocations,
    updateStorageStats,
  };
}
