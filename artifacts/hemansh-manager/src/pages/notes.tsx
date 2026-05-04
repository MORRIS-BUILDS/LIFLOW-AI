import React, { useState, useRef } from "react";
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
import { StickyNote, Plus, Trash2, Edit, Search, Tag, FileText, Image, X, Palette, Type } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListNotesQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  tags: z.string().optional(),
});

type NoteFormValues = z.infer<typeof noteSchema>;

const NOTE_COLORS = [
  { id: "default", label: "Default", bg: "", border: "" },
  { id: "yellow", label: "Yellow", bg: "bg-yellow-500/10", border: "border-yellow-500/40" },
  { id: "blue", label: "Blue", bg: "bg-blue-500/10", border: "border-blue-500/40" },
  { id: "green", label: "Green", bg: "bg-green-500/10", border: "border-green-500/40" },
  { id: "pink", label: "Pink", bg: "bg-pink-500/10", border: "border-pink-500/40" },
  { id: "purple", label: "Purple", bg: "bg-purple-500/10", border: "border-purple-500/40" },
  { id: "orange", label: "Orange", bg: "bg-orange-500/10", border: "border-orange-500/40" },
];

const NOTE_FONTS = [
  { id: "default", label: "Normal", className: "font-sans" },
  { id: "serif", label: "Serif", className: "font-serif" },
  { id: "mono", label: "Mono", className: "font-mono" },
  { id: "bold", label: "Bold", className: "font-sans font-bold" },
];

const colorDotMap: Record<string, string> = {
  default: "bg-muted-foreground",
  yellow: "bg-yellow-400",
  blue: "bg-blue-400",
  green: "bg-green-400",
  pink: "bg-pink-400",
  purple: "bg-purple-400",
  orange: "bg-orange-400",
};

function getColorClasses(color: string | null | undefined) {
  const found = NOTE_COLORS.find(c => c.id === color);
  return found ? { bg: found.bg, border: found.border } : { bg: "", border: "" };
}

function getFontClass(font: string | null | undefined) {
  const found = NOTE_FONTS.find(f => f.id === font);
  return found ? found.className : "font-sans";
}

