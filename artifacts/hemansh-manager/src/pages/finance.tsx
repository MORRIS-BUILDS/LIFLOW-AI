import React, { useState, useEffect } from "react";
import {
  useListExpenses,
  useCreateExpense,
  useDeleteExpense,
  useListSavings,
  useCreateSaving,
  useDeleteSaving,
  useListMutualFunds,
  useCreateMutualFund,
  useDeleteMutualFund,
  useListGold,
  useCreateGold,
  useDeleteGold,
  useGetMarketData,
  getListExpensesQueryKey,
  getListSavingsQueryKey,
  getListMutualFundsQueryKey,
  getListGoldQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  DollarSign,
  PiggyBank,
  BarChart2,
  Coins,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Other",
];

const expenseSchema = z.object({
  date: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  note: z.string().optional(),
});

const savingSchema = z.object({
  date: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  label: z.string().min(1, "Label is required"),
});

const mutualFundSchema = z.object({
  date: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  fundName: z.string().min(1, "Fund name is required"),
});

const goldSchema = z.object({
  date: z.string().min(1),
  amountGrams: z.coerce.number().positive("Amount must be positive"),
  pricePerGram: z.coerce.number().positive("Price must be positive"),
});

function StockMarketSection() {
  const { data: market, isLoading, refetch, isFetching, isError } = useGetMarketData();

  useEffect(() => {
    const id = setInterval(() => { refetch(); }, 60_000);
    return () => clearInterval(id);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError && !market) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
        <p>Unable to load live market data. Check your connection and try again.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {market?.marketClosed && (
            <span className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Market Closed — Showing last known values
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {market?.lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {format(new Date(market.lastUpdated), "HH:mm:ss")}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-7 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "SENSEX", data: market?.sensex },
          { label: "NIFTY 50", data: market?.nifty },
        ].map(({ label, data }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {data ? (
                <>
                  <div className="text-3xl font-bold">{data.value.toLocaleString("en-IN")}</div>
                  <div
                    className={`flex items-center gap-1 mt-1 text-sm font-medium ${
                      data.change >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {data.change >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {data.change >= 0 ? "+" : ""}
                    {data.change.toFixed(2)} pts ({data.changePercent >= 0 ? "+" : ""}
                    {data.changePercent.toFixed(2)}%)
                  </div>
                  <div className="h-24 mt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.points} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={data.change >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"}
                          dot={false}
                          strokeWidth={2}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(v: number) => [v.toLocaleString("en-IN"), label]}
                          labelFormatter={(l) => `Time: ${l}`}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground text-sm">No data available</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DailySpendSection() {
  const queryClient = useQueryClient();
  const { data: expenses, isLoading } = useListExpenses();

  const deleteExpense = useDeleteExpense({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        toast.success("Expense deleted");
      },
    },
  });

  const createExpense = useCreateExpense({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        toast.success("Expense logged");
        form.reset({ date: format(new Date(), "yyyy-MM-dd"), category: "", note: "" });
      },
    },
  });

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), category: "", note: "" },
  });

  const categoryTotals = React.useMemo(() => {
    if (!expenses) return [];
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const total = expenses?.reduce((s, e) => s + e.amount, 0) ?? 0;

  const onSubmit = (data: z.infer<typeof expenseSchema>) => {
    createExpense.mutate({ data: { ...data, note: data.note || null } });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...field}
                        >
                          <option value="">Select category…</option>
                          {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Description…" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createExpense.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  {createExpense.isPending ? "Logging…" : "Log Expense"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
            <CardDescription>Total: ₹{total.toLocaleString("en-IN")}</CardDescription>
          </CardHeader>
          <CardContent className="h-52">
            {categoryTotals.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryTotals.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Amount"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No expenses logged yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : expenses && expenses.length > 0 ? (
            <div className="space-y-2">
              <AnimatePresence>
                {expenses.slice(0, 20).map((exp) => (
                  <motion.div
                    key={exp.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {exp.category}
                      </span>
                      <div>
                        <div className="text-sm font-medium">₹{exp.amount.toLocaleString("en-IN")}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(exp.date), "MMM d, yyyy")}
                          {exp.note ? ` · ${exp.note}` : ""}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteExpense.mutate({ id: exp.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="mx-auto h-8 w-8 opacity-20 mb-2" />
              <p>No expenses logged yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SavingsSection() {
  const queryClient = useQueryClient();
  const { data: savings, isLoading } = useListSavings();

  const createSaving = useCreateSaving({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSavingsQueryKey() });
        toast.success("Saving entry added");
        form.reset({ date: format(new Date(), "yyyy-MM-dd"), label: "" });
      },
    },
  });

  const deleteSaving = useDeleteSaving({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSavingsQueryKey() });
        toast.success("Saving entry deleted");
      },
    },
  });

  const form = useForm<z.infer<typeof savingSchema>>({
    resolver: zodResolver(savingSchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), label: "" },
  });

  const total = savings?.reduce((s, e) => s + e.amount, 0) ?? 0;

  const chartData = React.useMemo(() => {
    if (!savings) return [];
    return [...savings].reverse().map((s) => ({
      date: format(new Date(s.date), "MMM d"),
      amount: s.amount,
    }));
  }, [savings]);

  const onSubmit = (data: z.infer<typeof savingSchema>) => {
    createSaving.mutate({ data });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Saving</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Emergency Fund, FD…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createSaving.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  {createSaving.isPending ? "Adding…" : "Add Saving"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Savings</CardTitle>
            <CardDescription>₹{total.toLocaleString("en-IN")}</CardDescription>
          </CardHeader>
          <CardContent className="h-52">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Amount"]}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No savings logged yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Savings Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : savings && savings.length > 0 ? (
            <div className="space-y-2">
              {savings.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">
                      ₹{s.amount.toLocaleString("en-IN")} · {format(new Date(s.date), "MMM d, yyyy")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={() => deleteSaving.mutate({ id: s.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <PiggyBank className="mx-auto h-8 w-8 opacity-20 mb-2" />
              <p>No savings entries yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MutualFundSection() {
  const queryClient = useQueryClient();
  const { data: funds, isLoading } = useListMutualFunds();

  const createFund = useCreateMutualFund({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMutualFundsQueryKey() });
        toast.success("Mutual fund entry added");
        form.reset({ date: format(new Date(), "yyyy-MM-dd"), fundName: "" });
      },
    },
  });

  const deleteFund = useDeleteMutualFund({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMutualFundsQueryKey() });
        toast.success("Entry deleted");
      },
    },
  });

  const form = useForm<z.infer<typeof mutualFundSchema>>({
    resolver: zodResolver(mutualFundSchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), fundName: "" },
  });

  const total = funds?.reduce((s, f) => s + f.amount, 0) ?? 0;

  const fundTotals = React.useMemo(() => {
    if (!funds) return [];
    const map = new Map<string, number>();
    for (const f of funds) {
      map.set(f.fundName, (map.get(f.fundName) ?? 0) + f.amount);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [funds]);

  const onSubmit = (data: z.infer<typeof mutualFundSchema>) => {
    createFund.mutate({ data });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="fundName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fund Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. HDFC Midcap…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createFund.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  {createFund.isPending ? "Adding…" : "Add Investment"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio Overview</CardTitle>
            <CardDescription>Total: ₹{total.toLocaleString("en-IN")}</CardDescription>
          </CardHeader>
          <CardContent className="h-52">
            {fundTotals.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fundTotals}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      name.length > 10 ? `${name.slice(0, 10)}… ${(percent * 100).toFixed(0)}%` : `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {fundTotals.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Amount"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No investments logged yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investment Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : funds && funds.length > 0 ? (
            <div className="space-y-2">
              {funds.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium">{f.fundName}</div>
                    <div className="text-xs text-muted-foreground">
                      ₹{f.amount.toLocaleString("en-IN")} · {format(new Date(f.date), "MMM d, yyyy")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={() => deleteFund.mutate({ id: f.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart2 className="mx-auto h-8 w-8 opacity-20 mb-2" />
              <p>No mutual fund entries yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GoldSection() {
  const queryClient = useQueryClient();
  const { data: gold, isLoading } = useListGold();

  const createGold = useCreateGold({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoldQueryKey() });
        toast.success("Gold entry added");
        form.reset({ date: format(new Date(), "yyyy-MM-dd") });
      },
    },
  });

  const deleteGold = useDeleteGold({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoldQueryKey() });
        toast.success("Gold entry deleted");
      },
    },
  });

  const form = useForm<z.infer<typeof goldSchema>>({
    resolver: zodResolver(goldSchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd") },
  });

  const totalGrams = gold?.reduce((s, g) => s + g.amountGrams, 0) ?? 0;
  const totalValue =
    gold?.reduce((s, g) => s + g.amountGrams * g.pricePerGram, 0) ?? 0;

  const chartData = React.useMemo(() => {
    if (!gold) return [];
    return [...gold].reverse().map((g) => ({
      date: format(new Date(g.date), "MMM d"),
      value: +(g.amountGrams * g.pricePerGram).toFixed(0),
    }));
  }, [gold]);

  const onSubmit = (data: z.infer<typeof goldSchema>) => {
    createGold.mutate({ data });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGrams.toFixed(2)} g</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString("en-IN")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Price / Gram</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalGrams > 0 ? (totalValue / totalGrams).toFixed(0) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Gold Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="amountGrams"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grams</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pricePerGram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price / Gram (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createGold.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  {createGold.isPending ? "Adding…" : "Add Entry"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Value Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-52">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Value"]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No gold entries yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gold Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : gold && gold.length > 0 ? (
            <div className="space-y-2">
              {gold.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {g.amountGrams}g @ ₹{g.pricePerGram}/g
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Value: ₹{(g.amountGrams * g.pricePerGram).toLocaleString("en-IN")} ·{" "}
                      {format(new Date(g.date), "MMM d, yyyy")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={() => deleteGold.mutate({ id: g.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="mx-auto h-8 w-8 opacity-20 mb-2" />
              <p>No gold entries yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Finance() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
        <p className="text-muted-foreground mt-1">
          Track your market, spending, savings, investments, and gold.
        </p>
      </div>

      <Tabs defaultValue="stock-market">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="stock-market">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Stock Market
          </TabsTrigger>
          <TabsTrigger value="daily-spend">
            <DollarSign className="h-4 w-4 mr-1.5" />
            Daily Spend
          </TabsTrigger>
          <TabsTrigger value="savings">
            <PiggyBank className="h-4 w-4 mr-1.5" />
            Savings
          </TabsTrigger>
          <TabsTrigger value="mutual-fund">
            <BarChart2 className="h-4 w-4 mr-1.5" />
            Mutual Fund
          </TabsTrigger>
          <TabsTrigger value="gold">
            <Coins className="h-4 w-4 mr-1.5" />
            Gold
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock-market" className="mt-6">
          <StockMarketSection />
        </TabsContent>
        <TabsContent value="daily-spend" className="mt-6">
          <DailySpendSection />
        </TabsContent>
        <TabsContent value="savings" className="mt-6">
          <SavingsSection />
        </TabsContent>
        <TabsContent value="mutual-fund" className="mt-6">
          <MutualFundSection />
        </TabsContent>
        <TabsContent value="gold" className="mt-6">
          <GoldSection />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
