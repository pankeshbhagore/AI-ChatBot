"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { apiFetch, Source } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function ChatSessionDetailPage({ params }: { params: { sessionId: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/api/chat/history/${params.sessionId}`)
      .then((res) => {
        if (res.history && res.history.length > 0) {
          const restored: Message[] = [];
          for (const entry of res.history) {
            restored.push({ role: "user", content: entry.question });
            restored.push({
              role: "assistant",
              content: entry.answer,
              sources: entry.sources || [],
            });
          }
          setMessages(restored);
          setTimestamp(res.history[res.history.length - 1].timestamp);
        }
      })
      .catch((err) => {
        console.error("Failed to load chat history:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params.sessionId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/chats"
          className="inline-flex h-9 w-9 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Session Details
            {timestamp && (
              <span className="text-xs font-normal px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/10 text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {new Date(timestamp).toLocaleString()}
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">ID: {params.sessionId}</p>
        </div>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">Loading transcript...</div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No messages found for this session.</div>
          ) : (
            <div className="bg-black/5 dark:bg-white/[0.02] p-4 md:p-8 space-y-6">
              {messages.map((m, i) => (
                <ChatMessage key={i} role={m.role} content={m.content} sources={m.sources} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
