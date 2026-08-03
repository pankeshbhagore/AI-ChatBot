"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Source } from "@/lib/api";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export function ChatMessage({ role, content, sources }: ChatMessageProps) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[85%] gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
        
        {/* Avatar */}
        <div className="mt-1 flex-shrink-0">
          {isUser ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/20">
              <User className="h-4 w-4 text-white/70" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 shadow-md shadow-violet-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-2xl px-5 py-4 text-[15px] shadow-sm transition-all",
            isUser 
              ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm shadow-violet-500/10" 
              : "bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] text-white/90 rounded-tl-sm"
          )}
        >
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || " "}</ReactMarkdown>
          </div>

          {!isUser && sources && sources.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
              {sources.map((s, i) => (
                <Badge key={i} variant="secondary" className="bg-white/5 border-white/10 hover:bg-white/10 text-xs px-2 py-0.5 font-normal text-muted-foreground">
                  {s.documentName}
                  {s.page ? ` · p.${s.page}` : ""}
                </Badge>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
