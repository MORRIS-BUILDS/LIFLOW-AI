import { useEffect, useRef, useState, useCallback } from "react";
import { useListTasks } from "@workspace/api-client-react";
import { addHours, parseISO, isWithinInterval, formatDistanceToNow } from "date-fns";

export interface UpcomingTask {
  id: number;
  title: string;
  deadline: string;
  urgency: "now" | "soon" | "today";
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [tick, setTick] = useState(0);
  const notifiedIds = useRef<Set<number>>(new Set());

  const { data: tasks } = useListTasks();

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!tasks) return;

    const now = new Date();
    const in1h = addHours(now, 1);
    const in24h = addHours(now, 24);

    const upcoming: UpcomingTask[] = [];

    tasks.forEach((task) => {
      if (task.completed) return;
      const deadlineStr = task.deadline || task.date;
      if (!deadlineStr) return;
      const deadline = parseISO(deadlineStr);
      if (deadline < now || deadline > in24h) return;

      const urgency = isWithinInterval(deadline, { start: now, end: in1h })
        ? "now"
        : deadline <= addHours(now, 3)
        ? "soon"
        : "today";

      upcoming.push({
        id: task.id,
        title: task.title,
        deadline: deadlineStr,
        urgency,
      });

      if (permission === "granted" && urgency === "now" && !notifiedIds.current.has(task.id)) {
        notifiedIds.current.add(task.id);
        try {
          new Notification("⏰ Task Due Soon!", {
            body: `"${task.title}" is due ${formatDistanceToNow(deadline, { addSuffix: true })}`,
            icon: "/favicon.ico",
            tag: `task-${task.id}`,
          });
        } catch {
        }
      }
    });

    upcoming.sort((a, b) => {
      const order = { now: 0, soon: 1, today: 2 };
      return order[a.urgency] - order[b.urgency];
    });

    setUpcomingTasks(upcoming);
  }, [tasks, permission, tick]);

  return { permission, requestPermission, upcomingTasks };
}
