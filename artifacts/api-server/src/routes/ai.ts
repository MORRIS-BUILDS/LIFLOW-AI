import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { studySessionsTable, gymSessionsTable, tasksTable } from "@workspace/db";
import { SendAiMessageBody, CreateConversationBody, GetConversationParams, DeleteConversationParams } from "@workspace/api-zod";

const router = Router();

// List conversations
router.get("/ai/conversations", async (req, res) => {
  try {
    const convs = await db.select().from(conversations).orderBy(desc(conversations.updatedAt));
    res.json(convs.map(formatConversation));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

// Create conversation
router.post("/ai/conversations", async (req, res) => {
  try {
    const body = CreateConversationBody.parse(req.body);
    const [conv] = await db.insert(conversations).values({ title: body.title }).returning();
    res.status(201).json(formatConversation(conv));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Get conversation with messages
router.get("/ai/conversations/:id", async (req, res) => {
  try {
    const { id } = GetConversationParams.parse({ id: req.params.id });
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
    res.json({
      id: conv.id,
      title: conv.title,
      messages: msgs.map(formatMessage),
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

// Delete conversation
router.delete("/ai/conversations/:id", async (req, res) => {
  try {
    const { id } = DeleteConversationParams.parse({ id: req.params.id });
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// Send message (streaming SSE)
router.post("/ai/conversations/:id/messages", async (req, res) => {
  try {
    const conversationId = req.params.id;
    const body = SendAiMessageBody.parse(req.body);

    const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    // Save user message
    await db.insert(messages).values({ conversationId, role: "user", content: body.content });

    // Get history
    const history = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt));

    const chatMessages = history.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Build system prompt with user context
    const [studySessions, gymSessions, tasks] = await Promise.all([
      db.select().from(studySessionsTable).orderBy(desc(studySessionsTable.date)).limit(10),
      db.select().from(gymSessionsTable).orderBy(desc(gymSessionsTable.date)).limit(10),
      db.select().from(tasksTable).where(eq(tasksTable.completed, false)).limit(10),
    ]);

    const systemPrompt = `You are a personal productivity AI assistant for Hemansh Manager. You help students and self-improvement focused individuals optimize their study habits, gym consistency, and task management.

Current context about the user:
- Pending tasks: ${tasks.length} tasks (${tasks.filter(t => t.priority === "High").length} high priority)
- Recent study subjects: ${[...new Set(studySessions.map(s => s.subject))].join(", ") || "None logged yet"}
- Study sessions this week: ${studySessions.filter(s => s.date >= new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]).length}
- Gym sessions this week: ${gymSessions.filter(s => s.date >= new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]).length}

Be concise, motivating, and specific. Give actionable advice. Analyze patterns and suggest improvements. Help with scheduling and productivity optimization.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Save assistant response
    await db.insert(messages).values({ conversationId, role: "assistant", content: fullResponse });
    // Update conversation updatedAt
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err);
    res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
    res.end();
  }
});

// AI Suggestions
router.get("/ai/suggestions", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    const [pendingTasks, studySessions, gymSessions] = await Promise.all([
      db.select().from(tasksTable).where(eq(tasksTable.completed, false)).limit(20),
      db.select().from(studySessionsTable).where(eq(studySessionsTable.date, today)),
      db.select().from(gymSessionsTable).where(eq(gymSessionsTable.date, weekAgo)),
    ]);

    const prompt = `Based on this user's data, give 4 concise, actionable productivity suggestions (one sentence each). Return as JSON array of strings.

Data:
- Pending tasks: ${pendingTasks.length} (${pendingTasks.filter(t => t.priority === "High").length} high priority)
- Study hours today: ${studySessions.reduce((sum, s) => sum + s.hours, 0)}h
- Gym sessions this week: ${gymSessions.length}
- Task categories: ${[...new Set(pendingTasks.map(t => t.category))].join(", ")}

Return format: ["suggestion1", "suggestion2", "suggestion3", "suggestion4"]`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    let suggestions: string[] = [];
    try {
      const content = response.choices[0]?.message?.content ?? "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      suggestions = ["Focus on your high priority tasks first.", "Aim for at least 2 hours of deep study today.", "Remember to take breaks every 45 minutes.", "Log your gym session to maintain your streak."];
    }

    res.json({ suggestions, generatedAt: new Date().toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get AI suggestions" });
  }
});

function formatConversation(c: typeof conversations.$inferSelect) {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function formatMessage(m: typeof messages.$inferSelect) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}

export default router;
