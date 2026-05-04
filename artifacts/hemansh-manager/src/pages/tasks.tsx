import React, { useState } from "react";
import { 
  useListTasks, 
  useCreateTask, 
  useUpdateTask, 
  useDeleteTask 
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, MoreVertical, Trash2, Edit, Plus, FilterX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListTasksQueryKey } from "@workspace/api-client-react";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["Study", "Gym", "Personal"]),
  priority: z.enum(["High", "Medium", "Low"]),
  deadline: z.string().optional(),
  date: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function Tasks() {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useListTasks(
    { category: filterCategory as any, priority: filterPriority as any },
    { query: { queryKey: getListTasksQueryKey({ category: filterCategory as any, priority: filterPriority as any }) } }
  );

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setIsCreateOpen(false);
        toast.success("Task created successfully");
        form.reset();
      }
    }
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    }
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast.success("Task deleted");
      }
    }
  });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "Personal",
      priority: "Medium",
    },
  });

  const onSubmit = (data: TaskFormValues) => {
    createTask.mutate({ data });
  };

  const handleToggleCompleted = (id: number, completed: boolean) => {
    updateTask.mutate({ id, data: { completed } });
  };

  const priorityColors = {
    High: "text-red-500 bg-red-500/10 border-red-500/20",
    Medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    Low: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  };

  const categoryColors = {
    Study: "bg-blue-500/10 text-blue-500",
    Gym: "bg-orange-500/10 text-orange-500",
    Personal: "bg-purple-500/10 text-purple-500",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage your priorities and execute.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-new-task">
              <Plus className="mr-2 h-4 w-4" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Complete chapter 4" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional details..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Study">Study</SelectItem>
                            <SelectItem value="Gym">Gym</SelectItem>
                            <SelectItem value="Personal">Personal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline (Optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createTask.isPending} data-testid="btn-submit-task">
                    {createTask.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? null : v)}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Study">Study</SelectItem>
            <SelectItem value="Gym">Gym</SelectItem>
            <SelectItem value="Personal">Personal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority || "all"} onValueChange={(v) => setFilterPriority(v === "all" ? null : v)}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>

        {(filterCategory || filterPriority) && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { setFilterCategory(null); setFilterPriority(null); }}
            title="Clear filters"
          >
            <FilterX className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {tasks?.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground border border-dashed rounded-lg"
              >
                <CheckCircle2 className="mx-auto h-12 w-12 opacity-20 mb-3" />
                <p>No tasks found. Create one to get started.</p>
              </motion.div>
            ) : (
              tasks?.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className={task.completed ? "opacity-60 bg-muted/50" : ""}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <Checkbox 
                        id={`task-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={(c) => handleToggleCompleted(task.id, c as boolean)}
                        className="mt-1"
                        data-testid={`checkbox-task-${task.id}`}
                      />
                      <div className="flex-1 space-y-1">
                        <label 
                          htmlFor={`task-${task.id}`}
                          className={`font-medium cursor-pointer ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                        >
                          {task.title}
                        </label>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Badge variant="outline" className={priorityColors[task.priority as keyof typeof priorityColors]}>
                            {task.priority} Priority
                          </Badge>
                          <Badge variant="secondary" className={categoryColors[task.category as keyof typeof categoryColors]}>
                            {task.category}
                          </Badge>
                          {task.deadline && (
                            <span className="text-xs text-muted-foreground flex items-center bg-muted px-2 rounded-md">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(task.deadline), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="-mr-2 -mt-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                            onClick={() => deleteTask.mutate({ id: task.id })}
                            data-testid={`btn-delete-task-${task.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
