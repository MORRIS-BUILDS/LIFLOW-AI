import React, { useState, useEffect, useRef } from "react";
import { 
  useListConversations, 
  useCreateConversation,
  useDeleteConversation,
  useGetAiSuggestions
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Send, Plus, Trash2, MessageSquare, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListConversationsQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export default function AiAssistant() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{id: string, role: string, content: string}>>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: loadingConversations } = useListConversations();
  const { data: suggestions } = useGetAiSuggestions();

  const createConversation = useCreateConversation({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setActiveConversationId(data.id);
        setMessages([]);
      }
    }
  });

  const deleteConversation = useDeleteConversation({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        if (activeConversationId === variables.id) {
          setActiveConversationId(null);
          setMessages([]);
        }
        toast.success("Conversation deleted");
      }
    }
  });

  // Fetch messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      fetch(`${import.meta.env.BASE_URL}api/ai/conversations/${activeConversationId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.messages) {
            setMessages(data.messages);
          }
        })
        .catch(err => console.error("Failed to load messages", err));
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!inputValue.trim() || isStreaming) return;
    
    let convId = activeConversationId;
    
    // Create conversation if none exists
    if (!convId) {
      try {
        const newConv = await createConversation.mutateAsync({ 
          data: { title: inputValue.slice(0, 30) + (inputValue.length > 30 ? '...' : '') } 
        });
        convId = newConv.id;
      } catch (err) {
        toast.error("Failed to create conversation");
        return;
      }
    }
    
    const userMsg = inputValue;
    setInputValue("");
    
    // Optimistically add user message
    const tempUserId = `temp-user-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempUserId, role: "user", content: userMsg }]);
    
    setIsStreaming(true);
    
    // Add empty assistant message placeholder
    const tempAsstId = `temp-asst-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempAsstId, role: "assistant", content: "" }]);

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/ai/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg })
      });
      
      if (!response.ok) throw new Error("Network response was not ok");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let asstContent = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                asstContent += data.content;
                setMessages(prev => 
                  prev.map(m => m.id === tempAsstId ? { ...m, content: asstContent } : m)
                );
              }
              if (data.done) {
                break;
              }
            } catch (e) {
              // Ignore parse errors on incomplete chunks
            }
          }
        }
      }
      
      // Refresh conversation list to update title if needed
      queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      
    } catch (error) {
      console.error("Streaming error:", error);
      toast.error("Error communicating with AI");
      setMessages(prev => prev.filter(m => m.id !== tempAsstId));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[calc(100vh-8rem)] flex flex-col gap-4"
    >
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground mt-1">Your personal guide for productivity and growth.</p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-6">
        {/* Sidebar */}
        <div className="hidden md:flex w-64 flex-col gap-4 shrink-0">
          <Button 
            className="w-full justify-start" 
            onClick={() => {
              setActiveConversationId(null);
              setMessages([]);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Chat
          </Button>

          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-none shadow-none bg-sidebar/50">
            <div className="p-3 font-medium text-sm text-sidebar-foreground/70 uppercase tracking-wider">
              Recent Chats
            </div>
            <ScrollArea className="flex-1 px-3 pb-3">
              {loadingConversations ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : conversations && conversations.length > 0 ? (
                <div className="space-y-1">
                  {conversations.map(conv => (
                    <div 
                      key={conv.id}
                      className={cn(
                        "group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-sm",
                        activeConversationId === conv.id 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      )}
                      onClick={() => setActiveConversationId(conv.id)}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="truncate">{conv.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation.mutate({ id: conv.id });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No previous conversations.
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>

        {/* Main Chat Area */}
        <Card className="flex-1 flex flex-col min-w-0 overflow-hidden border shadow-sm relative">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-6"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <Bot className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">How can I help you grow today?</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  I have context on your tasks, study habits, and gym consistency. Ask me for advice, analysis, or help planning.
                </p>
                
                {suggestions && suggestions.suggestions?.length > 0 && (
                  <div className="w-full max-w-2xl text-left">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                      <Sparkles className="h-4 w-4 text-purple-500" /> Suggested topics based on your data
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {suggestions.suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-left p-3 text-sm rounded-lg border bg-card hover:border-primary/50 hover:bg-muted/50 transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {messages.map((msg, i) => (
                  <div 
                    key={msg.id || i} 
                    className={cn(
                      "flex gap-4 max-w-3xl",
                      msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
                      msg.role === "user" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground"
                    )}>
                      {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
                    </div>
                    <div className={cn(
                      "px-4 py-3 rounded-lg text-sm shadow-sm",
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted/50 border rounded-tl-none prose prose-sm dark:prose-invert max-w-none"
                    )}>
                      {msg.role === "user" ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        msg.content ? (
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        ) : (
                          <div className="flex gap-1 items-center h-5">
                            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t bg-card mt-auto shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Message your AI coach..."
                className="pr-12 bg-background border-muted-foreground/30 focus-visible:ring-primary/50 shadow-sm"
                disabled={isStreaming}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!inputValue.trim() || isStreaming}
                className="absolute right-1 top-1 h-8 w-8"
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
            <div className="text-center mt-2 text-[10px] text-muted-foreground">
              AI can make mistakes. Verify important information.
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
