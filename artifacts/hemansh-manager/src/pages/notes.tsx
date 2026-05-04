import React, { useState } from "react";
import { 
  useListNotes, 
  useCreateNote,
  useUpdateNote,
  useDeleteNote
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { StickyNote, Plus, Trash2, Edit, Search, Tag, FileText } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListNotesQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  tags: z.string().optional(), // We'll parse this into an array
});

type NoteFormValues = z.infer<typeof noteSchema>;

export default function Notes() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useListNotes(
    { search: search || undefined, tag: selectedTag || undefined },
    { query: { queryKey: getListNotesQueryKey({ search: search || undefined, tag: selectedTag || undefined }) } }
  );

  // Extract unique tags from all notes (in a real app, this might be a separate API call)
  const allTags = React.useMemo(() => {
    if (!notes) return [];
    const tags = new Set<string>();
    notes.forEach(note => note.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [notes]);

  const createNote = useCreateNote({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        setIsCreateOpen(false);
        toast.success("Note created");
        form.reset();
      }
    }
  });

  const updateNote = useUpdateNote({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        setEditingId(null);
        toast.success("Note updated");
      }
    }
  });

  const deleteNote = useDeleteNote({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        toast.success("Note deleted");
      }
    }
  });

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: "",
      content: "",
      tags: "",
    },
  });

  const onSubmit = (data: NoteFormValues) => {
    const tagsArray = data.tags 
      ? data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : [];
      
    if (editingId) {
      updateNote.mutate({ 
        id: editingId, 
        data: { 
          title: data.title, 
          content: data.content, 
          tags: tagsArray 
        } 
      });
    } else {
      createNote.mutate({ 
        data: { 
          title: data.title, 
          content: data.content, 
          tags: tagsArray 
        } 
      });
    }
  };

  const handleEdit = (note: any) => {
    form.reset({
      title: note.title,
      content: note.content,
      tags: note.tags?.join(", ") || "",
    });
    setEditingId(note.id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 h-full flex flex-col"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground mt-1">Capture ideas, thoughts, and references.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          if (!open) {
            setEditingId(null);
            form.reset({ title: "", content: "", tags: "" });
          }
          setIsCreateOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button data-testid="btn-new-note">
              <Plus className="mr-2 h-4 w-4" /> New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Note' : 'Create Note'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex flex-col flex-1 h-full">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="Note Title" 
                          className="text-lg font-bold border-none focus-visible:ring-0 px-0 rounded-none bg-transparent" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex items-center text-sm text-muted-foreground border-b pb-2">
                          <Tag className="h-4 w-4 mr-2 shrink-0" />
                          <Input 
                            placeholder="Add tags (comma separated)..." 
                            className="border-none focus-visible:ring-0 h-6 px-0 rounded-none bg-transparent" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="flex-1 flex flex-col min-h-0">
                      <FormControl className="flex-1 min-h-0">
                        <Textarea 
                          placeholder="Write your thoughts here..." 
                          className="flex-1 resize-none border-none focus-visible:ring-0 px-0 bg-transparent" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="shrink-0 mt-4">
                  <Button type="submit" disabled={createNote.isPending || updateNote.isPending}>
                    {createNote.isPending || updateNote.isPending ? "Saving..." : "Save Note"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Sidebar for search and tags */}
        <div className="w-full md:w-64 space-y-6 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search notes..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tags</h3>
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={selectedTag === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedTag(null)}
              >
                All Notes
              </Badge>
              {allTags.map(tag => (
                <Badge 
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="flex-1 overflow-auto pb-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {notes.map((note) => (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="h-full flex flex-col hover:border-primary/50 transition-colors group">
                      <CardContent className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg line-clamp-1">{note.title}</h3>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 -mr-2 -mt-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => {
                                handleEdit(note);
                                setIsCreateOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteNote.mutate({ id: note.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-4 flex-1 mb-4 whitespace-pre-wrap">
                          {note.content}
                        </p>
                        <div className="flex justify-between items-end mt-auto pt-4 border-t border-border/50">
                          <div className="flex flex-wrap gap-1">
                            {note.tags && note.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 h-4">
                                {tag}
                              </Badge>
                            ))}
                            {note.tags && note.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground ml-1">+{note.tags.length - 3}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                            {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-muted-foreground border border-dashed rounded-lg">
              <FileText className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p>No notes found.</p>
              {(search || selectedTag) && (
                <Button 
                  variant="link" 
                  onClick={() => { setSearch(""); setSelectedTag(null); }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
