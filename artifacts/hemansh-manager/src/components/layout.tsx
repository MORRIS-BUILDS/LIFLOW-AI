import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  CheckSquare, 
  CalendarDays, 
  BookOpen, 
  Dumbbell, 
  StickyNote, 
  Bot,
  Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const sidebarItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Study", href: "/study", icon: BookOpen },
  { name: "Gym", href: "/gym", icon: Dumbbell },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "AI Assistant", href: "/ai", icon: Bot },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <h2 className="text-xl font-bold tracking-tighter text-sidebar-foreground">
          HEMANSH<span className="text-primary">.OS</span>
        </h2>
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
