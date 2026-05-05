import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable, savingsTable, mutualFundsTable, goldTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateExpenseBody,
  UpdateExpenseBody,
  CreateSavingBody,
  UpdateSavingBody,
  CreateMutualFundBody,
  UpdateMutualFundBody,
  CreateGoldBody,
  UpdateGoldBody,
  DeleteExpenseParams,
  DeleteSavingParams,
  DeleteMutualFundParams,
  DeleteGoldParams,
  UpdateExpenseParams,
  UpdateSavingParams,
  UpdateMutualFundParams,
  UpdateGoldParams,
} from "@workspace/api-zod";

const router = Router();

// ── MARKET DATA ────────────────────────────────────────────────────────

interface YahooChartResult {
  meta: { regularMarketPrice: number; chartPreviousClose: number };
  timestamp?: number[];
  indicators?: { quote?: { close?: (number | null)[] }[] };
}

async function fetchIndex(symbol: string): Promise<{ value: number; change: number; changePercent: number; points: { time: string; value: number }[] }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`Yahoo Finance returned ${resp.status}`);
  const json = (await resp.json()) as { chart: { result?: YahooChartResult[]; error?: unknown } };
  const result = json.chart.result?.[0];
  if (!result) throw new Error("No chart data");

  const value = result.meta.regularMarketPrice;
  const prevClose = result.meta.chartPreviousClose;
  const change = parseFloat((value - prevClose).toFixed(2));
  const changePercent = parseFloat(((change / prevClose) * 100).toFixed(2));

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const points: { time: string; value: number }[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null) continue;
    const d = new Date(timestamps[i] * 1000);
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    points.push({ time, value: Math.round(close) });
  }

  return { value: Math.round(value), change, changePercent, points };
}

function isNseMarketClosed(now: Date): boolean {
  // NSE/BSE hours: Mon–Fri 09:15–15:30 IST (UTC+5:30)
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + IST_OFFSET_MS);
  const dayOfWeek = istTime.getUTCDay(); // 0=Sun, 6=Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) return true;
  const istMinutes = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
  return istMinutes < 9 * 60 + 15 || istMinutes >= 15 * 60 + 30;
}

