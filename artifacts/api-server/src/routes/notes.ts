import { Router } from "express";
import { db } from "@workspace/db";
import { notesTable } from "@workspace/db";
import { eq, ilike, desc } from "drizzle-orm";
import {
  CreateNoteBody,
  UpdateNoteBody,
  GetNoteParams,
  UpdateNoteParams,
  DeleteNoteParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/notes", async (req, res) => {
  try {
    const { tag, search } = req.query as { tag?: string; search?: string };
    let query = db.select().from(notesTable).orderBy(desc(notesTable.updatedAt)).$dynamic();
    if (search) {
      query = query.where(ilike(notesTable.title, `%${search}%`));
    }
    const notes = await query;
    const filtered = tag ? notes.filter(n => n.tags.includes(tag)) : notes;
    res.json(filtered.map(formatNote));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list notes" });
  }
});

router.post("/notes", async (req, res) => {
  try {
    const body = CreateNoteBody.parse(req.body);
    const [note] = await db.insert(notesTable).values({
      title: body.title,
      content: body.content,
      tags: body.tags ?? [],
      color: (body as any).color ?? null,
      font: (body as any).font ?? null,
      imageData: (body as any).imageData ?? null,
    }).returning();
    res.status(201).json(formatNote(note));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

router.get("/notes/:id", async (req, res) => {
  try {
    const { id } = GetNoteParams.parse({ id: Number(req.params.id) });
    const [note] = await db.select().from(notesTable).where(eq(notesTable.id, id));
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(formatNote(note));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get note" });
  }
});

router.patch("/notes/:id", async (req, res) => {
  try {
    const { id } = UpdateNoteParams.parse({ id: Number(req.params.id) });
    const body = UpdateNoteBody.parse(req.body);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.tags !== undefined) updates.tags = body.tags;
    if ((body as any).color !== undefined) updates.color = (body as any).color;
    if ((body as any).font !== undefined) updates.font = (body as any).font;
    if ((body as any).imageData !== undefined) updates.imageData = (body as any).imageData;

    const [note] = await db.update(notesTable).set(updates).where(eq(notesTable.id, id)).returning();
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(formatNote(note));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

router.delete("/notes/:id", async (req, res) => {
  try {
    const { id } = DeleteNoteParams.parse({ id: Number(req.params.id) });
    await db.delete(notesTable).where(eq(notesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

function formatNote(n: typeof notesTable.$inferSelect) {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    tags: n.tags,
    color: n.color ?? null,
    font: n.font ?? null,
    imageData: n.imageData ?? null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

export default router;
