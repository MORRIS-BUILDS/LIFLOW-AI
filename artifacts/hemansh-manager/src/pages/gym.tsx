import React, { useState } from "react";
import {
  useListGymSessions,
  useCreateGymSession,
  useGetGymAnalytics,
  useDeleteGymSession,
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
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Plus, Trash2, Calendar as CalendarIcon, Zap, Activity, CheckSquare, CornerDownLeft } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListGymSessionsQueryKey,
  getGetGymAnalyticsQueryKey,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const exerciseSchema = z.object({
  name: z.string().min(1, "Name required"),
  sets: z.coerce.number().optional(),
  reps: z.coerce.number().optional(),
  weight: z.coerce.number().optional(),
});

const gymSessionSchema = z.object({
  workoutType: z.string().min(1, "Workout type is required"),
  date: z.string().min(1, "Date is required"),
  durationMinutes: z.coerce.number().optional(),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema),
});

type GymSessionFormValues = z.infer<typeof gymSessionSchema>;

function GymChecklist() {
  const [newItem, setNewItem] = useState("");
  const queryClient = useQueryClient();

  const { data: tasks } = useListTasks(
    { category: "Gym" as any },
    { query: { queryKey: getListTasksQueryKey({ category: "Gym" as any }) } }
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
        category: "Gym",
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
          <CheckSquare className="h-5 w-5 text-orange-400" />
          <CardTitle>Gym Checklist</CardTitle>
        </div>
        <CardDescription>Exercises and goals to hit today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Add a gym task..."
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
          <p className="text-sm text-muted-foreground text-center py-4">No gym tasks yet. Add one above!</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Gym() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: sessions, isLoading: loadingSessions } = useListGymSessions();
  const { data: analytics, isLoading: loadingAnalytics } = useGetGymAnalytics();

  const createSession = useCreateGymSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGymSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetGymAnalyticsQueryKey() });
        setIsCreateOpen(false);
        toast.success("Workout logged!");
        form.reset({
          workoutType: "",
          date: format(new Date(), 'yyyy-MM-dd'),
          durationMinutes: 60,
          notes: "",
          exercises: [{ name: "", sets: 3, reps: 10, weight: 0 }]
        });
      }
    }
  });

  const deleteSession = useDeleteGymSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGymSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetGymAnalyticsQueryKey() });
        toast.success("Workout deleted");
      }
    }
  });

  const form = useForm<GymSessionFormValues>({
    resolver: zodResolver(gymSessionSchema),
    defaultValues: {
      workoutType: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      durationMinutes: 60,
      notes: "",
      exercises: [{ name: "", sets: 3, reps: 10, weight: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ name: "exercises", control: form.control });

  const onSubmit = (data: GymSessionFormValues) => {
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
          <h1 className="text-3xl font-bold tracking-tight">Gym Tracker</h1>
          <p className="text-muted-foreground mt-1">Discipline equals freedom. Track your progress.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-log-gym">
              <Plus className="mr-2 h-4 w-4" /> Log Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Log Workout</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 px-1">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="workoutType" render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel>Workout Type</FormLabel>
                        <FormControl><Input placeholder="E.g., Push Day, Legs" {...field} /></FormControl>
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

                  <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-sm">Exercises</h4>
                      <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", sets: 3, reps: 10, weight: 0 })}>
                        <Plus className="h-4 w-4 mr-2" /> Add Exercise
                      </Button>
                    </div>
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 md:col-span-4">
                          <FormField control={form.control} name={`exercises.${index}.name`} render={({ field }) => (
                            <FormItem>
                              {index === 0 && <FormLabel className="text-xs">Exercise</FormLabel>}
                              <FormControl><Input placeholder="Bench Press" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <FormField control={form.control} name={`exercises.${index}.sets`} render={({ field }) => (
                            <FormItem>
                              {index === 0 && <FormLabel className="text-xs">Sets</FormLabel>}
                              <FormControl><Input type="number" placeholder="3" {...field} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <FormField control={form.control} name={`exercises.${index}.reps`} render={({ field }) => (
                            <FormItem>
                              {index === 0 && <FormLabel className="text-xs">Reps</FormLabel>}
                              <FormControl><Input type="number" placeholder="10" {...field} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                        <div className="col-span-4 md:col-span-3">
                          <FormField control={form.control} name={`exercises.${index}.weight`} render={({ field }) => (
                            <FormItem>
                              {index === 0 && <FormLabel className="text-xs">Weight</FormLabel>}
                              <FormControl><Input type="number" placeholder="lbs/kg" {...field} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                        <div className="col-span-12 md:col-span-1 flex justify-end">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (Minutes)</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="Felt strong today..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <DialogFooter className="mt-4 pt-4 border-t">
                    <Button type="submit" disabled={createSession.isPending} data-testid="btn-submit-gym">
                      {createSession.isPending ? "Logging..." : "Log Workout"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </ScrollArea>
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
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Activity className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.sessionsThisWeek}</div>
              <p className="text-xs text-muted-foreground mt-1">Workouts logged</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <CalendarIcon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.sessionsThisMonth}</div>
              <p className="text-xs text-muted-foreground mt-1">Workouts logged</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.currentStreak} Days</div>
              <p className="text-xs text-muted-foreground mt-1">Keep the momentum!</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <GymChecklist />
        </div>

        <div className="lg:col-span-2">
          {analytics?.dailyActivity && (
            <Card>
              <CardHeader>
                <CardTitle>Activity Map</CardTitle>
                <CardDescription>Your consistency over the last 14 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 items-center flex-wrap">
                  {analytics.dailyActivity.map((day, i) => (
                    <div
                      key={i}
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-md flex flex-col items-center justify-center border transition-colors ${
                        day.didWorkout
                          ? 'bg-orange-500 text-white border-orange-600'
                          : 'bg-muted/30 border-muted text-muted-foreground'
                      }`}
                      title={`${format(new Date(day.date), 'MMM d')}: ${day.didWorkout ? 'Workout logged' : 'Rest day'}`}
                    >
                      <span className="text-[10px] uppercase font-medium">{format(new Date(day.date), 'EEE')}</span>
                      <span className="text-xs font-bold">{format(new Date(day.date), 'd')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Workouts</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <AnimatePresence>
                {sessions.map((session) => (
                  <motion.div key={session.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <Card className="h-full overflow-hidden flex flex-col">
                      <div className="bg-orange-500/10 px-4 py-3 border-b flex justify-between items-center">
                        <div className="font-bold text-orange-600 dark:text-orange-500">{session.workoutType}</div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => deleteSession.mutate({ id: session.id })} data-testid={`btn-delete-gym-${session.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <CardContent className="p-4 flex-1">
                        <div className="text-xs text-muted-foreground mb-3 flex gap-4">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(session.date), 'MMM d, yyyy')}
                          </span>
                          {session.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {session.durationMinutes} min
                            </span>
                          )}
                        </div>
                        {session.exercises && session.exercises.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {session.exercises.slice(0, 3).map((ex, i) => (
                              <div key={i} className="text-sm flex justify-between">
                                <span className="font-medium">{ex.name}</span>
                                <span className="text-muted-foreground">
                                  {ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : ''}
                                  {ex.weight ? ` @ ${ex.weight}` : ''}
                                </span>
                              </div>
                            ))}
                            {session.exercises.length > 3 && (
                              <div className="text-xs text-muted-foreground italic mt-2">+ {session.exercises.length - 3} more exercises</div>
                            )}
                          </div>
                        )}
                        {session.notes && (
                          <div className="mt-4 pt-3 border-t text-sm text-muted-foreground italic">"{session.notes}"</div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell className="mx-auto h-8 w-8 opacity-20 mb-2" />
              <p>No workouts logged yet. Time to hit the iron.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