export default function Notes() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [selectedColor, setSelectedColor] = useState("default");
  const [selectedFont, setSelectedFont] = useState("default");
  const [imageData, setImageData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useListNotes(
    { search: search || undefined, tag: selectedTag || undefined },
    { query: { queryKey: getListNotesQueryKey({ search: search || undefined, tag: selectedTag || undefined }) } }
  );

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
        closeDialog();
        toast.success("Note created");
      }
    }
  });

  const updateNote = useUpdateNote({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        closeDialog();
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
    defaultValues: { title: "", content: "", tags: "" },
  });

  function closeDialog() {
    setIsCreateOpen(false);
    setEditingNote(null);
    setSelectedColor("default");
    setSelectedFont("default");
    setImageData(null);
    form.reset({ title: "", content: "", tags: "" });
  }

  const onSubmit = (data: NoteFormValues) => {
    const tagsArray = data.tags
      ? data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : [];
    const payload = {
      title: data.title,
      content: data.content,
      tags: tagsArray,
      color: selectedColor,
      font: selectedFont,
      imageData: imageData ?? undefined,
    } as any;

    if (editingNote) {
      updateNote.mutate({ id: editingNote.id, data: payload });
    } else {
      createNote.mutate({ data: payload });
    }
  };

  const handleEdit = (note: any) => {
    form.reset({
      title: note.title,
      content: note.content,
      tags: note.tags?.join(", ") || "",
    });
    setSelectedColor(note.color || "default");
    setSelectedFont(note.font || "default");
    setImageData(note.imageData || null);
    setEditingNote(note);
    setIsCreateOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageData(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
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

        <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsCreateOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="btn-new-note">
              <Plus className="mr-2 h-4 w-4" /> New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b shrink-0">
              <h2 className="font-semibold text-lg">{editingNote ? "Edit Note" : "New Note"}</h2>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/30 shrink-0 flex-wrap">
              {/* Color picker */}
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1.5">
                  {NOTE_COLORS.map(c => (
                    <button
                      key={c.id}
                      title={c.label}
                      onClick={() => setSelectedColor(c.id)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-all",
                        colorDotMap[c.id],
                        selectedColor === c.id ? "border-foreground scale-125" : "border-transparent"
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="w-px h-5 bg-border" />
              {/* Font picker */}
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {NOTE_FONTS.map(f => (
                    <button
                      key={f.id}
                      title={f.label}
                      onClick={() => setSelectedFont(f.id)}
                      className={cn(
                        "px-2 py-0.5 rounded text-xs border transition-all",
                        f.className,
                        selectedFont === f.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                      )}
                    >
                      Aa
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-px h-5 bg-border" />
              {/* Image upload */}
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
                  <Image className="h-3.5 w-3.5" />
                  {imageData ? "Change Image" : "Add Image"}
                </Button>
                {imageData && (
                  <button onClick={() => setImageData(null)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Image preview */}
            {imageData && (
              <div className="px-6 pt-3 shrink-0">
                <img src={imageData} alt="Note image" className="max-h-32 rounded-lg object-cover border" />
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 px-6 pb-4 pt-3 space-y-3">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Note Title"
                        className={cn(
                          "text-lg font-bold border-none focus-visible:ring-0 px-0 rounded-none bg-transparent",
                          getFontClass(selectedFont)
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="tags" render={({ field }) => (
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
                  </FormItem>
                )} />

                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem className="flex-1 flex flex-col min-h-0">
                    <FormControl className="flex-1 min-h-0">
                      <Textarea
                        placeholder="Write your thoughts here..."
                        className={cn(
                          "flex-1 resize-none border-none focus-visible:ring-0 px-0 bg-transparent min-h-[150px]",
                          getFontClass(selectedFont)
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="border-t pt-4 shrink-0">
                  <Button type="submit" disabled={createNote.isPending || updateNote.isPending} className="w-full">
                    {createNote.isPending || updateNote.isPending ? "Saving..." : "Save Note"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        <div className="w-full md:w-56 space-y-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={selectedTag === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedTag(null)}
              >
                All
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

        <div className="flex-1 overflow-auto pb-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {notes.map((note: any) => {
                  const colorCls = getColorClasses(note.color);
                  const fontCls = getFontClass(note.font);
                  return (
                    <motion.div
                      key={note.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className={cn(
                        "h-full flex flex-col hover:border-primary/50 transition-colors group",
                        colorCls.bg, colorCls.border
                      )}>
                        <CardContent className="p-5 flex-1 flex flex-col">
                          {note.imageData && (
                            <img
                              src={note.imageData}
                              alt="Note"
                              className="w-full h-28 object-cover rounded-md mb-3 border"
                            />
                          )}
                          <div className="flex justify-between items-start mb-2">
                            <h3 className={cn("font-bold text-base line-clamp-1 flex-1", fontCls)}>{note.title}</h3>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 -mr-2 -mt-2 shrink-0">
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => handleEdit(note)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => deleteNote.mutate({ id: note.id })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <p className={cn("text-sm text-muted-foreground line-clamp-4 flex-1 mb-3 whitespace-pre-wrap", fontCls)}>
                            {note.content}
                          </p>
                          <div className="flex justify-between items-end mt-auto pt-3 border-t border-border/50">
                            <div className="flex flex-wrap gap-1">
                              {note.tags && note.tags.slice(0, 3).map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 h-4">{tag}</Badge>
                              ))}
                              {note.tags && note.tags.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{note.tags.length - 3}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                              {format(new Date(note.updatedAt), 'MMM d')}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-muted-foreground border border-dashed rounded-lg">
              <FileText className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p>No notes found.</p>
              {(search || selectedTag) && (
                <Button variant="link" onClick={() => { setSearch(""); setSelectedTag(null); }} className="mt-2">
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
