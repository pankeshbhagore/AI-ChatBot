"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, MessageCircle } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex w-full mb-6 justify-start">
      <div className="flex max-w-[85%] gap-4 flex-row">
        <div className="mt-1 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 shadow-md shadow-violet-500/20">
            <Sparkles className="h-4 w-4 text-white animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-black/[0.03] dark:bg-white/[0.04] backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] px-5 py-4">
          <span className="typing-dot h-2 w-2 rounded-full bg-violet-400" />
          <span className="typing-dot h-2 w-2 rounded-full bg-violet-400" />
          <span className="typing-dot h-2 w-2 rounded-full bg-violet-400" />
        </div>
      </div>
    </div>
  );
}

export function SuggestedQuestions({
  questions,
  onSelect,
}: {
  questions: string[];
  onSelect: (q: string) => void;
}) {
  if (!questions?.length) return null;

  return (
    <div className="space-y-3 pl-12">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5" />
        Suggested Questions
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="group relative rounded-full bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm text-foreground/80 border border-black/10 dark:border-white/10 transition-all duration-300 hover:scale-105 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] hover:text-foreground hover:border-violet-500/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
