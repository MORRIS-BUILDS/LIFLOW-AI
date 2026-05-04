import React from "react";
import {
  useGetDashboardSummary,
  useGetMotivationalQuote,
  useUpdateTask
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { CheckCircle2, Dumbbell, BookOpen, Target, Clock, Zap, Quote } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: quote, isLoading: loadingQuote } = useGetMotivationalQuote();
  const updateTask = useUpdateTask();

  const handleToggleTask = (id: number, completed: boolean) => {
    updateTask.mutate({ id, data: { completed } });
  };

  const today = new Date();
  const completionPercentage = summary?.tasksTotal
    ? Math.round((summary.tasksCompleted / summary.tasksTotal) * 100)
    : 0;
  const studyProgress = summary?.studyGoalHours
    ? Math.min(100, Math.round((summary.studyHoursToday / summary.studyGoalHours) * 100))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20 p-6 md:p-8 space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary/80">
            {format(today, "EEEE")}
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-1">
            {format(today, "MMMM d, yyyy")}
          </h1>
          <p className="text-muted-foreground mt-2 text-base">Good to see you. Let's make today count.</p>
        </div>

        {loadingQuote ? (
          <Skeleton className="h-14 w-full max-w-xl" />
        ) : quote && (
          <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-xl px-5 py-4 max-w-2xl">
            <Quote className="h-5 w-5 text-primary/60 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm md:text-base font-medium italic leading-relaxed">"{quote.quote}"</p>
              <p className="text-xs text-muted-foreground mt-1.5">— {quote.author}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Stat Cards ───────────────────────────────────────── */}
      {loadingSummary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-t-4 border-t-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.tasksCompleted} / {summary?.tasksTotal}</div>
              <Progress value={completionPercentage} className="h-2 mt-3" />
              <p className="text-xs text-muted-foreground mt-2">{completionPercentage}% completed</p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Study Hours</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.studyHoursToday}h{" "}
                <span className="text-sm font-normal text-muted-foreground">/ {summary?.studyGoalHours}h goal</span>
              </div>
              <Progress value={studyProgress} className="h-2 mt-3 [&>div]:bg-blue-500" />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-muted-foreground">{studyProgress}% of daily goal</p>
                <Badge variant="outline" className="text-xs">🔥 {summary?.studyStreak} day streak</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-orange-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gym Activity</CardTitle>
              <Dumbbell className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {summary?.didGymToday ? "Done" : "Pending"}
                {summary?.didGymToday && <Zap className="h-5 w-5 text-orange-500 fill-orange-500" />}
              </div>
              <div className="mt-3">
                <Badge variant="outline" className="text-xs">🔥 {summary?.gymStreak} day streak</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-purple-500 bg-sidebar/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full justify-start" data-testid="link-quick-task">
                <Link href="/tasks">📝 New Task</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start" data-testid="link-quick-study">
                <Link href="/study">📚 Log Study Session</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Upcoming Tasks ─────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>Your tasks due soon</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : summary?.upcomingTasks && summary.upcomingTasks.length > 0 ? (
              <div className="space-y-2">
                {summary.upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={(checked) => handleToggleTask(task.id, checked as boolean)}
                      data-testid={`checkbox-task-${task.id}`}
                    />
                    <div className="space-y-1 flex-1">
                      <label
                        htmlFor={`task-${task.id}`}
                        className={`text-sm font-medium leading-none cursor-pointer ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {task.title}
                      </label>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{task.category}</Badge>
                        {task.deadline && (
                          <span className="text-[10px] text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(new Date(task.deadline), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 opacity-20 mb-2" />
                <p>No upcoming tasks. You're all caught up!</p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-border">
              <Button asChild variant="ghost" className="w-full" data-testid="btn-view-all-tasks">
                <Link href="/tasks">View All Tasks</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
