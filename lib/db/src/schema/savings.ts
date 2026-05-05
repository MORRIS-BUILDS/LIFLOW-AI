import { pgTable, serial, text, real, timestamp, date } from "drizzle-orm/pg-core";

export const savingsTable = pgTable("savings", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  amount: real("amount").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Saving = typeof savingsTable.$inferSelect;
