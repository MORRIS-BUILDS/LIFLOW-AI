import React, { useState } from "react";
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
import { CheckCircle2, Dumbbell, BookOpen, Target, Clock, Zap } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: quote, isLoading: loadingQuote } = useGetMotivationalQuote();
  const updateTask = useUpdateTask();

  const handleToggleTask = (id: number, completed: boolean) => {
    updateTask.mutate({ id, data: { completed } });
  };

  if (loadingSummary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Today, {format(today, 'MMM d')}</h1>
          <p className="text-muted-foreground mt-1">Focus and execute. The day is yours.</p>
        </div>
        
        {quote && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-md">
            <p className="text-sm font-medium italic">"{quote.quote}"</p>
            <p className="text-xs text-muted-foreground mt-1 text-right">— {quote.author}</p>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
            <div className="text-2xl font-bold">{summary?.studyHoursToday}h <span className="text-sm font-normal text-muted-foreground">/ {summary?.studyGoalHours}h goal</span></div>
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>Your tasks due soon</CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.upcomingTasks && summary.upcomingTasks.length > 0 ? (
              <div className="space-y-4">
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
                            {format(new Date(task.deadline), 'MMM d, h:mm a')}
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
