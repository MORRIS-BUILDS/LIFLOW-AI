import { Router } from "express";
import { db } from "@workspace/db";
import { journalEntriesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateJournalEntryBody,
  UpdateJournalEntryBody,
  DeleteJournalEntryParams,
  UpdateJournalEntryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/journal/entries", async (req, res) => {
  try {
    const entries = await db.select().from(journalEntriesTable).orderBy(desc(journalEntriesTable.date));
    res.json(entries.map(formatEntry));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list journal entries" });
  }
});

router.post("/journal/entries", async (req, res) => {
  try {
    const body = CreateJournalEntryBody.parse(req.body);
    const [entry] = await db.insert(journalEntriesTable).values({
      date: body.date instanceof Date ? body.date.toISOString().split("T")[0] : body.date,
      title: body.title,
      content: body.content,
      mood: body.mood ?? null,
    }).returning();
    res.status(201).json(formatEntry(entry));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create journal entry" });
  }
});

router.patch("/journal/entries/:id", async (req, res) => {
  try {
    const { id } = UpdateJournalEntryParams.parse({ id: Number(req.params.id) });
    const body = UpdateJournalEntryBody.parse(req.body);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.date !== undefined) {
      updates.date = body.date instanceof Date ? body.date.toISOString().split("T")[0] : body.date;
    }
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.mood !== undefined) updates.mood = body.mood;

    const [entry] = await db.update(journalEntriesTable).set(updates).where(eq(journalEntriesTable.id, id)).returning();
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(formatEntry(entry));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update journal entry" });
  }
});

router.delete("/journal/entries/:id", async (req, res) => {
  try {
    const { id } = DeleteJournalEntryParams.parse({ id: Number(req.params.id) });
    await db.delete(journalEntriesTable).where(eq(journalEntriesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete journal entry" });
  }
});

function formatEntry(e: typeof journalEntriesTable.$inferSelect) {
  return {
    id: e.id,
    date: e.date,
    title: e.title,
    content: e.content,
    mood: e.mood ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export default router;
