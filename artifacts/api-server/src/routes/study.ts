import { Router } from "express";
import { db } from "@workspace/db";
import { studySessionsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import {
  CreateStudySessionBody,
  UpdateStudySessionBody,
  UpdateStudySessionParams,
  DeleteStudySessionParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/study/sessions", async (req, res) => {
  try {
    const { date, week } = req.query as { date?: string; week?: string };
    const conditions = [];

    if (date) {
      conditions.push(eq(studySessionsTable.date, date));
    } else if (week) {
      const weekDate = new Date(week);
      const start = new Date(weekDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const fmt = (d: Date) => d.toISOString().split("T")[0];
      conditions.push(gte(studySessionsTable.date, fmt(start)));
      conditions.push(lte(studySessionsTable.date, fmt(end)));
    }

    const sessions = await db
      .select()
      .from(studySessionsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(studySessionsTable.date));

    res.json(sessions.map(formatSession));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list study sessions" });
  }
});

router.post("/study/sessions", async (req, res) => {
  try {
    const body = CreateStudySessionBody.parse(req.body);
    const [session] = await db.insert(studySessionsTable).values({
      subject: body.subject,
      hours: body.hours,
      date: body.date,
      notes: body.notes ?? null,
    }).returning();
    res.status(201).json(formatSession(session));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create study session" });
  }
});

router.patch("/study/sessions/:id", async (req, res) => {
  try {
    const { id } = UpdateStudySessionParams.parse({ id: Number(req.params.id) });
    const body = UpdateStudySessionBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.subject !== undefined) updates.subject = body.subject;
    if (body.hours !== undefined) updates.hours = body.hours;
    if (body.date !== undefined) updates.date = body.date;
    if (body.notes !== undefined) updates.notes = body.notes;

    const [session] = await db.update(studySessionsTable).set(updates).where(eq(studySessionsTable.id, id)).returning();
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(formatSession(session));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update study session" });
  }
});

router.delete("/study/sessions/:id", async (req, res) => {
  try {
    const { id } = DeleteStudySessionParams.parse({ id: Number(req.params.id) });
    await db.delete(studySessionsTable).where(eq(studySessionsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete study session" });
  }
});

router.get("/study/analytics", async (req, res) => {
  try {
    const sessions = await db.select().from(studySessionsTable).orderBy(desc(studySessionsTable.date));

    const today = new Date().toISOString().split("T")[0];
    const todaySessions = sessions.filter(s => s.date === today);
    const totalHoursToday = todaySessions.reduce((sum, s) => sum + s.hours, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekStart = weekAgo.toISOString().split("T")[0];
    const weekSessions = sessions.filter(s => s.date >= weekStart);
    const totalHoursThisWeek = weekSessions.reduce((sum, s) => sum + s.hours, 0);

    // Subject breakdown
    const subjectMap = new Map<string, number>();
    for (const s of sessions) {
      subjectMap.set(s.subject, (subjectMap.get(s.subject) ?? 0) + s.hours);
    }
    const subjectBreakdown = Array.from(subjectMap.entries()).map(([subject, hours]) => ({ subject, hours }));

    // Daily hours for last 14 days
    const dailyMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyMap.set(d.toISOString().split("T")[0], 0);
    }
    for (const s of sessions) {
      if (dailyMap.has(s.date)) {
        dailyMap.set(s.date, (dailyMap.get(s.date) ?? 0) + s.hours);
      }
    }
    const dailyHours = Array.from(dailyMap.entries()).map(([date, hours]) => ({ date, hours }));

    // Streak
    let currentStreak = 0;
    const dateSet = new Set(sessions.map(s => s.date));
    const checkDate = new Date();
    // If no study today, start from yesterday
    if (!dateSet.has(today)) checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const d = checkDate.toISOString().split("T")[0];
      if (dateSet.has(d)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }

    res.json({ currentStreak, totalHoursThisWeek, totalHoursToday, subjectBreakdown, dailyHours });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get study analytics" });
  }
});

function formatSession(s: typeof studySessionsTable.$inferSelect) {
  return {
    id: s.id,
    subject: s.subject,
    hours: s.hours,
    date: s.date,
    notes: s.notes ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export default router;
