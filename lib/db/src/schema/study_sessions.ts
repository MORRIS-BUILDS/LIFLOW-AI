import { pgTable, serial, text, real, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studySessionsTable = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  hours: real("hours").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStudySessionSchema = createInsertSchema(studySessionsTable).omit({ id: true, createdAt: true });
export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
export type StudySession = typeof studySessionsTable.$inferSelect;
