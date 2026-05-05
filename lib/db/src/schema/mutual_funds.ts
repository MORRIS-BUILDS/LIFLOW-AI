import { pgTable, serial, text, real, timestamp, date } from "drizzle-orm/pg-core";

export const mutualFundsTable = pgTable("mutual_funds", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  amount: real("amount").notNull(),
  fundName: text("fund_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MutualFund = typeof mutualFundsTable.$inferSelect;
