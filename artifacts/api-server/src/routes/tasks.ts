import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  CreateTaskBody,
  UpdateTaskBody,
  ListTasksQueryParams,
  GetTaskParams,
  UpdateTaskParams,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/tasks", async (req, res) => {
  try {
    const query = ListTasksQueryParams.parse(req.query);
    const conditions = [];
    if (query.category) conditions.push(eq(tasksTable.category, query.category));
    if (query.priority) conditions.push(eq(tasksTable.priority, query.priority));
    if (query.completed !== undefined) conditions.push(eq(tasksTable.completed, query.completed));
    if (query.date) conditions.push(eq(tasksTable.date, query.date));

    const tasks = await db
      .select()
      .from(tasksTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tasksTable.createdAt));

    res.json(tasks.map(formatTask));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const body = CreateTaskBody.parse(req.body);
    const [task] = await db.insert(tasksTable).values({
      title: body.title,
      description: body.description ?? null,
      category: body.category,
      priority: body.priority,
      deadline: body.deadline ? new Date(body.deadline) : null,
      date: body.date ?? null,
    }).returning();
    res.status(201).json(formatTask(task));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.get("/tasks/:id", async (req, res) => {
  try {
    const { id } = GetTaskParams.parse({ id: Number(req.params.id) });
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(formatTask(task));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get task" });
  }
});

router.patch("/tasks/:id", async (req, res) => {
  try {
    const { id } = UpdateTaskParams.parse({ id: Number(req.params.id) });
    const body = UpdateTaskBody.parse(req.body);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.category !== undefined) updates.category = body.category;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.completed !== undefined) updates.completed = body.completed;
    if (body.deadline !== undefined) updates.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.date !== undefined) updates.date = body.date;

    const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(formatTask(task));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = DeleteTaskParams.parse({ id: Number(req.params.id) });
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

function formatTask(task: typeof tasksTable.$inferSelect) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    category: task.category,
    priority: task.priority,
    completed: task.completed,
    deadline: task.deadline?.toISOString() ?? null,
    date: task.date ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export default router;
