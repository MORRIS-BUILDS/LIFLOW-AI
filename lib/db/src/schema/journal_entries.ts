import { pgTable, serial, text, timestamp, date } from "drizzle-orm/pg-core";

export const journalEntriesTable = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  mood: text("mood"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type JournalEntry = typeof journalEntriesTable.$inferSelect;
