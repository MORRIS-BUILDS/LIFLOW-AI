import React, { useState } from "react";
import {
  useListJournalEntries,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  getListJournalEntriesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { NotebookPen, Plus, Trash2, Edit, BookOpen, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const MOODS = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😔", label: "Sad" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🔥", label: "Motivated" },
  { emoji: "😌", label: "Calm" },
  { emoji: "🤔", label: "Thoughtful" },
];

const journalSchema = z.object({
  date: z.string().min(1, "Date is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  mood: z.string().nullable().optional(),
});

type JournalFormValues = z.infer<typeof journalSchema>;

export default function Journal() {
  const queryClient = useQueryClient();
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  const { data: entries, isLoading } = useListJournalEntries();

  const createEntry = useCreateJournalEntry({
    mutation: {
      onSuccess: (newEntry) => {
        queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey() });
        toast.success("Journal entry saved");
        setIsCreating(false);
        setSelectedEntryId(newEntry.id);
        setSelectedMood(null);
      },
    },
  });

  const updateEntry = useUpdateJournalEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey() });
        toast.success("Entry updated");
      },
    },
  });

  const deleteEntry = useDeleteJournalEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey() });
        toast.success("Entry deleted");
        setSelectedEntryId(null);
        setIsCreating(false);
      },
    },
  });

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      title: "",
      content: "",
      mood: null,
    },
  });

  const selectedEntry = entries?.find((e) => e.id === selectedEntryId) ?? null;

  const filteredEntries = entries?.filter((e) => e.date.startsWith(filterMonth)) ?? [];

  const availableMonths = Array.from(
    new Set((entries ?? []).map((e) => e.date.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  function startNew() {
    setSelectedEntryId(null);
    setIsCreating(true);
    setSelectedMood(null);
    form.reset({
      date: format(new Date(), "yyyy-MM-dd"),
      title: "",
      content: "",
      mood: null,
    });
  }

  function startEdit(entry: NonNullable<typeof selectedEntry>) {
    setSelectedEntryId(entry.id);
    setIsCreating(true);
    setSelectedMood(entry.mood ?? null);
    form.reset({
      date: entry.date,
      title: entry.title,
      content: entry.content,
      mood: entry.mood ?? null,
    });
  }

  function selectEntry(id: number) {
    setSelectedEntryId(id);
    setIsCreating(false);
    setSelectedMood(null);
  }

  const onSubmit = (data: JournalFormValues) => {
    const payload = { ...data, mood: selectedMood };
    if (selectedEntryId && isCreating) {
      updateEntry.mutate({ id: selectedEntryId, data: payload });
    } else {
      createEntry.mutate({ data: payload });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal</h1>
          <p className="text-muted-foreground mt-1">Your daily space to reflect and write.</p>
        </div>
        <Button onClick={startNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Entry
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 min-h-[600px]">
        <div className="w-full md:w-64 shrink-0 space-y-2">
          {/* Month filter */}
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setSelectedEntryId(null);
                setIsCreating(false);
              }}
              className="h-8 text-xs"
            />
          </div>
          {availableMonths.length > 0 && !availableMonths.includes(filterMonth) && (
            <p className="text-xs text-muted-foreground px-1">No entries for this month.</p>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredEntries.length > 0 ? (
            <div className="space-y-1.5">
              <AnimatePresence>
                {filteredEntries.map((entry) => (
                  <motion.button
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    onClick={() => selectEntry(entry.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50 hover:bg-muted/50",
                      selectedEntryId === entry.id && !isCreating
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(entry.date), "MMM d, yyyy")}
                      </span>
                      {entry.mood && <span className="text-base leading-none">{entry.mood}</span>}
                    </div>
                    <div className="text-sm font-medium truncate">{entry.title}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5 line-clamp-1">
                      {entry.content}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
              <BookOpen className="mx-auto h-6 w-6 opacity-20 mb-2" />
              <p>{entries && entries.length > 0 ? "No entries this month." : "No entries yet."}</p>
            </div>
          )}
        </div>

        <div className="flex-1">
          {isCreating ? (
            <Card className="h-full flex flex-col">
              <CardContent className="pt-6 flex-1 flex flex-col space-y-4">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col flex-1 space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Today's thoughts…" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <FormLabel className="text-sm font-medium">Mood</FormLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {MOODS.map(({ emoji, label }) => (
                          <button
                            key={emoji}
                            type="button"
                            title={label}
                            onClick={() => setSelectedMood(selectedMood === emoji ? null : emoji)}
                            className={cn(
                              "text-xl p-1.5 rounded-lg border-2 transition-all hover:scale-110",
                              selectedMood === emoji
                                ? "border-primary bg-primary/10 scale-110"
                                : "border-transparent hover:border-border"
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem className="flex-1 flex flex-col">
                          <FormLabel>Entry</FormLabel>
                          <FormControl className="flex-1">
                            <Textarea
                              placeholder="Write your thoughts, reflections, wins or learnings for today…"
                              className="flex-1 resize-none min-h-[250px] text-sm leading-relaxed"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        type="submit"
                        disabled={createEntry.isPending || updateEntry.isPending}
                        className="flex-1"
                      >
                        <NotebookPen className="h-4 w-4 mr-2" />
                        {createEntry.isPending || updateEntry.isPending
                          ? "Saving…"
                          : selectedEntryId
                          ? "Update Entry"
                          : "Save Entry"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreating(false);
                          if (!selectedEntryId) setSelectedEntryId(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : selectedEntry ? (
            <Card className="h-full">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(parseISO(selectedEntry.date), "EEEE, MMMM d, yyyy")}
                      {selectedEntry.mood && (
                        <span className="text-lg ml-1">{selectedEntry.mood}</span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold">{selectedEntry.title}</h2>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(selectedEntry)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteEntry.mutate({ id: selectedEntry.id })}
                      disabled={deleteEntry.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="border-t pt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {selectedEntry.content}
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Last updated {format(new Date(String(selectedEntry.updatedAt)), "MMM d, yyyy HH:mm")}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-lg">
              <NotebookPen className="h-12 w-12 opacity-20 mb-3" />
              <p className="font-medium">Select an entry to read</p>
              <p className="text-sm mt-1">or create a new one to start journaling</p>
              <Button className="mt-4" onClick={startNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
