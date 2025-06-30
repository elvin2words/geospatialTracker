import { 
  users, 
  devices, 
  geofences, 
  locations, 
  geofenceEvents,
  type User, 
  type InsertUser,
  type Device,
  type InsertDevice,
  type Geofence,
  type InsertGeofence,
  type Location,
  type InsertLocation,
  type GeofenceEvent,
  type InsertGeofenceEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<void>;
  
  // Devices
  getDevice(id: number): Promise<Device | undefined>;
  getDeviceByDeviceId(deviceId: string): Promise<Device | undefined>;
  getDevicesByUserId(userId: number): Promise<Device[]>;
  getAllDevices(): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDeviceBattery(id: number, batteryLevel: number): Promise<void>;
  updateDeviceLastSeen(id: number): Promise<void>;
  
  // Geofences
  getGeofence(id: number): Promise<Geofence | undefined>;
  getAllGeofences(): Promise<Geofence[]>;
  getActiveGeofences(): Promise<Geofence[]>;
  createGeofence(geofence: InsertGeofence): Promise<Geofence>;
  updateGeofence(id: number, updates: Partial<InsertGeofence>): Promise<Geofence | undefined>;
  deleteGeofence(id: number): Promise<boolean>;
  
  // Locations
  createLocation(location: InsertLocation): Promise<Location>;
  getLocationsByDevice(deviceId: number, limit?: number): Promise<Location[]>;
  getLatestLocationByDevice(deviceId: number): Promise<Location | undefined>;
  syncOfflineLocations(locations: InsertLocation[]): Promise<Location[]>;
  
  // Geofence Events
  createGeofenceEvent(event: InsertGeofenceEvent): Promise<GeofenceEvent>;
  getGeofenceEventsByDevice(deviceId: number, limit?: number): Promise<GeofenceEvent[]>;
  getGeofenceEventsByDateRange(startDate: Date, endDate: Date): Promise<GeofenceEvent[]>;
  getRecentGeofenceEvents(limit?: number): Promise<(GeofenceEvent & { device: Device, geofence: Geofence })[]>;
  
  // Analytics
  getDeviceStats(): Promise<{
    activeDevices: number;
    totalEvents: number;
    avgDuration: number;
    mostActiveZone: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device || undefined;
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.deviceId, deviceId));
    return device || undefined;
  }

  async getDevicesByUserId(userId: number): Promise<Device[]> {
    return await db.select().from(devices).where(eq(devices.userId, userId));
  }

  async getAllDevices(): Promise<Device[]> {
    return await db.select().from(devices);
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const [device] = await db.insert(devices).values(insertDevice).returning();
    return device;
  }

  async updateDeviceBattery(id: number, batteryLevel: number): Promise<void> {
    await db.update(devices)
      .set({ batteryLevel, lastSeen: new Date() })
      .where(eq(devices.id, id));
  }

  async updateDeviceLastSeen(id: number): Promise<void> {
    await db.update(devices)
      .set({ lastSeen: new Date() })
      .where(eq(devices.id, id));
  }

  async getGeofence(id: number): Promise<Geofence | undefined> {
    const [geofence] = await db.select().from(geofences).where(eq(geofences.id, id));
    return geofence || undefined;
  }

  async getAllGeofences(): Promise<Geofence[]> {
    return await db.select().from(geofences).orderBy(desc(geofences.createdAt));
  }

  async getActiveGeofences(): Promise<Geofence[]> {
    return await db.select().from(geofences)
      .where(and(
        eq(geofences.isActive, true),
        sql`(expires_at IS NULL OR expires_at > NOW())`
      ));
  }

  async createGeofence(insertGeofence: InsertGeofence): Promise<Geofence> {
    const [geofence] = await db.insert(geofences).values(insertGeofence).returning();
    return geofence;
  }

  async updateGeofence(id: number, updates: Partial<InsertGeofence>): Promise<Geofence | undefined> {
    const [geofence] = await db.update(geofences)
      .set(updates)
      .where(eq(geofences.id, id))
      .returning();
    return geofence || undefined;
  }

  async deleteGeofence(id: number): Promise<boolean> {
    const result = await db.delete(geofences).where(eq(geofences.id, id));
    return result.rowCount > 0;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const [location] = await db.insert(locations).values(insertLocation).returning();
    return location;
  }

  async getLocationsByDevice(deviceId: number, limit = 100): Promise<Location[]> {
    return await db.select().from(locations)
      .where(eq(locations.deviceId, deviceId))
      .orderBy(desc(locations.timestamp))
      .limit(limit);
  }

  async getLatestLocationByDevice(deviceId: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations)
      .where(eq(locations.deviceId, deviceId))
      .orderBy(desc(locations.timestamp))
      .limit(1);
    return location || undefined;
  }

  async syncOfflineLocations(insertLocations: InsertLocation[]): Promise<Location[]> {
    if (insertLocations.length === 0) return [];
    
    const syncedLocations = await db.insert(locations)
      .values(insertLocations.map(loc => ({ ...loc, syncedAt: new Date() })))
      .returning();
    
    return syncedLocations;
  }

  async createGeofenceEvent(insertEvent: InsertGeofenceEvent): Promise<GeofenceEvent> {
    const [event] = await db.insert(geofenceEvents).values(insertEvent).returning();
    return event;
  }

  async getGeofenceEventsByDevice(deviceId: number, limit = 100): Promise<GeofenceEvent[]> {
    return await db.select().from(geofenceEvents)
      .where(eq(geofenceEvents.deviceId, deviceId))
      .orderBy(desc(geofenceEvents.timestamp))
      .limit(limit);
  }

  async getGeofenceEventsByDateRange(startDate: Date, endDate: Date): Promise<GeofenceEvent[]> {
    return await db.select().from(geofenceEvents)
      .where(and(
        gte(geofenceEvents.timestamp, startDate),
        lte(geofenceEvents.timestamp, endDate)
      ))
      .orderBy(desc(geofenceEvents.timestamp));
  }

  async getRecentGeofenceEvents(limit = 50): Promise<(GeofenceEvent & { device: Device, geofence: Geofence })[]> {
    const result = await db.select({
      id: geofenceEvents.id,
      deviceId: geofenceEvents.deviceId,
      geofenceId: geofenceEvents.geofenceId,
      eventType: geofenceEvents.eventType,
      latitude: geofenceEvents.latitude,
      longitude: geofenceEvents.longitude,
      timestamp: geofenceEvents.timestamp,
      duration: geofenceEvents.duration,
      device: devices,
      geofence: geofences,
    })
    .from(geofenceEvents)
    .innerJoin(devices, eq(geofenceEvents.deviceId, devices.id))
    .innerJoin(geofences, eq(geofenceEvents.geofenceId, geofences.id))
    .orderBy(desc(geofenceEvents.timestamp))
    .limit(limit);

    return result.map(row => ({
      id: row.id,
      deviceId: row.deviceId,
      geofenceId: row.geofenceId,
      eventType: row.eventType,
      latitude: row.latitude,
      longitude: row.longitude,
      timestamp: row.timestamp,
      duration: row.duration,
      device: row.device,
      geofence: row.geofence,
    }));
  }

  async getDeviceStats(): Promise<{
    activeDevices: number;
    totalEvents: number;
    avgDuration: number;
    mostActiveZone: string;
  }> {
    // Active devices (seen in last 24 hours)
    const [activeDevicesResult] = await db.select({
      count: sql<number>`count(*)`
    }).from(devices)
    .where(and(
      eq(devices.isActive, true),
      sql`last_seen > NOW() - INTERVAL '24 hours'`
    ));

    // Total events in last 7 days
    const [totalEventsResult] = await db.select({
      count: sql<number>`count(*)`
    }).from(geofenceEvents)
    .where(sql`timestamp > NOW() - INTERVAL '7 days'`);

    // Average duration of events
    const [avgDurationResult] = await db.select({
      avg: sql<number>`COALESCE(AVG(duration), 0)`
    }).from(geofenceEvents)
    .where(and(
      eq(geofenceEvents.eventType, "exit"),
      sql`timestamp > NOW() - INTERVAL '7 days'`
    ));

    // Most active zone
    const mostActiveZoneResult = await db.select({
      name: geofences.name,
      count: sql<number>`count(*)`
    })
    .from(geofenceEvents)
    .innerJoin(geofences, eq(geofenceEvents.geofenceId, geofences.id))
    .where(sql`geofence_events.timestamp > NOW() - INTERVAL '7 days'`)
    .groupBy(geofences.name)
    .orderBy(sql`count(*) DESC`)
    .limit(1);

    return {
      activeDevices: activeDevicesResult?.count || 0,
      totalEvents: totalEventsResult?.count || 0,
      avgDuration: avgDurationResult?.avg || 0,
      mostActiveZone: mostActiveZoneResult[0]?.name || "No data",
    };
  }
}

export const storage = new DatabaseStorage();
