import React, { useState } from "react";
import {
  useListStudySessions,
  useCreateStudySession,
  useGetStudyAnalytics,
  useDeleteStudySession,
  useListTasks,
  useCreateTask,
  useUpdateTask,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Flame, Plus, Trash2, TrendingUp, Clock, CheckSquare, CornerDownLeft } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListStudySessionsQueryKey,
  getGetStudyAnalyticsQueryKey,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const studySessionSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  hours: z.coerce.number().min(0.1, "Must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type StudySessionFormValues = z.infer<typeof studySessionSchema>;

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function StudyChecklist() {
  const [newItem, setNewItem] = useState("");
  const queryClient = useQueryClient();

  const { data: tasks } = useListTasks(
    { category: "Study" as any },
    { query: { queryKey: getListTasksQueryKey({ category: "Study" as any }) } }
  );

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setNewItem("");
      }
    }
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    }
  });

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    createTask.mutate({
      data: {
        title: trimmed,
        category: "Study",
        priority: "Medium",
        date: format(new Date(), "yyyy-MM-dd"),
      }
    });
  };

  const pending = tasks?.filter(t => !t.completed) ?? [];
  const done = tasks?.filter(t => t.completed) ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-blue-400" />
          <CardTitle>Study Checklist</CardTitle>
        </div>
        <CardDescription>Tasks and goals to work through</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Add a study task..."
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button size="icon" onClick={handleAdd} disabled={!newItem.trim() || createTask.isPending}>
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </div>

        <AnimatePresence>
          {pending.map(task => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={false}
                onCheckedChange={() => updateTask.mutate({ id: task.id, data: { completed: true } })}
              />
              <span className="text-sm flex-1">{task.title}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {done.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Completed ({done.length})</p>
            {done.slice(0, 3).map(task => (
              <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg opacity-50">
                <Checkbox
                  checked
                  onCheckedChange={() => updateTask.mutate({ id: task.id, data: { completed: false } })}
                />
                <span className="text-sm flex-1 line-through">{task.title}</span>
              </div>
            ))}
          </div>
        )}

        {pending.length === 0 && done.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No study tasks yet. Add one above!</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Study() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: sessions, isLoading: loadingSessions } = useListStudySessions();
  const { data: analytics, isLoading: loadingAnalytics } = useGetStudyAnalytics();

  const createSession = useCreateStudySession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudySessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStudyAnalyticsQueryKey() });
        setIsCreateOpen(false);
        toast.success("Study session logged!");
        form.reset();
      }
    }
  });

  const deleteSession = useDeleteStudySession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudySessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStudyAnalyticsQueryKey() });
        toast.success("Session deleted");
      }
    }
  });

  const form = useForm<StudySessionFormValues>({
    resolver: zodResolver(studySessionSchema),
    defaultValues: {
      subject: "",
      hours: 1,
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: "",
    },
  });

  const onSubmit = (data: StudySessionFormValues) => {
    createSession.mutate({ data });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Tracker</h1>
          <p className="text-muted-foreground mt-1">Log hours and track your intellectual growth.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-log-study">
              <Plus className="mr-2 h-4 w-4" /> Log Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Study Session</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject / Topic</FormLabel>
                    <FormControl><Input placeholder="E.g., Quantum Physics" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="hours" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="What did you cover?" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createSession.isPending} data-testid="btn-submit-study">
                    {createSession.isPending ? "Logging..." : "Log Session"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {loadingAnalytics ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : analytics && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Daily Hours</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalHoursToday.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground mt-1">Logged today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Weekly Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalHoursThisWeek.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground mt-1">This week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.currentStreak} Days</div>
              <p className="text-xs text-muted-foreground mt-1">Keep it up!</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <StudyChecklist />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Hours</CardTitle>
              <CardDescription>Your study time over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent className="h-[240px]">
              {loadingAnalytics ? (
                <Skeleton className="h-full w-full" />
              ) : analytics?.dailyHours && analytics.dailyHours.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.dailyHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => format(new Date(val), 'MMM d')}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      labelFormatter={(val) => format(new Date(val), 'MMM d, yyyy')}
                    />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground border border-dashed rounded-lg text-sm">
                  No data for this week
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              <AnimatePresence>
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        {session.subject}
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{session.hours}h</span>
                      </div>
                      <div className="text-sm text-muted-foreground flex gap-3">
                        <span>{format(new Date(session.date), 'MMM d, yyyy')}</span>
                        {session.notes && <span className="line-clamp-1 max-w-xs">{session.notes}</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteSession.mutate({ id: session.id })}
                      data-testid={`btn-delete-study-${session.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="mx-auto h-8 w-8 opacity-20 mb-2" />
              <p>No study sessions logged yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
