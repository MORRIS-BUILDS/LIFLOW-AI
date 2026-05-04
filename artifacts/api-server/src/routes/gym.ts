import { Router } from "express";
import { db } from "@workspace/db";
import { gymSessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateGymSessionBody,
  UpdateGymSessionBody,
  UpdateGymSessionParams,
  DeleteGymSessionParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/gym/sessions", async (req, res) => {
  try {
    const { date } = req.query as { date?: string };
    const sessions = await db
      .select()
      .from(gymSessionsTable)
      .where(date ? eq(gymSessionsTable.date, date) : undefined)
      .orderBy(desc(gymSessionsTable.date));
    res.json(sessions.map(formatSession));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list gym sessions" });
  }
});

router.post("/gym/sessions", async (req, res) => {
  try {
    const body = CreateGymSessionBody.parse(req.body);
    const [session] = await db.insert(gymSessionsTable).values({
      workoutType: body.workoutType,
      exercises: body.exercises ?? [],
      date: body.date,
      durationMinutes: body.durationMinutes ?? null,
      notes: body.notes ?? null,
    }).returning();
    res.status(201).json(formatSession(session));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create gym session" });
  }
});

router.patch("/gym/sessions/:id", async (req, res) => {
  try {
    const { id } = UpdateGymSessionParams.parse({ id: Number(req.params.id) });
    const body = UpdateGymSessionBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.workoutType !== undefined) updates.workoutType = body.workoutType;
    if (body.exercises !== undefined) updates.exercises = body.exercises;
    if (body.date !== undefined) updates.date = body.date;
    if (body.durationMinutes !== undefined) updates.durationMinutes = body.durationMinutes;
    if (body.notes !== undefined) updates.notes = body.notes;

    const [session] = await db.update(gymSessionsTable).set(updates).where(eq(gymSessionsTable.id, id)).returning();
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(formatSession(session));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update gym session" });
  }
});

router.delete("/gym/sessions/:id", async (req, res) => {
  try {
    const { id } = DeleteGymSessionParams.parse({ id: Number(req.params.id) });
    await db.delete(gymSessionsTable).where(eq(gymSessionsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete gym session" });
  }
});

router.get("/gym/analytics", async (req, res) => {
  try {
    const sessions = await db.select().from(gymSessionsTable).orderBy(desc(gymSessionsTable.date));
    const today = new Date().toISOString().split("T")[0];

    const dateSet = new Set(sessions.map(s => s.date));

    // Streak calculation
    let currentStreak = 0;
    const checkDate = new Date();
    if (!dateSet.has(today)) checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const d = checkDate.toISOString().split("T")[0];
      if (dateSet.has(d)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }

    // Weekly / monthly counts
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 29);
    const weekStart = weekAgo.toISOString().split("T")[0];
    const monthStart = monthAgo.toISOString().split("T")[0];

    const sessionsThisWeek = sessions.filter(s => s.date >= weekStart).length;
    const sessionsThisMonth = sessions.filter(s => s.date >= monthStart).length;

    // Daily activity for last 30 days
    const dailyActivity = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dailyActivity.push({ date: dateStr, didWorkout: dateSet.has(dateStr) });
    }

    res.json({ currentStreak, sessionsThisWeek, sessionsThisMonth, dailyActivity });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get gym analytics" });
  }
});

type Exercise = { name: string; sets?: number | null; reps?: number | null; weight?: number | null };

function formatSession(s: typeof gymSessionsTable.$inferSelect) {
  return {
    id: s.id,
    workoutType: s.workoutType,
    exercises: (s.exercises as Exercise[]) ?? [],
    date: s.date,
    durationMinutes: s.durationMinutes ?? null,
    notes: s.notes ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export default router;
