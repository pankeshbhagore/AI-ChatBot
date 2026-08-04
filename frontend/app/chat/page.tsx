"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { TypingIndicator, SuggestedQuestions } from "@/components/chat/SuggestedQuestions";
import { ThemeToggle } from "@/components/theme-toggle";
import { streamAskQuestion, apiFetch, type Source } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasFirstToken, setHasFirstToken] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let id = sessionStorage.getItem("kb-chat-session-id");
    if (!id) {
      id = uuidv4();
      sessionStorage.setItem("kb-chat-session-id", id);
    }
    setSessionId(id);
  }, []);

  // Restore conversation from the database so it survives page refresh.
  useEffect(() => {
    if (!sessionId) return;
    apiFetch(`/api/chat/history/${sessionId}`)
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
          setSuggested(res.history[res.history.length - 1]?.suggestedQuestions || []);
        }
      })
      .catch(() => {
        // Silently ignore — first visit or backend unreachable.
      });
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  function sendMessage(question: string) {
    if (!question.trim() || isStreaming || !sessionId) return;

    setMessages((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setInput("");
    setSuggested([]);
    setIsStreaming(true);
    setHasFirstToken(false);

    streamAskQuestion(sessionId, question, {
      onChunk: (token) => {
        setHasFirstToken(true);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + token,
          };
          return updated;
        });
      },
      onFinal: (data) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: data.answer,
            sources: data.sources,
          };
          return updated;
        });
        setSuggested(data.suggestedQuestions || []);
        setIsStreaming(false);
      },
      onError: (message) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `⚠️ ${message}`,
          };
          return updated;
        });
        setIsStreaming(false);
      },
    });
  }

  return (
    <div className="mx-auto flex h-screen flex-col overflow-hidden bg-background">
      <header className="relative z-10 flex h-16 items-center gap-3 bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-purple-600/20 px-6 backdrop-blur-md border-b border-black/5 dark:border-white/5 shadow-lg">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/20">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Knowledge Base Assistant</h1>
        
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <a href="/" className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors text-foreground/70 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground px-3">
            Home
          </a>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth">
        <div className="mx-auto max-w-4xl space-y-6">
          {messages.length === 0 && (
            <div className="flex h-[70vh] flex-col items-center justify-center text-center animate-fade-in">
              <div className="relative mb-6">
                <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-3xl"></div>
                <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-2xl">
                  <Sparkles className="h-10 w-10 text-violet-400" />
                </div>
              </div>
              <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">How can I help you today?</h2>
              <p className="text-muted-foreground max-w-sm">
                Ask me anything about the documents in the knowledge base.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <ChatMessage role={m.role} content={m.content} sources={m.sources} />
            </div>
          ))}

          {isStreaming && !hasFirstToken && (
            <div className="animate-slide-up">
              <TypingIndicator />
            </div>
          )}

          {!isStreaming && suggested.length > 0 && (
            <div className="animate-fade-in pt-4">
              <SuggestedQuestions questions={suggested} onSelect={(q) => sendMessage(q)} />
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 p-4 pt-2">
        <div className="mx-auto max-w-4xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] p-2 pl-4 border border-black/[0.08] dark:border-white/[0.08] shadow-2xl backdrop-blur-xl transition-all focus-within:border-primary/50 focus-within:bg-black/[0.05] dark:focus-within:bg-white/[0.05]"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about the uploaded documents..."
              disabled={isStreaming}
              className="flex-1 border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none text-base placeholder:text-muted-foreground/70"
            />
            <Button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-0 text-white shadow-lg transition-all hover:scale-105 hover:shadow-violet-500/25 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-2 text-center text-xs text-muted-foreground/60">
            Assistant can make mistakes. Consider verifying important information.
          </div>
        </div>
      </div>
    </div>
  );
}
