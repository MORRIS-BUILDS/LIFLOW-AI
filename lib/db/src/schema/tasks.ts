import { pgTable, serial, text, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category", { enum: ["Study", "Gym", "Personal"] }).notNull().default("Personal"),
  priority: text("priority", { enum: ["High", "Medium", "Low"] }).notNull().default("Medium"),
  completed: boolean("completed").notNull().default(false),
  deadline: timestamp("deadline"),
  date: date("date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
