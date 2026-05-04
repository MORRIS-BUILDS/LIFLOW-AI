import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, studySessionsTable, gymSessionsTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";

const router = Router();

const MOTIVATIONAL_QUOTES = [
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { quote: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { quote: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { quote: "Great things never come from comfort zones.", author: "Unknown" },
  { quote: "Dream it. Wish it. Do it.", author: "Unknown" },
  { quote: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { quote: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
  { quote: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { quote: "It's going to be hard, but hard is not impossible.", author: "Unknown" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "Your only limit is your mind.", author: "Unknown" },
  { quote: "Act as if what you do makes a difference. It does.", author: "William James" },
];

router.get("/dashboard/motivational-quote", (_req, res) => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const quote = MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
  res.json(quote);
});

router.get("/dashboard/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Today's tasks
    const todayTasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.date, today))
      .orderBy(desc(tasksTable.createdAt));

    const tasksTotal = todayTasks.length;
    const tasksCompleted = todayTasks.filter(t => t.completed).length;

    // Study hours today
    const studySessions = await db.select().from(studySessionsTable).where(eq(studySessionsTable.date, today));
    const studyHoursToday = studySessions.reduce((sum, s) => sum + s.hours, 0);

    // All study sessions for streak
    const allStudySessions = await db.select().from(studySessionsTable).orderBy(desc(studySessionsTable.date));
    const studyDateSet = new Set(allStudySessions.map(s => s.date));
    let studyStreak = 0;
    const studyCheck = new Date();
    if (!studyDateSet.has(today)) studyCheck.setDate(studyCheck.getDate() - 1);
    while (studyDateSet.has(studyCheck.toISOString().split("T")[0])) {
      studyStreak++;
      studyCheck.setDate(studyCheck.getDate() - 1);
    }

    // Gym today
    const gymSessions = await db.select().from(gymSessionsTable).orderBy(desc(gymSessionsTable.date));
    const didGymToday = gymSessions.some(s => s.date === today);
    const gymDateSet = new Set(gymSessions.map(s => s.date));
    let gymStreak = 0;
    const gymCheck = new Date();
    if (!gymDateSet.has(today)) gymCheck.setDate(gymCheck.getDate() - 1);
    while (gymDateSet.has(gymCheck.toISOString().split("T")[0])) {
      gymStreak++;
      gymCheck.setDate(gymCheck.getDate() - 1);
    }

    // Upcoming tasks (next 7 days, not completed)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const upcomingRaw = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.completed, false), gte(tasksTable.date, today)))
      .orderBy(tasksTable.date)
      .limit(5);

    const upcomingTasks = upcomingRaw.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description ?? null,
      category: t.category,
      priority: t.priority,
      completed: t.completed,
      deadline: t.deadline?.toISOString() ?? null,
      date: t.date ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    res.json({
      date: today,
      tasksTotal,
      tasksCompleted,
      studyHoursToday,
      studyGoalHours: 6,
      didGymToday,
      gymStreak,
      studyStreak,
      upcomingTasks,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});

export default router;
