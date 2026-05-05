import { pgTable, serial, text, real, timestamp, date } from "drizzle-orm/pg-core";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Expense = typeof expensesTable.$inferSelect;
