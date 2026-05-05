import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  BookOpen,
  Dumbbell,
  StickyNote,
  Bot,
  Menu,
  Bell,
  BellOff,
  Clock,
  AlertTriangle,
  TrendingUp,
  NotebookPen,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow, parseISO } from "date-fns";

const sidebarItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Study", href: "/study", icon: BookOpen },
  { name: "Gym", href: "/gym", icon: Dumbbell },
  { name: "Finance", href: "/finance", icon: TrendingUp },
  { name: "Journal", href: "/journal", icon: NotebookPen },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "AI Assistant", href: "/ai", icon: Bot },
];

const urgencyConfig = {
  now: { label: "Due now", color: "text-red-400", icon: AlertTriangle },
  soon: { label: "Due soon", color: "text-yellow-400", icon: Clock },
  today: { label: "Due today", color: "text-blue-400", icon: Clock },
};

function NotificationBell() {
  const { permission, requestPermission, upcomingTasks } = useNotifications();
  const count = upcomingTasks.length;

  useEffect(() => {
    if (permission === "default") {
      const timer = setTimeout(() => {
        requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [permission, requestPermission]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 shrink-0">
          {permission === "denied" ? (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Bell className={cn("h-4 w-4", count > 0 ? "text-primary animate-pulse" : "text-muted-foreground")} />
          )}
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Reminders</span>
            {permission !== "granted" && permission !== "denied" && (
              <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={requestPermission}>
                Enable alerts
              </Button>
            )}
          </div>
          {permission === "granted" ? (
            <p className="text-xs text-muted-foreground mt-0.5">Browser alerts on for tasks due within 1h</p>
          ) : permission === "denied" ? (
            <p className="text-xs text-red-400 mt-0.5">Blocked in browser — enable in site settings</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Allow notifications for deadline alerts</p>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {upcomingTasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="h-6 w-6 mx-auto mb-2 opacity-30" />
              <p>No deadlines in the next 24h</p>
            </div>
          ) : (
            <div className="divide-y">
              {upcomingTasks.map((task) => {
                const cfg = urgencyConfig[task.urgency];
                const Icon = cfg.icon;
                return (
                  <div key={task.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors">
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className={cn("text-xs mt-0.5", cfg.color)}>
                        {cfg.label} · {formatDistanceToNow(parseISO(task.deadline), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tighter text-sidebar-foreground">
          MORRIS<span className="text-primary">.OS</span>
        </h2>
        <NotificationBell />
      </div>
      <ScrollArea className="flex-1 px-4">
        <nav className="flex flex-col gap-2">
          {sidebarItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70"
                  )}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-background">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-40"
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="hidden md:flex w-64 flex-col fixed inset-y-0">
        <SidebarContent />
      </div>

      <main className="flex-1 md:pl-64 flex flex-col p-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
