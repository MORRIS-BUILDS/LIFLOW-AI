import React, { useState } from "react";
import { useListTasks } from "@workspace/api-client-react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateTask } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListTasksQueryKey } from "@workspace/api-client-react";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const queryClient = useQueryClient();

  const { data: allTasks } = useListTasks();
  
  const formattedSelectedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  
  const { data: dayTasks, isLoading } = useListTasks(
    { date: formattedSelectedDate },
    { 
      query: { 
        enabled: !!formattedSelectedDate,
        queryKey: getListTasksQueryKey({ date: formattedSelectedDate })
      } 
    }
  );

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    }
  });

  const handleToggleCompleted = (id: number, completed: boolean) => {
    updateTask.mutate({ id, data: { completed } });
  };

  // Find dates that have tasks for dot indicators
  const datesWithTasks = allTasks?.reduce((acc, task) => {
    if (task.date) {
      const dateStr = task.date.split('T')[0];
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(task);
    } else if (task.deadline) {
      const dateStr = task.deadline.split('T')[0];
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(task);
    }
    return acc;
  }, {} as Record<string, any[]>) || {};

  const modifiers = {
    hasTask: (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return !!datesWithTasks[dateStr];
    }
  };

  const modifiersStyles = {
    hasTask: {
      fontWeight: 'bold',
      textDecoration: 'underline',
      color: 'hsl(var(--primary))'
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1">Plan your days and stay ahead.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-12 lg:grid-cols-12 items-start">
        <Card className="md:col-span-5 lg:col-span-4 flex justify-center pb-4">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="p-3"
            classNames={{
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
            }}
          />
        </Card>

        <Card className="md:col-span-7 lg:col-span-8 min-h-[400px]">
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Select a date to view tasks.</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-muted animate-pulse rounded-md" />
                <div className="h-16 bg-muted animate-pulse rounded-md" />
              </div>
            ) : dayTasks && dayTasks.length > 0 ? (
              <div className="space-y-3">
                {dayTasks.map(task => (
                  <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border ${task.completed ? 'bg-muted/50 opacity-60' : 'bg-card'}`}>
                    <Checkbox 
                      id={`cal-task-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={(c) => handleToggleCompleted(task.id, c as boolean)}
                    />
                    <div className="space-y-1 flex-1">
                      <label htmlFor={`cal-task-${task.id}`} className={`font-medium cursor-pointer ${task.completed ? 'line-through' : ''}`}>
                        {task.title}
                      </label>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{task.category}</Badge>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">{task.priority}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                <p>No tasks scheduled for this day.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
