import React, { useState, useMemo } from "react";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useListStudySessions,
  useListGymSessions,
} from "@workspace/api-client-react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { getListTasksQueryKey } from "@workspace/api-client-react";
import { Plus, CalendarDays, BookOpen, Dumbbell, CheckSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["Study", "Gym", "Personal"]),
  priority: z.enum(["High", "Medium", "Low"]),
  deadline: z.string().optional(),
});
type TaskFormValues = z.infer<typeof taskSchema>;

type ViewMode = "month" | "week";

const priorityBar: Record<string, string> = {
  High: "bg-red-500",
  Medium: "bg-yellow-500",
  Low: "bg-blue-500",
};

const categoryBadge: Record<string, string> = {
  Study: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Gym: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Personal: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: allTasks } = useListTasks();
  const { data: studySessions } = useListStudySessions();
  const { data: gymSessions } = useListGymSessions();

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setIsAddOpen(false);
        toast.success("Task added!");
        form.reset();
      },
    },
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
    },
  });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", category: "Personal", priority: "Medium" },
  });

  const onSubmit = (data: TaskFormValues) => {
    createTask.mutate({
      data: {
        ...data,
        date: format(selectedDate, "yyyy-MM-dd"),
        deadline: data.deadline || format(selectedDate, "yyyy-MM-dd"),
      },
    });
  };

  const eventsByDate = useMemo(() => {
    const map: Record<string, { tasks: any[]; study: any[]; gym: any[] }> = {};
    const ensure = (d: string) => {
      if (!map[d]) map[d] = { tasks: [], study: [], gym: [] };
    };
    allTasks?.forEach((t) => {
      const d = (t.date || t.deadline || "").split("T")[0];
      if (d) { ensure(d); map[d].tasks.push(t); }
    });
    studySessions?.forEach((s: any) => {
      const d = (s.date || "").split("T")[0];
      if (d) { ensure(d); map[d].study.push(s); }
    });
    gymSessions?.forEach((g: any) => {
      const d = (g.date || "").split("T")[0];
      if (d) { ensure(d); map[d].gym.push(g); }
    });
    return map;
  }, [allTasks, studySessions, gymSessions]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedEvents = eventsByDate[selectedKey] || { tasks: [], study: [], gym: [] };

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const handleToggleCompleted = (id: number, completed: boolean) => {
    updateTask.mutate({ id, data: { completed } });
  };

  const DotRow = ({ ev }: { ev: { tasks: any[]; study: any[]; gym: any[] } }) => (
    <div className="flex gap-0.5 mt-0.5 justify-center flex-wrap">
      {ev.tasks.some((t) => t.priority === "High") && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
      {ev.tasks.some((t) => t.priority === "Medium") && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
      {(ev.study.length > 0 || ev.tasks.some((t) => t.priority === "Low")) && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
      {ev.gym.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">All your events in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden text-sm">
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8"
              onClick={() => setViewMode("month")}
            >
              Month
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8"
              onClick={() => setViewMode("week")}
            >
              Week
            </Button>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 h-8">
                <Plus className="h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Task for {format(selectedDate, "MMMM d")}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl><Input placeholder="Task title..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Study">Study</SelectItem>
                            <SelectItem value="Gym">Gym</SelectItem>
                            <SelectItem value="Personal">Personal</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="deadline" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline (optional override)</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="submit" disabled={createTask.isPending}>
                      {createTask.isPending ? "Adding..." : "Add Task"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />High priority</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" />Medium priority</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" />Study / Low</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" />Gym session</span>
      </div>

      <div className="grid gap-6 md:grid-cols-12 items-start">
        <Card className="md:col-span-5 lg:col-span-4 overflow-hidden">
          {viewMode === "month" ? (
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              components={{
                DayContent: ({ date }) => {
                  const key = format(date, "yyyy-MM-dd");
                  const ev = eventsByDate[key];
                  return (
                    <div className="flex flex-col items-center py-0.5">
                      <span>{date.getDate()}</span>
                      {ev && <DotRow ev={ev} />}
                    </div>
                  );
                },
              }}
              className="p-3 w-full"
            />
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                  <div key={d} className="text-center text-[10px] text-muted-foreground font-medium pb-1">{d}</div>
                ))}
                {weekDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const ev = eventsByDate[key];
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(day)}
                      className={`flex flex-col items-center p-1.5 rounded-lg transition-colors ${
                        isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-accent" : "hover:bg-muted"
                      }`}
                    >
                      <span className="text-xs font-medium">{format(day, "d")}</span>
                      {ev && <DotRow ev={ev} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <div className="md:col-span-7 lg:col-span-8 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{format(selectedDate, "EEEE, MMMM d")}</CardTitle>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-3 w-3" /> Task
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <AnimatePresence>
                {selectedEvents.tasks.length === 0 && selectedEvents.study.length === 0 && selectedEvents.gym.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nothing scheduled. Add a task!</p>
                  </motion.div>
                )}

                {selectedEvents.tasks.length > 0 && (
                  <motion.div key="tasks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Tasks</span>
                      <Badge variant="secondary" className="text-xs h-4 px-1">{selectedEvents.tasks.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {selectedEvents.tasks.map((task: any) => (
                        <motion.div key={task.id} layout className={`flex items-start gap-3 p-3 rounded-lg border transition-opacity ${task.completed ? "opacity-50 bg-muted/30" : "bg-card"}`}>
                          <div className={`w-1 self-stretch rounded-full ${priorityBar[task.priority] || "bg-muted"}`} />
                          <Checkbox checked={task.completed} onCheckedChange={(c) => handleToggleCompleted(task.id, c as boolean)} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                            <div className="flex gap-1.5 mt-1 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] h-4 px-1 ${categoryBadge[task.category]}`}>{task.category}</Badge>
                              <Badge variant="outline" className="text-[10px] h-4 px-1">{task.priority}</Badge>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {selectedEvents.study.length > 0 && (
                  <motion.div key="study" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-semibold">Study Sessions</span>
                      <Badge variant="secondary" className="text-xs h-4 px-1">{selectedEvents.study.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {selectedEvents.study.map((s: any) => (
                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border bg-blue-500/5 border-blue-500/20">
                          <div className="w-1 self-stretch rounded-full bg-blue-500" />
                          <div>
                            <p className="text-sm font-medium">{s.subject}</p>
                            <p className="text-xs text-muted-foreground">{s.hours}h studied{s.notes ? ` · ${s.notes}` : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {selectedEvents.gym.length > 0 && (
                  <motion.div key="gym" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Dumbbell className="h-4 w-4 text-orange-400" />
                      <span className="text-sm font-semibold">Gym Sessions</span>
                      <Badge variant="secondary" className="text-xs h-4 px-1">{selectedEvents.gym.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {selectedEvents.gym.map((g: any) => (
                        <div key={g.id} className="flex items-center gap-3 p-3 rounded-lg border bg-orange-500/5 border-orange-500/20">
                          <div className="w-1 self-stretch rounded-full bg-orange-500" />
                          <div>
                            <p className="text-sm font-medium">{g.workoutType}</p>
                            <p className="text-xs text-muted-foreground">
                              {g.duration ? `${g.duration} min` : ""}
                              {g.exercises?.length ? ` · ${g.exercises.length} exercises` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
