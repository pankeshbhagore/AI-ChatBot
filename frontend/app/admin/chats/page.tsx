"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

interface ChatSession {
  _id: string;
  firstQuestion: string;
  messageCount: number;
  startTime: string;
  lastTime: string;
}

export default function ChatHistoryPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/chat/sessions")
      .then((res) => {
        setSessions(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load chat sessions:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
          Chat History
        </h1>
        <p className="text-muted-foreground mt-1">Review past conversations with the AI assistant.</p>
      </div>

      <Card className="glass-card">
        <CardHeader className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-6 py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-500" />
            All Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
              <div className="text-lg font-medium text-muted-foreground">No chat history found</div>
              <p className="text-sm text-muted-foreground/70">Users haven't started any conversations yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {sessions.map((session) => (
                <div key={session._id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                        {session.messageCount} messages
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.lastTime).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {session.firstQuestion}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      ID: {session._id.substring(0, 8)}...
                    </p>
                  </div>
                  <Link
                    href={`/admin/chats/${session._id}`}
                    className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-black/5 text-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 px-4 gap-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    View
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
