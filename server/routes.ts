import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertLocationSchema, insertGeofenceEventSchema, insertGeofenceSchema, insertDeviceSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections
  const connections = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    connections.add(ws);
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      connections.delete(ws);
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connections.delete(ws);
    });
  });
  
  // Broadcast to all connected clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Device management
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getAllDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.post("/api/devices", async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      
      broadcast({ type: 'device_created', data: device });
      res.json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid device data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create device" });
      }
    }
  });

  // Location tracking
  app.post("/api/locations", async (req, res) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);
      
      // Update device last seen
      await storage.updateDeviceLastSeen(locationData.deviceId);
      
      // Check for geofence violations
      const geofences = await storage.getActiveGeofences();
      for (const geofence of geofences) {
        if (isPointInGeofence(
          { lat: parseFloat(locationData.latitude), lng: parseFloat(locationData.longitude) },
          geofence.coordinates as any
        )) {
          // Create geofence entry event
          const event = await storage.createGeofenceEvent({
            deviceId: locationData.deviceId,
            geofenceId: geofence.id,
            eventType: "entry",
            latitude: locationData.latitude,
            longitude: locationData.longitude,
          });
          
          broadcast({ type: 'geofence_event', data: { ...event, geofence } });
        }
      }
      
      broadcast({ type: 'location_update', data: location });
      res.json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid location data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to record location" });
      }
    }
  });

  app.post("/api/locations/sync", async (req, res) => {
    try {
      const locationsData = z.array(insertLocationSchema).parse(req.body);
      const locations = await storage.syncOfflineLocations(locationsData);
      
      broadcast({ type: 'offline_sync', data: { count: locations.length } });
      res.json({ synced: locations.length, locations });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid locations data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to sync locations" });
      }
    }
  });

  app.get("/api/locations/device/:deviceId", async (req, res) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const locations = await storage.getLocationsByDevice(deviceId, limit);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Geofence management
  app.get("/api/geofences", async (req, res) => {
    try {
      const geofences = await storage.getAllGeofences();
      res.json(geofences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch geofences" });
    }
  });

  app.post("/api/geofences", async (req, res) => {
    try {
      const geofenceData = insertGeofenceSchema.parse(req.body);
      const geofence = await storage.createGeofence(geofenceData);
      
      broadcast({ type: 'geofence_created', data: geofence });
      res.json(geofence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid geofence data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create geofence" });
      }
    }
  });

  app.put("/api/geofences/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertGeofenceSchema.partial().parse(req.body);
      const geofence = await storage.updateGeofence(id, updates);
      
      if (!geofence) {
        return res.status(404).json({ message: "Geofence not found" });
      }
      
      broadcast({ type: 'geofence_updated', data: geofence });
      res.json(geofence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid geofence data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update geofence" });
      }
    }
  });

  app.patch("/api/geofences/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertGeofenceSchema.partial().parse(req.body);
      const geofence = await storage.updateGeofence(id, updates);
      
      if (!geofence) {
        return res.status(404).json({ message: "Geofence not found" });
      }
      
      broadcast({ type: 'geofence_updated', data: geofence });
      res.json(geofence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid geofence data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update geofence" });
      }
    }
  });

  app.delete("/api/geofences/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteGeofence(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Geofence not found" });
      }
      
      broadcast({ type: 'geofence_deleted', data: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete geofence" });
    }
  });

  // Events and analytics
  app.get("/api/events", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const events = await storage.getRecentGeofenceEvents(limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/device/:deviceId", async (req, res) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const events = await storage.getGeofenceEventsByDevice(deviceId, limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device events" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getDeviceStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Device battery updates
  app.put("/api/devices/:id/battery", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { batteryLevel } = req.body;
      
      if (typeof batteryLevel !== 'number' || batteryLevel < 0 || batteryLevel > 100) {
        return res.status(400).json({ message: "Invalid battery level" });
      }
      
      await storage.updateDeviceBattery(id, batteryLevel);
      
      broadcast({ type: 'battery_update', data: { deviceId: id, batteryLevel } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update battery" });
    }
  });

  return httpServer;
}

// Helper function to check if a point is inside a geofence
function isPointInGeofence(point: { lat: number; lng: number }, geofence: any): boolean {
  // Simple point-in-polygon check for GeoJSON polygons
  if (geofence.type === 'Polygon') {
    const coordinates = geofence.coordinates[0]; // First ring of polygon
    let inside = false;
    
    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      const xi = coordinates[i][1], yi = coordinates[i][0]; // Note: GeoJSON is [lng, lat]
      const xj = coordinates[j][1], yj = coordinates[j][0];
      
      if (((yi > point.lat) !== (yj > point.lat)) &&
          (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }
  
  // For circles (Point with radius property)
  if (geofence.type === 'Point' && geofence.radius) {
    const distance = getDistance(point, {
      lat: geofence.coordinates[1],
      lng: geofence.coordinates[0]
    });
    return distance <= geofence.radius;
  }
  
  return false;
}

// Helper function to calculate distance between two points
function getDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI/180);
}
