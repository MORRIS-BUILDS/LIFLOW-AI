import { pgTable, serial, real, timestamp, date } from "drizzle-orm/pg-core";

export const goldTable = pgTable("gold", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  amountGrams: real("amount_grams").notNull(),
  pricePerGram: real("price_per_gram").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Gold = typeof goldTable.$inferSelect;
