import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("user"), // admin, manager, user
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  deviceId: text("device_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  batteryLevel: integer("battery_level"),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const geofences = pgTable("geofences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // transmission_line, substation, construction_zone, restricted_area
  description: text("description"),
  coordinates: jsonb("coordinates").notNull(), // GeoJSON coordinates
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: integer("accuracy"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  isOfflineRecord: boolean("is_offline_record").notNull().default(false),
  syncedAt: timestamp("synced_at"),
});

export const geofenceEvents = pgTable("geofence_events", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  geofenceId: integer("geofence_id").notNull(),
  eventType: text("event_type").notNull(), // entry, exit
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  duration: integer("duration"), // in minutes, for exit events
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  devices: many(devices),
  geofences: many(geofences),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, {
    fields: [devices.userId],
    references: [users.id],
  }),
  locations: many(locations),
  geofenceEvents: many(geofenceEvents),
}));

export const geofencesRelations = relations(geofences, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [geofences.createdBy],
    references: [users.id],
  }),
  events: many(geofenceEvents),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  device: one(devices, {
    fields: [locations.deviceId],
    references: [devices.id],
  }),
}));

export const geofenceEventsRelations = relations(geofenceEvents, ({ one }) => ({
  device: one(devices, {
    fields: [geofenceEvents.deviceId],
    references: [devices.id],
  }),
  geofence: one(geofences, {
    fields: [geofenceEvents.geofenceId],
    references: [geofences.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
});

export const insertGeofenceSchema = createInsertSchema(geofences).omit({
  id: true,
  createdAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  timestamp: true,
  syncedAt: true,
});

export const insertGeofenceEventSchema = createInsertSchema(geofenceEvents).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type Geofence = typeof geofences.$inferSelect;
export type InsertGeofence = z.infer<typeof insertGeofenceSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type GeofenceEvent = typeof geofenceEvents.$inferSelect;
export type InsertGeofenceEvent = z.infer<typeof insertGeofenceEventSchema>;
