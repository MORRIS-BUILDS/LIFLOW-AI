import { pgTable, serial, text, integer, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gymSessionsTable = pgTable("gym_sessions", {
  id: serial("id").primaryKey(),
  workoutType: text("workout_type").notNull(),
  exercises: jsonb("exercises").notNull().default([]),
  date: date("date").notNull(),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGymSessionSchema = createInsertSchema(gymSessionsTable).omit({ id: true, createdAt: true });
export type InsertGymSession = z.infer<typeof insertGymSessionSchema>;
export type GymSession = typeof gymSessionsTable.$inferSelect;