router.get("/finance/market", async (req, res) => {
  try {
    const [sensex, nifty] = await Promise.all([
      fetchIndex("^BSESN"),
      fetchIndex("^NSEI"),
    ]);

    const now = new Date();
    res.json({
      sensex,
      nifty,
      marketClosed: isNseMarketClosed(now),
      lastUpdated: now.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(502).json({ error: "Failed to fetch market data from upstream" });
  }
});

// ── EXPENSES ──────────────────────────────────────────────────────────

router.get("/finance/expenses", async (req, res) => {
  try {
    const expenses = await db.select().from(expensesTable).orderBy(desc(expensesTable.date));
    res.json(expenses.map(formatExpense));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list expenses" });
  }
});

router.post("/finance/expenses", async (req, res) => {
  try {
    const body = CreateExpenseBody.parse(req.body);
    const [expense] = await db.insert(expensesTable).values({
      date: body.date instanceof Date ? body.date.toISOString().split("T")[0] : body.date,
      amount: body.amount,
      category: body.category,
      note: body.note ?? null,
    }).returning();
    res.status(201).json(formatExpense(expense));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

router.patch("/finance/expenses/:id", async (req, res) => {
  try {
    const { id } = UpdateExpenseParams.parse({ id: Number(req.params.id) });
    const body = UpdateExpenseBody.parse(req.body);
    const [expense] = await db.update(expensesTable).set({
      ...(body.date !== undefined && { date: body.date instanceof Date ? body.date.toISOString().split("T")[0] : body.date }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.note !== undefined && { note: body.note ?? null }),
    }).where(eq(expensesTable.id, id)).returning();
    if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
    res.json(formatExpense(expense));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

router.delete("/finance/expenses/:id", async (req, res) => {
  try {
    const { id } = DeleteExpenseParams.parse({ id: Number(req.params.id) });
    await db.delete(expensesTable).where(eq(expensesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// ── SAVINGS ───────────────────────────────────────────────────────────

router.get("/finance/savings", async (req, res) => {
  try {
    const savings = await db.select().from(savingsTable).orderBy(desc(savingsTable.date));
    res.json(savings.map(formatSaving));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list savings" });
  }
});

router.post("/finance/savings", async (req, res) => {
  try {
    const body = CreateSavingBody.parse(req.body);
    const [saving] = await db.insert(savingsTable).values({
      date: body.date instanceof Date ? body.date.toISOString().split("T")[0] : body.date,
      amount: body.amount,
      label: body.label,
    }).returning();
    res.status(201).json(formatSaving(saving));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create saving" });
  }
});

router.patch("/finance/savings/:id", async (req, res) => {
  try {
    const { id } = UpdateSavingParams.parse({ id: Number(req.params.id) });
    const body = UpdateSavingBody.parse(req.body);
    const [saving] = await db.update(savingsTable).set({
      ...(body.date !== undefined && { date: body.date instanceof Date ? body.date.toISOString().split("T")[0] : body.date }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.label !== undefined && { label: body.label }),
    }).where(eq(savingsTable.id, id)).returning();
    if (!saving) { res.status(404).json({ error: "Saving not found" }); return; }
    res.json(formatSaving(saving));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update saving" });
  }
});

router.delete("/finance/savings/:id", async (req, res) => {
  try {
    const { id } = DeleteSavingParams.parse({ id: Number(req.params.id) });
    await db.delete(savingsTable).where(eq(savingsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete saving" });
  }
});

// ── MUTUAL FUNDS ──────────────────────────────────────────────────────

router.get("/finance/mutual-funds", async (req, res) => {
  try {
    const funds = await db.select().from(mutualFundsTable).orderBy(desc(mutualFundsTable.date));
    res.json(funds.map(formatMutualFund));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list mutual funds" });
  }
});

router.post("/finance/mutual-funds", async (req, res) => {
  try {
    const body = CreateMutualFundBody.parse(req.body);
    const [fund] = await db.insert(mutualFundsTable).values({
      date: body.date instanceof Date ? body.date.toISOString().split("T")[0] : body.date,
      amount: body.amount,
      fundName: body.fundName,
    }).returning();
    res.status(201).json(formatMutualFund(fund));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create mutual fund entry" });
  }
});

router.patch("/finance/mutual-funds/:id", async (req, res) => {
  try {
    const { id } = UpdateMutualFundParams.parse({ id: Number(req.params.id) });
    const body = UpdateMutualFundBody.parse(req.body);
    const [fund] = await db.update(mutualFundsTable).set({
      ...(body.date !== undefined && { date: body.date instanceof Date ? body.date.toISOString().split("T")[0] : body.date }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.fundName !== undefined && { fundName: body.fundName }),
    }).where(eq(mutualFundsTable.id, id)).returning();
    if (!fund) { res.status(404).json({ error: "Mutual fund entry not found" }); return; }
    res.status(200).json(formatMutualFund(fund));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update mutual fund entry" });
  }
});

router.delete("/finance/mutual-funds/:id", async (req, res) => {
  try {
    const { id } = DeleteMutualFundParams.parse({ id: Number(req.params.id) });
    await db.delete(mutualFundsTable).where(eq(mutualFundsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete mutual fund entry" });
  }
});

// ── GOLD ──────────────────────────────────────────────────────────────

router.get("/finance/gold", async (req, res) => {
  try {
    const gold = await db.select().from(goldTable).orderBy(desc(goldTable.date));
    res.json(gold.map(formatGold));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list gold entries" });
  }
});

router.post("/finance/gold", async (req, res) => {
  try {
    const body = CreateGoldBody.parse(req.body);
    const [entry] = await db.insert(goldTable).values({
      date: body.date instanceof Date ? body.date.toISOString().split("T")[0] : body.date,
      amountGrams: body.amountGrams,
      pricePerGram: body.pricePerGram,
    }).returning();
    res.status(201).json(formatGold(entry));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create gold entry" });
  }
});

router.patch("/finance/gold/:id", async (req, res) => {
  try {
    const { id } = UpdateGoldParams.parse({ id: Number(req.params.id) });
    const body = UpdateGoldBody.parse(req.body);
    const [entry] = await db.update(goldTable).set({
      ...(body.date !== undefined && { date: body.date instanceof Date ? body.date.toISOString().split("T")[0] : body.date }),
      ...(body.amountGrams !== undefined && { amountGrams: body.amountGrams }),
      ...(body.pricePerGram !== undefined && { pricePerGram: body.pricePerGram }),
    }).where(eq(goldTable.id, id)).returning();
    if (!entry) { res.status(404).json({ error: "Gold entry not found" }); return; }
    res.status(200).json(formatGold(entry));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update gold entry" });
  }
});

router.delete("/finance/gold/:id", async (req, res) => {
  try {
    const { id } = DeleteGoldParams.parse({ id: Number(req.params.id) });
    await db.delete(goldTable).where(eq(goldTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete gold entry" });
  }
});

function formatExpense(e: typeof expensesTable.$inferSelect) {
  return {
    id: e.id,
    date: e.date,
    amount: e.amount,
    category: e.category,
    note: e.note ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

function formatSaving(s: typeof savingsTable.$inferSelect) {
  return {
    id: s.id,
    date: s.date,
    amount: s.amount,
    label: s.label,
    createdAt: s.createdAt.toISOString(),
  };
}

function formatMutualFund(f: typeof mutualFundsTable.$inferSelect) {
  return {
    id: f.id,
    date: f.date,
    amount: f.amount,
    fundName: f.fundName,
    createdAt: f.createdAt.toISOString(),
  };
}

function formatGold(g: typeof goldTable.$inferSelect) {
  return {
    id: g.id,
    date: g.date,
    amountGrams: g.amountGrams,
    pricePerGram: g.pricePerGram,
    createdAt: g.createdAt.toISOString(),
  };
}

export default router;
