interface OfflineLocation {
  id?: number;
  deviceId: number;
  latitude: string;
  longitude: string;
  accuracy: number;
  isOfflineRecord: boolean;
  timestamp: string;
}

interface OfflineGeofenceEvent {
  id?: number;
  deviceId: number;
  geofenceId: number;
  eventType: "entry" | "exit";
  latitude: string;
  longitude: string;
  timestamp: string;
}

class OfflineStorage {
  private dbName = "GeoTrackerOfflineDB";
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create locations store
        if (!db.objectStoreNames.contains("locations")) {
          const locationsStore = db.createObjectStore("locations", {
            keyPath: "id",
            autoIncrement: true,
          });
          locationsStore.createIndex("timestamp", "timestamp", { unique: false });
          locationsStore.createIndex("deviceId", "deviceId", { unique: false });
        }

        // Create geofence events store
        if (!db.objectStoreNames.contains("geofenceEvents")) {
          const eventsStore = db.createObjectStore("geofenceEvents", {
            keyPath: "id",
            autoIncrement: true,
          });
          eventsStore.createIndex("timestamp", "timestamp", { unique: false });
          eventsStore.createIndex("deviceId", "deviceId", { unique: false });
        }

        // Create app state store
        if (!db.objectStoreNames.contains("appState")) {
          db.createObjectStore("appState", { keyPath: "key" });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return this.db;
  }

  async addLocation(location: OfflineLocation): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["locations"], "readwrite");
      const store = transaction.objectStore("locations");
      
      const request = store.add(location);
      
      request.onerror = () => {
        reject(new Error("Failed to add location"));
      };
      
      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getLocations(): Promise<OfflineLocation[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["locations"], "readonly");
      const store = transaction.objectStore("locations");
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error("Failed to get locations"));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  async clearLocations(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["locations"], "readwrite");
      const store = transaction.objectStore("locations");
      const request = store.clear();

      request.onerror = () => {
        reject(new Error("Failed to clear locations"));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async addGeofenceEvent(event: OfflineGeofenceEvent): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["geofenceEvents"], "readwrite");
      const store = transaction.objectStore("geofenceEvents");
      
      const request = store.add(event);
      
      request.onerror = () => {
        reject(new Error("Failed to add geofence event"));
      };
      
      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getGeofenceEvents(): Promise<OfflineGeofenceEvent[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["geofenceEvents"], "readonly");
      const store = transaction.objectStore("geofenceEvents");
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error("Failed to get geofence events"));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  async clearGeofenceEvents(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["geofenceEvents"], "readwrite");
      const store = transaction.objectStore("geofenceEvents");
      const request = store.clear();

      request.onerror = () => {
        reject(new Error("Failed to clear geofence events"));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async setAppState(key: string, value: any): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["appState"], "readwrite");
      const store = transaction.objectStore("appState");
      
      const request = store.put({ key, value, timestamp: new Date().toISOString() });
      
      request.onerror = () => {
        reject(new Error("Failed to set app state"));
      };
      
      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getAppState(key: string): Promise<any> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["appState"], "readonly");
      const store = transaction.objectStore("appState");
      const request = store.get(key);

      request.onerror = () => {
        reject(new Error("Failed to get app state"));
      };

      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };
    });
  }

  // Fallback to localStorage for browsers that don't support IndexedDB
  private fallbackAddLocation(location: OfflineLocation): void {
    const locations = this.fallbackGetLocations();
    locations.push({ ...location, id: Date.now() });
    localStorage.setItem("offline_locations", JSON.stringify(locations));
  }

  private fallbackGetLocations(): OfflineLocation[] {
    const stored = localStorage.getItem("offline_locations");
    return stored ? JSON.parse(stored) : [];
  }

  private fallbackClearLocations(): void {
    localStorage.removeItem("offline_locations");
  }

  // Public methods with fallback support
  async safeAddLocation(location: OfflineLocation): Promise<void> {
    try {
      await this.addLocation(location);
    } catch (error) {
      console.warn("IndexedDB failed, falling back to localStorage:", error);
      this.fallbackAddLocation(location);
    }
  }

  async safeGetLocations(): Promise<OfflineLocation[]> {
    try {
      return await this.getLocations();
    } catch (error) {
      console.warn("IndexedDB failed, falling back to localStorage:", error);
      return this.fallbackGetLocations();
    }
  }

  async safeClearLocations(): Promise<void> {
    try {
      await this.clearLocations();
    } catch (error) {
      console.warn("IndexedDB failed, falling back to localStorage:", error);
      this.fallbackClearLocations();
    }
  }
}

// Create singleton instance
export const offlineStorage = new OfflineStorage();

// Initialize storage on module load
if (typeof window !== "undefined") {
  offlineStorage.init().catch((error) => {
    console.warn("Failed to initialize IndexedDB, using localStorage fallback:", error);
  });
}
