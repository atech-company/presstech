"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Bot, Loader2, Send, User } from "lucide-react";
import { widgetService, type WidgetMessage } from "@/features/widget/services/widget-service";
import { cn } from "@/lib/utils";

export default function EmbedChatPage() {
  const { botId } = useParams<{ botId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [botName, setBotName] = useState("Assistant");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token || !botId) {
      setError("Invalid embed link");
      setLoading(false);
      return;
    }

    async function init() {
      try {
        const config = await widgetService.config(botId, token);
        setBotName(config.name);
        const conversation = await widgetService.startConversation(botId, token, window.location.href);
        setConversationId(conversation.id);
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Hi! I'm ${config.name}. How can I help you?`,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chat");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [botId, token]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !conversationId || typing) return;

    const content = input.trim();
    setInput("");
    setTyping(true);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content, created_at: new Date().toISOString() },
    ]);

    try {
      const res = await widgetService.sendMessage(conversationId, token, content);
      setMessages((prev) => [...prev, res.assistant_message]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-medium">{botName}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">Typing...</div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 border-t p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          disabled={typing}
        />
        <button
          type="submit"
          disabled={typing || !input.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
